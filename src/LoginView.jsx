/**
 * LoginView.jsx
 * Pagina di login con autenticazione Supabase (email + password)
 * Include: login, mostra/nascondi password, reset password via email
 * Background: bosco animato — foglie nel vento, polline, api
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// ── Dati statici per il background ───────────────────────────

const LEAVES = [
  { id:0,  y:8,  dur:22, del:-4,  size:24, type:0, yOff:-35, rot:40  },
  { id:1,  y:18, dur:28, del:-11, size:17, type:1, yOff:20,  rot:130 },
  { id:2,  y:30, dur:19, del:-2,  size:29, type:2, yOff:-50, rot:220 },
  { id:3,  y:42, dur:25, del:-17, size:14, type:0, yOff:30,  rot:75  },
  { id:4,  y:55, dur:21, del:-8,  size:22, type:1, yOff:-25, rot:310 },
  { id:5,  y:68, dur:30, del:-14, size:18, type:2, yOff:40,  rot:160 },
  { id:6,  y:80, dur:17, del:-5,  size:26, type:0, yOff:-15, rot:250 },
  { id:7,  y:90, dur:24, del:-20, size:13, type:1, yOff:25,  rot:45  },
  { id:8,  y:12, dur:26, del:-9,  size:20, type:2, yOff:-40, rot:185 },
  { id:9,  y:25, dur:18, del:-13, size:16, type:0, yOff:35,  rot:290 },
  { id:10, y:60, dur:23, del:-1,  size:28, type:1, yOff:-20, rot:100 },
  { id:11, y:75, dur:20, del:-16, size:15, type:2, yOff:10,  rot:350 },
  { id:12, y:48, dur:29, del:-7,  size:21, type:0, yOff:-30, rot:200 },
  { id:13, y:35, dur:16, del:-22, size:11, type:1, yOff:45,  rot:65  },
  { id:14, y:5,  dur:20, del:-18, size:19, type:2, yOff:-18, rot:170 },
  { id:15, y:95, dur:27, del:-3,  size:23, type:0, yOff:22,  rot:280 },
];

const POLLENS = [
  { id:0,  x:5,  y:85, dur:14, del:-2,  size:3, sway:15   },
  { id:1,  x:12, y:70, dur:18, del:-7,  size:2, sway:-20  },
  { id:2,  x:20, y:90, dur:12, del:-3,  size:4, sway:10   },
  { id:3,  x:28, y:75, dur:16, del:-11, size:2, sway:25   },
  { id:4,  x:35, y:82, dur:20, del:-5,  size:3, sway:-12  },
  { id:5,  x:42, y:65, dur:15, del:-14, size:2, sway:18   },
  { id:6,  x:50, y:88, dur:13, del:-1,  size:4, sway:-8   },
  { id:7,  x:58, y:72, dur:17, del:-9,  size:2, sway:22   },
  { id:8,  x:65, y:80, dur:19, del:-4,  size:3, sway:-15  },
  { id:9,  x:72, y:68, dur:11, del:-12, size:2, sway:5    },
  { id:10, x:80, y:85, dur:14, del:-6,  size:4, sway:-20  },
  { id:11, x:88, y:78, dur:16, del:-8,  size:2, sway:12   },
  { id:12, x:93, y:90, dur:22, del:-10, size:3, sway:-18  },
  { id:13, x:8,  y:60, dur:18, del:-15, size:2, sway:8    },
  { id:14, x:55, y:55, dur:13, del:-3,  size:3, sway:-25  },
  { id:15, x:38, y:92, dur:15, del:-13, size:2, sway:16   },
  { id:16, x:76, y:62, dur:20, del:0,   size:4, sway:-10  },
  { id:17, x:15, y:95, dur:12, del:-16, size:2, sway:20   },
  { id:18, x:62, y:88, dur:17, del:-7,  size:3, sway:-6   },
  { id:19, x:45, y:76, dur:14, del:-18, size:2, sway:14   },
  { id:20, x:32, y:58, dur:21, del:-4,  size:3, sway:-22  },
  { id:21, x:68, y:94, dur:16, del:-10, size:2, sway:17   },
];

const BEES = [
  { id:0, x:12, y:22, dur:13, del:-3  },
  { id:1, x:68, y:14, dur:16, del:-8  },
  { id:2, x:38, y:38, dur:11, del:-5  },
  { id:3, x:82, y:42, dur:14, del:-1  },
  { id:4, x:22, y:58, dur:12, del:-10 },
];

const LEAF_PATHS = [
  'M0,-15 C5,-10 9,-2 7,6 C5,13 1,16 0,16 C-1,13 -4,7 -3,0 C-2,-7 0,-15 0,-15Z',
  'M0,-13 C8,-7 11,2 8,9 C5,15 -1,16 -4,12 C-9,7 -8,-3 -4,-10 C-1,-14 0,-13 0,-13Z',
  'M0,15 C-7,8 -13,0 -11,-7 C-9,-14 -3,-15 0,-11 C3,-15 9,-14 11,-7 C13,0 7,8 0,15Z',
];

const LEAF_COLORS_LIGHT = ['#5a9228','#7aba3a','#c8a020','#4a7818','#a8c050'];
const LEAF_COLORS_DARK  = ['#2a7030','#1a5a28','#3a8838','#2a6040','#4a9848'];

// ── Componente sfondo bosco ───────────────────────────────────
function ForestBackground() {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      <style>{`
        /* ── Sfondo bosco light ── */
        .nb-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 110% 55% at 50% -8%, rgba(245,215,55,0.38) 0%, transparent 52%),
            radial-gradient(ellipse 55% 85% at 2% 55%,  rgba(45,105,15,0.55) 0%, transparent 48%),
            radial-gradient(ellipse 55% 85% at 98% 55%, rgba(35,95,12,0.45) 0%, transparent 48%),
            radial-gradient(ellipse 120% 55% at 50% 108%, rgba(12,45,4,0.95) 0%, transparent 52%),
            linear-gradient(168deg, #b2d475 0%, #78a83c 22%, #38781a 50%, #183f08 78%, #0c2604 100%);
        }
        .nb-rays {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            163deg,
            transparent 0%, transparent 3.2%,
            rgba(255,245,110,0.045) 3.6%, transparent 4%,
            transparent 7.5%, rgba(255,245,110,0.03) 7.9%, transparent 8.3%
          );
        }
        /* ── Sfondo bosco dark ── */
        @media (prefers-color-scheme: dark) {
          .nb-bg {
            background:
              radial-gradient(ellipse 80% 45% at 50% -5%, rgba(30,110,30,0.10) 0%, transparent 48%),
              radial-gradient(ellipse 55% 80% at 2% 55%,  rgba(8,40,12,0.85) 0%, transparent 48%),
              radial-gradient(ellipse 55% 80% at 98% 55%, rgba(6,32,10,0.75) 0%, transparent 48%),
              linear-gradient(168deg, #040e03 0%, #060f05 35%, #040b04 65%, #020704 100%);
          }
          .nb-rays {
            background: repeating-linear-gradient(
              163deg,
              transparent 0%, transparent 4.5%,
              rgba(60,160,50,0.018) 5%, transparent 5.5%,
              transparent 10%, rgba(60,160,50,0.012) 10.5%, transparent 11%
            );
          }
        }

        /* ── Foglie ── */
        @keyframes nb-leaf-move {
          0%   { left: -60px; opacity: 0; }
          6%   { opacity: 0.82; }
          94%  { opacity: 0.65; }
          100% { left: calc(100vw + 60px); opacity: 0; }
        }
        @keyframes nb-leaf-tumble {
          0%   { transform: translateY(0px) rotate(0deg); }
          22%  { transform: translateY(var(--yo)) rotate(var(--rm)); }
          50%  { transform: translateY(calc(var(--yo) * -0.6)) rotate(calc(var(--rm) * 1.8)); }
          78%  { transform: translateY(calc(var(--yo) * 0.4)) rotate(calc(var(--rm) * 2.6)); }
          100% { transform: translateY(0px) rotate(calc(var(--rm) * 3.2)); }
        }

        /* ── Polline ── */
        @keyframes nb-pollen {
          0%   { transform: translate(0, 0);                 opacity: 0;    }
          12%  { opacity: 0.75; }
          88%  { opacity: 0.3;  }
          100% { transform: translate(var(--px), -78vh);     opacity: 0;    }
        }

        /* ── Api ── */
        @keyframes nb-bee {
          0%,100% { transform: translate(0,0)     rotate(-4deg); }
          18%     { transform: translate(32px,-35px) rotate(7deg); }
          38%     { transform: translate(58px,-6px)  rotate(-4deg); }
          58%     { transform: translate(48px,26px)  rotate(5deg); }
          78%     { transform: translate(14px,16px)  rotate(-6deg); }
        }
        @keyframes nb-wing {
          0%,100% { transform: scaleY(1);    opacity: 0.42; }
          50%     { transform: scaleY(0.1);  opacity: 0.12; }
        }
      `}</style>

      {/* Sfondo + raggi */}
      <div className="nb-bg" />
      <div className="nb-rays" />

      {/* Foglie */}
      {LEAVES.map(l => (
        <div key={l.id} style={{
          position: 'absolute',
          top: `${l.y}%`,
          left: '-60px',
          width: l.size,
          height: l.size,
          animation: `nb-leaf-move ${l.dur}s ${l.del}s infinite linear`,
          pointerEvents: 'none',
          willChange: 'left',
        }}>
          <div style={{
            width: '100%', height: '100%',
            animation: `nb-leaf-tumble ${(l.dur * 0.35).toFixed(1)}s ease-in-out infinite`,
            '--yo': `${l.yOff}px`,
            '--rm': `${l.rot}deg`,
          }}>
            <svg viewBox="-17 -17 34 34" width={l.size} height={l.size}>
              <path d={LEAF_PATHS[l.type]}
                style={{ fill: LEAF_COLORS_LIGHT[l.id % 5] }}
                className="nb-leaf-fill"
                opacity="0.8" />
              <line x1="0" y1="-12" x2="0" y2="12"
                stroke={LEAF_COLORS_LIGHT[l.id % 5]} strokeWidth="0.7"
                opacity="0.35" strokeLinecap="round" />
              <style>{`
                @media (prefers-color-scheme: dark) {
                  .nb-leaf-fill { fill: ${LEAF_COLORS_DARK[l.id % 5]} !important; }
                }
              `}</style>
            </svg>
          </div>
        </div>
      ))}

      {/* Polline */}
      {POLLENS.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: `${p.y}%`,
          width: p.size,
          height: p.size,
          borderRadius: '50%',
          background: 'rgba(215,185,18,0.72)',
          boxShadow: '0 0 4px rgba(230,200,20,0.5)',
          animation: `nb-pollen ${p.dur}s ${p.del}s infinite ease-out`,
          '--px': `${p.sway}px`,
          pointerEvents: 'none',
          willChange: 'transform, opacity',
        }} />
      ))}

      {/* Api */}
      {BEES.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: `${b.x}%`,
          top: `${b.y}%`,
          animation: `nb-bee ${b.dur}s ${b.del}s ease-in-out infinite`,
          pointerEvents: 'none',
          willChange: 'transform',
        }}>
          <svg viewBox="-16 -14 32 28" width="28" height="28">
            {/* Ali superiori */}
            <ellipse cx="-5.5" cy="-7.5" rx="6.5" ry="3.5"
              fill="rgba(210,235,255,0.38)"
              style={{ transformOrigin: '0 0', animation: 'nb-wing 0.16s linear infinite' }} />
            <ellipse cx="5.5" cy="-7.5" rx="6.5" ry="3.5"
              fill="rgba(210,235,255,0.38)"
              style={{ transformOrigin: '0 0', animation: 'nb-wing 0.16s -0.08s linear infinite' }} />
            {/* Ali inferiori */}
            <ellipse cx="-4" cy="-2.5" rx="4.5" ry="2.5"
              fill="rgba(210,235,255,0.22)"
              style={{ transformOrigin: '0 0', animation: 'nb-wing 0.16s -0.04s linear infinite' }} />
            <ellipse cx="4" cy="-2.5" rx="4.5" ry="2.5"
              fill="rgba(210,235,255,0.22)"
              style={{ transformOrigin: '0 0', animation: 'nb-wing 0.16s -0.12s linear infinite' }} />
            {/* Corpo */}
            <ellipse cx="0" cy="3" rx="6.8" ry="4.5" fill="#c87e10" />
            {/* Strisce nere */}
            <path d="M-6.5,1 Q0,-0.5 6.5,1 Q6.5,3.5 0,4.2 Q-6.5,3.5 -6.5,1Z" fill="#241402" opacity="0.88"/>
            <path d="M-5.8,4.5 Q0,3.2 5.8,4.5 Q5.2,6.8 0,7.2 Q-5.2,6.8 -5.8,4.5Z" fill="#241402" opacity="0.88"/>
            {/* Testa */}
            <circle cx="0" cy="-3" r="3.8" fill="#c87e10" />
            {/* Occhi */}
            <circle cx="-1.4" cy="-3.8" r="0.85" fill="#1a1004" />
            <circle cx="1.4" cy="-3.8" r="0.85" fill="#1a1004" />
            {/* Antenne */}
            <line x1="-1" y1="-6.5" x2="-5.5" y2="-11.5" stroke="#3a2808" strokeWidth="0.75" strokeLinecap="round"/>
            <line x1="1" y1="-6.5" x2="5.5" y2="-11.5" stroke="#3a2808" strokeWidth="0.75" strokeLinecap="round"/>
            <circle cx="-5.5" cy="-11.5" r="0.9" fill="#3a2808"/>
            <circle cx="5.5" cy="-11.5" r="0.9" fill="#3a2808"/>
            {/* Pungiglione */}
            <path d="M-1.2,7.5 Q0,10.5 1.2,7.5" fill="#241402" opacity="0.8"/>
          </svg>
        </div>
      ))}
    </div>
  );
}


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
      <ForestBackground />
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
          background: rgba(255,255,255,0.60);
          border: 1px solid rgba(255,255,255,0.88);
          border-radius: 28px;
          padding: 40px 32px 36px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset, 0 20px 60px rgba(10,40,5,0.35);
          backdrop-filter: blur(48px) saturate(2);
          -webkit-backdrop-filter: blur(48px) saturate(2);
        }
        @supports not (backdrop-filter: blur(1px)) {
          .login-card { background: rgba(230,245,215,0.97); }
        }
        @media (prefers-color-scheme: dark) {
          .login-card {
            background: rgba(8,22,8,0.62);
            border: 1px solid rgba(80,160,60,0.20);
            box-shadow: 0 1px 0 rgba(100,200,80,0.10) inset, 0 20px 60px rgba(0,0,0,0.55);
          }
          @supports not (backdrop-filter: blur(1px)) {
            .login-card { background: rgba(8,22,8,0.97); }
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