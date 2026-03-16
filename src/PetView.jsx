/**
 * PetView.jsx — Lista animali + scheda + mappa corporea
 * Collegato a Supabase: tabelle animali, clienti, operatori, razze
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import PetBodyMap   from './PetBodyMap';

// ── Stili condivisi ───────────────────────────────────────────
const glass = {
  background:  'var(--card-bg)',
  border:      '1px solid rgba(255,255,255,0.8)',
  borderRadius: 20,
  boxShadow:   'var(--card-shadow)',
};
const glassCard = {
  background:  'var(--card-bg-sm)',
  border:      '1px solid rgba(255,255,255,0.72)',
  borderRadius: 16,
  boxShadow:   'var(--card-shadow-sm)',
};
const inputStyle = {
  width:'100%', background:'var(--input-bg)',
  border:'1px solid rgba(255,255,255,0.8)', borderRadius:12,
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
  border:'1px solid rgba(255,255,255,0.8)', borderRadius:13,
  padding:'11px 18px', fontSize:14, fontWeight:600,
  cursor:'pointer', fontFamily:'inherit',
};
const secLabel = {
  fontSize:11, fontWeight:600, color:'var(--text-muted)',
  letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:8,
};

const specieEmoji = s => s==='gatto'?'🐈':s==='coniglio'?'🐇':'🐕';

const calcEta = (dataNascita) => {
  if (!dataNascita) return null;
  const diff = new Date() - new Date(dataNascita);
  const anni = Math.floor(diff / (1000*60*60*24*365));
  const mesi = Math.floor((diff % (1000*60*60*24*365)) / (1000*60*60*24*30));
  return anni > 0 ? `${anni} ann${anni===1?'o':'i'}` : `${mesi} mes${mesi===1?'e':'i'}`;
};

// ─────────────────────────────────────────────────────────────
// MODALE AGGIUNGI ANIMALE
// ─────────────────────────────────────────────────────────────
function ModalAggiungi({ clienti, razze, onClose, onSaved }) {
  const [f, setF] = useState({ cliente_id:'', nome:'', specie:'cane', razza_id:'', data_nascita:'', colore:'', note:'' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const set = (k,v) => setF(p => ({...p,[k]:v}));
  const razzeFiltered = razze.filter(r => r.specie === f.specie);

  const save = async () => {
    if (!f.cliente_id) { setError('Seleziona un proprietario'); return; }
    if (!f.nome.trim()) { setError('Inserisci il nome dell\'animale'); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase
      .from('animali')
      .insert([{ cliente_id:f.cliente_id, nome:f.nome.trim(), specie:f.specie,
        razza_id:f.razza_id||null, data_nascita:f.data_nascita||null,
        colore:f.colore.trim()||null, note:f.note.trim()||null }])
      .select('*, clienti(id,nome,cognome), razze(id,nome)')
      .single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved(data); onClose();
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(10,24,64,0.35)',
      backdropFilter:'blur(8px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <div style={{...glass,padding:24,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)'}}>🐾 Nuovo animale</div>
          <button onClick={onClose} style={{background:'var(--card-bg-sm)',border:'1px solid rgba(255,255,255,0.7)',
            borderRadius:10,width:32,height:32,cursor:'pointer',fontSize:18,color:'var(--text-secondary)',fontFamily:'inherit'}}>×</button>
        </div>

        <div style={{marginBottom:14}}>
          <div style={secLabel}>Proprietario *</div>
          <select value={f.cliente_id} onChange={e=>set('cliente_id',e.target.value)} style={inputStyle}>
            <option value="">Seleziona cliente...</option>
            {clienti.map(c=><option key={c.id} value={c.id}>{c.cognome} {c.nome}</option>)}
          </select>
        </div>

        <div style={{marginBottom:14}}>
          <div style={secLabel}>Nome animale *</div>
          <input type="text" placeholder="Es. Rex, Luna..." value={f.nome} onChange={e=>set('nome',e.target.value)} style={inputStyle}/>
        </div>

        <div style={{marginBottom:14}}>
          <div style={secLabel}>Specie</div>
          <div style={{display:'flex',gap:8}}>
            {['cane','gatto','altro'].map(s=>(
              <button key={s} onClick={()=>{set('specie',s);set('razza_id','');}} style={{
                flex:1,padding:'9px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                fontSize:13,fontWeight:600,border:'1px solid rgba(255,255,255,0.8)',
                background:f.specie===s?'rgba(255,255,255,0.65)':'rgba(255,255,255,0.3)',
                color:f.specie===s?'var(--text-primary)':'var(--text-secondary)',
                boxShadow:f.specie===s?'0 2px 0 rgba(255,255,255,0.9) inset':'none',
              }}>{specieEmoji(s)} {s.charAt(0).toUpperCase()+s.slice(1)}</button>
            ))}
          </div>
        </div>

        {razzeFiltered.length>0 && (
          <div style={{marginBottom:14}}>
            <div style={secLabel}>Razza</div>
            <select value={f.razza_id} onChange={e=>set('razza_id',e.target.value)} style={inputStyle}>
              <option value="">Seleziona razza...</option>
              {razzeFiltered.map(r=><option key={r.id} value={r.id}>{r.nome}</option>)}
            </select>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          <div>
            <div style={secLabel}>Data di nascita</div>
            <input type="date" value={f.data_nascita} onChange={e=>set('data_nascita',e.target.value)} style={inputStyle}/>
          </div>
          <div>
            <div style={secLabel}>Colore mantello</div>
            <input type="text" placeholder="Es. nero, bianco..." value={f.colore} onChange={e=>set('colore',e.target.value)} style={inputStyle}/>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={secLabel}>Note iniziali</div>
          <textarea rows={3} placeholder="Carattere, abitudini, patologie note..."
            value={f.note} onChange={e=>set('note',e.target.value)}
            style={{...inputStyle,resize:'vertical'}}/>
        </div>

        {error && <div style={{fontSize:13,color:'#dc2626',marginBottom:12,padding:'8px 12px',background:'rgba(239,68,68,0.08)',borderRadius:10}}>{error}</div>}

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{...btnSecondary,flex:1}}>Annulla</button>
          <button onClick={save} disabled={loading} style={{...btnPrimary,flex:2,opacity:loading?0.7:1}}>
            {loading?'Salvataggio...':'+ Aggiungi animale'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SCHEDA SINGOLO ANIMALE
// ─────────────────────────────────────────────────────────────
function SchedaAnimale({ animale, operatori, onUpdate, onBack }) {
  const [tab,     setTab]     = useState('scheda');
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [saving,  setSaving]  = useState(false);

  const CAMPI = [
    { field:'servizi_abituali',       label:'✂️ Servizi abituali' },
    { field:'preferenze_proprietario',label:'💬 Preferenze proprietario' },
    { field:'zone_critiche',           label:'⚠️ Zone critiche' },
    { field:'problemi_salute',         label:'🏥 Problemi di salute' },
    { field:'problemi_carattere',      label:'🧠 Problemi caratteriali' },
  ];

  const saveField = async () => {
    setSaving(true);
    const { error } = await supabase.from('animali').update({ [editing]: editVal }).eq('id', animale.id);
    setSaving(false);
    if (!error) { onUpdate({...animale,[editing]:editVal}); setEditing(null); }
  };

  const handleZoneSaved = async (zonaLabel, annotations) => {
    const zone = animale.zone_critiche ? `${animale.zone_critiche}, ${zonaLabel}` : zonaLabel;
    await supabase.from('animali').update({ zone_critiche:zone, annotazioni:annotations }).eq('id', animale.id);
    onUpdate({...animale, zone_critiche:zone, annotazioni:annotations});
  };

  const opPref = operatori.find(o => o.id === animale.operatore_preferito_id);

  return (
    <div style={{maxWidth:720,margin:'0 auto'}}>
      <div style={{marginBottom:14}}>
        <button onClick={onBack} style={{...btnSecondary,padding:'8px 14px',fontSize:13}}>← Indietro</button>
      </div>

      {/* Header card */}
      <div style={{...glass,padding:'18px 20px',marginBottom:14,display:'flex',alignItems:'center',gap:14}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:'linear-gradient(145deg,#5aabff,#2060dd)',
          display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,flexShrink:0,
          boxShadow:'0 4px 14px rgba(50,100,220,0.35)'}}>
          {specieEmoji(animale.specie)}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.4px'}}>{animale.nome}</div>
          <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:2}}>
            {animale.razze?.nome||animale.specie}
            {calcEta(animale.data_nascita) && ` - ${calcEta(animale.data_nascita)}`}
            {animale.clienti && ` - ${animale.clienti.cognome} ${animale.clienti.nome}`}
          </div>
        </div>
        {opPref && (
          <div style={{fontSize:11,fontWeight:600,background:'rgba(59,130,246,0.12)',color:'#2563eb',padding:'4px 10px',borderRadius:20}}>
            Op: {opPref.nome}
          </div>
        )}
      </div>

      {/* Tab */}
      <div style={{...glass,padding:'6px',marginBottom:14,display:'flex',gap:4}}>
        {[{id:'scheda',label:'📋 Scheda'},{id:'mappa',label:'🗺️ Mappa'},{id:'storico',label:'📌 Note'}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,padding:'9px 8px',borderRadius:14,border:'none',cursor:'pointer',
            fontFamily:'inherit',fontSize:13,transition:'all 0.2s',
            background:tab===t.id?'var(--card-border)':'transparent',
            color:tab===t.id?'var(--text-primary)':'var(--text-secondary)',
            fontWeight:tab===t.id?600:500,
            boxShadow:tab===t.id?'0 2px 0 rgba(255,255,255,0.9) inset,0 3px 10px rgba(80,120,200,0.15)':'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Scheda */}
      {tab==='scheda' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {CAMPI.map(({field,label})=>(
            <div key={field} style={{...glass,padding:'15px 17px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
                <div style={secLabel}>{label}</div>
                <button onClick={()=>{setEditing(field);setEditVal(animale[field]||'');}} style={{
                  fontSize:11,fontWeight:600,background:'rgba(59,130,246,0.1)',color:'#2563eb',
                  border:'none',borderRadius:8,padding:'3px 10px',cursor:'pointer',fontFamily:'inherit'}}>
                  Modifica
                </button>
              </div>
              {editing===field ? (
                <div>
                  <textarea autoFocus rows={3} value={editVal} onChange={e=>setEditVal(e.target.value)}
                    style={{...inputStyle,resize:'vertical'}}/>
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button onClick={saveField} disabled={saving} style={{...btnPrimary,flex:1,padding:'8px',fontSize:13,opacity:saving?0.7:1}}>
                      {saving?'Salvo...':'Salva'}
                    </button>
                    <button onClick={()=>setEditing(null)} style={{...btnSecondary,padding:'8px 14px',fontSize:13}}>Annulla</button>
                  </div>
                </div>
              ) : (
                <div style={{fontSize:14,color:animale[field]?'var(--text-primary)':'var(--text-muted)',lineHeight:1.6}}>
                  {animale[field]||'Nessuna nota'}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mappa */}
      {tab==='mappa' && (
        <PetBodyMap
          pet={{specie:animale.specie, annotazioni:animale.annotazioni||[]}}
          onZoneSaved={handleZoneSaved}
        />
      )}

      {/* Storico note */}
      {tab==='storico' && (
        <div style={{...glass,padding:'18px 20px'}}>
          <div style={{...secLabel,marginBottom:14}}>Storico note e osservazioni</div>
          {!(animale.storico_note?.length) ? (
            <div style={{fontSize:14,color:'var(--text-muted)',textAlign:'center',padding:'30px 0'}}>
              Nessuna nota registrata
            </div>
          ) : animale.storico_note.map((n,i)=>(
            <div key={i} style={{...glassCard,padding:'12px 14px',marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                <div style={{fontSize:12,fontWeight:600,color:'#2563eb'}}>{n.data}</div>
                <div style={{fontSize:12,color:'var(--text-secondary)'}}>Op. {n.operatore}</div>
              </div>
              <div style={{fontSize:13,color:'var(--text-primary)',lineHeight:1.55}}>{n.testo}</div>
            </div>
          ))}
          <button style={{width:'100%',padding:'11px',borderRadius:14,cursor:'pointer',fontFamily:'inherit',
            border:'1px dashed rgba(59,130,246,0.4)',background:'rgba(59,130,246,0.05)',
            color:'#2563eb',fontWeight:600,fontSize:13}}>
            + Aggiungi nota
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LISTA ANIMALI
// ─────────────────────────────────────────────────────────────
function ListaAnimali({ animali, loading, onSelect, onAdd }) {
  const [search, setSearch] = useState('');
  const filtered = animali.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    `${a.clienti?.cognome||''} ${a.clienti?.nome||''}`.toLowerCase().includes(search.toLowerCase()) ||
    (a.razze?.nome||'').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{maxWidth:720,margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
        <div style={{flex:1}}>
          <div style={{fontSize:26,fontWeight:700,color:'var(--text-primary)',letterSpacing:'-0.5px'}}>🐾 Animali</div>
          <div style={{fontSize:13,color:'var(--text-secondary)',marginTop:2}}>{animali.length} animali registrati</div>
        </div>
        <button onClick={onAdd} style={{...btnPrimary,display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap'}}>
          <span style={{fontSize:18,lineHeight:1}}>+</span> Aggiungi animale
        </button>
      </div>

      {/* Ricerca */}
      <div style={{...glassCard,padding:'10px 14px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontSize:16,opacity:0.5}}>🔍</span>
        <input type="text" placeholder="Cerca per nome, proprietario o razza..."
          value={search} onChange={e=>setSearch(e.target.value)}
          style={{flex:1,border:'none',background:'transparent',fontSize:14,color:'var(--text-primary)',outline:'none',fontFamily:'inherit'}}/>
        {search && <button onClick={()=>setSearch('')} style={{border:'none',background:'transparent',cursor:'pointer',fontSize:18,color:'var(--text-muted)'}}>×</button>}
      </div>

      {/* Contenuto */}
      {loading ? (
        <div style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)',fontSize:14}}>Caricamento animali...</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px'}}>
          <div style={{fontSize:48,marginBottom:16}}>🐾</div>
          <div style={{fontSize:16,fontWeight:600,color:'var(--text-primary)',marginBottom:8}}>
            {search?'Nessun risultato':'Nessun animale registrato'}
          </div>
          <div style={{fontSize:14,color:'var(--text-secondary)',marginBottom:20}}>
            {search?'Prova con un altro termine':'Aggiungi il primo animale per iniziare'}
          </div>
          {!search && <button onClick={onAdd} style={btnPrimary}>+ Aggiungi animale</button>}
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map(a=>(
            <button key={a.id} onClick={()=>onSelect(a)} style={{
              ...glassCard,display:'flex',alignItems:'center',gap:14,
              padding:'14px 16px',cursor:'pointer',textAlign:'left',
              width:'100%',fontFamily:'inherit',transition:'transform 0.15s',
            }}
              onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
              onMouseLeave={e=>e.currentTarget.style.transform='translateY(0)'}
            >
              <div style={{width:44,height:44,borderRadius:'50%',flexShrink:0,
                background:'linear-gradient(145deg,rgba(90,171,255,0.2),rgba(32,96,221,0.12))',
                border:'2px solid rgba(90,171,255,0.35)',
                display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>
                {specieEmoji(a.specie)}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:15,fontWeight:700,color:'var(--text-primary)'}}>{a.nome}</div>
                <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:2}}>
                  {a.razze?.nome||a.specie}
                  {a.clienti&&` - ${a.clienti.cognome} ${a.clienti.nome}`}
                </div>
                {a.zone_critiche && (
                  <div style={{fontSize:11,color:'#d97706',marginTop:3,display:'flex',alignItems:'center',gap:4}}>
                    <span>⚠️</span>
                    <span style={{whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{a.zone_critiche}</span>
                  </div>
                )}
              </div>
              <div style={{flexShrink:0,textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                {a.data_nascita && (()=>{
                  const anni=Math.floor((new Date()-new Date(a.data_nascita))/(1000*60*60*24*365));
                  return <div style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>{anni>0?`${anni}a`:'<1a'}</div>;
                })()}
                <div style={{fontSize:18,color:'var(--text-muted)'}}>›</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PetView() {
  const [animali,   setAnimali]   = useState([]);
  const [clienti,   setClienti]   = useState([]);
  const [operatori, setOperatori] = useState([]);
  const [razze,     setRazze]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [an, cl, op, rz] = await Promise.all([
      supabase.from('animali').select('*, clienti(id,nome,cognome), razze(id,nome)').order('nome'),
      supabase.from('clienti').select('id,nome,cognome').order('cognome'),
      supabase.from('operatori').select('id,nome,cognome').eq('attivo',true).order('nome'),
      supabase.from('razze').select('id,nome,specie').order('nome'),
    ]);
    setAnimali(an.data||[]);
    setClienti(cl.data||[]);
    setOperatori(op.data||[]);
    setRazze(rz.data||[]);
    setLoading(false);
  };

  const handleSaved  = (a) => setAnimali(p=>[...p,a].sort((a,b)=>a.nome.localeCompare(b.nome)));
  const handleUpdate = (a) => { setAnimali(p=>p.map(x=>x.id===a.id?a:x)); setSelected(a); };

  if (selected) {
    return <SchedaAnimale animale={selected} operatori={operatori} onUpdate={handleUpdate} onBack={()=>setSelected(null)}/>;
  }

  return (
    <>
      <ListaAnimali animali={animali} loading={loading} onSelect={setSelected} onAdd={()=>setShowModal(true)}/>
      {showModal && <ModalAggiungi clienti={clienti} razze={razze} onClose={()=>setShowModal(false)} onSaved={handleSaved}/>}
    </>
  );
}