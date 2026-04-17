/**
 * ProfiloView.jsx
 * Gestione profilo utente: info account, cambio password, logout
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// ── Helpers ──────────────────────────────────────────────────
function iniziali(email) {
  if (!email) return '?';
  const parte = email.split('@')[0];
  const segmenti = parte.split(/[._-]/);
  if (segmenti.length >= 2) return (segmenti[0][0] + segmenti[1][0]).toUpperCase();
  return parte.slice(0, 2).toUpperCase();
}

function formatData(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleDateString('it-IT', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Sottocomponente: campo input ──────────────────────────────
function Campo({ label, id, type = 'text', value, onChange, disabled, placeholder, autoComplete }) {
  const [show, setShow] = useState(false);
  const isPwd = type === 'password';
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
        letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 7 }} htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={isPwd && show ? 'text' : type}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete={autoComplete}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'var(--input-bg)', border: '1px solid var(--input-border)',
            borderRadius: 14, padding: isPwd ? '13px 46px 13px 16px' : '13px 16px',
            fontSize: 15, fontFamily: 'inherit', color: 'var(--text-primary)', outline: 'none',
            opacity: disabled ? 0.55 : 1,
          }}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
            aria-label={show ? 'Nascondi' : 'Mostra'}>
            {show ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Toast di conferma/errore ──────────────────────────────────
function Toast({ msg, tipo, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const isOk = tipo === 'ok';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      style={{
        position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
        zIndex: 999, display: 'flex', alignItems: 'center', gap: 10,
        background: isOk ? 'rgba(5,150,105,0.12)' : 'rgba(239,68,68,0.10)',
        border: `1px solid ${isOk ? 'rgba(5,150,105,0.3)' : 'rgba(239,68,68,0.28)'}`,
        borderRadius: 16, padding: '12px 18px',
        fontSize: 14, fontWeight: 600,
        color: isOk ? '#059669' : '#dc2626',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      }}
    >
      {isOk ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      )}
      {msg}
    </motion.div>
  );
}

// ── Sezione card ──────────────────────────────────────────────
function Sezione({ titolo, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: 'var(--card-bg)', border: '1px solid var(--card-border)',
        borderRadius: 24, padding: '24px 24px 20px',
        boxShadow: 'var(--card-shadow)', marginBottom: 16,
      }}
    >
      <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px',
        textTransform: 'uppercase', margin: '0 0 20px' }}>{titolo}</p>
      {children}
    </motion.div>
  );
}

// ── View principale ───────────────────────────────────────────
export default function ProfiloView() {
  const [user, setUser]           = useState(null);
  const [toast, setToast]         = useState(null); // { msg, tipo }

  // Cambio password
  const [pwdCorrente, setPwdCorrente]   = useState('');
  const [pwdNuova, setPwdNuova]         = useState('');
  const [pwdConferma, setPwdConferma]   = useState('');
  const [pwdLoading, setPwdLoading]     = useState(false);
  const [pwdError, setPwdError]         = useState('');

  // Cambio email
  const [emailNuova, setEmailNuova]     = useState('');
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const showToast = (msg, tipo = 'ok') => setToast({ msg, tipo });

  // ── Validazione password ──
  const pwdForza = (p) => {
    if (!p) return null;
    if (p.length < 8) return { livello: 0, label: 'Troppo corta', colore: '#ef4444' };
    if (p.length < 12 && !/[0-9]/.test(p)) return { livello: 1, label: 'Debole', colore: '#f97316' };
    if (p.length >= 12 && /[0-9]/.test(p) && /[^a-zA-Z0-9]/.test(p)) return { livello: 3, label: 'Forte', colore: '#059669' };
    return { livello: 2, label: 'Discreta', colore: '#2563eb' };
  };
  const forza = pwdForza(pwdNuova);

  // ── Cambia password ──
  const handleCambioPassword = async (e) => {
    e.preventDefault();
    setPwdError('');

    if (pwdNuova.length < 8) { setPwdError('La password deve essere almeno 8 caratteri.'); return; }
    if (pwdNuova !== pwdConferma) { setPwdError('Le password non coincidono.'); return; }
    if (pwdNuova === pwdCorrente) { setPwdError('La nuova password deve essere diversa da quella attuale.'); return; }

    setPwdLoading(true);

    // Prima verifica la password corrente ri-autenticando
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: pwdCorrente,
    });

    if (signInErr) {
      setPwdError('La password attuale non è corretta.');
      setPwdLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: pwdNuova });

    if (error) {
      setPwdError('Errore durante il salvataggio. Riprova.');
    } else {
      showToast('Password aggiornata con successo!');
      setPwdCorrente(''); setPwdNuova(''); setPwdConferma('');
    }
    setPwdLoading(false);
  };

  // ── Cambia email ──
  const handleCambioEmail = async (e) => {
    e.preventDefault();
    if (!emailNuova || emailNuova === user?.email) return;
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: emailNuova });
    if (error) {
      showToast('Errore aggiornamento email.', 'err');
    } else {
      showToast('Controlla la nuova email per confermare il cambio.');
      setEmailNuova('');
    }
    setEmailLoading(false);
  };

  if (!user) return null;

  const iniz = iniziali(user.email);
  const dataCreazione = formatData(user.created_at);
  const ultimoAccesso = formatData(user.last_sign_in_at);

  return (
    <>
      <AnimatePresence>
        {toast && <Toast key={toast.msg} msg={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      </AnimatePresence>

      <div style={{ width: '100%', paddingBottom: '2rem' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }} style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 500,
            textTransform: 'uppercase', letterSpacing: '0.6px' }}>Account</p>
          <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.6px' }}>
            Il tuo profilo
          </h1>
        </motion.div>

        {/* Avatar + info */}
        <Sezione titolo="Informazioni account">
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24 }}>
            {/* Avatar */}
            <div style={{
              width: 64, height: 64, borderRadius: 20, flexShrink: 0,
              background: 'linear-gradient(145deg, #5aabff, #2060dd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 800, color: '#fff',
              boxShadow: '0 6px 20px rgba(60,120,220,0.35)',
            }}>
              {iniz}
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {user.email}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>
                Account creato il {dataCreazione}
              </p>
            </div>
          </div>

          {/* Dettagli */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Ultimo accesso', valore: ultimoAccesso },
              { label: 'Provider', valore: user.app_metadata?.provider === 'email' ? 'Email / Password' : user.app_metadata?.provider || '—' },
            ].map(({ label, valore }) => (
              <div key={label} style={{ background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
                borderRadius: 14, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 3px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>{valore}</p>
              </div>
            ))}
          </div>
        </Sezione>

        {/* Cambio email */}
        <Sezione titolo="Cambia email">
          <form onSubmit={handleCambioEmail}>
            <Campo label="Email attuale" id="email-attuale" type="email"
              value={user.email} onChange={() => {}} disabled placeholder="" />
            <Campo label="Nuova email" id="email-nuova" type="email"
              value={emailNuova} onChange={e => setEmailNuova(e.target.value)}
              disabled={emailLoading} placeholder="nuova@email.com" autoComplete="email" />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '-8px 0 16px', lineHeight: 1.5 }}>
              Riceverai un'email di conferma al nuovo indirizzo. Il cambio diventa attivo solo dopo la conferma.
            </p>
            <motion.button type="submit"
              disabled={emailLoading || !emailNuova || emailNuova === user.email}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(145deg, #4a8fff, #1d5fd4)', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                opacity: (emailLoading || !emailNuova || emailNuova === user.email) ? 0.55 : 1,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
              }}>
              {emailLoading ? 'Invio conferma...' : 'Aggiorna email'}
            </motion.button>
          </form>
        </Sezione>

        {/* Cambio password */}
        <Sezione titolo="Cambia password">
          <form onSubmit={handleCambioPassword}>
            <Campo label="Password attuale" id="pwd-corrente" type="password"
              value={pwdCorrente} onChange={e => { setPwdCorrente(e.target.value); setPwdError(''); }}
              disabled={pwdLoading} placeholder="••••••••" autoComplete="current-password" />

            <Campo label="Nuova password" id="pwd-nuova" type="password"
              value={pwdNuova} onChange={e => { setPwdNuova(e.target.value); setPwdError(''); }}
              disabled={pwdLoading} placeholder="Min. 8 caratteri" autoComplete="new-password" />

            {/* Indicatore forza */}
            {pwdNuova && forza && (
              <div style={{ marginBottom: 16, marginTop: -8 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 99,
                      background: i <= forza.livello - 1 ? forza.colore : 'var(--card-border)',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: forza.colore }}>{forza.label}</p>
              </div>
            )}

            <Campo label="Conferma nuova password" id="pwd-conferma" type="password"
              value={pwdConferma} onChange={e => { setPwdConferma(e.target.value); setPwdError(''); }}
              disabled={pwdLoading} placeholder="Ripeti la nuova password" autoComplete="new-password" />

            {/* Errore */}
            <AnimatePresence>
              {pwdError && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
                    background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.22)',
                    borderRadius: 12, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {pwdError}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button type="submit"
              disabled={pwdLoading || !pwdCorrente || !pwdNuova || !pwdConferma}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '12px 22px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(145deg, #4a8fff, #1d5fd4)', color: '#fff',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                opacity: (pwdLoading || !pwdCorrente || !pwdNuova || !pwdConferma) ? 0.55 : 1,
                boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {pwdLoading && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                  style={{ animation: 'spin 0.8s linear infinite' }}>
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                  <path d="M21 12a9 9 0 00-9-9"/>
                </svg>
              )}
              {pwdLoading ? 'Salvataggio...' : 'Aggiorna password'}
            </motion.button>
          </form>
        </Sezione>

        {/* Zona pericolosa */}
        <Sezione titolo="Sessione">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px', lineHeight: 1.6 }}>
            Disconnetti questo dispositivo dall'account. Dovrai eseguire di nuovo il login.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => supabase.auth.signOut()}
            style={{
              padding: '12px 22px', borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.22)',
              color: '#dc2626', fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Esci dall'account
          </motion.button>
        </Sezione>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}