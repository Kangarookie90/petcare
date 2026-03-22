/**
 * db.js — Database locale IndexedDB con Dexie
 * Mirror delle tabelle Supabase per uso offline
 */

import Dexie from 'dexie';

export const db = new Dexie('PetCareDB');

db.version(1).stores({
  // Tabelle dati
  clienti:      'id, cognome, nome, created_at',
  animali:      'id, cliente_id, nome, specie',
  operatori:    'id, nome, attivo',
  servizi:      'id, nome',
  razze:        'id, nome, specie',
  appuntamenti: 'id, inizio, fine, stato, cliente_id, animale_id, operatore_id',

  // Coda mutazioni offline
  // action: 'insert' | 'update' | 'delete'
  // tabella: nome tabella Supabase
  // payload: dati da inviare
  // id_locale: id temporaneo generato offline
  _coda: '++id, tabella, action, created_at',

  // Metadata sync
  _sync: 'chiave',
});

export default db;