/**
 * LoginView.jsx
 * Pagina di login con autenticazione Supabase (email + password)
 * Include: login, mostra/nascondi password, reset password via email
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';


export default function LoginView() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [showPwd,      setShowPwd]      = useState(false);
  const [modalReset,   setModalReset]   = useState(false);
  const [resetEmail,   setResetEmail]   = useState('');
  const [resetSent,    setResetSent]    = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.trim(),
      password: password,
    });
    if (authError) {
      setError(
        authError.message.includes('Invalid login')
          ? 'Email o password non corretti.'
          : 'Errore di accesso. Riprova.'
      );
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin,
    });
    // Mostriamo sempre successo (non svela se l'email esiste nel sistema)
    setResetSent(true);
    setResetLoading(false);
  };

  const openReset = () => {
    setResetEmail(email); // pre-compila con l'email già digitata
    setResetSent(false);
    setModalReset(true);
  };

  return (
    <>
      <style>{`
        .login-wrap {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          z-index: 1;
        }
        .login-card {
          width: 100%;
          max-width: 380px;
          background: rgba(255,255,255,0.52);
          border: 1px solid rgba(255,255,255,0.82);
          border-radius: 28px;
          padding: 40px 32px 36px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.92) inset, 0 16px 56px rgba(60,100,200,0.18);
          backdrop-filter: blur(40px) saturate(1.8);
          -webkit-backdrop-filter: blur(40px) saturate(1.8);
        }
        @supports not (backdrop-filter: blur(1px)) {
          .login-card { background: rgba(220,232,255,0.97); }
        }
        @media (prefers-color-scheme: dark) {
          .login-card {
            background: rgba(18,38,85,0.65);
            border: 1px solid rgba(100,150,255,0.22);
            box-shadow: 0 1px 0 rgba(120,170,255,0.12) inset, 0 16px 56px rgba(0,0,0,0.45);
          }
          @supports not (backdrop-filter: blur(1px)) {
            .login-card { background: rgba(18,38,85,0.97); }
          }
        }
        .login-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-bottom: 7px;
        }
        .login-input {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 14px;
          padding: 13px 16px;
          font-size: 15px;
          font-family: inherit;
          color: var(--text-primary);
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: var(--placeholder); }
        .login-input:focus {
          border-color: rgba(37,99,235,0.5);
          box-shadow: 0 0 0 3px rgba(37,99,235,0.12);
        }
        .login-pwd-wrap { position: relative; }
        .login-pwd-wrap .login-input { padding-right: 46px; }
        .login-pwd-toggle {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: var(--text-muted); display: flex; align-items: center;
          justify-content: center; border-radius: 8px; transition: color 0.2s;
        }
        .login-pwd-toggle:hover { color: var(--text-primary); }
        .login-btn {
          width: 100%; padding: 14px; border-radius: 16px;
          background: linear-gradient(145deg, #4a8fff, #1d5fd4);
          border: none; color: #fff; font-size: 15px; font-weight: 700;
          font-family: inherit; cursor: pointer;
          box-shadow: 0 4px 16px rgba(37,99,235,0.35);
          transition: opacity 0.2s, transform 0.1s;
        }
        .login-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .login-error {
          background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
          border-radius: 12px; padding: 11px 14px; font-size: 13px;
          color: #dc2626; display: flex; align-items: center; gap: 8px;
        }
        @media (prefers-color-scheme: dark) { .login-error { color: #fca5a5; } }

        /* Modal overlay */
        .reset-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.35);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; padding: 24px;
        }
        .reset-card {
          width: 100%; max-width: 340px;
          background: rgba(255,255,255,0.75);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 24px; padding: 28px 24px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset, 0 20px 60px rgba(0,0,0,0.2);
          backdrop-filter: blur(40px) saturate(2);
          -webkit-backdrop-filter: blur(40px) saturate(2);
        }
        @media (prefers-color-scheme: dark) {
          .reset-card {
            background: rgba(18,38,85,0.8);
            border: 1px solid rgba(100,150,255,0.25);
          }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Modal reset password ── */}
      <AnimatePresence>
        {modalReset && (
          <motion.div className="reset-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={e => { if (e.target === e.currentTarget) setModalReset(false); }}>
            <motion.div className="reset-card"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}>

              {/* Icona */}
              <div style={{ width: 44, height: 44, borderRadius: 14, margin: '0 0 16px',
                background: 'linear-gradient(145deg, #5aabff, #2060dd)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(60,120,220,0.35)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              </div>

              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                Password dimenticata?
              </h2>

              {!resetSent ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
                    Inserisci la tua email. Ti mandiamo un link per impostare una nuova password.
                  </p>
                  <form onSubmit={handleReset}>
                    <label className="login-label" htmlFor="reset-email">Email</label>
                    <input id="reset-email" className="login-input" type="email"
                      placeholder="nome@esempio.com" autoComplete="email"
                      value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      disabled={resetLoading}
                      style={{ marginBottom: 16 }} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="button" onClick={() => setModalReset(false)}
                        style={{ flex: 1, padding: '11px', borderRadius: 12,
                          background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
                          color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600,
                          fontFamily: 'inherit', cursor: 'pointer' }}>
                        Annulla
                      </button>
                      <button type="submit" disabled={resetLoading || !resetEmail}
                        style={{ flex: 2, padding: '11px', borderRadius: 12,
                          background: 'linear-gradient(145deg, #4a8fff, #1d5fd4)',
                          border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                          fontFamily: 'inherit', cursor: 'pointer',
                          opacity: (resetLoading || !resetEmail) ? 0.6 : 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        {resetLoading && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                            style={{ animation: 'spin 0.8s linear infinite' }}>
                            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                            <path d="M21 12a9 9 0 00-9-9"/>
                          </svg>
                        )}
                        {resetLoading ? 'Invio...' : 'Invia link'}
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                /* Stato: email inviata */
                <div style={{ textAlign: 'center', padding: '8px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    Email inviata!
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 20px', lineHeight: 1.6 }}>
                    Controlla la casella di <strong style={{ color: 'var(--text-secondary)' }}>{resetEmail}</strong>.
                    Il link scade tra 1 ora.
                  </p>
                  <button onClick={() => setModalReset(false)}
                    style={{ padding: '11px 28px', borderRadius: 12,
                      background: 'linear-gradient(145deg, #4a8fff, #1d5fd4)',
                      border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                      fontFamily: 'inherit', cursor: 'pointer' }}>
                    Chiudi
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Form di login ── */}
      <div className="login-wrap">
        <motion.div className="login-card"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}>

          {/* Logo + titolo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img
              src="/assets/nemora-logo-login.svg"
              alt="Nemora"
              style={{ width: '100%', height: 'auto', margin: '0 auto', display: 'block' }}
            />
          </div>

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label className="login-label" htmlFor="login-email">Email</label>
              <input id="login-email" className="login-input" type="email"
                placeholder="nome@esempio.com" autoComplete="email" autoCapitalize="none"
                value={email} onChange={e => { setEmail(e.target.value); setError(''); }}
                disabled={loading} />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
                <label className="login-label" htmlFor="login-password" style={{ margin: 0 }}>Password</label>
                <button type="button" onClick={openReset}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 600, color: 'var(--text-accent)',
                    fontFamily: 'inherit', textDecoration: 'none' }}>
                  Password dimenticata?
                </button>
              </div>
              <div className="login-pwd-wrap">
                <input id="login-password" className="login-input"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••" autoComplete="current-password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  disabled={loading} />
                <button type="button" className="login-pwd-toggle"
                  onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                  aria-label={showPwd ? 'Nascondi password' : 'Mostra password'}>
                  {showPwd ? (
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
              </div>
            </div>

            <div style={{ marginBottom: 24 }} />

            {/* Errore */}
            {error && (
              <motion.div className="login-error"
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 20 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </motion.div>
            )}

            {/* Submit */}
            <motion.button type="submit" className="login-btn"
              disabled={loading || !email || !password}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                    style={{ animation: 'spin 0.8s linear infinite' }}>
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
                    <path d="M21 12a9 9 0 00-9-9"/>
                  </svg>
                  Accesso in corso...
                </span>
              ) : 'Accedi'}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </>
  );
}