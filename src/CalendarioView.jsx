/**
 * CalendarioView.jsx
 * Calendario appuntamenti con viste mese/settimana/giorno
 * FullCalendar + Supabase
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { supabase } from './supabaseClient';

// ── Colori operatori ─────────────────────────────────────────
const COLORI_OP = ['#2563eb','#059669','#d97706','#7c3aed','#db2777','#0891b2'];

// ── Stili condivisi ──────────────────────────────────────────
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
const inputStyle = {
  width: '100%', background: 'var(--input-bg)',
  border: '1px solid var(--card-border)', borderRadius: 12,
  padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)',
  fontFamily: 'inherit', outline: 'none',
};
const btnPrimary = {
  background: 'linear-gradient(145deg,#5aabff,#2060dd)', color: '#fff',
  border: 'none', borderRadius: 13, padding: '11px 18px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(50,100,220,0.35)',
};
const btnSecondary = {
  background: 'var(--input-bg)', color: 'var(--text-secondary)',
  border: '1px solid var(--card-border)', borderRadius: 13,
  padding: '11px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
const btnDanger = {
  background: 'rgba(239,68,68,0.1)', color: '#dc2626',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 13,
  padding: '11px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
const secLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 6,
};

// ─────────────────────────────────────────────────────────────
// MODAL NUOVO CLIENTE (inline nel form appuntamento)
// ─────────────────────────────────────────────────────────────
function FormNuovoCliente({ onSaved, onCancel }) {
  const [f, setF] = useState({ nome: '', cognome: '', telefono: '', email: '' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!f.nome.trim() || !f.cognome.trim()) return;
    setLoading(true);
    const { data } = await supabase.from('clienti')
      .insert([{ nome: f.nome.trim(), cognome: f.cognome.trim(), telefono: f.telefono.trim() || null, email: f.email.trim() || null }])
      .select().single();
    setLoading(false);
    if (data) onSaved(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ ...glassCard, padding: 16, marginTop: 10, overflow: 'hidden' }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Nuovo cliente</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={secLabel}>Nome *</div>
          <input value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Mario" style={inputStyle} />
        </div>
        <div>
          <div style={secLabel}>Cognome *</div>
          <input value={f.cognome} onChange={e => set('cognome', e.target.value)} placeholder="Rossi" style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={secLabel}>Telefono</div>
          <input value={f.telefono} onChange={e => set('telefono', e.target.value)} placeholder="+39 333..." style={inputStyle} />
        </div>
        <div>
          <div style={secLabel}>Email</div>
          <input value={f.email} onChange={e => set('email', e.target.value)} placeholder="mail@..." style={inputStyle} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ ...btnSecondary, flex: 1, padding: '8px' }}>Annulla</button>
        <button onClick={save} disabled={loading || !f.nome || !f.cognome}
          style={{ ...btnPrimary, flex: 2, padding: '8px', opacity: (!f.nome || !f.cognome) ? 0.5 : 1 }}>
          {loading ? 'Salvo...' : 'Crea cliente'}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL NUOVO ANIMALE (inline nel form appuntamento)
// ─────────────────────────────────────────────────────────────
function FormNuovoAnimale({ clienteId, razze, onSaved, onCancel }) {
  const [f, setF] = useState({ nome: '', specie: 'cane', razza: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cercaRazza, setCercaRazza] = useState('');
  const [showRazzeList, setShowRazzeList] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const razzeFiltered = razze
    .filter(r => r.specie === f.specie)
    .filter(r => r.nome.toLowerCase().includes(cercaRazza.toLowerCase()));

  const razzaSelezionata = f.razza ? { nome: f.razza } : null;

  const save = async () => {
    if (!f.nome.trim()) { setError('Inserisci il nome'); return; }
    if (!clienteId) { setError('Cliente non valido'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.from('animali')
      .insert([{ cliente_id: clienteId, nome: f.nome.trim(), specie: f.specie, razza: f.razza || null }])
      .select().single();
    if (err) { setLoading(false); setError(err.message); return; }
    setLoading(false);
    onSaved({ ...data, razze: f.razza ? { nome: f.razza } : null });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ ...glassCard, padding: 16, marginTop: 10, overflow: 'hidden' }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Nuovo animale</div>

      {/* Nome */}
      <div style={{ marginBottom: 10 }}>
        <div style={secLabel}>Nome *</div>
        <input
          autoFocus
          value={f.nome}
          onChange={e => set('nome', e.target.value)}
          placeholder="Rex, Luna..."
          style={inputStyle}
        />
      </div>

      {/* Specie */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {['cane', 'gatto', 'altro'].map(s => (
          <button key={s} onClick={() => { set('specie', s); set('razza', ''); setCercaRazza(''); }} style={{
            flex: 1, padding: '8px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 600, border: '1px solid var(--card-border)',
            background: f.specie === s ? 'rgba(255,255,255,0.65)' : 'transparent',
            color: f.specie === s ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}>
            {s === 'cane' ? '🐕' : s === 'gatto' ? '🐈' : '🐾'} {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Ricerca razza */}
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <div style={secLabel}>Razza</div>
        {razzaSelezionata ? (
          <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{razzaSelezionata.nome}</span>
            <button onClick={() => { set('razza', ''); setCercaRazza(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
          </div>
        ) : (
          <>
            <input
              value={cercaRazza}
              onChange={e => { setCercaRazza(e.target.value); setShowRazzeList(true); }}
              onFocus={() => setShowRazzeList(true)}
              placeholder="Cerca razza..."
              style={inputStyle}
            />
            {showRazzeList && cercaRazza && razzeFiltered.length > 0 && (
              <div style={{
                position: 'absolute', zIndex: 999, width: '100%', marginTop: 4,
                background: 'var(--dropdown-bg, #fff)',
                border: '1px solid var(--card-border)',
                borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                maxHeight: 220, overflowY: 'auto',
              }}>
                {razzeFiltered.slice(0, 10).map(r => (
                  <button key={r.id}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => { set('razza', r.nome); setCercaRazza(r.nome); setShowRazzeList(false); }}
                    style={{ display: 'block', width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none',
                      borderBottom: '1px solid var(--card-border)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
                    {r.nome}
                  </button>
                ))}
              </div>
            )}
            {showRazzeList && cercaRazza && razzeFiltered.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 2px' }}>
                Nessuna razza trovata
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 10,
          padding: '7px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onCancel} style={{ ...btnSecondary, flex: 1, padding: '8px' }}>Annulla</button>
        <button onClick={save} disabled={loading || !f.nome}
          style={{ ...btnPrimary, flex: 2, padding: '8px', opacity: !f.nome ? 0.5 : 1 }}>
          {loading ? 'Salvo...' : 'Crea animale'}
        </button>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL NUOVO / MODIFICA APPUNTAMENTO
// ─────────────────────────────────────────────────────────────
function ModalAppuntamento({ appuntamento, dataInizio, operatori, onClose, onSaved, onDeleted }) {
  const isEdit = !!appuntamento;

  const [clienti,  setClienti]  = useState([]);
  const [animali,  setAnimali]  = useState([]);
  const [servizi,  setServizi]  = useState([]);
  const [razze,    setRazze]    = useState([]);

  const [cercaCliente, setCercaCliente] = useState('');
  const [showNuovoCliente, setShowNuovoCliente] = useState(false);
  const [showNuovoAnimale, setShowNuovoAnimale] = useState(false);

  const [f, setF] = useState({
    cliente_id:   appuntamento?.cliente_id   || '',
    animale_id:   appuntamento?.animale_id   || '',
    operatore_id: appuntamento?.operatore_id || '',
    servizi_ids:  appuntamento?.servizi_ids  || [],
    data:         dataInizio ? dataInizio.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    ora_inizio:   dataInizio ? dataInizio.toTimeString().slice(0,5) : '09:00',
    durata_minuti: appuntamento?.durata_minuti || 60,
    durata_auto:  true,
    note:         appuntamento?.note || '',
    stato:        appuntamento?.stato || 'confermato',
  });
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Fetch dati iniziali
  useEffect(() => {
    const load = async () => {
      const [cl, sv, rz] = await Promise.all([
        supabase.from('clienti').select('id,nome,cognome,telefono').order('cognome'),
        supabase.from('servizi').select('id,nome,durata_minuti,prezzo').order('nome'),
        supabase.from('razze').select('id,nome,specie').order('nome'),
      ]);
      setClienti(cl.data || []);
      setServizi(sv.data || []);
      setRazze(rz.data || []);
    };
    load();
  }, []);

  // Fetch animali quando cambia il cliente
  useEffect(() => {
    if (!f.cliente_id) { setAnimali([]); return; }
    supabase.from('animali').select('id,nome,specie,razze(nome)')
      .eq('cliente_id', f.cliente_id).order('nome')
      .then(({ data }) => setAnimali(data || []));
  }, [f.cliente_id]);

  // Calcola durata automatica dai servizi selezionati
  useEffect(() => {
    if (!f.durata_auto) return;
    const tot = f.servizi_ids.reduce((acc, sid) => {
      const s = servizi.find(x => x.id === sid);
      return acc + (s?.durata_minuti || 0);
    }, 0);
    if (tot > 0) set('durata_minuti', tot);
  }, [f.servizi_ids, f.durata_auto, servizi]);

  const clientiFiltrati = clienti.filter(c =>
    `${c.cognome} ${c.nome} ${c.telefono || ''}`.toLowerCase().includes(cercaCliente.toLowerCase())
  );

  const toggleServizio = (id) => {
    set('servizi_ids', f.servizi_ids.includes(id)
      ? f.servizi_ids.filter(x => x !== id)
      : [...f.servizi_ids, id]
    );
    set('durata_auto', true);
  };

  const durataConsigliata = servizi
    .filter(s => f.servizi_ids.includes(s.id))
    .reduce((a, s) => a + (s.durata_minuti || 0), 0);

  const oraFine = () => {
    const [h, m] = f.ora_inizio.split(':').map(Number);
    const tot = h * 60 + m + Number(f.durata_minuti);
    return `${String(Math.floor(tot / 60) % 24).padStart(2,'0')}:${String(tot % 60).padStart(2,'0')}`;
  };

  const save = async () => {
    if (!f.cliente_id) { setError('Seleziona un cliente'); return; }
    if (!f.animale_id) { setError('Seleziona un animale'); return; }
    if (!f.operatore_id) { setError('Seleziona un operatore'); return; }
    setSaving(true); setError('');

    const inizio = new Date(`${f.data}T${f.ora_inizio}`);
    const fine   = new Date(inizio.getTime() + f.durata_minuti * 60000);

    const payload = {
      cliente_id:    f.cliente_id,
      animale_id:    f.animale_id,
      operatore_id:  f.operatore_id,
      servizio_id:   f.servizi_ids[0] || null,  // primo servizio come principale
      inizio:        inizio.toISOString(),
      fine:          fine.toISOString(),
      durata_minuti: Number(f.durata_minuti),
      note:          f.note.trim() || null,
      stato:         f.stato,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('appuntamenti').update(payload).eq('id', appuntamento.id).select(`
        *, clienti(nome,cognome), animali(nome,specie), operatori(nome,cognome,colore)
      `).single();
    } else {
      result = await supabase.from('appuntamenti').insert([payload]).select(`
        *, clienti(nome,cognome), animali(nome,specie), operatori(nome,cognome,colore)
      `).single();
    }

    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data);
    onClose();
  };

  const deleteAppt = async () => {
    if (!window.confirm('Eliminare questo appuntamento?')) return;
    await supabase.from('appuntamenti').delete().eq('id', appuntamento.id);
    onDeleted(appuntamento.id);
    onClose();
  };

  const clienteSelezionato = clienti.find(c => c.id === f.cliente_id);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(10,24,64,0.45)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ ...glass, padding: 24, width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--card-bg-sm)', border: '1px solid var(--card-border)',
            borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
            fontSize: 18, color: 'var(--text-secondary)', fontFamily: 'inherit',
          }}>×</button>
        </div>

        {/* Data e ora */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ gridColumn: '1/3' }}>
            <div style={secLabel}>Data</div>
            <input type="date" value={f.data} onChange={e => set('data', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={secLabel}>Ora inizio</div>
            <input type="time" value={f.ora_inizio} onChange={e => set('ora_inizio', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Stato */}
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Stato</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['confermato','in attesa','completato','cancellato'].map(s => (
              <button key={s} onClick={() => set('stato', s)} style={{
                flex: 1, padding: '7px 4px', borderRadius: 10, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                border: '1px solid var(--card-border)',
                background: f.stato === s ? ({
                  confermato: 'rgba(37,99,235,0.15)',
                  'in attesa': 'rgba(217,119,6,0.15)',
                  completato: 'rgba(5,150,105,0.15)',
                  cancellato: 'rgba(220,38,38,0.15)',
                }[s]) : 'transparent',
                color: f.stato === s ? ({
                  confermato: '#2563eb',
                  'in attesa': '#d97706',
                  completato: '#059669',
                  cancellato: '#dc2626',
                }[s]) : 'var(--text-muted)',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Ricerca cliente */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={secLabel}>Cliente *</div>
            {!showNuovoCliente && (
              <button onClick={() => setShowNuovoCliente(true)} style={{
                fontSize: 11, fontWeight: 600, color: '#2563eb', background: 'rgba(37,99,235,0.1)',
                border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Nuovo cliente</button>
            )}
          </div>

          {clienteSelezionato ? (
            <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {clienteSelezionato.cognome} {clienteSelezionato.nome}
                </div>
                {clienteSelezionato.telefono && (
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSelezionato.telefono}</div>
                )}
              </div>
              <button onClick={() => { set('cliente_id', ''); set('animale_id', ''); setCercaCliente(''); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
            </div>
          ) : (
            <>
              <input
                placeholder="Cerca per nome o telefono..."
                value={cercaCliente}
                onChange={e => setCercaCliente(e.target.value)}
                style={inputStyle}
              />
              {cercaCliente && clientiFiltrati.length > 0 && (
                <div style={{ ...glassCard, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                  {clientiFiltrati.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => { set('cliente_id', c.id); setCercaCliente(''); }}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none',
                        border: 'none', borderBottom: '1px solid var(--card-border)', cursor: 'pointer',
                        textAlign: 'left', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.cognome} {c.nome}</div>
                      {c.telefono && <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{c.telefono}</div>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <AnimatePresence>
            {showNuovoCliente && (
              <FormNuovoCliente
                onSaved={(c) => {
                  setClienti(prev => [...prev, c].sort((a,b) => a.cognome.localeCompare(b.cognome)));
                  set('cliente_id', c.id);
                  setShowNuovoCliente(false);
                }}
                onCancel={() => setShowNuovoCliente(false)}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Selezione animale */}
        {f.cliente_id && (
          <div style={{ marginBottom: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={secLabel}>Animale *</div>
              {!showNuovoAnimale && (
                <button onClick={() => setShowNuovoAnimale(true)} style={{
                  fontSize: 11, fontWeight: 600, color: '#059669', background: 'rgba(5,150,105,0.1)',
                  border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
                }}>+ Nuovo animale</button>
              )}
            </div>
            {animali.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                Nessun animale per questo cliente
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {animali.map(a => (
                  <button key={a.id} onClick={() => set('animale_id', a.id)} style={{
                    padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                    border: '1px solid var(--card-border)',
                    background: f.animale_id === a.id ? 'rgba(37,99,235,0.15)' : 'var(--card-bg-sm)',
                    color: f.animale_id === a.id ? '#2563eb' : 'var(--text-primary)',
                    boxShadow: f.animale_id === a.id ? '0 2px 0 rgba(255,255,255,0.9) inset' : 'none',
                  }}>
                    {a.specie === 'gatto' ? '🐈' : '🐕'} {a.nome}
                    {a.razze?.nome && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }}>({a.razze.nome})</span>}
                  </button>
                ))}
              </div>
            )}
            <AnimatePresence>
              {showNuovoAnimale && (
                <FormNuovoAnimale
                  clienteId={f.cliente_id}
                  razze={razze}
                  onSaved={(a) => {
                    setAnimali(prev => [...prev, a]);
                    set('animale_id', a.id);
                    setShowNuovoAnimale(false);
                  }}
                  onCancel={() => setShowNuovoAnimale(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Operatore */}
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Operatore *</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {operatori.map((op, i) => {
              const colore = op.colore || COLORI_OP[i % COLORI_OP.length];
              const sel = f.operatore_id === op.id;
              return (
                <button key={op.id} onClick={() => set('operatore_id', op.id)} style={{
                  padding: '8px 14px', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  border: `1px solid ${sel ? colore + '60' : 'var(--card-border)'}`,
                  background: sel ? colore + '20' : 'var(--card-bg-sm)',
                  color: sel ? colore : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: colore,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: '#fff' }}>
                    {op.nome[0]}
                  </div>
                  {op.nome}
                </button>
              );
            })}
          </div>
        </div>

        {/* Servizi */}
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Trattamenti</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {servizi.map(s => {
              const sel = f.servizi_ids.includes(s.id);
              return (
                <button key={s.id} onClick={() => toggleServizio(s.id)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                  fontFamily: 'inherit', textAlign: 'left',
                  border: `1px solid ${sel ? 'rgba(37,99,235,0.3)' : 'var(--card-border)'}`,
                  background: sel ? 'rgba(37,99,235,0.1)' : 'var(--card-bg-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: sel ? '#2563eb' : 'var(--card-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {sel && <span style={{ fontSize: 11, color: '#fff', lineHeight: 1 }}>✓</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{s.nome}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.durata_minuti && <span>{s.durata_minuti} min</span>}
                    {s.prezzo && <span>€{Number(s.prezzo).toFixed(0)}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Durata */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={secLabel}>Durata</div>
            {durataConsigliata > 0 && (
              <button onClick={() => { set('durata_minuti', durataConsigliata); set('durata_auto', true); }} style={{
                fontSize: 11, color: '#2563eb', background: 'rgba(37,99,235,0.1)',
                border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
              }}>
                Usa consigliata ({durataConsigliata} min)
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              type="number" min="5" max="480" step="5"
              value={f.durata_minuti}
              onChange={e => { set('durata_minuti', e.target.value); set('durata_auto', false); }}
              style={{ ...inputStyle, width: 100 }}
            />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              minuti — fine ore <strong style={{ color: 'var(--text-primary)' }}>{oraFine()}</strong>
            </div>
          </div>
          {durataConsigliata > 0 && Number(f.durata_minuti) !== durataConsigliata && (
            <div style={{ fontSize: 11, color: '#d97706', marginTop: 5 }}>
              La durata consigliata dai trattamenti selezionati e di {durataConsigliata} minuti
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{ marginBottom: 20 }}>
          <div style={secLabel}>Note</div>
          <textarea rows={3} placeholder="Note sull'appuntamento..."
            value={f.note} onChange={e => set('note', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {error && (
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12,
            padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
            {error}
          </div>
        )}

        {/* Azioni */}
        <div style={{ display: 'flex', gap: 10 }}>
          {isEdit && (
            <button onClick={deleteAppt} style={{ ...btnDanger, padding: '11px 14px' }}>Elimina</button>
          )}
          <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
          <button onClick={save} disabled={loading} style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea appuntamento'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDARIO PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function CalendarioView() {
  const calRef = useRef(null);
  const [operatori,    setOperatori]    = useState([]);
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [clickedDate,  setClickedDate]  = useState(null);
  const [view,         setView]         = useState('timeGridWeek');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [op, ap] = await Promise.all([
      supabase.from('operatori').select('id,nome,cognome,colore').eq('attivo', true).order('nome'),
      supabase.from('appuntamenti').select(`
        id, inizio, fine, stato, note, durata_minuti,
        clienti(nome,cognome),
        animali(nome,specie),
        operatori(id,nome,cognome,colore)
      `).neq('stato', 'cancellato'),
    ]);
    const ops = op.data || [];
    setOperatori(ops);
    setEvents(apToEvents(ap.data || [], ops));
    setLoading(false);
  };

  const apToEvents = (appts, ops) => appts.map((a, i) => {
    const op = ops.find(o => o.id === a.operatori?.id) || a.operatori;
    const colore = op?.colore || COLORI_OP[ops.findIndex(o => o.id === op?.id) % COLORI_OP.length] || '#2563eb';
    return {
      id:             a.id,
      title:          `${a.animali?.nome || ''} - ${a.clienti?.cognome || ''}`,
      start:          a.inizio,
      end:            a.fine,
      backgroundColor: colore,
      borderColor:    colore,
      extendedProps:  { appuntamento: a },
    };
  });

  const handleEventClick = ({ event }) => {
    setSelectedAppt(event.extendedProps.appuntamento);
    setClickedDate(null);
    setShowModal(true);
  };

  const handleDateClick = ({ date }) => {
    setSelectedAppt(null);
    setClickedDate(date);
    setShowModal(true);
  };

  const handleEventDrop = async ({ event }) => {
    await supabase.from('appuntamenti').update({
      inizio: event.start.toISOString(),
      fine:   event.end.toISOString(),
    }).eq('id', event.id);
  };

  const handleSaved = () => { fetchAll(); };
  const handleDeleted = () => { fetchAll(); };

  const changeView = (v) => {
    setView(v);
    calRef.current?.getApi().changeView(v);
  };

  const VIEW_LABELS = { timeGridDay: 'Giorno', timeGridWeek: 'Settimana', dayGridMonth: 'Mese' };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Calendario</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {events.length} appuntamenti
          </div>
        </div>

        {/* Selettore vista */}
        <div style={{ ...glassCard, display: 'flex', gap: 3, padding: '5px' }}>
          {Object.entries(VIEW_LABELS).map(([v, label]) => (
            <motion.button
              key={v}
              onClick={() => changeView(v)}
              whileTap={{ scale: 0.95 }}
              style={{
                padding: '7px 14px', borderRadius: 11, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
                background: view === v ? 'var(--card-bg)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: view === v ? 'var(--card-shadow-sm)' : 'none',
              }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {/* Bottone nuovo */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setSelectedAppt(null); setClickedDate(new Date()); setShowModal(true); }}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuovo appuntamento
        </motion.button>
      </motion.div>

      {/* Legenda operatori */}
      {operatori.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}
        >
          {operatori.map((op, i) => {
            const colore = op.colore || COLORI_OP[i % COLORI_OP.length];
            return (
              <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20, background: colore + '18',
                border: '1px solid ' + colore + '40' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: colore }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: colore }}>{op.nome}</span>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Calendario */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ ...glass, padding: 10, overflow: 'hidden' }}
      >
        <style>{`
          :root { --dropdown-bg: #ffffff; }
          @media (prefers-color-scheme: dark) { :root { --dropdown-bg: #1a2d5a; } }
          .fc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .fc .fc-toolbar { gap: 8px; flex-wrap: wrap; margin-bottom: 8px !important; }
          .fc .fc-toolbar-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
          .fc .fc-button {
            background: var(--card-bg-sm) !important;
            border: 1px solid var(--card-border) !important;
            color: var(--text-primary) !important;
            border-radius: 10px !important;
            font-family: inherit !important;
            font-size: 13px !important;
            font-weight: 600 !important;
            padding: 6px 12px !important;
            box-shadow: none !important;
          }
          .fc .fc-button:hover { background: var(--card-bg) !important; }
          .fc .fc-button-active { background: var(--card-bg) !important; }
          .fc .fc-today-button { opacity: 0.8; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: var(--card-border-sm) !important; }
          .fc .fc-timegrid-slot { height: 22px; }
          .fc .fc-event {
            border-radius: 8px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            padding: 2px 6px !important;
            border: none !important;
            cursor: pointer !important;
          }
          .fc .fc-event:hover { opacity: 0.85; }
          .fc .fc-col-header-cell { font-size: 13px; font-weight: 600; color: var(--text-primary); padding: 8px 0; }
          .fc .fc-timegrid-axis { color: var(--text-muted); font-size: 10px; }
          .fc .fc-timegrid-slot-label { font-size: 10px; }
          .fc .fc-daygrid-day-number { color: var(--text-primary); font-size: 13px; }
          .fc .fc-day-today { background: rgba(37,99,235,0.05) !important; }
          .fc .fc-highlight { background: rgba(37,99,235,0.1) !important; }
          .fc-scrollgrid { border-radius: 12px; overflow: hidden; }
          .fc .fc-more-link { color: var(--text-accent); font-size: 11px; font-weight: 600; }
        `}</style>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            Caricamento calendario...
          </div>
        ) : (
          <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            locale={itLocale}
            events={events}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            slotMinTime="00:00:00"
            slotMaxTime="24:00:00"
            slotDuration="01:00:00"
            scrollTime="08:00:00"
            slotLabelInterval="01:00"
            allDaySlot={false}
            nowIndicator={true}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: '',
            }}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            height="calc(100vh - 200px)"
          />
        )}
      </motion.div>

      {/* Modal appuntamento */}
      <AnimatePresence>
        {showModal && (
          <ModalAppuntamento
            appuntamento={selectedAppt}
            dataInizio={clickedDate}
            operatori={operatori}
            onClose={() => setShowModal(false)}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}