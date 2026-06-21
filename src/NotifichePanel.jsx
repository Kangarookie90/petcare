/**
 * NotifichePanel.jsx
 * Campanella notifiche in tempo reale via Supabase Realtime
 * Mostra aggiornamenti automatici dal cliente via WhatsApp
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

const TIPO_META = {
  conferma_cliente: {
    label:   'Conferma cliente',
    colore:  '#059669',
    bg:      'rgba(5,150,105,0.1)',
    border:  'rgba(5,150,105,0.25)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
  },
  annullamento_cliente: {
    label:   'Annullamento cliente',
    colore:  '#dc2626',
    bg:      'rgba(220,38,38,0.08)',
    border:  'rgba(220,38,38,0.22)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
  },
  spostamento_richiesto: {
    label:   'Richiesta spostamento',
    colore:  '#d97706',
    bg:      'rgba(217,119,6,0.08)',
    border:  'rgba(217,119,6,0.22)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3"/>
        <path d="M16 2v4M8 2v4M3 10h18"/>
        <path d="M8 15l2 2 4-4"/>
      </svg>
    ),
  },
  recall: {
    label:   'Recall toeletta',
    colore:  '#7c3aed',
    bg:      'rgba(124,58,237,0.08)',
    border:  'rgba(124,58,237,0.22)',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed"
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
        <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
      </svg>
    ),
  },
};

function fmtTempo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)  return 'Adesso';
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h fa`;
  return new Date(isoString).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
}

export function useNotifiche() {
  const [notifiche,    setNotifiche]    = useState([]);
  const [nonLette,     setNonLette]     = useState(0);
  const [nuovaToast,   setNuovaToast]   = useState(null);

  useEffect(() => {
    // Carica notifiche esistenti non lette
    supabase
      .from('notifiche')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        const lista = data || [];
        setNotifiche(lista);
        setNonLette(lista.filter(n => !n.letto).length);
      });

    // Sottoscrivi a nuove notifiche in tempo reale
    const channel = supabase
      .channel('notifiche-realtime')
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifiche',
      }, (payload) => {
        const nuova = payload.new;
        setNotifiche(prev => [nuova, ...prev]);
        setNonLette(prev => prev + 1);
        setNuovaToast(nuova);
        // Toast scompare dopo 5 secondi
        setTimeout(() => setNuovaToast(null), 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const marcaLette = async (ids) => {
    const idDaMarcare = ids ?? notifiche.filter(n => !n.letto).map(n => n.id);
    if (idDaMarcare.length === 0) return;
    await supabase.from('notifiche').update({ letto: true }).in('id', idDaMarcare);
    setNotifiche(prev => prev.map(n => idDaMarcare.includes(n.id) ? { ...n, letto: true } : n));
    setNonLette(prev => Math.max(0, prev - idDaMarcare.length));
  };

  return { notifiche, nonLette, nuovaToast, marcaLette };
}

// ── Toast in-app per notifica istantanea ─────────────────────
export function NotificaToast({ notifica, onClose }) {
  const meta = TIPO_META[notifica.tipo] || TIPO_META.spostamento_richiesto;

  return (
    <AnimatePresence>
      {notifica && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 30 }}
          style={{
            position: 'fixed', bottom: 90, right: 20, zIndex: 600,
            maxWidth: 340, width: 'calc(100vw - 40px)',
            background: 'var(--card-bg)',
            border: `1px solid ${meta.border}`,
            borderRadius: 18, padding: '14px 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}
        >
          <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
            background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {meta.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: meta.colore }}>
              {meta.label}
            </p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {notifica.messaggio}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Pannello notifiche completo ───────────────────────────────
export function NotifichePanel({ notifiche, nonLette, onMarcaLette, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 400,
        width: 'min(380px, calc(100vw - 40px))',
        background: 'var(--card-bg)',
        borderLeft: '1px solid var(--card-border)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid var(--card-border-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Notifiche WhatsApp
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
            Risposte automatiche dei clienti
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {nonLette > 0 && (
            <button onClick={() => onMarcaLette()} style={{
              background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
              borderRadius: 10, padding: '5px 12px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
            }}>
              Segna lette
            </button>
          )}
          <button onClick={onClose} style={{ background: 'var(--card-bg-sm)',
            border: '1px solid var(--card-border-sm)', borderRadius: 10,
            width: 32, height: 32, cursor: 'pointer', fontSize: 16,
            color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ×
          </button>
        </div>
      </div>

      {/* Lista */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
        {notifiche.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ marginBottom: 12, opacity: 0.3, display: 'flex', justifyContent: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 01-3.46 0"/>
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Nessuna notifica
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              Quando un cliente risponde al reminder WhatsApp, la notifica apparirà qui in tempo reale.
            </p>
          </div>
        ) : (
          notifiche.map((n, i) => {
            const meta = TIPO_META[n.tipo] || TIPO_META.spostamento_richiesto;
            return (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => {
                  if (!n.letto) onMarcaLette([n.id]);
                  if (n.appuntamento_id) onNavigate?.('calendario');
                  onClose();
                }}
                style={{
                  margin: '4px 12px',
                  padding: '13px 14px',
                  borderRadius: 14,
                  cursor: 'pointer',
                  background: n.letto ? 'transparent' : meta.bg,
                  border: `1px solid ${n.letto ? 'var(--card-border-sm)' : meta.border}`,
                  opacity: n.letto ? 0.65 : 1,
                  transition: 'all 0.15s',
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}
              >
                <div style={{ width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: n.letto ? 'var(--card-bg-sm)' : meta.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {meta.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.colore }}>
                      {meta.label}
                    </span>
                    {!n.letto && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%',
                        background: meta.colore, flexShrink: 0 }} />
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)',
                    lineHeight: 1.5, fontWeight: n.letto ? 400 : 500 }}>
                    {n.messaggio}
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                    {fmtTempo(n.created_at)}
                    {n.appuntamento_id && (
                      <span style={{ marginLeft: 8, color: 'var(--text-accent)' }}>
                        → Vai al calendario
                      </span>
                    )}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ── Campanella (usata nella sidebar) ─────────────────────────
export function CampanellaNotifiche({ nonLette, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.92 }}
      style={{
        position: 'relative',
        background: 'none', border: 'none', cursor: 'pointer',
        width: 36, height: 36, borderRadius: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: nonLette > 0 ? '#d97706' : 'var(--text-muted)',
        transition: 'color 0.2s',
      }}
      title="Notifiche WhatsApp"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      <AnimatePresence>
        {nonLette > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            style={{
              position: 'absolute', top: 2, right: 2,
              minWidth: 16, height: 16, borderRadius: 99,
              background: '#dc2626', color: '#fff',
              fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1,
            }}
          >
            {nonLette > 9 ? '9+' : nonLette}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}