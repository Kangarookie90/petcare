import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { inizializzaSync } from './syncService.js'
import { Analytics } from '@vercel/analytics/react'
import { registerSW } from 'virtual:pwa-register'

// Avvia sync all'avvio dell'app
inizializzaSync();

// ── Service worker: aggiornamento con conferma dell'utente ──
// Quando è disponibile una nuova versione, NON si ricarica da sola:
// salviamo la funzione di update su window e avvisiamo l'app con un
// evento custom. Il banner (UpdateBanner.jsx) lo intercetta e mostra
// il pulsante "Aggiorna ora" all'utente.
if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      window.__updateSW = updateSW;
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    },
    onOfflineReady() {
      console.log('[PWA] App pronta per funzionare offline');
    },
  });

  // Controlla periodicamente se c'è una nuova versione disponibile
  // (utile per chi tiene l'app aperta a lungo, es. su un tablet in salone)
  setInterval(() => {
    updateSW();
  }, 60 * 60 * 1000); // ogni 60 minuti
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)