/**
 * OfflineIndicator.jsx
 * Pill che mostra lo stato connessione in App.jsx
 *
 * Uso in App.jsx:
 *   import OfflineIndicator from './OfflineIndicator';
 *   // dentro il return, prima del bottom-nav:
 *   <OfflineIndicator />
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useOffline } from './useOffline';

export default function OfflineIndicator() {
  const { isOnline, codaCount, ultimoSync } = useOffline();

  const formatSync = (d) => {
    if (!d) return 'mai';
    const diff = Math.round((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return 'adesso';
    if (diff < 60) return `${diff} min fa`;
    return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {(!isOnline || codaCount > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 99,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            background: isOnline
              ? 'rgba(217,119,6,0.15)'
              : 'rgba(220,38,38,0.15)',
            border: `1px solid ${isOnline ? 'rgba(217,119,6,0.3)' : 'rgba(220,38,38,0.3)'}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontSize: 12,
            fontWeight: 600,
            color: isOnline ? '#d97706' : '#dc2626',
            fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {/* Dot animato */}
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            style={{
              width: 7, height: 7, borderRadius: '50%',
              background: isOnline ? '#d97706' : '#dc2626',
            }}
          />
          {!isOnline && codaCount === 0 && 'Offline — visualizzazione dati in cache'}
          {!isOnline && codaCount > 0 && `Offline — ${codaCount} modific${codaCount === 1 ? 'a' : 'he'} in attesa di sync`}
          {isOnline  && codaCount > 0 && `Sincronizzazione in corso (${codaCount} in coda)...`}
        </motion.div>
      )}
    </AnimatePresence>
  );
}