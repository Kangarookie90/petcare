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
  const [f, setF] = useState({ nome: '', specie: 'cane', razza_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cercaRazza, setCercaRazza] = useState('');
  const [showRazzeList, setShowRazzeList] = useState(false);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const razzeFiltered = razze
    .filter(r => r.specie === f.specie)
    .filter(r => r.nome.toLowerCase().includes(cercaRazza.toLowerCase()));

  const razzaSelezionata = razze.find(r => r.id === f.razza_id) || null;

  const save = async () => {
    if (!f.nome.trim()) { setError('Inserisci il nome'); return; }
    if (!clienteId) { setError('Cliente non valido'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase.from('animali')
      .insert([{ cliente_id: clienteId, nome: f.nome.trim(), specie: f.specie, razza_id: f.razza_id || null }])
      .select('*, razze(id,nome)').single();
    if (err) { setLoading(false); setError(err.message); return; }
    setLoading(false);
    onSaved(data);
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      style={{ ...glassCard, padding: 16, marginTop: 10, overflow: 'visible' }}
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
          <button key={s} onClick={() => { set('specie', s); set('razza_id', ''); setCercaRazza(''); }} style={{
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
      <div style={{ marginBottom: 12, position: 'relative', zIndex: 1000 }}>
        <div style={secLabel}>Razza</div>
        {razzaSelezionata ? (
          <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{razzaSelezionata.nome}</span>
            <button onClick={() => { set('razza_id', ''); setCercaRazza(''); }}
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
                    onClick={() => { set('razza_id', r.id); setCercaRazza(r.nome); setShowRazzeList(false); }}
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
  const [serviziCaricati, setServiziCaricati] = useState(false);

  const [cercaCliente, setCercaCliente] = useState('');
  const [showNuovoCliente, setShowNuovoCliente] = useState(false);
  const [searchMode, setSearchMode]     = useState('cliente'); // 'cliente' | 'animale'
  const [cercaAnimaleQuery, setCercaAnimaleQuery] = useState('');
  const [tuttiAnimali, setTuttiAnimali] = useState([]);
  const [showNuovoAnimale, setShowNuovoAnimale] = useState(false);

  // Estrai IDs dagli oggetti join (Supabase restituisce oggetti nested, non ID diretti)
  const initClienteId   = appuntamento?.clienti?.id   || appuntamento?.cliente_id   || '';
  const initAnimaleId   = appuntamento?.animali?.id   || appuntamento?.animale_id   || '';
  const initOperatoreId = appuntamento?.operatori?.id || appuntamento?.operatore_id || '';
  const initData = appuntamento?.inizio
    ? new Date(appuntamento.inizio).toISOString().split('T')[0]
    : dataInizio ? dataInizio.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const initOra = appuntamento?.inizio
    ? new Date(appuntamento.inizio).toTimeString().slice(0,5)
    : dataInizio ? dataInizio.toTimeString().slice(0,5) : '09:00';

  const [f, setF] = useState({
    cliente_id:    initClienteId,
    animale_id:    initAnimaleId,
    operatore_id:  initOperatoreId,
    servizi_ids:   appuntamento?.servizi_ids || (appuntamento?.servizio_id ? [appuntamento.servizio_id] : []),
    data:          initData,
    ora_inizio:    initOra,
    durata_minuti: 60,
    durata_auto:   true,
    note:          appuntamento?.note || '',
    stato:         appuntamento?.stato || 'confermato',
    blocco_orario: false,
    prezzo_proposto:   appuntamento?.prezzo_proposto || '',
    prezzo_confermato: appuntamento?.prezzo_confermato || '',
    prezzo_confermato_flag: appuntamento?.prezzo_confermato_flag || false,
  });
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Fetch dati iniziali
  useEffect(() => {
    const load = async () => {
      const promises = [
        supabase.from('clienti').select('id,nome,cognome,telefono,prezzo_riservato').order('cognome'),
        supabase.from('servizi').select('id,nome,durata_minuti,prezzo').order('nome'),
        supabase.from('razze').select('id,nome,specie').order('nome'),
      ];
      // Se siamo in modifica, carica anche i servizi associati
      if (appuntamento?.id) {
        promises.push(
          supabase.from('appuntamenti_servizi')
            .select('servizio_id, prezzo_applicato')
            .eq('appuntamento_id', appuntamento.id)
        );
      }
      const [cl, sv, rz, apSv] = await Promise.all(promises);
      setClienti(cl.data || []);
      setServizi(sv.data || []);
      setRazze(rz.data || []);
      // Imposta i servizi già associati all'appuntamento
      if (apSv?.data?.length > 0) {
        const ids = apSv.data.map(r => r.servizio_id);
        set('servizi_ids', ids);
      }
      setServiziCaricati(true);
      // Fetch tutti gli animali per ricerca per-animale
      supabase.from('animali')
        .select('id,nome,specie,cliente_id,problemi_carattere,problemi_salute,servizi_riservati_ids,durata_riservata,clienti(id,nome,cognome)')
        .order('nome')
        .then(({ data }) => setTuttiAnimali(data || []));
    };
    load();
  }, []);

  // Fetch animali quando cambia il cliente
  useEffect(() => {
    if (!f.cliente_id) { setAnimali([]); return; }
    supabase.from('animali').select('id,nome,specie,razze(nome),problemi_carattere,problemi_salute,servizi_riservati_ids,durata_riservata')
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
    if (!f.blocco_orario && !f.cliente_id) { setError('Seleziona un cliente o attiva "Blocca orario"'); return; }
    if (!f.blocco_orario && !f.animale_id) { setError('Seleziona un animale'); return; }
    if (!f.operatore_id) { setError('Seleziona un operatore'); return; }
    setSaving(true); setError('');

    try {
      const inizio = new Date(`${f.data}T${f.ora_inizio}`);
      const fine   = new Date(inizio.getTime() + f.durata_minuti * 60000);

      const payload = {
        cliente_id:    f.blocco_orario ? null : f.cliente_id,
        animale_id:    f.blocco_orario ? null : f.animale_id,
        operatore_id:  f.operatore_id,
        servizio_id:   f.servizi_ids[0] || null, // primo per compatibilità
        inizio:        inizio.toISOString(),
        fine:          fine.toISOString(),
        note:          f.note.trim() || null,
        stato:         f.stato,
        prezzo_proposto:        f.prezzo_proposto !== '' ? Number(f.prezzo_proposto) : null,
        prezzo_confermato:      f.prezzo_confermato !== '' ? Number(f.prezzo_confermato) : null,
        prezzo_confermato_flag: f.prezzo_confermato_flag,
      };

      const SELECT = `
        id, inizio, fine, stato, note, prezzo_proposto, prezzo_confermato, prezzo_confermato_flag,
        clienti(id,nome,cognome), 
        animali(id,nome,specie,problemi_carattere,problemi_salute), 
        operatori(id,nome,cognome,colore)
      `;

      let result;
      if (isEdit) {
        result = await supabase.from('appuntamenti').update(payload).eq('id', appuntamento.id).select(SELECT).single();
      } else {
        result = await supabase.from('appuntamenti').insert([payload]).select(SELECT).single();
      }

      if (result.error) {
        setError(result.error.message);
        setSaving(false);
        return;
      }

      const apId = result.data.id;

      // Salva servizi su appuntamenti_servizi (cancella e reinserisci)
      await supabase.from('appuntamenti_servizi').delete().eq('appuntamento_id', apId);
      if (f.servizi_ids.length > 0) {
        const righeServizi = f.servizi_ids.map(sid => {
          const sv = servizi.find(x => x.id === sid);
          return {
            appuntamento_id:  apId,
            servizio_id:      sid,
            prezzo_applicato: sv?.prezzo || null,
          };
        });
        const { error: svErr } = await supabase.from('appuntamenti_servizi').insert(righeServizi);
        if (svErr) console.error('[CalendarioView] errore salvataggio servizi:', svErr);
      }

      // Aggiungi servizi al risultato per aggiornare il calendario
      const serviziAssociati = f.servizi_ids.map(sid => servizi.find(x => x.id === sid)).filter(Boolean);
      onSaved({ ...result.data, _serviziMultipli: serviziAssociati });
      onClose();
    } catch (err) {
      console.error('[CalendarioView] save error:', err);
      setError('Errore durante il salvataggio: ' + (err.message || 'riprova'));
    } finally {
      setSaving(false);
    }
  };

  const deleteAppt = async () => {
    if (!window.confirm('Eliminare questo appuntamento?')) return;
    await supabase.from('appuntamenti').delete().eq('id', appuntamento.id);
    onDeleted(appuntamento.id);
    onClose();
  };

  // Cerca prima nella lista caricata, poi nel nested object dell'appuntamento (edit mode)
  const clienteSelezionato = clienti.find(c => c.id === f.cliente_id)
    || (appuntamento?.clienti?.id === f.cliente_id ? appuntamento.clienti : null);

  // Quando cambia animale, precompila servizi e durata riservati (solo nuovo appuntamento)
  useEffect(() => {
    if (!f.animale_id || isEdit) return;
    const a = [...animali, ...tuttiAnimali].find(x => x.id === f.animale_id);
    if (!a) return;
    if (a.servizi_riservati_ids?.length > 0) {
      set('servizi_ids', a.servizi_riservati_ids);
      set('durata_auto', true);
    }
    if (a.durata_riservata) {
      set('durata_minuti', a.durata_riservata);
      set('durata_auto', false);
    }
  }, [f.animale_id, animali]);

  // Quando cambia cliente, pre-carica prezzo_riservato — solo se non siamo in edit con prezzo già settato
  useEffect(() => {
    if (!f.cliente_id || !clienti.length) return;
    // In edit non sovrascrivere il prezzo già salvato
    if (isEdit && f.prezzo_proposto !== '') return;
    const c = clienti.find(x => x.id === f.cliente_id);
    if (c?.prezzo_riservato) {
      set('prezzo_proposto', String(c.prezzo_riservato));
    }
  }, [f.cliente_id, clienti]);

  // Quando cambiano i servizi, calcola prezzo totale dalla somma
  useEffect(() => {
    if (f.servizi_ids.length === 0) return;
    if (isEdit && f.prezzo_proposto !== '' && !serviziCaricati) return;
    const cliente = clienti.find(x => x.id === f.cliente_id);
    if (cliente?.prezzo_riservato) {
      set('prezzo_proposto', String(cliente.prezzo_riservato));
      return;
    }
    const tot = f.servizi_ids.reduce((acc, sid) => {
      const s = servizi.find(x => x.id === sid);
      return acc + Number(s?.prezzo || 0);
    }, 0);
    if (tot > 0) set('prezzo_proposto', String(tot));
  }, [f.servizi_ids, servizi]);

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

        {/* Toggle blocco orario */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={() => set('blocco_orario', !f.blocco_orario)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
              border: `1px solid ${f.blocco_orario ? 'rgba(220,38,38,0.3)' : 'var(--card-border)'}`,
              background: f.blocco_orario ? 'rgba(220,38,38,0.08)' : 'var(--card-bg-sm)',
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              background: f.blocco_orario ? '#dc2626' : 'var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {f.blocco_orario && <span style={{ fontSize: 11, color: '#fff', lineHeight: 1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: f.blocco_orario ? '#dc2626' : 'var(--text-primary)' }}>
                Blocca orario
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                Riserva lo slot senza associare un cliente
              </div>
            </div>
          </button>
        </div>

        {/* Toggle modalità ricerca */}
        {!f.blocco_orario && !f.cliente_id && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {[['cliente','👤 Cerca per proprietario'],['animale','🐾 Cerca per animale']].map(([mode, label]) => (
              <button key={mode} onClick={() => { setSearchMode(mode); setCercaAnimaleQuery(''); setCercaCliente(''); }} style={{
                flex: 1, padding: '8px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 12, fontWeight: 600,
                border: `1px solid ${searchMode === mode ? 'rgba(37,99,235,0.4)' : 'var(--card-border)'}`,
                background: searchMode === mode ? 'rgba(37,99,235,0.12)' : 'var(--card-bg-sm)',
                color: searchMode === mode ? '#2563eb' : 'var(--text-muted)',
              }}>{label}</button>
            ))}
          </div>
        )}

        {/* Ricerca per animale */}
        {!f.blocco_orario && searchMode === 'animale' && !f.cliente_id && (
          <div style={{ marginBottom: 14 }}>
            <div style={secLabel}>Cerca animale *</div>
            <input
              placeholder="Nome animale..."
              value={cercaAnimaleQuery}
              onChange={e => setCercaAnimaleQuery(e.target.value)}
              style={inputStyle}
              autoComplete="off"
            />
            {cercaAnimaleQuery.length > 1 && (() => {
              const filtrati = tuttiAnimali.filter(a =>
                a.nome.toLowerCase().includes(cercaAnimaleQuery.toLowerCase())
              ).slice(0, 15);
              return filtrati.length > 0 ? (
                <div style={{ ...glassCard, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {filtrati.map(a => (
                    <button key={a.id} onMouseDown={e => {
                      e.preventDefault();
                      set('cliente_id', a.cliente_id);
                      set('animale_id', a.id);
                      setCercaAnimaleQuery('');
                    }} style={{
                      display: 'block', width: '100%', padding: '10px 14px',
                      background: 'none', border: 'none',
                      borderBottom: '1px solid var(--card-border-sm)',
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                        <span>{a.specie === 'gatto' ? '🐈' : '🐕'} {a.nome}</span>
                        {(a.problemi_salute || a.problemi_carattere) && <span>⚠️</span>}
                        {(a.servizi_riservati_ids?.length > 0 || a.durata_riservata) && (
                          <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>★</span>
                        )}
                      </div>
                      {a.clienti && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {a.clienti.cognome} {a.clienti.nome}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                  Nessun animale trovato
                </div>
              );
            })()}
          </div>
        )}

        {/* Ricerca cliente */}
        {!f.blocco_orario && (searchMode === 'cliente' || f.cliente_id) && <div style={{ marginBottom: 4 }}>
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
              <button onClick={() => { set('cliente_id', ''); set('animale_id', ''); setCercaCliente(''); setSearchMode('cliente'); }}
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
        </div>}

        {/* Selezione animale */}
        {!f.blocco_orario && f.cliente_id && (
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
                    {(a.servizi_riservati_ids?.length > 0 || a.durata_riservata) && (
                      <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>★</span>
                    )}
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

        {/* Alert problemi animale */}
        {(() => {
          const animaleSelezionato = animali.find(a => a.id === f.animale_id);
          const hasProblemiSalute    = animaleSelezionato?.problemi_salute?.trim();
          const hasProblemiCarattere = animaleSelezionato?.problemi_carattere?.trim();
          if (!hasProblemiSalute && !hasProblemiCarattere) return null;
          return (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginBottom: 16,
                borderRadius: 14,
                background: 'rgba(234,179,8,0.10)',
                border: '1.5px solid rgba(234,179,8,0.35)',
                padding: '12px 14px',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
            >
              <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>⚠️</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Attenzione — note sull'animale
                </div>
                {hasProblemiSalute && (
                  <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: hasProblemiCarattere ? 4 : 0 }}>
                    <span style={{ fontWeight: 600 }}>Salute:</span> {animaleSelezionato.problemi_salute}
                  </div>
                )}
                {hasProblemiCarattere && (
                  <div style={{ fontSize: 12, color: 'var(--text-primary)' }}>
                    <span style={{ fontWeight: 600 }}>Carattere:</span> {animaleSelezionato.problemi_carattere}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })()}

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
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Note</div>
          <textarea rows={3} placeholder="Note sull'appuntamento..."
            value={f.note} onChange={e => set('note', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Prezzo */}
        {!f.blocco_orario && (
          <div style={{ marginBottom: 16 }}>
            <div style={secLabel}>Prezzo</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {/* Prezzo riservato (da anagrafica) */}
              {clienteSelezionato?.prezzo_riservato && (
                <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Riservato</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>
                    € {Number(clienteSelezionato.prezzo_riservato).toFixed(2)}
                  </div>
                </div>
              )}
              {/* Prezzo proposto (modificabile) */}
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5 }}>
                  {clienteSelezionato?.prezzo_riservato ? 'Prezzo applicato' : 'Prezzo proposto'}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
                  <input type="number" min="0" step="0.50"
                    placeholder="0.00"
                    value={f.prezzo_proposto}
                    onChange={e => set('prezzo_proposto', e.target.value)}
                    style={{ ...inputStyle, paddingLeft: 26 }}
                  />
                </div>
              </div>
            </div>

            {/* Sezione conferma prezzo — solo in modifica e se completato */}
            {isEdit && (
              <div style={{ marginTop: 12, padding: '14px', borderRadius: 14,
                background: f.prezzo_confermato_flag ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)',
                border: `1px solid ${f.prezzo_confermato_flag ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.25)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: f.prezzo_confermato_flag ? '#059669' : '#d97706',
                    textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {f.prezzo_confermato_flag ? '✓ Prezzo confermato' : 'Conferma prezzo finale'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
                    <input type="number" min="0" step="0.50"
                      placeholder={f.prezzo_proposto || '0.00'}
                      value={f.prezzo_confermato}
                      onChange={e => { set('prezzo_confermato', e.target.value); set('prezzo_confermato_flag', false); }}
                      style={{ ...inputStyle, paddingLeft: 26,
                        borderColor: f.prezzo_confermato_flag ? 'rgba(5,150,105,0.4)' : 'var(--card-border)' }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      const val = f.prezzo_confermato || f.prezzo_proposto;
                      set('prezzo_confermato', val);
                      set('prezzo_confermato_flag', true);
                    }}
                    style={{
                      padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 13, fontWeight: 700, border: 'none',
                      background: f.prezzo_confermato_flag
                        ? 'linear-gradient(145deg,#34d399,#059669)'
                        : 'linear-gradient(145deg,#fbbf24,#d97706)',
                      color: '#fff',
                      boxShadow: f.prezzo_confermato_flag
                        ? '0 4px 12px rgba(5,150,105,0.35)'
                        : '0 4px 12px rgba(217,119,6,0.35)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {f.prezzo_confermato_flag ? '✓ Confermato' : 'Conferma'}
                  </button>
                </div>
                {f.prezzo_confermato_flag && (
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8, fontWeight: 500 }}>
                    Prezzo finale registrato: € {Number(f.prezzo_confermato).toFixed(2)}
                  </div>
                )}
              </div>
            )}


          </div>
        )}

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
        id, inizio, fine, stato, note, prezzo_proposto, prezzo_confermato, prezzo_confermato_flag,
        clienti(id,nome,cognome),
        animali(id,nome,specie,problemi_carattere,problemi_salute),
        operatori(id,nome,cognome,colore),
        appuntamenti_servizi(servizio_id, prezzo_applicato, servizi(id,nome,prezzo,durata_minuti))
      `).neq('stato', 'cancellato'),
    ]);
    const ops = op.data || [];
    setOperatori(ops);
    setEvents(apToEvents(ap.data || [], ops));
    setLoading(false);
  };

  const apToEvents = (appts, ops) => appts.map((a) => {
    const op = ops.find(o => o.id === a.operatori?.id) || a.operatori;
    const idx = ops.findIndex(o => o.id === (op?.id || a.operatori?.id));
    const coloreBase = op?.colore || COLORI_OP[idx % COLORI_OP.length] || '#3b82f6';
    const prezzoOk = a.prezzo_confermato_flag;
    const colore = prezzoOk ? '#6b7280' : coloreBase;
    // Servizi multipli da appuntamenti_servizi
    const serviziMultipli = (a._serviziMultipli || a.appuntamenti_servizi || [])
      .map(r => r.servizi || r)
      .filter(Boolean);
    const serviziNomi = serviziMultipli.map(s => s.nome).filter(Boolean);
    return {
      id:              a.id,
      title:           a.animali?.nome || 'Appuntamento',
      start:           a.inizio,
      end:             a.fine,
      backgroundColor: colore + 'dd',
      borderColor:     colore,
      textColor:       '#fff',
      extendedProps:   {
        appuntamento: a,
        coloreBase,
        prezzoOk,
        animaleNome:   a.animali?.nome || '',
        servizioNome:  serviziNomi,
        operatoreNome: op?.nome || '',
        hasAlert:      !!(a.animali?.problemi_salute || a.animali?.problemi_carattere),
      },
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

  const handleSaved = (apData) => {
    if (!apData) { fetchAll(); return; }
    // Aggiorna solo l'evento modificato/aggiunto senza rimontare il calendario
    setOperatori(prev => {
      const ops = prev;
      setEvents(prevEvents => {
        const nuovoEvent = apToEvents([apData], ops)[0];
        if (!nuovoEvent) return prevEvents;
        const exists = prevEvents.find(e => e.id === nuovoEvent.id);
        if (exists) {
          return prevEvents.map(e => e.id === nuovoEvent.id ? nuovoEvent : e);
        }
        return [...prevEvents, nuovoEvent];
      });
      return ops;
    });
  };
  const handleDeleted = (id) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

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
          .fc .fc-timegrid-slot { min-height: 0; }
          .fc .fc-event {
            border-radius: 8px !important;
            cursor: pointer !important;
            overflow: hidden !important;
            border-width: 2px !important;
          }
          .fc .fc-event:hover { filter: brightness(1.08) !important; transform: translateY(-1px) !important; transition: all 0.12s ease !important; }
          .fc .fc-event-main { padding: 0 !important; height: 100% !important; overflow: hidden !important; }
          /* Nasconde titolo nativo — usiamo eventContent */
          .fc .fc-event-title-container { display: none !important; }
          .fc .fc-event-time { display: none !important; }
          .fc .fc-col-header-cell { font-size: 13px; font-weight: 600; color: var(--text-primary); padding: 8px 0; }
          .fc .fc-timegrid-axis { color: var(--text-muted); font-size: 11px; }
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
            slotMinTime="09:00:00"
            slotMaxTime="20:00:00"
            slotDuration="00:30:00"
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
            expandRows={true}
            eventContent={({ event, timeText }) => {
              const { animaleNome, servizioNome, operatoreNome, prezzoOk, hasAlert } = event.extendedProps;
              const servizi = Array.isArray(servizioNome) ? servizioNome : (servizioNome ? [servizioNome] : []);
              return (
                <div style={{
                  padding: '3px 6px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  overflow: 'hidden',
                  gap: 1,
                }}>
                  {/* Riga 1: check + animale (grassetto) + operatore */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {prezzoOk && (
                      <div style={{
                        width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#a3e635,#22c55e)',
                        border: '1.5px solid rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(34,197,94,0.6)',
                      }}>
                        <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {hasAlert && (
                      <div style={{
                        fontSize: 11, flexShrink: 0, lineHeight: 1,
                        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
                      }}>⚠️</div>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {animaleNome}
                    </span>
                    {operatoreNome && (
                      <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.75, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {operatoreNome}
                      </span>
                    )}
                  </div>
                  {/* Riga 2: orario */}
                  <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.80, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.2 }}>
                    {timeText}
                  </div>
                  {/* Righe servizi: primo visibile + "... +N altri" */}
                  {servizi.length > 0 && (
                    <div style={{ fontSize: 10, opacity: 0.78, lineHeight: 1.3 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {servizi[0]}
                      </div>
                      {servizi.length > 1 && (
                        <div style={{ opacity: 0.65, fontStyle: 'italic' }}>
                          +{servizi.length - 1} {servizi.length - 1 === 1 ? 'altro' : 'altri'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
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