/**
 * CalendarioView.jsx
 * Calendario appuntamenti con viste mese/settimana/giorno
 * FullCalendar + Supabase
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import itLocale from '@fullcalendar/core/locales/it';
import { supabase } from './supabaseClient';
import { getSaloneId } from './syncService';
import RichiamataAI from './RichiamataAi';

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
// MODAL NUOVO CLIENTE
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
// MODAL NUOVO ANIMALE
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

      <div style={{ marginBottom: 10 }}>
        <div style={secLabel}>Nome *</div>
        <input autoFocus value={f.nome} onChange={e => set('nome', e.target.value)} placeholder="Rex, Luna..." style={inputStyle} />
      </div>

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
  const [searchMode, setSearchMode]     = useState('cliente');
  const [cercaAnimaleQuery, setCercaAnimaleQuery] = useState('');
  const [tuttiAnimali, setTuttiAnimali] = useState([]);
  const [showNuovoAnimale, setShowNuovoAnimale] = useState(false);

  const initClienteId   = appuntamento?.clienti?.id   || appuntamento?.cliente_id   || '';
  // Supporto multi-animale: legge da appuntamenti_animali se disponibile, altrimenti fallback su animale_id
  const initAnimaliIds  = appuntamento?._animaliIds?.length > 0
    ? appuntamento._animaliIds
    : (appuntamento?.animali?.id ? [appuntamento.animali.id] : []);
  const initOperatoreId = appuntamento?.operatori?.id || appuntamento?.operatore_id || '';
  const initData = appuntamento?.inizio
    ? new Date(appuntamento.inizio).toISOString().split('T')[0]
    : dataInizio ? dataInizio.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  const initOra = appuntamento?.inizio
    ? new Date(appuntamento.inizio).toTimeString().slice(0,5)
    : dataInizio ? dataInizio.toTimeString().slice(0,5) : '09:00';

  const [f, setF] = useState({
    cliente_id:    initClienteId,
    animali_ids:   initAnimaliIds,
    operatore_id:  initOperatoreId,
    servizi_ids:   appuntamento?.servizi_ids || (appuntamento?.servizio_id ? [appuntamento.servizio_id] : []),
    data:          initData,
    ora_inizio:    initOra,
    durata_minuti: 60,
    durata_auto:   true,
    note:          appuntamento?.note || '',
    stato:         appuntamento?.stato || 'confermato',
    blocco_orario: false,
    prezzo_proposto:        appuntamento?.prezzo_proposto || '',
    prezzo_confermato:      appuntamento?.prezzo_confermato || '',
    prezzo_confermato_flag: appuntamento?.prezzo_confermato_flag || false,
    metodo_pagamento:       appuntamento?.metodo_pagamento || 'contanti',
  });
  const [loading, setSaving] = useState(false);
  const [error, setError] = useState('');

  // ── Suggerimento prossimo appuntamento ──
  const [showSuggerimento, setShowSuggerimento] = useState(false);
  const [suggerimentoData, setSuggerimentoData] = useState(null);
  const [creandoProssimo,  setCreandoProssimo]  = useState(false);

  // ── Check-in fotografico ──
  const [showFotoCheckin,  setShowFotoCheckin]  = useState(false);
  const [fotoCheckinUrls,  setFotoCheckinUrls]  = useState({ prima: null, dopo: null });
  const [fotoCheckinBlobs, setFotoCheckinBlobs] = useState({ prima: null, dopo: null });
  const [savingFoto,       setSavingFoto]       = useState(false);
  const fotoInputPrimaRef = useRef(null);
  const fotoInputDopoRef  = useRef(null);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // ── Calcola frequenza media e suggerisce prossimo appuntamento ──
  const calcolaSuggerimento = async (animaleId, dataCompletata) => {
    const { data: storico } = await supabase
      .from('appuntamenti')
      .select('inizio')
      .eq('animale_id', animaleId)
      .eq('stato', 'completato')
      .order('inizio', { ascending: false })
      .limit(10);
    if (!storico || storico.length < 2) return null;
    const intervalli = [];
    for (let i = 0; i < storico.length - 1; i++) {
      const diff = (new Date(storico[i].inizio) - new Date(storico[i+1].inizio)) / (1000*60*60*24);
      intervalli.push(Math.abs(diff));
    }
    const freqGiorni = Math.round(intervalli.reduce((a,b)=>a+b,0) / intervalli.length);
    const prossima   = new Date(new Date(dataCompletata).getTime() + freqGiorni * 24*60*60*1000);
    return { freqGiorni, prossima };
  };

  // ── Gestione foto check-in ──
  const handleFotoSelect = (tipo, file) => {
    if (!file) return;
    setFotoCheckinUrls(p => ({ ...p, [tipo]: URL.createObjectURL(file) }));
    setFotoCheckinBlobs(p => ({ ...p, [tipo]: file }));
  };

  const salvaFotoCheckin = async (apId) => {
    setSavingFoto(true);
    for (const tipo of ['prima','dopo']) {
      const blob = fotoCheckinBlobs[tipo];
      if (!blob) continue;
      const path = `checkin/${apId}/${tipo}_${Date.now()}.jpg`;
      await supabase.storage.from('appuntamenti-foto').upload(path, blob, { contentType: blob.type });
    }
    setSavingFoto(false);
    setShowFotoCheckin(false);
    setFotoCheckinUrls({ prima: null, dopo: null });
    setFotoCheckinBlobs({ prima: null, dopo: null });
  };

  useEffect(() => {
    const load = async () => {
      const promises = [
        supabase.from('clienti').select('id,nome,cognome,telefono,prezzo_riservato').order('cognome'),
        supabase.from('servizi').select('id,nome,durata_minuti,prezzo').order('nome'),
        supabase.from('razze').select('id,nome,specie').order('nome'),
      ];
      if (appuntamento?.id) {
        promises.push(
          supabase.from('appuntamenti_servizi')
            .select('servizio_id, prezzo_applicato')
            .eq('appuntamento_id', appuntamento.id)
        );
        promises.push(
          supabase.from('appuntamenti_animali')
            .select('animale_id')
            .eq('appuntamento_id', appuntamento.id)
        );
      }
      const [cl, sv, rz, apSv, apAn] = await Promise.all(promises);
      setClienti(cl.data || []);
      setServizi(sv.data || []);
      setRazze(rz.data || []);
      if (apSv?.data?.length > 0) {
        set('servizi_ids', apSv.data.map(r => r.servizio_id));
      }
      if (apAn?.data?.length > 0) {
        set('animali_ids', apAn.data.map(r => r.animale_id));
      }
      setServiziCaricati(true);
      supabase.from('animali')
        .select('id,nome,specie,cliente_id,problemi_carattere,problemi_salute,servizi_riservati_ids,durata_riservata,clienti(id,nome,cognome)')
        .order('nome')
        .then(({ data }) => setTuttiAnimali(data || []));
    };
    load();
  }, []);

  useEffect(() => {
    if (!f.cliente_id) { setAnimali([]); return; }
    supabase.from('animali').select('id,nome,specie,razze(nome),problemi_carattere,problemi_salute,servizi_riservati_ids,durata_riservata')
      .eq('cliente_id', f.cliente_id).order('nome')
      .then(({ data }) => setAnimali(data || []));
  }, [f.cliente_id]);

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
    if (!f.blocco_orario && f.animali_ids.length === 0) { setError('Seleziona almeno un animale'); return; }
    if (!f.operatore_id) { setError('Seleziona un operatore'); return; }
    setSaving(true); setError('');

    try {
      const inizio = new Date(`${f.data}T${f.ora_inizio}`);
      const fine   = new Date(inizio.getTime() + f.durata_minuti * 60000);

      // animale_id principale = primo selezionato (retrocompatibilità)
      const animaleIdPrimario = f.blocco_orario ? null : (f.animali_ids[0] || null);

      const payload = {
        cliente_id:             f.blocco_orario ? null : f.cliente_id,
        animale_id:             animaleIdPrimario,
        operatore_id:           f.operatore_id,
        servizio_id:            f.servizi_ids[0] || null,
        inizio:                 inizio.toISOString(),
        fine:                   fine.toISOString(),
        note:                   f.note.trim() || null,
        stato:                  f.stato,
        prezzo_proposto:        f.prezzo_proposto !== '' ? Number(f.prezzo_proposto) : null,
        prezzo_confermato:      f.prezzo_confermato !== '' ? Number(f.prezzo_confermato) : null,
        prezzo_confermato_flag: f.prezzo_confermato_flag,
        metodo_pagamento:       f.metodo_pagamento,
      };

      const SELECT = `
        id, inizio, fine, stato, note, prezzo_proposto, prezzo_confermato, prezzo_confermato_flag, metodo_pagamento,
        clienti(id,nome,cognome),
        animali(id,nome,specie,problemi_carattere,problemi_salute),
        operatori(id,nome,cognome,colore)
      `;

      const saloneId = await getSaloneId();
      let result;
      if (isEdit) {
        result = await supabase.from('appuntamenti').update(payload).eq('id', appuntamento.id).select(SELECT).single();
      } else {
        result = await supabase.from('appuntamenti').insert([{ ...payload, salone_id: saloneId }]).select(SELECT).single();
      }

      if (result.error) { setError(result.error.message); setSaving(false); return; }

      const apId = result.data.id;

      // Salva servizi
      await supabase.from('appuntamenti_servizi').delete().eq('appuntamento_id', apId);
      if (f.servizi_ids.length > 0) {
        const righeServizi = f.servizi_ids.map(sid => {
          const sv = servizi.find(x => x.id === sid);
          return { appuntamento_id: apId, servizio_id: sid, prezzo_applicato: sv?.prezzo || null };
        });
        await supabase.from('appuntamenti_servizi').insert(righeServizi.map(r => ({ ...r, salone_id: saloneId })));
      }

      // Salva animali multipli nella junction table
      await supabase.from('appuntamenti_animali').delete().eq('appuntamento_id', apId);
      if (!f.blocco_orario && f.animali_ids.length > 0) {
        await supabase.from('appuntamenti_animali').insert(
          f.animali_ids.map(aid => ({ appuntamento_id: apId, animale_id: aid, salone_id: saloneId }))
        );
      }

      const serviziAssociati = f.servizi_ids.map(sid => servizi.find(x => x.id === sid)).filter(Boolean);
      // Arricchisci il risultato con tutti gli animali per aggiornare il calendario
      const animaliAssociati = f.animali_ids.map(aid => [...animali, ...tuttiAnimali].find(x => x.id === aid)).filter(Boolean);
      onSaved({ ...result.data, _serviziMultipli: serviziAssociati, _animaliIds: f.animali_ids, _animaliMultipli: animaliAssociati });

      // Se completato → calcola prossima visita, salva su animale, crea notifica recall
      if (f.stato === 'completato' && f.animali_ids.length > 0) {
        setShowFotoCheckin(true);

        // Per ogni animale coinvolto: calcola prossima visita e crea notifica recall
        Promise.all(f.animali_ids.map(async (animaleId) => {
          try {
            // 1. Leggi il record animale per vedere se ha frequenza esplicita
            const { data: animaleData } = await supabase
              .from('animali')
              .select('id, nome, frequenza_toeletta_giorni, cliente_id, clienti(id, nome, cognome, telefono)')
              .eq('id', animaleId)
              .single();

            if (!animaleData) return;

            // 2. Calcola frequenza: usa quella esplicita, fallback sullo storico
            let freqGiorni = animaleData.frequenza_toeletta_giorni;
            if (!freqGiorni) {
              const sug = await calcolaSuggerimento(animaleId, result.data.inizio);
              if (sug) freqGiorni = sug.freqGiorni;
            }


            // 3. Calcola data prossima visita
            const prossimaData = new Date(new Date(result.data.inizio).getTime() + freqGiorni * 24 * 60 * 60 * 1000);
            const prossimaISO  = prossimaData.toISOString().slice(0, 10);

            // 4. Salva prossima_visita_attesa sull'animale
            await supabase
              .from('animali')
              .update({ prossima_visita_attesa: prossimaISO })
              .eq('id', animaleId);

            // 5. Crea notifica recall — viene mostrata nella campanella N giorni prima
            //    La notifica ha data = prossima_visita_attesa così è facile filtrarla
            const cliente = animaleData.clienti;
            await supabase.from('notifiche').insert({
              tipo:         'recall',
              animale_id:   animaleId,
              cliente_id:   animaleData.cliente_id,
              messaggio:    `${animaleData.nome} — prossima toeletta prevista il ${prossimaData.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })} (ogni ${freqGiorni} giorni)`,
              telefono_cliente: cliente?.telefono || null,
              letto:        false,
              created_at:   new Date().toISOString(),
              appuntamento_id: result.data.id,
              salone_id:    saloneId,
            });

            // 6. Suggerimento UI solo per il primo animale (comportamento esistente)
            if (animaleId === f.animali_ids[0]) {
              setSuggerimentoData({
                freqGiorni,
                prossima: prossimaData,
                apData:   result.data,
              });
            }
          } catch (e) {
            console.error('[Recall] Errore per animale', animaleId, e);
          }
        }));

        return;
      }
      onClose();
    } catch (err) {
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

  const clienteSelezionato = clienti.find(c => c.id === f.cliente_id)
    || (appuntamento?.clienti?.id === f.cliente_id ? appuntamento.clienti : null);

  // Quando viene selezionato UN SOLO animale, applica i suoi preset (servizi/durata riservati)
  useEffect(() => {
    if (f.animali_ids.length !== 1 || isEdit) return;
    const a = [...animali, ...tuttiAnimali].find(x => x.id === f.animali_ids[0]);
    if (!a) return;
    if (a.servizi_riservati_ids?.length > 0) { set('servizi_ids', a.servizi_riservati_ids); set('durata_auto', true); }
    if (a.durata_riservata) { set('durata_minuti', a.durata_riservata); set('durata_auto', false); }
  }, [f.animali_ids, animali]);

  useEffect(() => {
    if (!f.cliente_id || !clienti.length) return;
    if (isEdit && f.prezzo_proposto !== '') return;
    const c = clienti.find(x => x.id === f.cliente_id);
    if (c?.prezzo_riservato) set('prezzo_proposto', String(c.prezzo_riservato));
  }, [f.cliente_id, clienti]);

  useEffect(() => {
    if (f.servizi_ids.length === 0) return;
    if (isEdit && f.prezzo_proposto !== '' && !serviziCaricati) return;
    const cliente = clienti.find(x => x.id === f.cliente_id);
    if (cliente?.prezzo_riservato) { set('prezzo_proposto', String(cliente.prezzo_riservato)); return; }
    const tot = f.servizi_ids.reduce((acc, sid) => acc + Number(servizi.find(x => x.id === sid)?.prezzo || 0), 0);
    if (tot > 0) set('prezzo_proposto', String(tot));
  }, [f.servizi_ids, servizi]);

  const isMobile = window.innerWidth < 640;
  const isTablet = window.innerWidth >= 640 && window.innerWidth < 1280;
  // Su tablet la sidebar occupa spazio a sinistra: lo leggiamo dal DOM
  const sidebarOffset = isTablet ? (document.querySelector('.sidebar')?.offsetWidth ?? 240) : 0;

  return (
    <motion.div
  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
  drag={false}                          // ← blocca il drag su touch
  onPan={() => {}}                      // ← assorbe eventuali pan gesture
  style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: sidebarOffset, zIndex: 200,
    background: 'rgba(10,24,64,0.45)',
    WebkitBackdropFilter: 'blur(10px)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: isMobile ? 'flex-start' : 'center',
    justifyContent: 'center',
    paddingTop: isMobile ? 'calc(env(safe-area-inset-top) + 12px)' : 20,
    paddingBottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 12px)' : 20,
    paddingLeft: 12,
    paddingRight: 12,
    touchAction: 'pan-y',
  }}
  onClick={e => e.target === e.currentTarget && onClose()}
     >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ ...glass, padding: isMobile ? 16 : 24, width: '100%', maxWidth: isTablet ? 820 : 680,
          maxHeight: isMobile
            ? 'calc(100dvh - env(safe-area-inset-top) - env(safe-area-inset-bottom) - 100px)'
            : 'calc(100dvh - 40px)',
          overflowY: 'auto', overflowX: 'clip' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
            {isEdit ? 'Modifica appuntamento' : 'Nuovo appuntamento'}
          </div>
          <button onClick={onClose} style={{ background: 'var(--card-bg-sm)', border: '1px solid var(--card-border)',
            borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 18,
            color: 'var(--text-secondary)', fontFamily: 'inherit' }}>×</button>
        </div>

        {/* Data e ora */}
        <div className="date-time-grid" style={{ marginBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={secLabel}>Data</div>
            <input type="date" value={f.data} onChange={e => set('data', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={secLabel}>Ora inizio</div>
            <input type="time" value={f.ora_inizio} onChange={e => set('ora_inizio', e.target.value)} style={{ ...inputStyle, fontSize: 13 }} />
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
                background: f.stato === s ? ({ confermato:'rgba(37,99,235,0.15)', 'in attesa':'rgba(217,119,6,0.15)', completato:'rgba(5,150,105,0.15)', cancellato:'rgba(220,38,38,0.15)' }[s]) : 'transparent',
                color: f.stato === s ? ({ confermato:'#2563eb', 'in attesa':'#d97706', completato:'#059669', cancellato:'#dc2626' }[s]) : 'var(--text-muted)',
              }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Blocco orario */}
        <div style={{ marginBottom: 16 }}>
          <button onClick={() => set('blocco_orario', !f.blocco_orario)} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
            border: `1px solid ${f.blocco_orario ? 'rgba(220,38,38,0.3)' : 'var(--card-border)'}`,
            background: f.blocco_orario ? 'rgba(220,38,38,0.08)' : 'var(--card-bg-sm)',
          }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
              background: f.blocco_orario ? '#dc2626' : 'var(--card-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {f.blocco_orario && <span style={{ fontSize: 11, color: '#fff', lineHeight: 1 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: f.blocco_orario ? '#dc2626' : 'var(--text-primary)' }}>Blocca orario</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>Riserva lo slot senza associare un cliente</div>
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
            <input placeholder="Nome animale..." value={cercaAnimaleQuery}
              onChange={e => setCercaAnimaleQuery(e.target.value)} style={inputStyle} autoComplete="off" />
            {cercaAnimaleQuery.length > 1 && (() => {
              const filtrati = tuttiAnimali.filter(a => a.nome.toLowerCase().includes(cercaAnimaleQuery.toLowerCase())).slice(0, 15);
              return filtrati.length > 0 ? (
                <div style={{ ...glassCard, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                  {filtrati.map(a => (
                    <button key={a.id} onMouseDown={e => { e.preventDefault(); set('cliente_id', a.cliente_id); set('animali_ids', [a.id]); setCercaAnimaleQuery(''); }}
                      style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none',
                        borderBottom: '1px solid var(--card-border-sm)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display:'flex', alignItems:'center', gap:6 }}>
                        <span>{a.specie === 'gatto' ? '🐈' : '🐕'} {a.nome}</span>
                        {(a.problemi_salute || a.problemi_carattere) && <span>⚠️</span>}
                        {(a.servizi_riservati_ids?.length > 0 || a.durata_riservata) && (
                          <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>★</span>
                        )}
                      </div>
                      {a.clienti && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.clienti.cognome} {a.clienti.nome}</div>}
                    </button>
                  ))}
                </div>
              ) : <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Nessun animale trovato</div>;
            })()}
          </div>
        )}

        {/* Ricerca cliente */}
        {!f.blocco_orario && (searchMode === 'cliente' || f.cliente_id) && (
          <div style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={secLabel}>Cliente *</div>
              {!showNuovoCliente && (
                <button onClick={() => setShowNuovoCliente(true)} style={{ fontSize: 11, fontWeight: 600, color: '#2563eb',
                  background: 'rgba(37,99,235,0.1)', border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Nuovo cliente
                </button>
              )}
            </div>
            {clienteSelezionato ? (
              <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{clienteSelezionato.cognome} {clienteSelezionato.nome}</div>
                  {clienteSelezionato.telefono && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{clienteSelezionato.telefono}</div>}
                </div>
                <button onClick={() => { set('cliente_id', ''); set('animale_id', ''); setCercaCliente(''); setSearchMode('cliente'); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
              </div>
            ) : (
              <>
                <input placeholder="Cerca per nome o telefono..." value={cercaCliente}
                  onChange={e => setCercaCliente(e.target.value)} style={inputStyle} />
                {cercaCliente && clientiFiltrati.length > 0 && (
                  <div style={{ ...glassCard, marginTop: 4, maxHeight: 160, overflowY: 'auto' }}>
                    {clientiFiltrati.slice(0, 5).map(c => (
                      <button key={c.id} onClick={() => { set('cliente_id', c.id); setCercaCliente(''); }}
                        style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none',
                          border: 'none', borderBottom: '1px solid var(--card-border)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
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
                  onSaved={(c) => { setClienti(prev => [...prev, c].sort((a,b) => a.cognome.localeCompare(b.cognome))); set('cliente_id', c.id); setShowNuovoCliente(false); }}
                  onCancel={() => setShowNuovoCliente(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Selezione animale — multi-select */}
        {!f.blocco_orario && f.cliente_id && (
          <div style={{ marginBottom: 16, marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={secLabel}>
                Animale{animali.length > 1 ? 'i' : ''} *
                {f.animali_ids.length > 1 && (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'rgba(37,99,235,0.15)',
                    color: '#2563eb', borderRadius: 6, padding: '1px 6px' }}>
                    {f.animali_ids.length} selezionati
                  </span>
                )}
              </div>
              {!showNuovoAnimale && (
                <button onClick={() => setShowNuovoAnimale(true)} style={{ fontSize: 11, fontWeight: 600, color: '#059669',
                  background: 'rgba(5,150,105,0.1)', border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Nuovo animale
                </button>
              )}
            </div>
            {animali.length === 0
              ? <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>Nessun animale per questo cliente</div>
              : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {animali.map(a => {
                    const sel = f.animali_ids.includes(a.id);
                    return (
                      <button key={a.id} onClick={() => {
                        set('animali_ids', sel
                          ? f.animali_ids.filter(x => x !== a.id)
                          : [...f.animali_ids, a.id]
                        );
                      }} style={{
                        padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                        border: `1.5px solid ${sel ? 'rgba(37,99,235,0.5)' : 'var(--card-border)'}`,
                        background: sel ? 'rgba(37,99,235,0.15)' : 'var(--card-bg-sm)',
                        color: sel ? '#2563eb' : 'var(--text-primary)',
                        boxShadow: sel ? '0 2px 0 rgba(255,255,255,0.9) inset' : 'none',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <span style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${sel ? '#2563eb' : 'var(--text-muted)'}`,
                          background: sel ? '#2563eb' : 'transparent', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {sel && <span style={{ fontSize: 10, color: '#fff', lineHeight: 1 }}>✓</span>}
                        </span>
                        {a.specie === 'gatto' ? '🐈' : '🐕'} {a.nome}
                        {a.razze?.nome && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({a.razze.nome})</span>}
                        {(a.servizi_riservati_ids?.length > 0 || a.durata_riservata) && (
                          <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.15)', color: '#2563eb', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            <AnimatePresence>
              {showNuovoAnimale && (
                <FormNuovoAnimale clienteId={f.cliente_id} razze={razze}
                  onSaved={(a) => { setAnimali(prev => [...prev, a]); set('animali_ids', [...f.animali_ids, a.id]); setShowNuovoAnimale(false); }}
                  onCancel={() => setShowNuovoAnimale(false)} />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Alert problemi animali selezionati */}
        {(() => {
          const animaliConProblemi = f.animali_ids
            .map(id => animali.find(x => x.id === id))
            .filter(a => a?.problemi_salute?.trim() || a?.problemi_carattere?.trim());
          if (animaliConProblemi.length === 0) return null;
          return (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 16, borderRadius: 14, background: 'rgba(234,179,8,0.10)',
                border: '1.5px solid rgba(234,179,8,0.35)', padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, flexShrink: 0, lineHeight: 1 }}>⚠️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#b45309', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Attenzione — note sugli animali
                </div>
                {animaliConProblemi.map(a => (
                  <div key={a.id} style={{ marginBottom: animaliConProblemi.length > 1 ? 8 : 0 }}>
                    {animaliConProblemi.length > 1 && (
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {a.specie === 'gatto' ? '🐈' : '🐕'} {a.nome}
                      </div>
                    )}
                    {a.problemi_salute && <div style={{ fontSize: 12, color: 'var(--text-primary)', marginBottom: a.problemi_carattere ? 2 : 0 }}><span style={{ fontWeight: 600 }}>Salute:</span> {a.problemi_salute}</div>}
                    {a.problemi_carattere && <div style={{ fontSize: 12, color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>Carattere:</span> {a.problemi_carattere}</div>}
                  </div>
                ))}
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
                  padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  border: `1px solid ${sel ? colore + '60' : 'var(--card-border)'}`,
                  background: sel ? colore + '20' : 'var(--card-bg-sm)',
                  color: sel ? colore : 'var(--text-primary)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: colore,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>
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
                  padding: '10px 14px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  border: `1px solid ${sel ? 'rgba(37,99,235,0.3)' : 'var(--card-border)'}`,
                  background: sel ? 'rgba(37,99,235,0.1)' : 'var(--card-bg-sm)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      background: sel ? '#2563eb' : 'var(--card-border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
                border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Usa consigliata ({durataConsigliata} min)
              </button>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input type="number" min="5" max="480" step="5" value={f.durata_minuti}
              onChange={e => { set('durata_minuti', e.target.value); set('durata_auto', false); }}
              style={{ ...inputStyle, width: 100 }} />
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              minuti — fine ore <strong style={{ color: 'var(--text-primary)' }}>{oraFine()}</strong>
            </div>
          </div>
          {durataConsigliata > 0 && Number(f.durata_minuti) !== durataConsigliata && (
            <div style={{ fontSize: 11, color: '#d97706', marginTop: 5 }}>
              La durata consigliata dai trattamenti selezionati è di {durataConsigliata} minuti
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Note</div>
          <textarea rows={3} placeholder="Note sull'appuntamento..." value={f.note}
            onChange={e => set('note', e.target.value)} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Prezzo */}
        {!f.blocco_orario && (
          <div style={{ marginBottom: 16 }}>
            <div style={secLabel}>Prezzo</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              {clienteSelezionato?.prezzo_riservato && (
                <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Riservato</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>€ {Number(clienteSelezionato.prezzo_riservato).toFixed(2)}</div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 140 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 5 }}>
                  {clienteSelezionato?.prezzo_riservato ? 'Prezzo applicato' : 'Prezzo proposto'}
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
                  <input type="number" min="0" step="0.50" placeholder="0.00" value={f.prezzo_proposto}
                    onChange={e => set('prezzo_proposto', e.target.value)} style={{ ...inputStyle, paddingLeft: 26 }} />
                </div>
              </div>
            </div>

            {/* Conferma prezzo — solo in modifica */}
            {isEdit && (
              <div style={{ marginTop: 12, padding: '14px', borderRadius: 14,
                background: f.prezzo_confermato_flag ? 'rgba(5,150,105,0.08)' : 'rgba(217,119,6,0.08)',
                border: `1px solid ${f.prezzo_confermato_flag ? 'rgba(5,150,105,0.25)' : 'rgba(217,119,6,0.25)'}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10,
                  color: f.prezzo_confermato_flag ? '#059669' : '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {f.prezzo_confermato_flag ? '✓ Prezzo confermato' : 'Conferma prezzo finale'}
                </div>
                {/* Toggle metodo pagamento */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[
                    { id: 'contanti', label: '💵 Contanti', activeColor: '#059669', activeBg: 'rgba(5,150,105,0.15)', activeBorder: 'rgba(5,150,105,0.4)' },
                    { id: 'pos',      label: '💳 POS',      activeColor: '#7c3aed', activeBg: 'rgba(124,58,237,0.15)', activeBorder: 'rgba(124,58,237,0.4)' },
                  ].map(m => {
                    const attivo = f.metodo_pagamento === m.id;
                    return (
                      <button key={m.id} onClick={() => set('metodo_pagamento', m.id)} style={{
                        flex: 1, padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                        border: `1px solid ${attivo ? m.activeBorder : 'var(--card-border)'}`,
                        background: attivo ? m.activeBg : 'transparent',
                        color: attivo ? m.activeColor : 'var(--text-muted)',
                        transition: 'all 0.15s',
                      }}>{m.label}</button>
                    );
                  })}
                </div>
                {/* Input + bottone */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
                    <input type="number" min="0" step="0.50" placeholder={f.prezzo_proposto || '0.00'} value={f.prezzo_confermato}
                      onChange={e => { set('prezzo_confermato', e.target.value); set('prezzo_confermato_flag', false); }}
                      style={{ ...inputStyle, paddingLeft: 26, borderColor: f.prezzo_confermato_flag ? 'rgba(5,150,105,0.4)' : 'var(--card-border)' }} />
                  </div>
                  <button onClick={() => { const val = f.prezzo_confermato || f.prezzo_proposto; set('prezzo_confermato', val); set('prezzo_confermato_flag', true); set('stato', 'completato'); }}
                    style={{ padding: '10px 16px', borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: 'none',
                      background: f.prezzo_confermato_flag ? 'linear-gradient(145deg,#34d399,#059669)' : 'linear-gradient(145deg,#fbbf24,#d97706)',
                      color: '#fff', whiteSpace: 'nowrap',
                      boxShadow: f.prezzo_confermato_flag ? '0 4px 12px rgba(5,150,105,0.35)' : '0 4px 12px rgba(217,119,6,0.35)' }}>
                    {f.prezzo_confermato_flag ? '✓ Confermato' : 'Conferma'}
                  </button>
                </div>
                {f.prezzo_confermato_flag && (
                  <div style={{ fontSize: 11, color: '#059669', marginTop: 8, fontWeight: 500 }}>
                    Prezzo finale: € {Number(f.prezzo_confermato).toFixed(2)} —{' '}
                    <span style={{ color: f.metodo_pagamento === 'pos' ? '#7c3aed' : '#059669', fontWeight: 700 }}>
                      {f.metodo_pagamento === 'pos' ? '💳 POS' : '💵 Contanti'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12,
            padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0,
          background: 'var(--btn-bar-bg, #0d2060)',
          marginLeft: isMobile ? -16 : -24, marginRight: isMobile ? -16 : -24,
          padding: isMobile ? '12px 16px' : '12px 24px',
          borderTop: '1px solid var(--card-border)', marginTop: 4 }}>
          {isEdit && <button onClick={deleteAppt} style={{ ...btnDanger, padding: '11px 14px' }}>Elimina</button>}
          <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
          <button onClick={save} disabled={loading} style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : 'Crea appuntamento'}
          </button>
        </div>

        {/* ── CHECK-IN FOTOGRAFICO ── */}
        {showFotoCheckin && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            style={{marginTop:20,padding:'18px',borderRadius:16,
              background:'rgba(5,150,105,0.08)',border:'1px solid rgba(5,150,105,0.25)'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#059669',marginBottom:4}}>
              📸 Check-in fotografico
            </div>
            <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:14}}>
              Aggiungi foto prima e dopo la toelettatura (opzionale)
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
              {['prima','dopo'].map(tipo => (
                <div key={tipo}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',
                    letterSpacing:'0.4px',marginBottom:6}}>{tipo === 'prima' ? '📷 Prima' : '✨ Dopo'}</div>
                  <div
                    onClick={() => tipo==='prima' ? fotoInputPrimaRef.current?.click() : fotoInputDopoRef.current?.click()}
                    style={{height:90,borderRadius:12,cursor:'pointer',overflow:'hidden',
                      border:`2px dashed ${fotoCheckinUrls[tipo] ? 'rgba(5,150,105,0.5)' : 'rgba(255,255,255,0.3)'}`,
                      background: fotoCheckinUrls[tipo] ? 'transparent' : 'rgba(255,255,255,0.05)',
                      display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {fotoCheckinUrls[tipo]
                      ? <img src={fotoCheckinUrls[tipo]} alt={tipo} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      : <span style={{fontSize:24}}>+</span>}
                  </div>
                </div>
              ))}
            </div>
            <input ref={fotoInputPrimaRef} type="file" accept="image/*" capture="environment" style={{display:'none'}}
              onChange={e => handleFotoSelect('prima', e.target.files[0])} />
            <input ref={fotoInputDopoRef}  type="file" accept="image/*" capture="environment" style={{display:'none'}}
              onChange={e => handleFotoSelect('dopo',  e.target.files[0])} />
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => { setShowFotoCheckin(false); if (!suggerimentoData) onClose(); }}
                style={{...btnSecondary,flex:1,padding:'9px',fontSize:13}}>Salta</button>
              <button onClick={() => salvaFotoCheckin(appuntamento?.id || suggerimentoData?.apData?.id).then(()=>{ if(!suggerimentoData) onClose(); })}
                disabled={savingFoto || (!fotoCheckinBlobs.prima && !fotoCheckinBlobs.dopo)}
                style={{...btnPrimary,flex:2,padding:'9px',fontSize:13,
                  opacity:(savingFoto||(!fotoCheckinBlobs.prima&&!fotoCheckinBlobs.dopo))?0.5:1}}>
                {savingFoto ? 'Salvataggio...' : '💾 Salva foto'}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SUGGERIMENTO PROSSIMO APPUNTAMENTO ── */}
        {suggerimentoData && !showFotoCheckin && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}}
            style={{marginTop:20,padding:'18px',borderRadius:16,
              background:'rgba(37,99,235,0.08)',border:'1px solid rgba(37,99,235,0.25)'}}>
            <div style={{fontSize:14,fontWeight:700,color:'#2563eb',marginBottom:4}}>
              📅 Vuoi fissare il prossimo appuntamento?
            </div>
            <div style={{fontSize:13,color:'var(--text-secondary)',marginBottom:12,lineHeight:1.5}}>
              In base alla frequenza storica ({suggerimentoData.freqGiorni} giorni in media),
              il prossimo appuntamento sarebbe verso il{' '}
              <strong style={{color:'var(--text-primary)'}}>
                {suggerimentoData.prossima.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}
              </strong>.
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onClose}
                style={{...btnSecondary,flex:1,padding:'9px',fontSize:13}}>Non ora</button>
              <button
                disabled={creandoProssimo}
                onClick={async () => {
                  setCreandoProssimo(true);
                  const ap = suggerimentoData.apData;
                  const dataStr = suggerimentoData.prossima.toISOString().split('T')[0];
                  const oraStr  = new Date(ap.inizio).toTimeString().slice(0,5);
                  const inizio  = new Date(`${dataStr}T${oraStr}`);
                  const fine    = new Date(inizio.getTime() + 60*60000);
                  const saloneIdNext = await getSaloneId();
                  const { data: nuovoAp } = await supabase.from('appuntamenti').insert([{
                    cliente_id:   ap.clienti?.id  || ap.cliente_id,
                    animale_id:   ap.animali?.id  || ap.animale_id,
                    operatore_id: ap.operatori?.id || ap.operatore_id,
                    inizio: inizio.toISOString(),
                    fine:   fine.toISOString(),
                    stato: 'in attesa',
                    salone_id: saloneIdNext,
                  }]).select('id,inizio,fine,stato,clienti(id,nome,cognome),animali(id,nome,specie),operatori(id,nome,colore)').single();
                  if (nuovoAp) onSaved(nuovoAp);
                  setCreandoProssimo(false);
                  setSuggerimentoData(null);
                  onClose();
                }}
                style={{...btnPrimary,flex:2,padding:'9px',fontSize:13,opacity:creandoProssimo?0.7:1}}>
                {creandoProssimo ? 'Creazione...' : `✓ Prenota per il ${suggerimentoData.prossima.toLocaleDateString('it-IT',{day:'numeric',month:'short'})}`}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// CALENDARIO PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function CalendarioView() {
  const calRef         = useRef(null);
  const dropdownRef    = useRef(null);
  const [operatori,    setOperatori]    = useState([]);
  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showModal,    setShowModal]    = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [clickedDate,  setClickedDate]  = useState(null);
  const [view,         setView]         = useState(() =>
    window.innerWidth < 640 ? 'timeGridDay' : 'timeGridWeek'
  );
  const [filtroOp,     setFiltroOp]     = useState('tutti');
  const filtroOpRef   = useRef('tutti');
  const refetchTimer  = useRef(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Debounce refetch — se arrivano più chiamate in 200ms parte una sola query
  const refetchEvents = useCallback(() => {
    clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(() => {
      calRef.current?.getApi().refetchEvents();
    }, 200);
  }, []);

  const setFiltroOpAndRefetch = (val) => {
    filtroOpRef.current = val;
    setFiltroOp(val);
    refetchEvents();
  };

  // Adatta la view al cambio orientamento / resize
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 640;
      setView(prev => {
        if (isMobile && prev === 'timeGridWeek') {
          calRef.current?.getApi().changeView('timeGridDay');
          return 'timeGridDay';
        }
        if (!isMobile && prev === 'timeGridDay') {
          calRef.current?.getApi().changeView('timeGridWeek');
          return 'timeGridWeek';
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Chiudi dropdown cliccando fuori
  useEffect(() => {
    const handler = e => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, []);

  useEffect(() => { fetchOperatori(); }, []);

  const fetchOperatori = async () => {
    const { data } = await supabase.from('operatori').select('id,nome,cognome,colore').eq('attivo', true).order('nome');
    setOperatori(data || []);
    setLoading(false);
  };

  // Funzione eventi lazy: chiamata da FullCalendar solo per il range visibile
  const fetchEvents = useCallback(async (fetchInfo, successCallback, failureCallback) => {
    try {
      const { data } = await supabase.from('appuntamenti').select(`
        id, inizio, fine, stato, note,
        prezzo_proposto, prezzo_confermato, prezzo_confermato_flag, metodo_pagamento,
        clienti(id,nome,cognome),
        animali(id,nome,specie,problemi_carattere,problemi_salute),
        operatori(id,nome,cognome,colore),
        appuntamenti_servizi(servizio_id, prezzo_applicato, servizi(id,nome,prezzo,durata_minuti)),
        appuntamenti_animali(animale_id, animali(id,nome,specie,problemi_carattere,problemi_salute))
      `)
        .neq('stato', 'cancellato')
        .gte('inizio', fetchInfo.startStr)
        .lte('fine',   fetchInfo.endStr);

      const ops = operatori.length > 0 ? operatori : (
        await supabase.from('operatori').select('id,nome,cognome,colore').eq('attivo', true).order('nome')
      ).data || [];

      if (operatori.length === 0) setOperatori(ops);
      const evts = apToEvents(data || [], ops);
      const filtrati = filtroOpRef.current === 'tutti'
        ? evts
        : evts.filter(e => e.extendedProps.operatoreId === filtroOpRef.current);
      setEvents(filtrati);
      successCallback(filtrati);
    } catch (e) {
      failureCallback(e);
    }
  }, [operatori]);

  const apToEvents = (appts, ops) => appts.map(a => {
    const op = ops.find(o => o.id === a.operatori?.id) || a.operatori;
    const idx = ops.findIndex(o => o.id === (op?.id || a.operatori?.id));
    const coloreBase = op?.colore || COLORI_OP[idx % COLORI_OP.length] || '#3b82f6';
    const prezzoOk = a.prezzo_confermato_flag;
    const colore = prezzoOk ? '#6b7280' : coloreBase;
    const serviziNomi = (a._serviziMultipli || a.appuntamenti_servizi || [])
      .map(r => (r.servizi || r)?.nome).filter(Boolean);

    // Animali: usa la junction table se disponibile, altrimenti fallback su animali singolo
    const animaliList = a._animaliMultipli
      || (a.appuntamenti_animali?.length > 0
          ? a.appuntamenti_animali.map(r => r.animali).filter(Boolean)
          : (a.animali ? [a.animali] : []));
    const animaliIds = a._animaliIds
      || (a.appuntamenti_animali?.length > 0
          ? a.appuntamenti_animali.map(r => r.animale_id)
          : (a.animale_id ? [a.animale_id] : []));

    const animaleNome = animaliList.length > 1
      ? animaliList.map(x => x.nome).join(' & ')
      : (animaliList[0]?.nome || '');

    const hasAlert = animaliList.some(x => x?.problemi_salute || x?.problemi_carattere);

    return {
      id:              a.id,
      title:           animaleNome || 'Appuntamento',
      start:           a.inizio,
      end:             a.fine,
      backgroundColor: colore + 'dd',
      borderColor:     colore,
      textColor:       '#fff',
      extendedProps:   {
        appuntamento:  { ...a, _animaliIds: animaliIds, _animaliMultipli: animaliList },
        coloreBase,
        prezzoOk,
        operatoreId:   a.operatori?.id || '',
        animaleNome,
        animaliCount:  animaliList.length,
        servizioNome:  serviziNomi,
        operatoreNome: op?.nome || '',
        hasAlert,
      },
    };
  });

  // Filtra eventi per operatore selezionato
  const opSelezionato = operatori.find(o => o.id === filtroOp);
  const coloreOpSel   = opSelezionato?.colore || '#2563eb';

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
    // Forza FullCalendar a ri-richiedere gli eventi per il range visibile
    refetchEvents();
    setShowModal(false);
  };

  const handleDeleted = id => {
    refetchEvents();
  };

  // ── Richiamata AI → apre modal precompilato ───────────────
  const handleRichiamata = ({ data_ora, _precompilato }) => {
    setSelectedAppt(_precompilato);
    setClickedDate(data_ora ? new Date(data_ora) : new Date());
    setShowModal(true);
  };

  const changeView = v => { setView(v); calRef.current?.getApi().changeView(v); };

  const VIEW_LABELS = { timeGridDay: 'Giorno', timeGridWeek: 'Settimana', dayGridMonth: 'Mese' };

  return (
    <div style={{ width: '100%' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>

        {/* Titolo */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Calendario</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {events.length}{filtroOp !== 'tutti' ? ` (filtrati)` : ''} appuntamenti
          </div>
        </div>

        {/* ── Dropdown operatori ── */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(p => !p)}
            style={{
              ...glassCard,
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', cursor: 'pointer', border: '1px solid var(--card-border)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              color: filtroOp === 'tutti' ? 'var(--text-primary)' : coloreOpSel,
              minWidth: 160,
            }}
          >
            {filtroOp === 'tutti' ? (
              <>
                <div style={{ display: 'flex', gap: -4 }}>
                  {operatori.slice(0, 3).map((op, i) => (
                    <div key={op.id} style={{ width: 18, height: 18, borderRadius: '50%',
                      background: op.colore || COLORI_OP[i], border: '2px solid var(--card-bg)',
                      marginLeft: i > 0 ? -6 : 0, fontSize: 8, fontWeight: 700, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {op.nome[0]}
                    </div>
                  ))}
                </div>
                <span style={{ flex: 1 }}>Tutti gli operatori</span>
              </>
            ) : (
              <>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: coloreOpSel,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {opSelezionato?.nome[0]}
                </div>
                <span style={{ flex: 1 }}>{opSelezionato?.nome}</span>
              </>
            )}
            {/* Chevron */}
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                  minWidth: 200, zIndex: 9999,
                  background: 'var(--dropdown-bg, #fff)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  overflow: 'hidden',
                }}
              >
                {/* Tutti */}
                <button onClick={() => { setFiltroOpAndRefetch('tutti'); setDropdownOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '11px 14px', background: filtroOp === 'tutti' ? 'rgba(37,99,235,0.08)' : 'none',
                    border: 'none', borderBottom: '1px solid var(--card-border)',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                  <div style={{ display: 'flex' }}>
                    {operatori.slice(0, 3).map((op, i) => (
                      <div key={op.id} style={{ width: 20, height: 20, borderRadius: '50%',
                        background: op.colore || COLORI_OP[i], border: '2px solid var(--dropdown-bg, #fff)',
                        marginLeft: i > 0 ? -6 : 0, fontSize: 9, fontWeight: 700, color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {op.nome[0]}
                      </div>
                    ))}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: filtroOp === 'tutti' ? '#2563eb' : 'var(--text-primary)' }}>
                    Tutti gli operatori
                  </span>
                  {filtroOp === 'tutti' && <span style={{ marginLeft: 'auto', color: '#2563eb', fontSize: 14 }}>✓</span>}
                </button>

                {/* Lista operatori */}
                {operatori.map((op, i) => {
                  const colore = op.colore || COLORI_OP[i % COLORI_OP.length];
                  const sel = filtroOp === op.id;
                  return (
                    <button key={op.id} onClick={() => { setFiltroOpAndRefetch(op.id); setDropdownOpen(false); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                        padding: '11px 14px', background: sel ? colore + '12' : 'none',
                        border: 'none', borderBottom: '1px solid var(--card-border)',
                        cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: colore, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff' }}>
                        {op.nome[0]}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: sel ? colore : 'var(--text-primary)', flex: 1 }}>
                        {op.nome} {op.cognome}
                      </span>
                      {sel && <span style={{ color: colore, fontSize: 14 }}>✓</span>}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Selettore vista */}
        <div style={{ ...glassCard, display: 'flex', gap: 3, padding: '5px' }}>
          {Object.entries(VIEW_LABELS).map(([v, label]) => (
            <motion.button key={v} onClick={() => changeView(v)} whileTap={{ scale: 0.95 }} style={{
              padding: '7px 14px', borderRadius: 11, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all 0.2s',
              background: view === v ? 'var(--card-bg)' : 'transparent',
              color: view === v ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: view === v ? 'var(--card-shadow-sm)' : 'none',
            }}>{label}</motion.button>
          ))}
        </div>

        {/* Nuovo appuntamento */}
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => { setSelectedAppt(null); setClickedDate(new Date()); setShowModal(true); }}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuovo appuntamento
        </motion.button>
      </motion.div>

      {/* ── Calendario ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }} style={{ ...glass, padding: 10, overflow: 'hidden' }}>
        <style>{`
          :root { --dropdown-bg: #ffffff; }
          @media (prefers-color-scheme: dark) { :root { --dropdown-bg: #1a2d5a; } }
          .fc { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
          .fc .fc-toolbar { gap: 8px; flex-wrap: wrap; margin-bottom: 8px !important; }
          .fc .fc-toolbar-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
          .fc .fc-button {
            background: var(--card-bg-sm) !important; border: 1px solid var(--card-border) !important;
            color: var(--text-primary) !important; border-radius: 10px !important;
            font-family: inherit !important; font-size: 13px !important;
            font-weight: 600 !important; padding: 6px 12px !important; box-shadow: none !important;
          }
          .fc .fc-button:hover { background: var(--card-bg) !important; }
          .fc .fc-button-active { background: var(--card-bg) !important; }
          .fc-theme-standard td, .fc-theme-standard th { border-color: var(--card-border-sm) !important; }
          .fc .fc-event { border-radius: 8px !important; cursor: pointer !important; overflow: hidden !important; border-width: 2px !important; }
          .fc .fc-event:hover { filter: brightness(1.08) !important; transform: translateY(-1px) !important; transition: all 0.12s ease !important; }
          .fc .fc-event-main { padding: 0 !important; height: 100% !important; overflow: hidden !important; }
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

        <FullCalendar
            ref={calRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={view}
            locale={itLocale}
            events={fetchEvents}
            editable={true}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={3}
            slotMinTime="09:00:00"
            slotMaxTime="19:00:00"
            slotDuration="00:15:00"
            slotLabelInterval="01:00"
            allDaySlot={false}
            nowIndicator={true}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
            eventClick={handleEventClick}
            dateClick={handleDateClick}
            eventDrop={handleEventDrop}
            height="calc(100dvh - 130px)"
            expandRows={true}
            eventContent={({ event, timeText }) => {
              const { animaleNome, animaliCount, servizioNome, operatoreNome, prezzoOk, hasAlert } = event.extendedProps;
              const servizi = Array.isArray(servizioNome) ? servizioNome : (servizioNome ? [servizioNome] : []);
              return (
                <div style={{ padding: '3px 6px', height: '100%', display: 'flex', flexDirection: 'column',
                  justifyContent: 'flex-start', overflow: 'hidden', gap: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
                    {prezzoOk && (
                      <div style={{ width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg,#a3e635,#22c55e)',
                        border: '1.5px solid rgba(255,255,255,0.9)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 1px 4px rgba(34,197,94,0.6)' }}>
                        <svg width="7" height="7" viewBox="0 0 10 10" fill="none">
                          <path d="M2 5l2.5 2.5 3.5-4" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    )}
                    {hasAlert && <div style={{ fontSize: 11, flexShrink: 0, lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>⚠️</div>}
                    {animaliCount > 1 && (
                      <div style={{ fontSize: 9, fontWeight: 800, flexShrink: 0, background: 'rgba(255,255,255,0.25)',
                        borderRadius: 4, padding: '1px 4px', lineHeight: 1.4 }}>×{animaliCount}</div>
                    )}
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
                      {animaleNome}
                    </span>
                    {operatoreNome && filtroOp === 'tutti' && (
                      <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.75, whiteSpace: 'nowrap', flexShrink: 0 }}>
                        {operatoreNome}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.80, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.2 }}>
                    {timeText}
                  </div>
                  {servizi.length > 0 && (
                    <div style={{ fontSize: 11, opacity: 0.78, lineHeight: 1.3 }}>
                      <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{servizi[0]}</div>
                      {servizi.length > 1 && (
                        <div style={{ opacity: 0.65, fontStyle: 'italic' }}>+{servizi.length - 1} {servizi.length - 1 === 1 ? 'altro' : 'altri'}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            }}
          />
      </motion.div>

      {/* Modal */}
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

      {/* ── Richiamata AI ── */}
      <RichiamataAI onAppuntamentoRilevato={handleRichiamata} />
    </div>
  );
}