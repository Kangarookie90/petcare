/**
 * useOffline.js — Hook React per stato connessione + indicatore sync
 *
 * Uso:
 *   const { isOnline, codaCount, ultimoSync } = useOffline();
 */

import { useState, useEffect } from 'react';
import { onConnectivityChange, getIsOnline } from './syncService';
import { db } from './db';

export function useOffline() {
  const [isOnline,   setIsOnline]   = useState(getIsOnline());
  const [codaCount,  setCodaCount]  = useState(0);
  const [ultimoSync, setUltimoSync] = useState(null);

  useEffect(() => {
    // Stato connessione
    const unsub = onConnectivityChange(setIsOnline);

    // Conta mutazioni in coda ogni 3 secondi
    const interval = setInterval(async () => {
      const count = await db._coda.count();
      setCodaCount(count);
      const sync = await db._sync.get('ultimo_sync');
      if (sync) setUltimoSync(new Date(sync.valore));
    }, 3000);

    // Prima lettura immediata
    db._coda.count().then(setCodaCount);
    db._sync.get('ultimo_sync').then(s => s && setUltimoSync(new Date(s.valore)));

    return () => { unsub(); clearInterval(interval); };
  }, []);

  return { isOnline, codaCount, ultimoSync };
}