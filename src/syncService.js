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
 *   clienti, animali (+ comportamento/comportamento_note), operatori, servizi, razze,
 *   appuntamenti, primanota, appuntamenti_servizi, notifiche, lista_attesa, operatori_orari
 *
 * Storage (mai in coda — gestiti direttamente):
 *   animali-memo (note vocali), appuntamenti-foto (check-in fotografico)
 */

import { supabase } from './supabaseClient';
import { db } from './db';

// ── Tabelle da sincronizzare ──────────────────────────────────
const TABELLE = ['clienti', 'animali', 'operatori', 'servizi', 'razze', 'appuntamenti', 'primanota', 'appuntamenti_servizi', 'appuntamenti_animali', 'notifiche', 'lista_attesa', 'operatori_orari'];

// ── Select per tabelle con join o campi specifici ─────────────
const SELECT_MAP = {
  animali:              '*, razze(id, nome), clienti(id, nome, cognome)',
  appuntamenti:         '*, clienti(id, nome, cognome), animali(id, nome, specie, problemi_carattere, problemi_salute), operatori(id, nome, cognome, colore)',
  appuntamenti_animali: 'id, appuntamento_id, animale_id, animali(id, nome, specie, problemi_carattere, problemi_salute)',
  notifiche:            'id, tipo, appuntamento_id, messaggio, telefono_cliente, letto, created_at',
  lista_attesa:         '*, clienti(id, nome, cognome, telefono), animali(id, nome, specie), operatori(id, nome, colore)',
};

// ── Tabelle in sola lettura (mai in coda scrittura) ───────────
const TABELLE_READONLY = new Set(['notifiche']);

// ── Tabelle che non vanno cancellate in blocco durante sync ───
// lista_attesa: sincronizzata per delta per evitare flash UI
const TABELLE_DELTA = new Set(['lista_attesa']);

// ── Stato connettività ────────────────────────────────────────
let isOnline = navigator.onLine;
const listeners = new Set();

window.addEventListener('online',  () => { isOnline = true;  notifyListeners(); syncAll(); });
window.addEventListener('offline', () => { isOnline = false; notifyListeners(); });

function notifyListeners() {
  listeners.forEach(fn => fn(isOnline));
}

export function onConnectivityChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getIsOnline() {
  return isOnline;
}

// ── ID temporaneo per record offline ─────────────────────────
function tempId() {
  return 'offline_' + Date.now() + '_' + Math.random().toString(36).slice(2);
}

// ─────────────────────────────────────────────────────────────
// FIX 1: Flag anti-sync-paralleli
// Impedisce che due syncAll() girino contemporaneamente
// (es. reconnect + timer nello stesso momento).
// ─────────────────────────────────────────────────────────────
let _syncInProgress = false;

// ─────────────────────────────────────────────────────────────
// FIX 3: Debounce per syncTabella() chiamata da leggi()
// Se una tabella è stata sincronizzata negli ultimi 60s,
// non parte un nuovo sync — evita il thrashing su IndexedDB
// quando più componenti leggono la stessa tabella in rapida successione.
// ─────────────────────────────────────────────────────────────
const _ultimoSyncPerTabella = new Map(); // tabella → timestamp ms
const DEBOUNCE_LEGGI_MS = 60_000; // 60 secondi

// ── Sync completo (scarica tutto da Supabase → DB locale) ─────
export async function syncAll() {
  if (!isOnline) return;

  // FIX 1: Evita sync paralleli
  if (_syncInProgress) {
    console.log('[PetCare Sync] Sync già in corso, skip.');
    return;
  }
  _syncInProgress = true;

  console.log('[PetCare Sync] Avvio sincronizzazione...');

  try {
    // 1. Prima svuota la coda offline (invia le mutazioni pendenti)
    await flushCoda();

    // 2. Scarica i dati freschi da Supabase — tabelle in parallelo
    await Promise.all(
      TABELLE.map(t => syncTabella(t, SELECT_MAP[t] || '*'))
    );

    // 3. Aggiorna timestamp ultimo sync
    await db._sync.put({ chiave: 'ultimo_sync', valore: new Date().toISOString() });
    console.log('[PetCare Sync] Completato');
  } finally {
    _syncInProgress = false;
  }
}

// ── Sync singola tabella ──────────────────────────────────────
async function syncTabella(tabella, select) {
  try {
    const { data, error } = await supabase.from(tabella).select(select);
    if (error) { console.error(`[Sync] Errore ${tabella}:`, error); return; }
    if (!data) return;

    if (TABELLE_DELTA.has(tabella)) {
      // Delta sync: aggiorna/inserisce senza cancellare tutto
      await db[tabella].bulkPut(data);
    } else {
      // FIX 2: Operazione atomica con transazione Dexie
      // clear() + bulkPut() in un'unica transazione —
      // nessuna lettura vede mai la tabella vuota a metà operazione.
      await db.transaction('rw', db[tabella], async () => {
        await db[tabella].clear();
        await db[tabella].bulkPut(data);
      });
    }

    // Aggiorna il timestamp di sync per questa tabella (usato dal debounce in leggi())
    _ultimoSyncPerTabella.set(tabella, Date.now());

  } catch (e) {
    console.error(`[Sync] ${tabella}:`, e);
  }
}

// ── Svuota coda offline ───────────────────────────────────────
async function flushCoda() {
  const coda = await db._coda.orderBy('id').toArray();
  if (coda.length === 0) return;

  console.log(`[PetCare Sync] ${coda.length} mutazioni da inviare`);

  for (const item of coda) {
    try {
      let ok = false;

      if (item.action === 'insert') {
        // Rimuovi id temporaneo prima di inviare
        const payload = { ...item.payload };
        const idLocale = payload._id_locale;
        delete payload._id_locale;
        delete payload.id; // lascia che Supabase generi l'UUID reale

        const { data, error } = await supabase.from(item.tabella).insert([payload]).select().single();
        if (!error && data) {
          // Sostituisci record locale con quello reale (nuovo UUID)
          await db[item.tabella].delete(idLocale);
          await db[item.tabella].put(data);
          ok = true;
        }
      }

      else if (item.action === 'update') {
        const { error } = await supabase.from(item.tabella).update(item.payload).eq('id', item.record_id);
        ok = !error;
      }

      else if (item.action === 'delete') {
        // Non inviare delete per record offline mai sincronizzati
        if (!String(item.record_id).startsWith('offline_')) {
          const { error } = await supabase.from(item.tabella).delete().eq('id', item.record_id);
          ok = !error;
        } else {
          ok = true; // record mai arrivato al server, ignora
        }
      }

      if (ok) {
        await db._coda.delete(item.id);
      }
    } catch (e) {
      console.error('[Sync] Errore flush coda:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// API OFFLINE-FIRST — usa questi invece di supabase direttamente
// ─────────────────────────────────────────────────────────────

/**
 * Legge da DB locale (sempre istantaneo).
 * Se online, aggiorna in background — ma max una volta ogni 60s per tabella
 * per evitare thrashing quando più componenti leggono in rapida successione.
 */
export async function leggi(tabella, { filtri = {}, ordine = null } = {}) {
  // Lettura locale
  let dati = await db[tabella].toArray();

  // Applica filtri semplici
  if (Object.keys(filtri).length > 0) {
    dati = dati.filter(r => Object.entries(filtri).every(([k, v]) => r[k] === v));
  }

  // Ordina
  if (ordine) {
    dati = dati.sort((a, b) => {
      const va = a[ordine] || '';
      const vb = b[ordine] || '';
      return va < vb ? -1 : va > vb ? 1 : 0;
    });
  }

  // FIX 3: Sync in background solo se non è stato fatto di recente
  if (isOnline) {
    const ultimoSync = _ultimoSyncPerTabella.get(tabella) ?? 0;
    const msSinceSinc = Date.now() - ultimoSync;
    if (msSinceSinc > DEBOUNCE_LEGGI_MS) {
      syncTabella(tabella, SELECT_MAP[tabella] || '*').catch(() => {});
    }
  }

  return dati;
}

/**
 * Inserisce un record.
 * Online → Supabase (poi salva locale).
 * Offline → DB locale con ID temporaneo + coda.
 */
export async function inserisci(tabella, payload) {
  if (isOnline) {
    const { data, error } = await supabase.from(tabella).insert([payload]).select().single();
    if (error) throw error;
    await db[tabella].put(data);
    return data;
  } else {
    const idLocale = tempId();
    const recordLocale = { ...payload, id: idLocale, _id_locale: idLocale, _offline: true };
    await db[tabella].put(recordLocale);
    await db._coda.add({
      tabella,
      action: 'insert',
      payload: recordLocale,
      created_at: new Date().toISOString(),
    });
    return recordLocale;
  }
}

/**
 * Aggiorna un record.
 */
export async function aggiorna(tabella, id, payload) {
  // Aggiorna subito locale
  const existing = await db[tabella].get(id);
  if (existing) await db[tabella].put({ ...existing, ...payload });

  if (isOnline && !String(id).startsWith('offline_')) {
    const { data, error } = await supabase.from(tabella).update(payload).eq('id', id).select().single();
    if (error) throw error;
    await db[tabella].put(data);
    return data;
  } else {
    await db._coda.add({
      tabella,
      action: 'update',
      record_id: id,
      payload,
      created_at: new Date().toISOString(),
    });
    return { ...existing, ...payload };
  }
}

/**
 * Elimina un record.
 */
export async function elimina(tabella, id) {
  await db[tabella].delete(id);

  if (isOnline && !String(id).startsWith('offline_')) {
    const { error } = await supabase.from(tabella).delete().eq('id', id);
    if (error) throw error;
  } else if (!String(id).startsWith('offline_')) {
    await db._coda.add({
      tabella,
      action: 'delete',
      record_id: id,
      created_at: new Date().toISOString(),
    });
  }
}

// ── Avvio: sync iniziale se online ────────────────────────────
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