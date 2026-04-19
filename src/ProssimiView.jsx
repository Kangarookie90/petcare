/**
 * ProssimiView.jsx
 * Lista prossimi appuntamenti — dal momento attuale in poi
 * Filtro per stato: tutti / da confermare / confermati
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// ── Stili ─────────────────────────────────────────────────────
const glass = {
  background: 'var(--card-bg)',
  border: '1px solid var(--card-border)',
  borderRadius: 20,
  boxShadow: 'var(--card-shadow)',
};
const glassCard = {
  background: 'var(--card-bg-sm)',
  border: '1px solid var(--card-border-sm)',
  borderRadius: 16,
  boxShadow: 'var(--card-shadow-sm)',
};

const COLORI_STATI = {
  confermato:  { bg: 'rgba(37,99,235,0.12)',  text: '#2563eb',  border: 'rgba(37,99,235,0.25)',  label: 'Confermato' },
  'in attesa': { bg: 'rgba(217,119,6,0.12)',  text: '#d97706',  border: 'rgba(217,119,6,0.25)',  label: 'In attesa' },
  completato:  { bg: 'rgba(5,150,105,0.12)',  text: '#059669',  border: 'rgba(5,150,105,0.25)',  label: 'Completato' },
  cancellato:  { bg: 'rgba(220,38,38,0.12)',  text: '#dc2626',  border: 'rgba(220,38,38,0.25)',  label: 'Cancellato' },
};

const COLORI_OP = ['#2563eb','#059669','#d97706','#7c3aed','#db2777','#0891b2'];

const FILTRI = [
  { id: 'tutti',       label: 'Tutti' },
  { id: 'in attesa',   label: 'Da confermare' },
  { id: 'confermato',  label: 'Confermati' },
];

// ── Helper date ───────────────────────────────────────────────
const fmtOra = (d) =>
  new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

const fmtDataBreve = (d) => {
  const data = new Date(d);
  const oggi = new Date();
  const domani = new Date(); domani.setDate(oggi.getDate() + 1);
  const dopodomani = new Date(); dopodomani.setDate(oggi.getDate() + 2);

  if (data.toDateString() === oggi.toDateString()) return 'Oggi';
  if (data.toDateString() === domani.toDateString()) return 'Domani';
  if (data.toDateString() === dopodomani.toDateString()) return 'Dopodomani';
  return data.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'short' });
};

const fmtDataCompleta = (d) =>
  new Date(d).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

const minutiMancanti = (d) => {
  const diff = new Date(d) - new Date();
  if (diff < 0) return null;
  const min = Math.floor(diff / 60000);
  if (min < 60) return `tra ${min} min`;
  const ore = Math.floor(min / 60);
  const rm = min % 60;
  if (ore < 24) return `tra ${ore}h${rm > 0 ? ` ${rm}min` : ''}`;
  return null;
};

const specieEmoji = (s) => s === 'gatto' ? '🐈' : '🐕';

// ── Raggruppa per data ─────────────────────────────────────────
const raggruppaPerData = (appuntamenti) => {
  const mappa = {};
  appuntamenti.forEach(a => {
    const chiave = new Date(a.inizio).toDateString();
    if (!mappa[chiave]) mappa[chiave] = { label: fmtDataCompleta(a.inizio), dataBreve: fmtDataBreve(a.inizio), items: [] };
    mappa[chiave].items.push(a);
  });
  return Object.values(mappa);
};

// ── Card singolo appuntamento ─────────────────────────────────
function CardAppuntamento({ a, operatori, index }) {
  const stato = COLORI_STATI[a.stato] || COLORI_STATI.confermato;
  const op = operatori.find(o => o.id === a.operatori?.id) || a.operatori;
  const opIdx = operatori.findIndex(o => o.id === (op?.id || a.operatori?.id));
  const coloreOp = op?.colore || COLORI_OP[opIdx % COLORI_OP.length] || '#2563eb';
  const mancanti = minutiMancanti(a.inizio);
  const serviziNomi = (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        ...glassCard,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barra colorata laterale operatore */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: coloreOp, borderRadius: '16px 0 0 16px',
      }} />

      {/* Orario */}
      <div style={{
        minWidth: 52, textAlign: 'center', paddingLeft: 4, paddingTop: 2,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>
          {fmtOra(a.inizio)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 500 }}>
          {fmtOra(a.fine)}
        </div>
        {mancanti && (
          <div style={{
            marginTop: 6, fontSize: 10, fontWeight: 700,
            color: coloreOp, background: coloreOp + '18',
            borderRadius: 8, padding: '2px 5px', whiteSpace: 'nowrap',
          }}>
            {mancanti}
          </div>
        )}
      </div>

      {/* Separatore verticale */}
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--card-border-sm)', flexShrink: 0 }} />

      {/* Contenuto principale */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Animale + cliente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
          {a.animali?.specie && (
            <span style={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
              {specieEmoji(a.animali.specie)}
            </span>
          )}
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {a.animali?.nome || 'Blocco orario'}
          </div>
          {(a.animali?.problemi_salute || a.animali?.problemi_carattere) && (
            <span style={{ fontSize: 13, flexShrink: 0 }}>⚠️</span>
          )}
        </div>

        {a.clienti && (
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>
            {a.clienti.cognome} {a.clienti.nome}
            {a.clienti.telefono && (
              <span style={{ marginLeft: 8, opacity: 0.7 }}>📱 {a.clienti.telefono}</span>
            )}
          </div>
        )}

        {/* Servizi */}
        {serviziNomi.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 5 }}>
            {serviziNomi.slice(0, 3).map((s, i) => (
              <span key={i} style={{
                fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
                background: 'rgba(37,99,235,0.1)', color: '#2563eb',
              }}>{s}</span>
            ))}
            {serviziNomi.length > 3 && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px' }}>
                +{serviziNomi.length - 3} altri
              </span>
            )}
          </div>
        )}

        {/* Operatore */}
        {op && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 16, height: 16, borderRadius: '50%', background: coloreOp, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, color: '#fff',
            }}>
              {op.nome?.[0]}
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {op.nome} {op.cognome}
            </span>
          </div>
        )}

        {/* Note */}
        {a.note && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, fontStyle: 'italic', lineHeight: 1.4 }}>
            📝 {a.note}
          </div>
        )}
      </div>

      {/* Badge stato */}
      <div style={{
        flexShrink: 0, fontSize: 11, fontWeight: 700,
        background: stato.bg, color: stato.text,
        border: `1px solid ${stato.border}`,
        borderRadius: 10, padding: '3px 8px', whiteSpace: 'nowrap',
      }}>
        {stato.label}
      </div>
    </motion.div>
  );
}

// ── Componente principale ──────────────────────────────────────
export default function ProssimiView() {
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [operatori,    setOperatori]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filtro,       setFiltro]       = useState('tutti');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Chiudi dropdown al tocco/click fuori
  useEffect(() => {
    const handler = e => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const adesso = new Date().toISOString();

    const [apRes, opRes] = await Promise.all([
      supabase
        .from('appuntamenti')
        .select(`
          id, inizio, fine, stato, note,
          clienti(id, nome, cognome, telefono),
          animali(id, nome, specie, problemi_salute, problemi_carattere),
          operatori(id, nome, cognome, colore),
          appuntamenti_servizi(servizi(id, nome))
        `)
        .gte('inizio', adesso)
        .not('stato', 'eq', 'cancellato')
        .order('inizio')
        .limit(200),
      supabase
        .from('operatori')
        .select('id, nome, cognome, colore')
        .eq('attivo', true)
        .order('nome'),
    ]);

    setAppuntamenti(apRes.data || []);
    setOperatori(opRes.data || []);
    setLoading(false);
  };

  // Filtra per stato
  const apFiltrati = filtro === 'tutti'
    ? appuntamenti
    : appuntamenti.filter(a => a.stato === filtro);

  const gruppi = raggruppaPerData(apFiltrati);
  const filtroLabel = FILTRI.find(f => f.id === filtro)?.label || 'Tutti';

  // Conta badge per ogni filtro
  const contaPerFiltro = (id) => id === 'tutti'
    ? appuntamenti.length
    : appuntamenti.filter(a => a.stato === id).length;

  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Prossimi
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {loading ? 'Caricamento...' : `${apFiltrati.length} appuntament${apFiltrati.length === 1 ? 'o' : 'i'} in programma`}
          </div>
        </div>

        {/* Dropdown filtro */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            style={{
              ...glassCard,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 14px', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
              border: dropdownOpen ? '1px solid rgba(37,99,235,0.4)' : '1px solid var(--card-border-sm)',
              background: dropdownOpen ? 'rgba(37,99,235,0.08)' : 'var(--card-bg-sm)',
              minWidth: 160,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
            </svg>
            <span style={{ flex: 1 }}>{filtroLabel}</span>
            {contaPerFiltro(filtro) > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, minWidth: 20, height: 20,
                background: filtro === 'in attesa' ? '#d97706' : filtro === 'confermato' ? '#2563eb' : 'var(--text-muted)',
                color: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px',
              }}>
                {contaPerFiltro(filtro)}
              </span>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.5, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  ...glass, padding: 6, minWidth: 200, zIndex: 50,
                }}
              >
                {FILTRI.map(f => {
                  const sel = filtro === f.id;
                  const count = contaPerFiltro(f.id);
                  return (
                    <button
                      key={f.id}
                      onClick={() => { setFiltro(f.id); setDropdownOpen(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '10px 12px', borderRadius: 12,
                        background: sel ? 'rgba(37,99,235,0.1)' : 'transparent',
                        border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: f.id === 'in attesa' ? '#d97706' : f.id === 'confermato' ? '#2563eb' : 'var(--text-muted)',
                      }} />
                      <span style={{
                        flex: 1, fontSize: 14, fontWeight: sel ? 700 : 500,
                        color: sel ? '#2563eb' : 'var(--text-primary)',
                      }}>
                        {f.label}
                      </span>
                      <span style={{
                        fontSize: 12, fontWeight: 600,
                        color: sel ? '#2563eb' : 'var(--text-muted)',
                      }}>
                        {count}
                      </span>
                      {sel && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottone aggiorna */}
        <button
          onClick={fetchData}
          disabled={loading}
          style={{
            ...glassCard,
            padding: '9px 12px', cursor: 'pointer', border: '1px solid var(--card-border-sm)',
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
            opacity: loading ? 0.5 : 1,
          }}
          title="Aggiorna"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}>
            <path d="M23 4v6h-6M1 20v-6h6"/>
            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
          </svg>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </button>
      </motion.div>

      {/* Contenuto */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Caricamento appuntamenti...
        </div>
      ) : apFiltrati.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '80px 20px' }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>📅</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Nessun appuntamento
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {filtro === 'tutti'
              ? 'Non ci sono appuntamenti programmati'
              : `Nessun appuntamento "${filtroLabel.toLowerCase()}" in programma`}
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {gruppi.map((gruppo, gi) => (
            <motion.div
              key={gruppo.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06 }}
            >
              {/* Intestazione giorno */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <div style={{
                  ...glassCard, padding: '5px 14px',
                  fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  {gruppo.dataBreve === 'Oggi' && <span>⚡</span>}
                  {gruppo.dataBreve === 'Domani' && <span>🌅</span>}
                  <span style={{
                    color: gruppo.dataBreve === 'Oggi' ? '#2563eb' : 'var(--text-primary)',
                    fontWeight: gruppo.dataBreve === 'Oggi' ? 800 : 700,
                  }}>
                    {gruppo.dataBreve}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'capitalize' }}>
                    · {gruppo.label}
                  </span>
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--card-border-sm)' }} />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {gruppo.items.length} app.
                </span>
              </div>

              {/* Cards appuntamenti del giorno */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {gruppo.items.map((a, i) => (
                  <CardAppuntamento
                    key={a.id}
                    a={a}
                    operatori={operatori}
                    index={i}
                  />
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}