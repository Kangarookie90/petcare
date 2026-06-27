/**
 * RicercaGlobale.jsx
 * Overlay ricerca stile Spotlight — navigazione tastiera, azioni dirette,
 * ricerca su clienti + animali + appuntamenti (storico completo).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

const DEBOUNCE_MS = 220;
const MIN_CHARS   = 2;
const MAX_PER_CAT = 5;

const specieEmoji = s =>
  s === 'gatto' ? '🐈' : s === 'coniglio' ? '🐇' : '🐕';

const statoColore = s => ({
  confermato:  '#2563eb',
  'in attesa': '#d97706',
  completato:  '#059669',
  cancellato:  '#dc2626',
}[s] || '#888');

function fmtDataOra(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' })
    + ' ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ── Highlight match ───────────────────────────────────────────
function Hl({ text, query }) {
  if (!text || !query) return <>{text || ''}</>;
  const str = String(text);
  const idx = str.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{str}</>;
  return (
    <>
      {str.slice(0, idx)}
      <mark style={{ background: 'rgba(37,99,235,0.18)', color: 'inherit',
        borderRadius: 3, padding: '0 1px', fontWeight: 700 }}>
        {str.slice(idx, idx + query.length)}
      </mark>
      {str.slice(idx + query.length)}
    </>
  );
}

// ── Riga risultato generica ───────────────────────────────────
function Riga({ item, query, focused, onSelect }) {
  const ref = useRef(null);

  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focused]);

  return (
    <div
      ref={ref}
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 14px', borderRadius: 12, cursor: 'pointer',
        background: focused ? 'rgba(37,99,235,0.1)' : 'transparent',
        border: focused ? '1px solid rgba(37,99,235,0.2)' : '1px solid transparent',
        transition: 'background 0.12s, border 0.12s',
      }}
      onMouseEnter={e => { if (!focused) e.currentTarget.style.background = 'var(--card-bg-sm)'; }}
      onMouseLeave={e => { if (!focused) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Icona */}
      <div style={{
        width: 36, height: 36, borderRadius: 11, flexShrink: 0,
        background: item.iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: item.iconEmoji ? 18 : 13, fontWeight: 800,
        color: item.iconEmoji ? undefined : '#fff',
      }}>
        {item.iconEmoji || item.iconLetter}
      </div>

      {/* Testo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          <Hl text={item.titolo} query={query} />
          {item.tag && (
            <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 500,
              color: 'var(--text-muted)' }}>
              {item.tag}
            </span>
          )}
        </div>
        {item.sottotitolo && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <Hl text={item.sottotitolo} query={query} />
          </div>
        )}
      </div>

      {/* Badge stato (appuntamenti) */}
      {item.stato && (
        <span style={{
          fontSize: 10, fontWeight: 700, flexShrink: 0,
          background: statoColore(item.stato) + '1a',
          color: statoColore(item.stato),
          padding: '2px 8px', borderRadius: 20,
          border: `1px solid ${statoColore(item.stato)}30`,
        }}>
          {item.stato}
        </span>
      )}

      {/* Avviso carattere */}
      {item.warning && (
        <span title={item.warning} style={{ fontSize: 15, flexShrink: 0 }}>⚠️</span>
      )}

      {/* Freccia — appare solo se focused */}
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
        stroke={focused ? '#2563eb' : 'var(--text-muted)'}
        strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, opacity: focused ? 1 : 0.4 }}>
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </div>
  );
}

// ── Header sezione ────────────────────────────────────────────
function SezHeader({ label, icon, count }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7,
      padding: '10px 14px 4px',
      borderTop: '1px solid var(--card-border-sm)',
      marginTop: 4,
    }}>
      <span style={{ fontSize: 13 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        letterSpacing: '0.6px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 11, fontWeight: 600,
        background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
        borderRadius: 99, padding: '0px 6px', color: 'var(--text-secondary)', lineHeight: '18px' }}>
        {count}
      </span>
    </div>
  );
}

// ── Trasforma risultati in lista flat navigabile ──────────────
function buildItems(risultati) {
  if (!risultati) return [];
  const items = [];

  (risultati.clienti || []).forEach(c => items.push({
    _type: 'cliente', _id: c.id, _raw: c,
    titolo: `${c.cognome || ''} ${c.nome || ''}`.trim(),
    sottotitolo: [c.telefono, c.email].filter(Boolean).join(' · ') || c.indirizzo || null,
    tag: c.animali_count > 0 ? `${c.animali_count} pet` : null,
    iconBg: 'linear-gradient(145deg,#5aabff,#2060dd)',
    iconLetter: (c.cognome?.[0] || c.nome?.[0] || '?').toUpperCase(),
    _sez: 'clienti',
  }));

  (risultati.animali || []).forEach(a => items.push({
    _type: 'animale', _id: a.id, _raw: a,
    titolo: a.nome,
    tag: [a.specie, a.razze?.nome].filter(Boolean).join(' · '),
    sottotitolo: a.clienti
      ? `👤 ${a.clienti.cognome || ''} ${a.clienti.nome || ''}`.trim()
      : null,
    warning: a.problemi_carattere || null,
    iconBg: a.specie === 'gatto' ? 'rgba(124,58,237,0.12)'
          : a.specie === 'coniglio' ? 'rgba(5,150,105,0.12)'
          : 'rgba(37,99,235,0.12)',
    iconEmoji: specieEmoji(a.specie),
    _sez: 'animali',
  }));

  (risultati.appuntamenti || []).forEach(ap => items.push({
    _type: 'appuntamento', _id: ap.id, _raw: ap,
    titolo: ap.animali?.nome
      ? `${ap.animali.nome} · ${ap.animali.specie}`
      : '—',
    sottotitolo: [
      fmtDataOra(ap.inizio),
      ap.clienti ? `${ap.clienti.cognome || ''} ${ap.clienti.nome || ''}`.trim() : null,
      ap.operatori?.nome ? `· ${ap.operatori.nome}` : null,
    ].filter(Boolean).join('  '),
    stato: ap.stato,
    iconBg: statoColore(ap.stato) + '18',
    iconEmoji: '📅',
    _sez: 'appuntamenti',
  }));

  return items;
}

// ── Componente principale ─────────────────────────────────────
export default function RicercaGlobale({ onClose, onNavigate }) {
  const [query,      setQuery]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [risultati,  setRisultati]  = useState(null);
  const [focusIdx,   setFocusIdx]   = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const items = buildItems(risultati);
  const totale = items.length;

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  // Tastiera: Escape, frecce, Enter
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (!risultati || totale === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusIdx(i => Math.min(i + 1, totale - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusIdx(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        apriItem(items[focusIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [risultati, focusIdx, items, totale]);

  const apriItem = useCallback((item) => {
    if (!item) return;
    if (item._type === 'animale') {
      onNavigate('pet', { petId: item._id });
    } else if (item._type === 'cliente') {
      onNavigate('clienti', { clienteId: item._id });
    } else if (item._type === 'appuntamento') {
      onNavigate('calendario', {});
    }
    onClose();
  }, [onNavigate, onClose]);

  // Query → debounce → fetch
  const cerca = useCallback(async (q) => {
    if (q.length < MIN_CHARS) { setRisultati(null); setLoading(false); return; }
    setLoading(true);

    const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`;

    const [clientiRes, animaliRes, appRes] = await Promise.all([
      supabase
        .from('clienti')
        .select('id, nome, cognome, telefono, email, indirizzo')
        .or(`cognome.ilike.${like},nome.ilike.${like},telefono.ilike.${like},email.ilike.${like}`)
        .limit(MAX_PER_CAT),

      supabase
        .from('animali')
        .select('id, nome, specie, problemi_carattere, razze(nome), clienti!left(id, nome, cognome)')
        .ilike('nome', like)
        .limit(MAX_PER_CAT),

      // Appuntamenti: RPC server-side su storico completo
      supabase.rpc('search_appuntamenti', { q: q.trim() }),
    ]);

    // Arricchisci clienti con conteggio animali
    const clienti = clientiRes.data || [];
    if (clienti.length > 0) {
      const { data: cnt } = await supabase
        .from('animali').select('cliente_id').in('cliente_id', clienti.map(c => c.id));
      clienti.forEach(c => {
        c.animali_count = (cnt || []).filter(a => a.cliente_id === c.id).length;
      });
    }

    // Normalizza risultati RPC nel formato atteso da buildItems
    const apFiltrati = (appRes.data || []).map(ap => ({
      id:         ap.id,
      inizio:     ap.inizio,
      stato:      ap.stato,
      clienti:    { id: ap.cliente_id, nome: ap.cliente_nome, cognome: ap.cliente_cognome },
      animali:    { id: ap.animale_id, nome: ap.animale_nome, specie: ap.animale_specie },
      operatori:  { nome: ap.operatore_nome, colore: ap.operatore_colore },
    }));

    setRisultati({ clienti, animali: animaliRes.data || [], appuntamenti: apFiltrati });
    setFocusIdx(0);
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    setFocusIdx(0);
    clearTimeout(timerRef.current);
    if (v.length < MIN_CHARS) { setRisultati(null); setLoading(false); return; }
    setLoading(true);
    timerRef.current = setTimeout(() => cerca(v), DEBOUNCE_MS);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // Raggruppa items per sezione per disegnare gli header
  const sezioni = [];
  let last = null;
  items.forEach((item, i) => {
    if (item._sez !== last) {
      sezioni.push({ sez: item._sez, startIdx: i });
      last = item._sez;
    }
  });

  const sezMeta = {
    clienti:      { label: 'Clienti',      icon: '👤' },
    animali:      { label: 'Animali',       icon: '🐾' },
    appuntamenti: { label: 'Appuntamenti',  icon: '📅' },
  };

  return createPortal(
    <>
      <style>{`
        .rg-overlay {
          position: fixed; inset: 0; z-index: 500;
          background: rgba(8,20,60,0.48);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          display: flex; align-items: flex-start;
          justify-content: center;
          padding: 72px 20px 40px;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        @media (max-width: 639px) {
          .rg-overlay { padding: 20px 12px 40px; }
        }
        .rg-box {
          width: 100%; max-width: 600px;
          background: var(--card-bg);
          border: 1px solid var(--card-border);
          border-radius: 26px;
          box-shadow:
            0 2px 0 rgba(255,255,255,0.9) inset,
            0 32px 80px rgba(8,20,80,0.32);
          overflow: hidden;
        }
        .rg-input {
          width: 100%; background: transparent; border: none;
          font-size: 17px; font-family: inherit; font-weight: 500;
          color: var(--text-primary); outline: none; padding: 0;
          caret-color: #2563eb;
        }
        .rg-input::placeholder { color: var(--placeholder, #aaa); font-weight: 400; }
        .rg-body {
          max-height: 66dvh; overflow-y: auto;
          padding: 0 6px 10px;
        }
        .rg-body::-webkit-scrollbar { width: 4px; }
        .rg-body::-webkit-scrollbar-thumb {
          background: var(--card-border); border-radius: 99px;
        }
        @keyframes rg-spin { to { transform: rotate(360deg); } }
        @media (prefers-color-scheme: dark) {
          .rg-box {
            box-shadow:
              0 1px 0 rgba(120,170,255,0.1) inset,
              0 32px 80px rgba(0,0,0,0.55);
          }
        }
      `}</style>

      <div className="rg-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <motion.div
          className="rg-box"
          initial={{ opacity: 0, y: -18, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 440, damping: 34 }}
        >
          {/* ── Barra di ricerca ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12,
            padding: '16px 18px',
            borderBottom: risultati || query ? '1px solid var(--card-border-sm)' : 'none',
          }}>
            {loading ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
                stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, animation: 'rg-spin 0.75s linear infinite' }}>
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.2"/>
                <path d="M21 12a9 9 0 00-9-9"/>
              </svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="10.5" cy="10.5" r="6.5" stroke="var(--text-muted)" strokeWidth="2"/>
                <path d="M16 16.5L20.5 21" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            )}

            <input
              ref={inputRef}
              className="rg-input"
              placeholder="Cerca clienti, animali, appuntamenti…"
              value={query}
              onChange={handleChange}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {query && (
                <button onClick={() => { setQuery(''); setRisultati(null); inputRef.current?.focus(); }}
                  style={{ background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
                    borderRadius: 7, padding: '2px 8px', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, color: 'var(--text-muted)', lineHeight: '18px' }}>
                  ✕
                </button>
              )}
              <kbd style={{ fontSize: 11, color: 'var(--text-muted)',
                background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
                borderRadius: 6, padding: '2px 7px', fontFamily: 'inherit', lineHeight: '18px' }}>
                Esc
              </kbd>
            </div>
          </div>

          {/* ── Body ── */}
          <div className="rg-body">

            {/* Stato: query corta */}
            {query.length > 0 && query.length < MIN_CHARS && (
              <div style={{ textAlign: 'center', padding: '26px 0',
                fontSize: 13, color: 'var(--text-muted)' }}>
                Scrivi almeno {MIN_CHARS} caratteri…
              </div>
            )}

            {/* Stato: vuoto */}
            {!query && (
              <div style={{ textAlign: 'center', padding: '32px 0 28px' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.4 }}>🔍</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Cerca tra clienti, animali e appuntamenti<br/>
                  <span style={{ fontSize: 11 }}>Nome, cognome, telefono, email o animale</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 12,
                  marginTop: 16, fontSize: 11, color: 'var(--text-muted)' }}>
                  {[['↑↓', 'naviga'], ['↵', 'apri'], ['Esc', 'chiudi']].map(([k, l]) => (
                    <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <kbd style={{ background: 'var(--card-bg-sm)',
                        border: '1px solid var(--card-border-sm)',
                        borderRadius: 5, padding: '1px 6px', fontFamily: 'inherit',
                        fontSize: 11 }}>{k}</kbd>
                      {l}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stato: nessun risultato */}
            {risultati && totale === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0 24px' }}>
                <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.35 }}>🐾</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  Nessun risultato per "{query}"
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Prova con nome, cognome, telefono o nome dell'animale
                </div>
              </div>
            )}

            {/* Risultati con header sezione */}
            {risultati && totale > 0 && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={query}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.12 }}
                >
                  {(() => {
                    let sezCorrente = null;
                    return items.map((item, i) => {
                      const showHeader = item._sez !== sezCorrente;
                      sezCorrente = item._sez;
                      const meta = sezMeta[item._sez];
                      const count = items.filter(x => x._sez === item._sez).length;
                      return (
                        <div key={`${item._type}-${item._id}`}>
                          {showHeader && (
                            <SezHeader label={meta.label} icon={meta.icon} count={count} />
                          )}
                          <Riga
                            item={item}
                            query={query}
                            focused={focusIdx === i}
                            onSelect={() => apriItem(item)}
                          />
                        </div>
                      );
                    });
                  })()}

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--card-border-sm)',
                    padding: '8px 14px 4px', marginTop: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {totale} risultat{totale === 1 ? 'o' : 'i'}
                    </span>
                    <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)' }}>
                      {[['↑↓', 'naviga'], ['↵', 'apri']].map(([k, l]) => (
                        <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <kbd style={{ background: 'var(--card-bg-sm)',
                            border: '1px solid var(--card-border-sm)',
                            borderRadius: 5, padding: '0px 5px', fontFamily: 'inherit' }}>{k}</kbd>
                          {l}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>
    </>,
    document.body
  );
}