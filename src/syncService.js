/**
 * syncService.js
 * Gestione offline-first + sync automatico con Supabase
 *
 * Logica:
 * - Tutte le letture vanno prima al DB locale, poi (se online) aggiorna dal server
 * - Tutte le scritture vanno al DB locale + coda se offline, o direttamente a Supabase se online
 * - Quando torna la connessione, svuota la coda e ri-scarica i dati freschi
 *
 * Tabelle sincronizzate:
 *   clienti, animali, operatori, servizi, razze,
 *   appuntamenti, primanota, appuntamenti_servizi, notifiche, lista_attesa, operatori_orari
 *
 * v2 — multi-salone:
 *   - syncAll() richiede salone_id (caricato da _meta)
 *   - inserisci() inietta automaticamente salone_id su ogni record
 *   - utenti_salone sincronizzata in cache locale (readonly)
 */

import { supabase } from './supabaseClient';
import { db } from './db';

// ── Tabelle da sincronizzare ──────────────────────────────────
const TABELLE = ['clienti', 'animali', 'operatori', 'servizi', 'razze', 'appuntamenti', 'primanota', 'appuntamenti_servizi', 'appuntamenti_animali', 'notifiche', 'lista_attesa', 'operatori_orari'];

// ── Select per tabelle con join o campi specifici ─────────────
const SELECT_MAP = {
  animali:              '*, razze(id, nome), clienti(id, nome, cognome)',
  appuntamenti:         '*, clienti(id, nome, cognome), animali(id, nome, specie, problemi_carattere, problemi_salute), operatori(id, nome, cognome, colore)',
  appuntamenti_animali: 'id, appuntamento_id, animale_id, salone_id, animali(id, nome, specie, problemi_carattere, problemi_salute)',
  notifiche:            'id, tipo, appuntamento_id, animale_id, cliente_id, messaggio, telefono_cliente, letto, created_at, salone_id',
  lista_attesa:         '*, clienti(id, nome, cognome, telefono), animali(id, nome, specie), operatori(id, nome, colore)',
};

// ── Finestre temporali per tabelle grandi ─────────────────────
const MESI_6   = 6;
const GIORNI_30 = 30;

function finestraISO(mesi = 6) {
  const d = new Date();
  d.setMonth(d.getMonth() - mesi);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function finestraGiorni(giorni = 30) {
  const d = new Date();
  d.setDate(d.getDate() - giorni);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

const FILTRO_TEMPORALE = {
  appuntamenti:         { campo: 'inizio',     da: () => finestraISO(MESI_6) },
  primanota:            { campo: 'data',        da: () => finestraISO(MESI_6).slice(0, 10) },
  appuntamenti_servizi: null,
  appuntamenti_animali: null,
  notifiche:            { campo: 'created_at', da: () => finestraGiorni(GIORNI_30) },
};

// ── Tabelle in sola lettura (mai in coda scrittura) ───────────
const TABELLE_READONLY = new Set(['notifiche']);

// ── Tabelle che usano merge invece di clear+bulkPut ───────────
const TABELLE_MERGE = new Set(['lista_attesa', 'appuntamenti', 'primanota', 'notifiche']);

// ── Stato connettività ────────────────────────────────────────
let isOnline = navigator.onLine;
const listeners = new Set();

window.addEventListener('online',  () => { isOnline = true;  notifyListeners(); syncAll(); });
window.addEventListener('offline', () => { isOnline = false; notifyListeners(); });

function notifyListeners() { listeners.forEach(fn => fn(isOnline)); }

export function onConnectivityChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getIsOnline() { return isOnline; }

function tempId() {
  return 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

// ── salone_id attivo ─────────────────────────────────────────
// Caricato da _meta all'avvio, aggiornato da setSaloneAttivo().
let _saloneId = null;

export async function getSaloneId() {
  if (_saloneId) return _saloneId;
  const meta = await db._meta.get('salone_id');
  _saloneId = meta?.valore ?? null;
  return _saloneId;
}

export async function setSaloneAttivo({ salone_id, ruolo }) {
  _saloneId = salone_id;
  await db._meta.put({ chiave: 'salone_id', valore: salone_id });
  await db._meta.put({ chiave: 'ruolo',     valore: ruolo });
  // Forza re-sync con il nuovo salone
  await db._sync.delete('ultimo_sync');
}

export async function getRuoloLocale() {
  const meta = await db._meta.get('ruolo');
  return meta?.valore ?? 'operatore';
}

// ── Flag anti-sync-paralleli ──────────────────────────────────
let _syncInProgress = false;

// ── Debounce per leggi() — max 1 sync per tabella ogni 60s ───
const _ultimoSyncPerTabella = new Map();
const DEBOUNCE_LEGGI_MS = 60_000;

// ── Sync utenti_salone (cache locale del pivot ruoli) ─────────
async function syncUtentiSalone() {
  try {
    const { data, error } = await supabase.from('utenti_salone').select('*');
    if (error || !data) return;
    await db.transaction('rw', db.utenti_salone, async () => {
      await db.utenti_salone.clear();
      await db.utenti_salone.bulkPut(data);
    });
  } catch (e) {
    console.error('[Sync] utenti_salone:', e);
  }
}

// ── Sync completo ─────────────────────────────────────────────
export async function syncAll() {
  if (!isOnline) return;
  if (_syncInProgress) { console.log('[Sync] Sync già in corso, skip.'); return; }
  _syncInProgress = true;
  console.log('[Sync] Avvio sincronizzazione...');
  try {
    await flushCoda();
    await syncUtentiSalone();
    await Promise.all(TABELLE.map(t => syncTabella(t, SELECT_MAP[t] || '*')));
    await db._sync.put({ chiave: 'ultimo_sync', valore: new Date().toISOString() });
    console.log('[Sync] Completato');
  } finally {
    _syncInProgress = false;
  }
}

// ── Sync singola tabella ──────────────────────────────────────
// RLS filtra automaticamente per salone — non serve passare salone_id nella query.
async function syncTabella(tabella, select) {
  try {
    let query = supabase.from(tabella).select(select);
    const filtro = FILTRO_TEMPORALE[tabella];
    if (filtro) {
      query = query.gte(filtro.campo, filtro.da());
    }

    const { data, error } = await query;
    if (error) { console.error(`[Sync] Errore ${tabella}:`, error); return; }
    if (!data) return;

    if (TABELLE_MERGE.has(tabella)) {
      await db[tabella].bulkPut(data);
    } else {
      await db.transaction('rw', db[tabella], async () => {
        await db[tabella].clear();
        await db[tabella].bulkPut(data);
      });
    }

    _ultimoSyncPerTabella.set(tabella, Date.now());
  } catch (e) {
    console.error(`[Sync] ${tabella}:`, e);
  }
}

// ── Svuota coda offline ───────────────────────────────────────
async function flushCoda() {
  const coda = await db._coda.orderBy('id').toArray();
  if (coda.length === 0) return;
  console.log(`[Sync] ${coda.length} mutazioni da inviare`);
  for (const item of coda) {
    try {
      let ok = false;
      if (item.action === 'insert') {
        const payload = { ...item.payload };
        const idLocale = payload._id_locale;
        delete payload._id_locale;
        delete payload.id;
        const { data, error } = await supabase.from(item.tabella).insert([payload]).select().single();
        if (!error && data) {
          await db[item.tabella].delete(idLocale);
          await db[item.tabella].put(data);
          ok = true;
        }
      } else if (item.action === 'update') {
        const { error } = await supabase.from(item.tabella).update(item.payload).eq('id', item.record_id);
        ok = !error;
      } else if (item.action === 'delete') {
        if (!String(item.record_id).startsWith('offline_')) {
          const { error } = await supabase.from(item.tabella).delete().eq('id', item.record_id);
          ok = !error;
        } else { ok = true; }
      }
      if (ok) await db._coda.delete(item.id);
    } catch (e) {
      console.error('[Sync] Errore flush coda:', e);
    }
  }
}

// ── API OFFLINE-FIRST ─────────────────────────────────────────

export async function leggi(tabella, { filtri = {}, ordine = null } = {}) {
  let dati = await db[tabella].toArray();
  if (Object.keys(filtri).length > 0) {
    dati = dati.filter(r => Object.entries(filtri).every(([k, v]) => r[k] === v));
  }
  if (ordine) {
    dati = dati.sort((a, b) => {
      const va = a[ordine] || ''; const vb = b[ordine] || '';
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
  }
  if (isOnline) {
    const ultimoSync = _ultimoSyncPerTabella.get(tabella) ?? 0;
    if (Date.now() - ultimoSync > DEBOUNCE_LEGGI_MS) {
      syncTabella(tabella, SELECT_MAP[tabella] || '*').catch(() => {});
    }
  }
  return dati;
}

export async function inserisci(tabella, payload) {
  // Inietta salone_id automaticamente su ogni insert
  const saloneId = await getSaloneId();
  const payloadCompleto = saloneId ? { salone_id: saloneId, ...payload } : payload;

  if (isOnline) {
    const { data, error } = await supabase.from(tabella).insert([payloadCompleto]).select().single();
    if (error) throw error;
    await db[tabella].put(data);
    return data;
  } else {
    const idLocale = tempId();
    const recordLocale = { ...payloadCompleto, id: idLocale, _id_locale: idLocale, _offline: true };
    await db[tabella].put(recordLocale);
    await db._coda.add({ tabella, action: 'insert', payload: recordLocale, created_at: new Date().toISOString() });
    return recordLocale;
  }
}

export async function aggiorna(tabella, id, payload) {
  const existing = await db[tabella].get(id);
  if (existing) await db[tabella].put({ ...existing, ...payload });
  if (isOnline && !String(id).startsWith('offline_')) {
    const { data, error } = await supabase.from(tabella).update(payload).eq('id', id).select().single();
    if (error) throw error;
    await db[tabella].put(data);
    return data;
  } else {
    await db._coda.add({ tabella, action: 'update', record_id: id, payload, created_at: new Date().toISOString() });
    return { ...existing, ...payload };
  }
}

export async function elimina(tabella, id) {
  await db[tabella].delete(id);
  if (isOnline && !String(id).startsWith('offline_')) {
    const { error } = await supabase.from(tabella).delete().eq('id', id);
    if (error) throw error;
  } else if (!String(id).startsWith('offline_')) {
    await db._coda.add({ tabella, action: 'delete', record_id: id, created_at: new Date().toISOString() });
  }
}

export async function inizializzaSync() {
  const ultimoSync = await db._sync.get('ultimo_sync');
  const minutiDallUltimoSync = ultimoSync
    ? (Date.now() - new Date(ultimoSync.valore).getTime()) / 60000
    : Infinity;
  if (isOnline && minutiDallUltimoSync > 5) {
    console.log('[Sync] Avvio sync iniziale...');
    syncAll();
  } else if (isOnline) {
    console.log(`[Sync] Skip — ultimo sync ${Math.round(minutiDallUltimoSync)}min fa`);
  } else {
    console.log('[Sync] Offline — uso dati locali');
  }
}