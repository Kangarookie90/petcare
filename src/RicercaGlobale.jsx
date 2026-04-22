/**
 * RicercaGlobale.jsx
 * Overlay di ricerca cross-entità stile Spotlight
 * Cerca su: clienti, animali, appuntamenti
 * Aperto da App.jsx con shortcut Cmd/Ctrl+K o click sull'icona
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// ── Costanti ──────────────────────────────────────────────────
const DEBOUNCE_MS = 280;
const MIN_CHARS   = 2;

const specieEmoji = s =>
  s === 'gatto' ? '🐈' : s === 'coniglio' ? '🐇' : '🐕';

const statoColore = s => ({
  confermato:  '#2563eb',
  'in attesa': '#d97706',
  completato:  '#059669',
  cancellato:  '#dc2626',
}[s] || '#888');

function fmtData(iso) {
  return new Date(iso).toLocaleDateString('it-IT', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}
function fmtOra(iso) {
  return new Date(iso).toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ── Highlight testo corrispondente ───────────────────────────
function Highlight({ text, query }) {
  if (!text) return null;
  const str = String(text);
  if (!query) return <>{str}</>;
  const idx = str.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{str}</>;
  return (
    <>
      {str.slice(0, idx)}
      <mark style={{ background: 'rgba(37,99,235,0.2)', color: 'var(--text-primary)',
        borderRadius: 3, padding: '0 2px' }}>
        {str.slice(idx, idx + query.length)}
      </mark>
      {str.slice(idx + query.length)}
    </>
  );
}

// ── Card risultato: cliente ───────────────────────────────────
function CardCliente({ c, query, onNavigate, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => { onNavigate('clienti'); onClose(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 14, cursor: 'pointer',
        background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
        transition: 'all 0.15s',
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Avatar */}
      <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(145deg,#5aabff,#2060dd)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 14, fontWeight: 800, color: '#fff' }}>
        {(c.cognome?.[0] || c.nome?.[0] || '?').toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Highlight text={`${c.cognome || ''} ${c.nome || ''}`.trim()} query={query} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
          {c.telefono && (
            <span>📞 <Highlight text={c.telefono} query={query} /></span>
          )}
          {c.email && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              ✉️ <Highlight text={c.email} query={query} />
            </span>
          )}
          {!c.telefono && !c.email && c.indirizzo && (
            <span>📍 <Highlight text={c.indirizzo} query={query} /></span>
          )}
        </div>
      </div>

      <div style={{ flexShrink: 0 }}>
        {c.animali_count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600,
            background: 'rgba(37,99,235,0.1)', color: '#2563eb',
            borderRadius: 8, padding: '2px 8px' }}>
            {c.animali_count} pet
          </span>
        )}
      </div>

      {/* Freccia */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
        strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </motion.div>
  );
}

// ── Card risultato: animale ───────────────────────────────────
function CardAnimale({ a, query, onNavigate, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => { onNavigate('pet'); onClose(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 14, cursor: 'pointer',
        background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
        transition: 'all 0.15s',
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Emoji specie */}
      <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0,
        background: a.specie === 'gatto'
          ? 'rgba(124,58,237,0.12)' : a.specie === 'coniglio'
          ? 'rgba(5,150,105,0.12)' : 'rgba(37,99,235,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
        {specieEmoji(a.specie)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Highlight text={a.nome} query={query} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 6 }}>
            {a.specie}
            {a.razze?.nome ? ` · ${a.razze.nome}` : ''}
          </span>
        </div>
        {a.clienti && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
            👤 <Highlight
              text={`${a.clienti.cognome || ''} ${a.clienti.nome || ''}`.trim()}
              query={query}
            />
          </div>
        )}
      </div>

      {a.problemi_carattere && (
        <span title="Problemi carattere" style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
      )}

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
        strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </motion.div>
  );
}

// ── Card risultato: appuntamento ──────────────────────────────
function CardAppuntamento({ ap, query, onNavigate, onClose }) {
  const colore = statoColore(ap.stato);
  const isPast = new Date(ap.inizio) < new Date();

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => { onNavigate('calendario'); onClose(); }}
      style={{ display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 14px', borderRadius: 14, cursor: 'pointer',
        background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
        opacity: isPast ? 0.7 : 1, transition: 'all 0.15s',
      }}
      whileHover={{ scale: 1.01, y: -1 }}
      whileTap={{ scale: 0.99 }}
    >
      {/* Data */}
      <div style={{ width: 42, textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {fmtOra(ap.inizio)}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.2 }}>
          {fmtData(ap.inizio)}
        </div>
      </div>

      {/* Barra colore stato */}
      <div style={{ width: 3, height: 36, borderRadius: 99,
        background: colore, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ap.animali ? (
            <><Highlight text={ap.animali.nome} query={query} />
              <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}> · {ap.animali.specie}</span>
            </>
          ) : '—'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {ap.clienti && (
            <Highlight
              text={`${ap.clienti.cognome || ''} ${ap.clienti.nome || ''}`.trim()}
              query={query}
            />
          )}
          {ap.operatori && (
            <span style={{ marginLeft: 6, color: 'var(--text-muted)' }}>
              · {ap.operatori.nome}
            </span>
          )}
        </div>
      </div>

      <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0,
        background: colore + '18', color: colore,
        padding: '2px 8px', borderRadius: 20 }}>
        {ap.stato}
      </span>

      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)"
        strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </motion.div>
  );
}

// ── Sezione raggruppata ───────────────────────────────────────
function Sezione({ label, count, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ display:'flex', alignItems:'center' }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          letterSpacing: '0.6px', textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 600,
          background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
          borderRadius: 99, padding: '1px 7px', color: 'var(--text-secondary)' }}>
          {count}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {children}
      </div>
    </div>
  );
}

// ── Componente principale ─────────────────────────────────────
export default function RicercaGlobale({ onClose, onNavigate }) {
  const [query,       setQuery]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [risultati,   setRisultati]   = useState(null); // null = nessuna ricerca ancora
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // Focus automatico all'apertura
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);

  // Chiudi con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Ricerca con debounce
  const cerca = useCallback(async (q) => {
    if (q.length < MIN_CHARS) { setRisultati(null); setLoading(false); return; }

    setLoading(true);
    const likeEscaped = q.replace(/[%_\\]/g, '\\$&');
    const like = `%${likeEscaped}%`;

    const [clientiRes, animaliRes, appRes] = await Promise.all([
      // Clienti: cerca su nome, cognome, telefono, email
      supabase
        .from('clienti')
        .select('id, nome, cognome, telefono, email, indirizzo')
        .or(`cognome.ilike.${like},nome.ilike.${like},telefono.ilike.${like},email.ilike.${like}`)
        .limit(6),

      // Animali: cerca su nome + unisci con cliente
      supabase
        .from('animali')
        .select('id, nome, specie, colore, problemi_carattere, razze(nome), clienti!left(id, nome, cognome)')
        .ilike('nome', like)
        .limit(6),

      // Appuntamenti: i prossimi 30 giorni che matchano per cliente o animale
      supabase
        .from('appuntamenti')
        .select(`
          id, inizio, fine, stato,
          clienti(nome, cognome),
          animali(nome, specie),
          operatori(nome, colore)
        `)
        .or(`clienti.cognome.ilike.${like},clienti.nome.ilike.${like},animali.nome.ilike.${like}`)
        .gte('inizio', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('inizio')
        .limit(5),
    ]);

    // Arricchisci clienti con conteggio animali
    const clienti = (clientiRes.data || []);
    if (clienti.length > 0) {
      const ids = clienti.map(c => c.id);
      const { data: animaliCount } = await supabase
        .from('animali')
        .select('cliente_id')
        .in('cliente_id', ids);

      clienti.forEach(c => {
        c.animali_count = (animaliCount || []).filter(a => a.cliente_id === c.id).length;
      });
    }

    // Filtra appuntamenti: il join .or su tabella relazionata non è supportato
    // da tutte le versioni PostgREST, facciamo un filtro client-side come fallback
    const apFiltrati = (appRes.data || []).filter(ap => {
      const nomeCliente = `${ap.clienti?.cognome || ''} ${ap.clienti?.nome || ''}`.toLowerCase();
      const nomeAnimale = (ap.animali?.nome || '').toLowerCase();
      const ql = q.toLowerCase();
      return nomeCliente.includes(ql) || nomeAnimale.includes(ql);
    });

    setRisultati({
      clienti,
      animali:       animaliRes.data || [],
      appuntamenti:  apFiltrati,
    });
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timerRef.current);
    if (v.length < MIN_CHARS) { setRisultati(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => cerca(v), DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const totale = risultati
    ? risultati.clienti.length + risultati.animali.length + risultati.appuntamenti.length
    : 0;

  return (
    <>
      <style>{`
        .rg-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(8, 20, 60, 0.5);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 80px 20px 40px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
          touch-action: pan-y;
        }
        @media (max-width: 639px) {
          .rg-overlay { padding: 24px 12px 40px; align-items: flex-start; }
        }
        .rg-box {
          width: 100%;
          max-width: 620px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 28px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.92) inset, 0 32px 80px rgba(8,20,80,0.35);
          overflow: hidden;
        }
        @media (prefers-color-scheme: dark) {
          .rg-box {
            box-shadow: 0 1px 0 rgba(120,170,255,0.12) inset, 0 32px 80px rgba(0,0,0,0.6);
          }
        }
        @supports not (backdrop-filter: blur(1px)) {
          .rg-overlay { background: rgba(8, 20, 60, 0.88); }
        }
        .rg-input {
          width: 100%; background: transparent; border: none;
          font-size: 17px; font-family: inherit; font-weight: 500;
          color: var(--text-primary); outline: none; padding: 0;
        }
        .rg-input::placeholder { color: var(--placeholder); font-weight: 400; }
        .rg-results { padding: 4px 16px 16px; max-height: 68dvh; overflow-y: auto; }
        .rg-results::-webkit-scrollbar { width: 4px; }
        .rg-results::-webkit-scrollbar-thumb {
          background: var(--card-border); border-radius: 99px;
        }
      `}</style>

      {/* Overlay — click fuori per chiudere */}
      <div className="rg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div
          className="rg-box"
          initial={{ opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          {/* Barra di ricerca */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '18px 20px', borderBottom: '1px solid var(--card-border-sm)' }}>
            {loading ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="rgba(37,99,235,0.7)" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, animation: 'spin 0.8s linear infinite' }}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                style={{ flexShrink: 0 }}>
                <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--text-muted)" strokeWidth="2"/>
                <path d="M16 16.5L20.5 21" stroke="var(--text-muted)" strokeWidth="2.5"
                  strokeLinecap="round"/>
              </svg>
            )}

            <input
              ref={inputRef}
              className="rg-input"
              placeholder="Cerca clienti, animali, appuntamenti..."
              value={query}
              onChange={handleChange}
            />

            {query && (
              <button onClick={() => { setQuery(''); setRisultati(null); inputRef.current?.focus(); }}
                style={{ background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
                  borderRadius: 8, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>
                ✕
              </button>
            )}

            <kbd style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0,
              background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
              borderRadius: 6, padding: '2px 6px', fontFamily: 'inherit' }}>
              Esc
            </kbd>
          </div>

          {/* Risultati */}
          <div className="rg-results">

            {/* Stato: query corta */}
            {query.length > 0 && query.length < MIN_CHARS && (
              <div style={{ textAlign: 'center', padding: '28px 0',
                fontSize: 13, color: 'var(--text-muted)' }}>
                Scrivi almeno {MIN_CHARS} caratteri...
              </div>
            )}

            {/* Stato: nessun risultato */}
            {risultati && totale === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <div style={{ marginBottom: 12, display:'flex', justifyContent:'center' }}>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                    <circle cx="10.5" cy="10.5" r="7.5"/>
                    <path d="M17 17L21.5 21.5"/>
                    <path d="M8 10.5h5M10.5 8v5" strokeOpacity="0.6"/>
                  </svg>
                </div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Nessun risultato per "{query}"
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  Prova con nome, cognome, telefono o nome dell'animale
                </div>
              </div>
            )}

            {/* Stato: vuoto iniziale */}
            {!query && (
              <div style={{ textAlign: 'center', padding: '36px 0' }}>
                <div style={{ marginBottom: 14, display:'flex', justifyContent:'center' }}>
                  <svg width="44" height="44" viewBox="0 0 36 36" fill="none" opacity="0.35">
                    <ellipse cx="11" cy="8" rx="4.5" ry="5.5" fill="var(--text-muted)"/>
                    <ellipse cx="25" cy="8" rx="4.5" ry="5.5" fill="var(--text-muted)"/>
                    <ellipse cx="5" cy="19" rx="3.5" ry="4.5" fill="var(--text-muted)"/>
                    <ellipse cx="31" cy="19" rx="3.5" ry="4.5" fill="var(--text-muted)"/>
                    <path d="M18 14c-6.5 0-11 4-11 9.5 0 4 2.5 7 5.5 7.5 1.5.3 3-.5 5.5-.5s4 .8 5.5.5c3-.5 5.5-3.5 5.5-7.5 0-5.5-4.5-9.5-11-9.5z" fill="var(--text-muted)"/>
                  </svg>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Cerca tra clienti, animali e appuntamenti<br/>
                  <span style={{ fontSize: 12 }}>Puoi usare nome, cognome, telefono o email</span>
                </div>
              </div>
            )}

            {/* Risultati effettivi */}
            {risultati && totale > 0 && (
              <div style={{ paddingTop: 12 }}>

                {risultati.clienti.length > 0 && (
                  <Sezione label="Clienti" count={risultati.clienti.length} icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  }>
                    {risultati.clienti.map(c => (
                      <CardCliente key={c.id} c={c} query={query}
                        onNavigate={onNavigate} onClose={onClose} />
                    ))}
                  </Sezione>
                )}

                {risultati.animali.length > 0 && (
                  <Sezione label="Animali" count={risultati.animali.length} icon={
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><ellipse cx="6" cy="4" rx="2.5" ry="3" fill="#7c3aed"/><ellipse cx="14" cy="4" rx="2.5" ry="3" fill="#7c3aed"/><ellipse cx="2.5" cy="10.5" rx="2" ry="2.8" fill="#7c3aed" opacity="0.7"/><ellipse cx="17.5" cy="10.5" rx="2" ry="2.8" fill="#7c3aed" opacity="0.7"/><path d="M10 8c-4 0-6.5 2.5-6.5 6 0 2.5 1.5 4.2 3.2 4.5 1 .2 2-.3 3.3-.3s2.3.5 3.3.3c1.7-.3 3.2-2 3.2-4.5 0-3.5-2.5-6-6.5-6z" fill="#7c3aed"/></svg>
                  }>
                    {risultati.animali.map(a => (
                      <CardAnimale key={a.id} a={a} query={query}
                        onNavigate={onNavigate} onClose={onClose} />
                    ))}
                  </Sezione>
                )}

                {risultati.appuntamenti.length > 0 && (
                  <Sezione label="Appuntamenti" count={risultati.appuntamenti.length} icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/><circle cx="8" cy="16" r="1" fill="#059669"/><circle cx="12" cy="16" r="1" fill="#059669"/></svg>
                  }>
                    {risultati.appuntamenti.map(ap => (
                      <CardAppuntamento key={ap.id} ap={ap} query={query}
                        onNavigate={onNavigate} onClose={onClose} />
                    ))}
                  </Sezione>
                )}

                {/* Footer */}
                <div style={{ borderTop: '1px solid var(--card-border-sm)',
                  paddingTop: 10, marginTop: 4, display: 'flex',
                  alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {totale} risultat{totale === 1 ? 'o' : 'i'} per "{query}"
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Clicca per navigare alla sezione
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}