/**
 * ListaAttesaView.jsx
 * Gestione lista d'attesa — clienti che vogliono un appuntamento
 * su uno slot già occupato. Quando si libera uno slot, si notifica
 * il primo in lista e si può creare subito l'appuntamento.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

const glass = {
  background:  'var(--card-bg)',
  border:      '1px solid var(--card-border)',
  borderRadius: 20,
  boxShadow:   'var(--card-shadow)',
};
const glassCard = {
  background:  'var(--card-bg-sm)',
  border:      '1px solid var(--card-border-sm)',
  borderRadius: 16,
  boxShadow:   'var(--card-shadow-sm)',
};
const inputStyle = {
  width:'100%', background:'var(--input-bg)',
  border:'1px solid var(--card-border)', borderRadius:12,
  padding:'10px 14px', fontSize:14, color:'var(--text-primary)',
  fontFamily:'inherit', outline:'none',
};
const btnPrimary = {
  background:'linear-gradient(145deg,#5aabff,#2060dd)', color:'#fff',
  border:'none', borderRadius:13, padding:'11px 18px',
  fontSize:14, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
  boxShadow:'0 4px 14px rgba(50,100,220,0.35)',
};
const btnSecondary = {
  background:'var(--input-bg)', color:'var(--text-secondary)',
  border:'1px solid var(--card-border)', borderRadius:13,
  padding:'11px 18px', fontSize:14, fontWeight:600,
  cursor:'pointer', fontFamily:'inherit',
};
const secLabel = {
  fontSize:11, fontWeight:700, color:'var(--text-muted)',
  letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:8,
};

const PRIORITA = [
  { val:'alta',   label:'Alta',   color:'#dc2626', bg:'rgba(220,38,38,0.1)'   },
  { val:'media',  label:'Media',  color:'#d97706', bg:'rgba(217,119,6,0.1)'   },
  { val:'bassa',  label:'Bassa',  color:'#059669', bg:'rgba(5,150,105,0.1)'   },
];

const specieEmoji = s => s === 'gatto' ? '🐈' : s === 'coniglio' ? '🐇' : '🐕';

function ModalAggiungi({ onClose, onSaved }) {
  const [clienti,   setClienti]   = useState([]);
  const [animali,   setAnimali]   = useState([]);
  const [operatori, setOperatori] = useState([]);
  const [cercaC,    setCercaC]    = useState('');
  const [f, setF] = useState({
    cliente_id: '', animale_id: '', operatore_id: '',
    data_preferita: '', fascia_oraria: 'qualsiasi',
    servizio_richiesto: '', note: '', priorita: 'media',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  useEffect(() => {
    Promise.all([
      supabase.from('clienti').select('id,nome,cognome,telefono').order('cognome'),
      supabase.from('operatori').select('id,nome,colore').eq('attivo', true).order('nome'),
    ]).then(([cl, op]) => {
      setClienti(cl.data || []);
      setOperatori(op.data || []);
    });
  }, []);

  useEffect(() => {
    if (!f.cliente_id) { setAnimali([]); return; }
    supabase.from('animali').select('id,nome,specie').eq('cliente_id', f.cliente_id).order('nome')
      .then(({ data }) => setAnimali(data || []));
  }, [f.cliente_id]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const clientiFiltrati = clienti.filter(c =>
    `${c.cognome} ${c.nome} ${c.telefono||''}`.toLowerCase().includes(cercaC.toLowerCase())
  );

  const save = async () => {
    if (!f.cliente_id) { setError('Seleziona un cliente'); return; }
    setSaving(true); setError('');
    const { data, error: err } = await supabase.from('lista_attesa').insert([{
      cliente_id:          f.cliente_id,
      animale_id:          f.animale_id || null,
      operatore_id:        f.operatore_id || null,
      data_preferita:      f.data_preferita || null,
      fascia_oraria:       f.fascia_oraria,
      servizio_richiesto:  f.servizio_richiesto.trim() || null,
      note:                f.note.trim() || null,
      priorita:            f.priorita,
      stato:               'in_attesa',
    }]).select(`*, clienti(nome,cognome,telefono), animali(nome,specie), operatori(nome,colore)`).single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(data);
    onClose();
  };

  const clienteSel = clienti.find(c => c.id === f.cliente_id);

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(10,24,64,0.5)',
        backdropFilter:'blur(8px)', WebkitBackdropFilter:'blur(8px)',
        display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <motion.div initial={{ opacity:0, y:20, scale:0.97 }} animate={{ opacity:1, y:0, scale:1 }}
        exit={{ opacity:0, y:10 }}
        style={{ ...glass, padding:24, width:'100%', maxWidth:500, maxHeight:'90dvh', overflowY:'auto' }}>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontSize:18, fontWeight:700, color:'var(--text-primary)', margin:0 }}>
            ➕ Aggiungi in lista d'attesa
          </h2>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer',
            fontSize:22, color:'var(--text-muted)', lineHeight:1 }}>×</button>
        </div>

        {/* Cliente */}
        <div style={{ marginBottom:14 }}>
          <div style={secLabel}>Cliente *</div>
          {clienteSel ? (
            <div style={{ ...glassCard, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text-primary)' }}>
                  {clienteSel.cognome} {clienteSel.nome}
                </div>
                {clienteSel.telefono && <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{clienteSel.telefono}</div>}
              </div>
              <button onClick={() => { set('cliente_id',''); set('animale_id',''); setCercaC(''); }}
                style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', fontSize:16 }}>×</button>
            </div>
          ) : (
            <div style={{ position:'relative' }}>
              <input value={cercaC} onChange={e=>setCercaC(e.target.value)}
                placeholder="Cerca cliente..." style={inputStyle} />
              {cercaC && clientiFiltrati.length > 0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:50,
                  ...glass, padding:8, marginTop:4, maxHeight:200, overflowY:'auto' }}>
                  {clientiFiltrati.slice(0,8).map(c => (
                    <button key={c.id}
                      onClick={() => { set('cliente_id', c.id); setCercaC(''); }}
                      style={{ display:'block', width:'100%', padding:'9px 12px', textAlign:'left',
                        background:'none', border:'none', cursor:'pointer', fontFamily:'inherit',
                        borderRadius:8, fontSize:14, color:'var(--text-primary)' }}>
                      {c.cognome} {c.nome}
                      {c.telefono && <span style={{ fontSize:12, color:'var(--text-muted)', marginLeft:8 }}>{c.telefono}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Animale */}
        {animali.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={secLabel}>Animale</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={() => set('animale_id','')}
                style={{ padding:'7px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                  fontSize:13, border:'1px solid var(--card-border)',
                  background: !f.animale_id ? 'rgba(37,99,235,0.12)' : 'var(--card-bg-sm)',
                  color: !f.animale_id ? '#2563eb' : 'var(--text-secondary)', fontWeight:600 }}>
                Qualsiasi
              </button>
              {animali.map(a => (
                <button key={a.id} onClick={() => set('animale_id', a.id)}
                  style={{ padding:'7px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                    fontSize:13, border:'1px solid var(--card-border)',
                    background: f.animale_id===a.id ? 'rgba(37,99,235,0.12)' : 'var(--card-bg-sm)',
                    color: f.animale_id===a.id ? '#2563eb' : 'var(--text-primary)', fontWeight:600 }}>
                  {specieEmoji(a.specie)} {a.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Operatore preferito */}
        <div style={{ marginBottom:14 }}>
          <div style={secLabel}>Operatore preferito</div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <button onClick={() => set('operatore_id','')}
              style={{ padding:'7px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                fontSize:13, border:'1px solid var(--card-border)',
                background: !f.operatore_id ? 'rgba(37,99,235,0.12)' : 'var(--card-bg-sm)',
                color: !f.operatore_id ? '#2563eb' : 'var(--text-secondary)', fontWeight:600 }}>
              Qualsiasi
            </button>
            {operatori.map(op => (
              <button key={op.id} onClick={() => set('operatore_id', op.id)}
                style={{ padding:'7px 12px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                  fontSize:13, border:'1px solid var(--card-border)', fontWeight:600,
                  background: f.operatore_id===op.id ? `${op.colore||'#2563eb'}20` : 'var(--card-bg-sm)',
                  color: f.operatore_id===op.id ? (op.colore||'#2563eb') : 'var(--text-primary)' }}>
                {op.nome}
              </button>
            ))}
          </div>
        </div>

        {/* Data preferita */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div>
            <div style={secLabel}>Data preferita</div>
            <input type="date" value={f.data_preferita} onChange={e=>set('data_preferita',e.target.value)}
              min={new Date().toISOString().split('T')[0]} style={inputStyle}/>
          </div>
          <div>
            <div style={secLabel}>Fascia oraria</div>
            <select value={f.fascia_oraria} onChange={e=>set('fascia_oraria',e.target.value)}
              style={{ ...inputStyle, cursor:'pointer' }}>
              {['qualsiasi','mattina (8-12)','pomeriggio (12-17)','sera (17-20)'].map(f =>
                <option key={f} value={f}>{f}</option>
              )}
            </select>
          </div>
        </div>

        {/* Servizio richiesto */}
        <div style={{ marginBottom:14 }}>
          <div style={secLabel}>Servizio richiesto</div>
          <input value={f.servizio_richiesto} onChange={e=>set('servizio_richiesto',e.target.value)}
            placeholder="Es. bagno + taglio, solo toelettatura..." style={inputStyle}/>
        </div>

        {/* Priorità */}
        <div style={{ marginBottom:14 }}>
          <div style={secLabel}>Priorità</div>
          <div style={{ display:'flex', gap:8 }}>
            {PRIORITA.map(p => (
              <button key={p.val} onClick={() => set('priorita', p.val)}
                style={{ flex:1, padding:'8px', borderRadius:10, cursor:'pointer', fontFamily:'inherit',
                  fontSize:12, fontWeight:700, border:`1px solid ${f.priorita===p.val ? p.color+'60' : 'var(--card-border)'}`,
                  background: f.priorita===p.val ? p.bg : 'var(--card-bg-sm)',
                  color: f.priorita===p.val ? p.color : 'var(--text-muted)' }}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Note */}
        <div style={{ marginBottom:20 }}>
          <div style={secLabel}>Note</div>
          <textarea rows={2} value={f.note} onChange={e=>set('note',e.target.value)}
            placeholder="Note aggiuntive..." style={{ ...inputStyle, resize:'vertical' }}/>
        </div>

        {error && <div style={{ fontSize:13, color:'#dc2626', marginBottom:12, padding:'8px 12px',
          background:'rgba(220,38,38,0.08)', borderRadius:8 }}>{error}</div>}

        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ ...btnSecondary, flex:1 }}>Annulla</button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, flex:2, opacity:saving?0.7:1 }}>
            {saving ? 'Salvataggio...' : '✓ Aggiungi in lista'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ListaAttesaView({ onNavigateToCalendario }) {
  const [lista,       setLista]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showAggiungi,setShowAggiungi]= useState(false);
  const [filtro,      setFiltro]      = useState('in_attesa');

  const carica = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lista_attesa')
      .select(`id, priorita, stato, data_preferita, fascia_oraria,
        servizio_richiesto, note, created_at,
        clienti(id, nome, cognome, telefono),
        animali(id, nome, specie),
        operatori(id, nome, colore)`)
      .order('priorita')
      .order('created_at');
    setLista(data || []);
    setLoading(false);
  };

  useEffect(() => { carica(); }, []);

  const aggiorna = async (id, nuovoStato) => {
    await supabase.from('lista_attesa').update({ stato: nuovoStato }).eq('id', id);
    setLista(prev => prev.map(r => r.id === id ? { ...r, stato: nuovoStato } : r));
  };

  const elimina = async (id) => {
    if (!window.confirm('Rimuovere dalla lista d\'attesa?')) return;
    await supabase.from('lista_attesa').delete().eq('id', id);
    setLista(prev => prev.filter(r => r.id !== id));
  };

  const creaAppuntamento = async (r) => {
    // Segna come "convertito" e naviga al calendario
    await aggiorna(r.id, 'convertito');
    onNavigateToCalendario?.();
  };

  const listaFiltrata = lista.filter(r => filtro === 'tutti' || r.stato === filtro);

  const FILTRI = [
    { id:'in_attesa',  label:'In attesa' },
    { id:'contattato', label:'Contattato' },
    { id:'convertito', label:'Convertiti' },
    { id:'tutti',      label:'Tutti' },
  ];

  const prioritaMeta = (p) => PRIORITA.find(x=>x.val===p) || PRIORITA[1];

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ padding:'0 0 2rem', width:'100%' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
        <div>
          <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', margin:'0 0 2px', letterSpacing:'-0.5px' }}>
            👥 Lista d'attesa
          </h1>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
            {lista.filter(r=>r.stato==='in_attesa').length} in attesa
          </div>
        </div>
        <button onClick={() => setShowAggiungi(true)} style={{ ...btnPrimary, padding:'10px 16px', fontSize:13 }}>
          + Aggiungi
        </button>
      </div>

      {/* Filtri */}
      <div style={{ ...glassCard, padding:'6px', display:'flex', gap:4, marginBottom:16 }}>
        {FILTRI.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)}
            style={{ flex:1, padding:'8px', borderRadius:12, border:'none', cursor:'pointer',
              fontFamily:'inherit', fontSize:12, fontWeight:filtro===f.id?700:500, transition:'all 0.2s',
              background:filtro===f.id?'var(--card-border)':'transparent',
              color:filtro===f.id?'var(--text-primary)':'var(--text-secondary)',
              boxShadow:filtro===f.id?'0 2px 0 rgba(255,255,255,0.9) inset':'none' }}>
            {f.label}
            {f.id !== 'tutti' && (
              <span style={{ marginLeft:5, fontSize:10, fontWeight:700,
                background:'rgba(37,99,235,0.15)', color:'#2563eb',
                padding:'1px 5px', borderRadius:20 }}>
                {lista.filter(r=>r.stato===f.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>
          Caricamento...
        </div>
      ) : listaFiltrata.length === 0 ? (
        <div style={{ ...glass, padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>🎉</div>
          <div style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
            {filtro === 'in_attesa' ? 'Nessuno in lista d\'attesa' : 'Nessun elemento'}
          </div>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
            {filtro === 'in_attesa' ? 'Tutti gli slot disponibili!' : ''}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {listaFiltrata.map((r, idx) => {
            const pm = prioritaMeta(r.priorita);
            const isAttivo = r.stato === 'in_attesa';
            const giorni = Math.floor((Date.now() - new Date(r.created_at)) / (1000*60*60*24));

            return (
              <motion.div key={r.id} layout
                initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                style={{ ...glass, padding:'16px 18px', opacity: r.stato === 'convertito' ? 0.55 : 1 }}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:10 }}>
                  {/* Posizione */}
                  {isAttivo && (
                    <div style={{ width:28, height:28, borderRadius:8, background:'rgba(37,99,235,0.1)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:13, fontWeight:800, color:'#2563eb', flexShrink:0 }}>
                      {listaFiltrata.filter(x=>x.stato==='in_attesa').indexOf(r) + 1}
                    </div>
                  )}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>
                      {r.clienti ? `${r.clienti.cognome} ${r.clienti.nome}` : '—'}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)', display:'flex', gap:8, flexWrap:'wrap' }}>
                      {r.animali && <span>{specieEmoji(r.animali.specie)} {r.animali.nome}</span>}
                      {r.operatori && (
                        <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                          <span style={{ width:8, height:8, borderRadius:'50%',
                            background:r.operatori.colore||'#2563eb', display:'inline-block' }}/>
                          {r.operatori.nome}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Badge priorità */}
                  <div style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
                    background:pm.bg, color:pm.color, flexShrink:0 }}>
                    {pm.label}
                  </div>
                </div>

                {/* Dettagli */}
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:10 }}>
                  {r.data_preferita && (
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:20,
                      background:'rgba(37,99,235,0.1)', color:'#2563eb' }}>
                      📅 {new Date(r.data_preferita).toLocaleDateString('it-IT',{day:'numeric',month:'short'})}
                    </span>
                  )}
                  {r.fascia_oraria && r.fascia_oraria !== 'qualsiasi' && (
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:20,
                      background:'rgba(124,58,237,0.1)', color:'#7c3aed' }}>
                      🕐 {r.fascia_oraria}
                    </span>
                  )}
                  {r.servizio_richiesto && (
                    <span style={{ fontSize:12, fontWeight:600, padding:'3px 9px', borderRadius:20,
                      background:'rgba(5,150,105,0.1)', color:'#059669' }}>
                      ✂️ {r.servizio_richiesto}
                    </span>
                  )}
                  <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                    In attesa da {giorni === 0 ? 'oggi' : `${giorni}gg`}
                  </span>
                </div>

                {r.note && (
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10,
                    background:'var(--card-bg-sm)', borderRadius:8, padding:'6px 10px' }}>
                    📝 {r.note}
                  </div>
                )}

                {/* Contatto rapido */}
                {r.clienti?.telefono && isAttivo && (
                  <div style={{ marginBottom:10 }}>
                    <a href={`tel:${r.clienti.telefono}`}
                      style={{ fontSize:12, color:'#2563eb', fontWeight:600, textDecoration:'none',
                        display:'inline-flex', alignItems:'center', gap:4 }}>
                      📞 {r.clienti.telefono}
                    </a>
                    <a href={`https://wa.me/${r.clienti.telefono.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      style={{ fontSize:12, color:'#059669', fontWeight:600, textDecoration:'none',
                        display:'inline-flex', alignItems:'center', gap:4, marginLeft:14 }}>
                      💬 WhatsApp
                    </a>
                  </div>
                )}

                {/* Azioni */}
                {isAttivo && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => aggiorna(r.id, 'contattato')}
                      style={{ flex:1, padding:'9px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:12, fontWeight:600,
                        background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)',
                        color:'#7c3aed' }}>
                      📞 Contattato
                    </button>
                    <button onClick={() => creaAppuntamento(r)}
                      style={{ flex:2, padding:'9px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:12, fontWeight:700,
                        background:'linear-gradient(145deg,#5aabff,#2060dd)',
                        border:'none', color:'#fff' }}>
                      📅 Crea appuntamento
                    </button>
                    <button onClick={() => elimina(r.id)}
                      style={{ padding:'9px 10px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:13,
                        background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)',
                        color:'#dc2626' }}>
                      ✕
                    </button>
                  </div>
                )}

                {r.stato === 'contattato' && (
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={() => aggiorna(r.id, 'in_attesa')}
                      style={{ flex:1, padding:'8px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:12, fontWeight:600,
                        background:'var(--card-bg-sm)', border:'1px solid var(--card-border-sm)',
                        color:'var(--text-secondary)' }}>
                      ← Ripristina
                    </button>
                    <button onClick={() => creaAppuntamento(r)}
                      style={{ flex:2, padding:'8px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:12, fontWeight:700,
                        background:'linear-gradient(145deg,#34d399,#059669)',
                        border:'none', color:'#fff' }}>
                      ✓ Prenota
                    </button>
                    <button onClick={() => elimina(r.id)}
                      style={{ padding:'8px 10px', borderRadius:11, cursor:'pointer',
                        fontFamily:'inherit', fontSize:13,
                        background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)',
                        color:'#dc2626' }}>
                      ✕
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showAggiungi && (
          <ModalAggiungi
            onClose={() => setShowAggiungi(false)}
            onSaved={(r) => { setLista(prev => [r, ...prev]); }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}