/**
 * RichiamataAI.jsx
 * Componente standalone da importare in CalendarioView.
 *
 * Uso:
 *   import RichiamataAI from './RichiamataAI';
 *
 *   // Dentro CalendarioView, prima della chiusura del return:
 *   <RichiamataAI
 *     onAppuntamentoRilevato={(dati) => {
 *       setClickedDate(dati.data_ora ? new Date(dati.data_ora) : new Date());
 *       setSelectedAppt(dati._precompilato);   // vedi sotto
 *       setShowModal(true);
 *     }}
 *   />
 *
 * Il callback riceve un oggetto con i campi già nel formato
 * che ModalAppuntamento si aspetta (cliente_id, animali_ids, ecc.)
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Stili interni ─────────────────────────────────────────────
const glass = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 20,
  boxShadow: 'var(--card-shadow)',
};
const glassCard = {
  background: 'var(--card-bg-sm)',
  border: '1px solid var(--card-border-sm)',
  borderRadius: 14,
};
const secLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4,
};
const btnPrimary = {
  background: 'linear-gradient(145deg,#5aabff,#2060dd)', color: '#fff',
  border: 'none', borderRadius: 13, padding: '12px 18px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(50,100,220,0.35)',
};
const btnSecondary = {
  background: 'var(--input-bg)', color: 'var(--text-secondary)',
  border: '1px solid var(--card-border)', borderRadius: 13,
  padding: '12px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};

// ── Chip confidenza ───────────────────────────────────────────
const CONFIDENZA_STYLE = {
  alta:  { bg: 'rgba(5,150,105,0.12)',  border: 'rgba(5,150,105,0.3)',  color: '#059669', label: '✓ Alta confidenza' },
  media: { bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.3)',  color: '#d97706', label: '~ Confidenza media' },
  bassa: { bg: 'rgba(220,38,38,0.10)',  border: 'rgba(220,38,38,0.25)', color: '#dc2626', label: '⚠ Bassa confidenza' },
};

// ── Helper: formatta data_ora ─────────────────────────────────
function formattaDataOra(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return iso; }
}

// ─────────────────────────────────────────────────────────────
export default function RichiamataAI({ onAppuntamentoRilevato }) {
  const [open,         setOpen]         = useState(false);
  const [recState,     setRecState]     = useState('idle'); // idle | recording | elaborating | done | error
  const [trascrizione, setTrascrizione] = useState('');
  const [risultato,    setRisultato]    = useState(null);
  const [errore,       setErrore]       = useState('');

  const mediaRecRef = useRef(null);
  const chunksRef   = useRef([]);
  const audioBlobRef = useRef(null);

  // ── Avvia registrazione ───────────────────────────────────
  const avvia = async () => {
    setErrore('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        audioBlobRef.current = new Blob(chunksRef.current, { type: 'audio/webm' });
        elabora(audioBlobRef.current);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecState('recording');
      // Limite massimo 3 minuti
      setTimeout(() => { if (mediaRecRef.current?.state === 'recording') mediaRecRef.current.stop(); }, 180000);
    } catch (e) {
      setErrore('Microfono non disponibile: ' + e.message);
    }
  };

  const ferma = () => {
    if (mediaRecRef.current?.state === 'recording') {
      mediaRecRef.current.stop();
      setRecState('elaborating');
    }
  };

  // ── Invia all'API ─────────────────────────────────────────
  const elabora = async (blob) => {
    setRecState('elaborating');
    setTrascrizione('');
    setRisultato(null);

    try {
      const fd = new FormData();
      fd.append('audio', blob, 'chiamata.webm');

      const res = await fetch('/api/appuntamento-da-chiamata', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore API');

      setTrascrizione(data.trascrizione || '');
      setRisultato(data.appuntamento || null);
      setRecState('done');
    } catch (e) {
      setErrore('Errore elaborazione: ' + e.message);
      setRecState('error');
    }
  };

  // ── Conferma → passa i dati al CalendarioView ─────────────
  const conferma = () => {
    if (!risultato) return;
    // Costruiamo un oggetto "precompilato" compatibile con ModalAppuntamento
    const precompilato = {
      // Simuliamo la struttura che ModalAppuntamento legge
      cliente_id:  risultato.cliente_id,
      clienti:     risultato.cliente_id
        ? { id: risultato.cliente_id, nome: risultato.cliente_nome?.split(' ')[0] || '', cognome: risultato.cliente_nome?.split(' ').slice(1).join(' ') || '' }
        : null,
      animali:     risultato.animale_id
        ? { id: risultato.animale_id, nome: risultato.animale_nome, specie: risultato.animale_specie }
        : null,
      _animaliIds: risultato.animale_id ? [risultato.animale_id] : [],
      operatori:   risultato.operatore_id
        ? { id: risultato.operatore_id, nome: risultato.operatore_nome }
        : null,
      note:        risultato.note || '',
      _precompilato: true,
    };
    onAppuntamentoRilevato({
      data_ora:      risultato.data_ora,
      _precompilato: precompilato,
    });
    chiudi();
  };

  const chiudi = () => {
    setOpen(false);
    setRecState('idle');
    setTrascrizione('');
    setRisultato(null);
    setErrore('');
    audioBlobRef.current = null;
  };

  const conf = risultato ? (CONFIDENZA_STYLE[risultato.confidenza] || CONFIDENZA_STYLE.media) : null;

  return (
    <>
      {/* ── FAB telefono ──────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen(true)}
        title="Registra telefonata → crea appuntamento AI"
        style={{
          position: 'fixed', bottom: 90, right: 20, zIndex: 900,
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(145deg,#34d399,#059669)',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 18px rgba(5,150,105,0.45)',
          color: '#fff', fontSize: 22,
        }}>
        📞
      </motion.button>

      {/* ── Bottom sheet ──────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) chiudi(); }}>

            <motion.div
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32 }}
              style={{ ...glass, width: '100%', maxWidth: 520,
                borderRadius: '24px 24px 0 0',
                padding: '24px 20px 32px',
                maxHeight: '88vh', overflowY: 'auto',
                paddingBottom: 'calc(32px + env(safe-area-inset-bottom))' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 22 }}>📞</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
                      Registra telefonata
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                      L'AI creerà l'appuntamento automaticamente
                    </div>
                  </div>
                </div>
                <button onClick={chiudi} style={{ background: 'none', border: 'none',
                  fontSize: 20, cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>✕</button>
              </div>

              {/* ── IDLE ── */}
              {recState === 'idle' && (
                <button onClick={avvia} style={{ ...btnPrimary, width: '100%', padding: '16px',
                  background: 'linear-gradient(145deg,#34d399,#059669)',
                  boxShadow: '0 4px 16px rgba(5,150,105,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 15 }}>
                  <span style={{ fontSize: 22 }}>🎙️</span> Avvia registrazione
                </button>
              )}

              {/* ── RECORDING ── */}
              {recState === 'recording' && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, color: '#dc2626', fontWeight: 700,
                    marginBottom: 16, letterSpacing: 0.5 }}>
                    <span style={{ display: 'inline-block', animation: 'pulse 1s infinite' }}>●</span> REC in corso...
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>
                    Parla normalmente. L'AI capirà nomi, date e orari.
                  </div>
                  <button onClick={ferma} style={{ ...btnSecondary, width: '100%', padding: '14px',
                    border: '1px solid rgba(220,38,38,0.3)',
                    color: '#dc2626', fontSize: 15 }}>
                    ■ Stop e analizza
                  </button>
                </div>
              )}

              {/* ── ELABORATING ── */}
              {recState === 'elaborating' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 12,
                    display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>⟳</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Elaborazione in corso...
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Trascrizione → ricerca nel DB → estrazione appuntamento
                  </div>
                </div>
              )}

              {/* ── ERROR ── */}
              {recState === 'error' && (
                <div>
                  <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.25)',
                    borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                    {errore}
                  </div>
                  <button onClick={() => setRecState('idle')} style={{ ...btnSecondary, width: '100%' }}>
                    Riprova
                  </button>
                </div>
              )}

              {/* ── DONE ── */}
              {recState === 'done' && risultato && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Trascrizione */}
                  <div style={{ ...glassCard, padding: '12px 14px' }}>
                    <div style={secLabel}>🎙️ Trascrizione</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)',
                      lineHeight: 1.6, fontStyle: 'italic' }}>
                      "{trascrizione}"
                    </div>
                  </div>

                  {/* Chip confidenza */}
                  <div style={{ display: 'inline-flex', alignSelf: 'flex-start',
                    background: conf.bg, border: `1px solid ${conf.border}`,
                    borderRadius: 20, padding: '4px 12px',
                    fontSize: 12, fontWeight: 600, color: conf.color }}>
                    {conf.label}
                  </div>

                  {risultato.motivo_bassa_confidenza && (
                    <div style={{ fontSize: 12, color: '#d97706',
                      background: 'rgba(217,119,6,0.08)', borderRadius: 10,
                      padding: '8px 12px', lineHeight: 1.5 }}>
                      ⚠️ {risultato.motivo_bassa_confidenza}
                    </div>
                  )}

                  {/* Card dati appuntamento */}
                  <div style={{ ...glassCard, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
                      📋 Appuntamento rilevato
                    </div>

                    {[
                      { label: 'Cliente',   val: risultato.cliente_nome,    icon: '👤' },
                      { label: 'Animale',   val: risultato.animale_nome ? `${risultato.animale_nome}${risultato.animale_specie ? ` (${risultato.animale_specie})` : ''}` : null, icon: '🐾' },
                      { label: 'Data/ora',  val: formattaDataOra(risultato.data_ora), icon: '📅' },
                      { label: 'Operatore', val: risultato.operatore_nome,  icon: '✂️' },
                      { label: 'Servizio',  val: risultato.servizio_ipotizzato, icon: '🛁' },
                      { label: 'Note',      val: risultato.note,            icon: '📝' },
                    ].map(({ label, val, icon }) => val ? (
                      <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                        <div>
                          <div style={{ ...secLabel, marginBottom: 1 }}>{label}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                        </div>
                      </div>
                    ) : null)}

                    {/* Avviso se dati mancanti */}
                    {(!risultato.cliente_id || !risultato.data_ora) && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)',
                        borderTop: '1px solid var(--card-border)', paddingTop: 8, marginTop: 2 }}>
                        I campi mancanti potranno essere completati nel form.
                      </div>
                    )}
                  </div>

                  {/* Azioni */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={chiudi} style={{ ...btnSecondary, flex: 1, padding: '13px' }}>
                      Annulla
                    </button>
                    <button onClick={() => setRecState('idle')}
                      style={{ ...btnSecondary, flex: 1, padding: '13px', fontSize: 13 }}>
                      🔄 Riregistra
                    </button>
                    <button onClick={conferma}
                      style={{ ...btnPrimary, flex: 2, padding: '13px' }}>
                      Apri form →
                    </button>
                  </div>

                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes spin  { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}