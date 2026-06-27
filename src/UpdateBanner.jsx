import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * UpdateBanner.jsx
 * Mostra un banner quando è disponibile una nuova versione dell'app
 * (rilevata dal service worker registrato in main.jsx).
 * L'utente decide quando aggiornare cliccando "Aggiorna ora" —
 * nessun reload automatico e nessuna perdita di lavoro in corso.
 */
export default function UpdateBanner() {
  const [visibile, setVisibile] = useState(false);
  const [aggiornando, setAggiornando] = useState(false);

  useEffect(() => {
    const onUpdate = () => setVisibile(true);
    window.addEventListener('sw-update-available', onUpdate);
    return () => window.removeEventListener('sw-update-available', onUpdate);
  }, []);

  const handleAggiorna = () => {
    setAggiornando(true);
    if (window.__updateSW) {
      window.__updateSW(true); // attiva il nuovo service worker e ricarica
    } else {
      window.location.reload();
    }
  };

  return (
    <AnimatePresence>
      {visibile && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{
            position: 'fixed',
            bottom: 'calc(16px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 600,
            width: 'calc(100% - 32px)',
            maxWidth: 420,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 18,
            background: 'rgba(255,255,255,0.85)',
            border: '1px solid rgba(255,255,255,0.9)',
            boxShadow: '0 2px 0 rgba(255,255,255,0.95) inset, 0 12px 32px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(24px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              Nuova versione disponibile
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
              Aggiorna per avere le ultime novità
            </p>
          </div>
          <button
            onClick={handleAggiorna}
            disabled={aggiornando}
            style={{
              flexShrink: 0,
              padding: '9px 16px',
              borderRadius: 12,
              border: '1px solid rgba(29,158,117,0.3)',
              background: 'rgba(29,158,117,0.1)',
              color: '#0F6E56',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              cursor: aggiornando ? 'default' : 'pointer',
              opacity: aggiornando ? 0.6 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {aggiornando ? 'Aggiornamento…' : 'Aggiorna ora'}
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}