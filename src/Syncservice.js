/**
 * syncService.js
 * Gestione offline-first + sync automatico con Supabase
 *
 * Logica:
 * - Tutte le letture vanno prima al DB locale, poi (se online) aggiorna dal server
 * - Tutte le scritture vanno al DB locale + coda se offline, o direttamente a Supabase se online
 * - Quando torna la connessione, svuota la coda e ri-scarica i dati freschi
 */

import { supabase } from './supabaseClient';
import { db } from './db';

// ── Tabelle da sincronizzare ──────────────────────────────────
const TABELLE = ['clienti', 'animali', 'operatori', 'servizi', 'razze', 'appuntamenti'];

// ── Stato connessione ─────────────────────────────────────────
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

// ── Sync completo (scarica tutto da Supabase → DB locale) ────
export async function syncAll() {
  if (!isOnline) return;

  console.log('[PetCare Sync] Avvio sincronizzazione...');

  // 1. Prima svuota la coda offline (invia le mutazioni pendenti)
  await flushCoda();

  // 2. Scarica i dati freschi da Supabase
  await Promise.all([
    syncTabella('clienti',      '*'),
    syncTabella('animali',      '*, razze(id,nome)'),
    syncTabella('operatori',    '*'),
    syncTabella('servizi',      '*'),
    syncTabella('razze',        '*'),
    syncTabella('appuntamenti', '*, clienti(nome,cognome), animali(nome,specie), operatori(id,nome,cognome,colore), servizi(id,nome,prezzo)'),
  ]);

  // 3. Aggiorna timestamp ultimo sync
  await db._sync.put({ chiave: 'ultimo_sync', valore: new Date().toISOString() });
  console.log('[PetCare Sync] Completato');
}

async function syncTabella(tabella, select) {
  try {
    const { data, error } = await supabase.from(tabella).select(select);
    if (error) { console.error(`[Sync] Errore ${tabella}:`, error); return; }
    if (data) {
      await db[tabella].clear();
      await db[tabella].bulkPut(data);
    }
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
 * Se online, aggiorna in background.
 */
export async function leggi(tabella, { filtri = {}, ordine = null } = {}) {
  // Lettura locale
  let query = db[tabella].toArray();
  let dati = await query;

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

  // Se online aggiorna in background (senza bloccare)
  if (isOnline) {
    syncTabella(tabella, '*').catch(() => {});
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
    // Crea record locale con ID temporaneo
    const idLocale = tempId();
    const recordLocale = { ...payload, id: idLocale, _id_locale: idLocale, _offline: true };
    await db[tabella].put(recordLocale);
    // Accoda mutazione
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
    // Accoda se offline o record ancora locale
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

// ── Avvio: sync iniziale se online ───────────────────────────
export async function inizializzaSync() {
  const ultimoSync = await db._sync.get('ultimo_sync');
  const minutiDallUltimoSync = ultimoSync
    ? (Date.now() - new Date(ultimoSync.valore).getTime()) / 60000
    : Infinity;

  // Sync se online e sono passati più di 5 minuti dall'ultimo
  if (isOnline && minutiDallUltimoSync > 5) {
    syncAll();
  }
}