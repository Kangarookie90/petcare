/**
 * db.js — Database locale IndexedDB con Dexie
 * Mirror delle tabelle Supabase per uso offline
 */

import Dexie from 'dexie';

export const db = new Dexie('PetCareDB');

// ── v2: schema originale ──────────────────────────────────────
db.version(2).stores({
  clienti:             'id, cognome, nome, created_at',
  animali:             'id, cliente_id, nome, specie',
  operatori:           'id, nome, attivo',
  servizi:             'id, nome',
  razze:               'id, nome, specie',
  appuntamenti:        'id, inizio, fine, stato, cliente_id, animale_id, operatore_id',
  primanota:           'id, data, appuntamento_id, operatore_id, tipo',
  appuntamenti_servizi:'id, appuntamento_id, servizio_id',
  _coda:               '++id, tabella, action, created_at',
  _sync:               'chiave',
});

// ── v3: aggiunta tabella notifiche WhatsApp ───────────────────
// Nota: i nuovi campi sanitari di animali (allergie, vaccini,
// farmaci_in_corso, veterinario_nome, veterinario_tel) non
// richiedono modifiche allo schema Dexie — vengono salvati
// automaticamente come dati nel record esistente.
db.version(3).stores({
  clienti:             'id, cognome, nome, created_at',
  animali:             'id, cliente_id, nome, specie',
  operatori:           'id, nome, attivo',
  servizi:             'id, nome',
  razze:               'id, nome, specie',
  appuntamenti:        'id, inizio, fine, stato, cliente_id, animale_id, operatore_id',
  primanota:           'id, data, appuntamento_id, operatore_id, tipo',
  appuntamenti_servizi:'id, appuntamento_id, servizio_id',
  notifiche:           'id, tipo, appuntamento_id, letto, created_at',
  _coda:               '++id, tabella, action, created_at',
  _sync:               'chiave',
});

// ── v4: aggiunta tabella lista_attesa ────────────────────────
db.version(4).stores({
  clienti:             'id, cognome, nome, created_at',
  animali:             'id, cliente_id, nome, specie',
  operatori:           'id, nome, attivo',
  servizi:             'id, nome',
  razze:               'id, nome, specie',
  appuntamenti:        'id, inizio, fine, stato, cliente_id, animale_id, operatore_id',
  primanota:           'id, data, appuntamento_id, operatore_id, tipo',
  appuntamenti_servizi:'id, appuntamento_id, servizio_id',
  notifiche:           'id, tipo, appuntamento_id, letto, created_at',
  lista_attesa:        'id, cliente_id, animale_id, operatore_id, stato, priorita, created_at',
  _coda:               '++id, tabella, action, created_at',
  _sync:               'chiave',
});

// ── v5: nuovi campi AI su animali ────────────────────────────
// ultima_scheda_visita e ultima_scheda_data non richiedono indici
// Dexie — vengono salvati automaticamente come dati nel record.
// La versione va comunque incrementata per documentare la migrazione.
db.version(5).stores({
  clienti:             'id, cognome, nome, created_at',
  animali:             'id, cliente_id, nome, specie',
  operatori:           'id, nome, attivo',
  servizi:             'id, nome',
  razze:               'id, nome, specie',
  appuntamenti:        'id, inizio, fine, stato, cliente_id, animale_id, operatore_id',
  primanota:           'id, data, appuntamento_id, operatore_id, tipo',
  appuntamenti_servizi:'id, appuntamento_id, servizio_id',
  notifiche:           'id, tipo, appuntamento_id, letto, created_at',
  lista_attesa:        'id, cliente_id, animale_id, operatore_id, stato, priorita, created_at',
  _coda:               '++id, tabella, action, created_at',
  _sync:               'chiave',
});

export default db;