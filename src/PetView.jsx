/**
 * PetView.jsx — Lista animali + scheda + mappa corporea
 * Collegato a Supabase: tabelle animali, clienti, operatori, razze
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
// RICERCA CLIENTE con searchbox (per 2000+ clienti)
// ─────────────────────────────────────────────────────────────
function ClienteSearch({ clienti, value, onChange }) {
  const [query, setQuery] = useState('');
  const [show,  setShow]  = useState(false);
  const ref = useRef(null);

  const selezionato = clienti.find(c => c.id === value);
  const filtrati = query.length > 1
    ? clienti.filter(c =>
        `${c.cognome} ${c.nome} ${c.telefono || ''}`.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    : [];

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, []);

  if (selezionato) {
    return (
      <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
            {selezionato.cognome} {selezionato.nome}
          </div>
          {selezionato.telefono && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{selezionato.telefono}</div>
          )}
        </div>
        <button onClick={() => { onChange(''); setQuery(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Cerca per cognome, nome o telefono..."
        value={query}
        autoFocus
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => query.length > 1 && setShow(true)}
        style={{ ...inputStyle }}
        autoComplete="off"
      />
      {show && filtrati.length > 0 && (
        <div style={{
          position: 'fixed',
          zIndex: 9999,
          width: 'min(380px, calc(100vw - 32px))',
          background: 'var(--dropdown-bg, #ffffff)',
          border: '1px solid var(--card-border)',
          borderRadius: 12,
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {filtrati.map(c => (
            <button key={c.id}
              onMouseDown={e => { e.preventDefault(); onChange(c.id); setQuery(''); setShow(false); }}
              onTouchEnd={e => { e.preventDefault(); onChange(c.id); setQuery(''); setShow(false); }}
              style={{
                display: 'block', width: '100%', padding: '10px 14px',
                background: 'none', border: 'none',
                borderBottom: '1px solid var(--card-border-sm)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {c.cognome} {c.nome}
              </div>
              {c.telefono && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.telefono}</div>
              )}
            </button>
          ))}
        </div>
      )}
      {query.length > 0 && query.length <= 1 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
          Scrivi almeno 2 caratteri per cercare tra {clienti.length} clienti
        </div>
      )}
      {show && query.length > 1 && filtrati.length === 0 && (
        <div style={{ position: 'fixed', zIndex: 9999, width: 'min(380px, calc(100vw - 32px))',
          ...glassCard, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
          Nessun cliente trovato
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// RICERCA RAZZA con searchbox
// ─────────────────────────────────────────────────────────────
function RazzaSearch({ razze, value, onChange, onReset }) {
  const [query, setQuery]       = useState('');
  const [show,  setShow]        = useState(false);
  const ref = useRef(null);

  const selezionata = razze.find(r => r.id === value);
  const filtrate = query.length > 0
    ? razze.filter(r => r.nome.toLowerCase().includes(query.toLowerCase())).slice(0, 30)
    : [];

  // Chiudi al click fuori
  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setShow(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler, { passive: true });
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, []);

  if (selezionata) {
    return (
      <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{selezionata.nome}</span>
        <button onClick={() => { onReset(); setQuery(''); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--text-muted)' }}>×</button>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        placeholder="Cerca razza..."
        value={query}
        onChange={e => { setQuery(e.target.value); setShow(true); }}
        onFocus={() => setShow(true)}
        style={{ ...inputStyle }}
        autoComplete="off"
      />
      {show && filtrate.length > 0 && (
        <div style={{
          position: 'fixed', zIndex: 9999, width: 'min(380px, calc(100vw - 32px))',
          background: 'var(--dropdown-bg, #ffffff)', border: '1px solid var(--card-border)',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          maxHeight: 240, overflowY: 'auto',
        }}>
          {filtrate.map(r => (
            <button key={r.id}
              onMouseDown={e => { e.preventDefault(); onChange(r.id); setQuery(''); setShow(false); }}
              onTouchEnd={e => { e.preventDefault(); onChange(r.id); setQuery(''); setShow(false); }}
              style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none',
                border: 'none', borderBottom: '1px solid var(--card-border-sm)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                fontSize: 13, color: 'var(--text-primary)' }}>
              {r.nome}
            </button>
          ))}
        </div>
      )}
      {show && query.length > 0 && filtrate.length === 0 && (
        <div style={{ position: 'fixed', zIndex: 9999, width: 'min(380px, calc(100vw - 32px))',
          ...glassCard, padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
          Nessuna razza trovata
        </div>
      )}
      {query.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>
          Inizia a scrivere per cercare tra {razze.length} razze
        </div>
      )}
    </div>
  );
}

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position:'fixed',inset:0,zIndex:200,background:'rgba(10,24,64,0.35)',
        WebkitBackdropFilter:'blur(8px)',backdropFilter:'blur(8px)',
        display:'flex',alignItems:'center',justifyContent:'center',padding:20,
        touchAction:'pan-y',overscrollBehavior:'contain' }}
      onClick={e => e.target===e.currentTarget && onClose()}>
      <style>{`
        :root { --dropdown-bg: #ffffff; }
        @media (prefers-color-scheme: dark) { :root { --dropdown-bg: #1a2d5a; } }
      `}</style>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{...glass,padding:24,width:'100%',maxWidth:480,maxHeight:'90vh',overflowY:'auto',WebkitOverflowScrolling:'touch'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
          <div style={{fontSize:18,fontWeight:700,color:'var(--text-primary)'}}>🐾 Nuovo animale</div>
          <button onClick={onClose} style={{background:'var(--card-bg-sm)',border:'1px solid rgba(255,255,255,0.7)',
            borderRadius:10,width:32,height:32,cursor:'pointer',fontSize:18,color:'var(--text-secondary)',fontFamily:'inherit'}}>×</button>
        </div>

        <div style={{marginBottom:14}}>
          <div style={secLabel}>Proprietario *</div>
          <ClienteSearch
            clienti={clienti}
            value={f.cliente_id}
            onChange={id => set('cliente_id', id)}
          />
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
            <RazzaSearch
              razze={razzeFiltered}
              value={f.razza_id}
              onChange={id => set('razza_id', id)}
              onReset={() => set('razza_id', '')}
            />
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
  <div>
    <div style={secLabel}>Data di nascita</div>
    <input type="date" value={f.data_nascita} onChange={e=>set('data_nascita',e.target.value)} style={inputStyle}/>
  </div>
  <div>
    <div style={secLabel}>Colore mantello</div>
    <input type="text" placeholder="Es. nero, bianco..." value={f.colore} onChange={e=>set('colore',e.target.value)} style={inputStyle}/>
  </div>
</div>

        <div style={{marginBottom:14}}>
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
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// ZONE CRITICHE — tag eliminabili e modificabili
// ─────────────────────────────────────────────────────────────
function ZoneCritiche({ animale, onUpdate }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editVal,    setEditVal]    = useState('');
  const [nuova,      setNuova]      = useState('');
  const [saving,     setSaving]     = useState(false);

  // Parsa la stringa in array
  const zone = animale.zone_critiche
    ? animale.zone_critiche.split(',').map(z => z.trim()).filter(Boolean)
    : [];

  const saveZone = async (nuoveZone) => {
    setSaving(true);
    const str = nuoveZone.join(', ');
    await supabase.from('animali').update({ zone_critiche: str || null }).eq('id', animale.id);
    onUpdate({ ...animale, zone_critiche: str || null });
    setSaving(false);
  };

  const elimina = (idx) => {
    const nuove = zone.filter((_, i) => i !== idx);
    saveZone(nuove);
  };

  const salvaModifica = (idx) => {
    if (!editVal.trim()) { elimina(idx); setEditingIdx(null); return; }
    const nuove = zone.map((z, i) => i === idx ? editVal.trim() : z);
    saveZone(nuove);
    setEditingIdx(null);
  };

  const aggiungi = () => {
    if (!nuova.trim()) return;
    saveZone([...zone, nuova.trim()]);
    setNuova('');
  };

  return (
    <div style={{...glass, padding:'15px 17px'}}>
      <div style={{...secLabel, marginBottom: 12}}>⚠️ Zone critiche</div>

      {zone.length === 0 ? (
        <div style={{fontSize:13, color:'var(--text-muted)', marginBottom:12}}>
          Nessuna zona critica registrata
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:8, marginBottom:12}}>
          {zone.map((z, i) => (
            <div key={i}>
              {editingIdx === i ? (
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <input
                    autoFocus
                    value={editVal}
                    onChange={e => setEditVal(e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') salvaModifica(i); if (e.key==='Escape') setEditingIdx(null); }}
                    style={{...inputStyle, flex:1, padding:'8px 12px', fontSize:13}}
                  />
                  <button onClick={() => salvaModifica(i)} disabled={saving} style={{
                    background:'linear-gradient(145deg,#5aabff,#2060dd)', color:'#fff',
                    border:'none', borderRadius:10, padding:'8px 14px',
                    fontSize:12, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                    opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? '...' : 'Salva'}
                  </button>
                  <button onClick={() => setEditingIdx(null)} style={{
                    background:'var(--input-bg)', color:'var(--text-secondary)',
                    border:'1px solid var(--card-border)', borderRadius:10,
                    padding:'8px 12px', fontSize:12, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    Annulla
                  </button>
                </div>
              ) : (
                <div style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 12px', borderRadius:12,
                  background:'rgba(239,68,68,0.07)',
                  border:'1px solid rgba(239,68,68,0.15)',
                }}>
                  <div style={{width:8, height:8, borderRadius:'50%', background:'#ef4444', flexShrink:0}} />
                  <span style={{flex:1, fontSize:13, fontWeight:500, color:'var(--text-primary)'}}>{z}</span>
                  <button onClick={() => { setEditingIdx(i); setEditVal(z); }} style={{
                    background:'rgba(37,99,235,0.1)', color:'#2563eb',
                    border:'none', borderRadius:7, padding:'3px 9px',
                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    Modifica
                  </button>
                  <button onClick={() => elimina(i)} style={{
                    background:'rgba(239,68,68,0.1)', color:'#dc2626',
                    border:'none', borderRadius:7, padding:'3px 9px',
                    fontSize:11, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
                  }}>
                    Elimina
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Aggiungi zona manualmente */}
      <div style={{display:'flex', gap:8}}>
        <input
          type="text"
          placeholder="Aggiungi zona critica..."
          value={nuova}
          onChange={e => setNuova(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && aggiungi()}
          style={{...inputStyle, flex:1, padding:'8px 12px', fontSize:13}}
        />
        <button onClick={aggiungi} disabled={!nuova.trim() || saving} style={{
          background:'linear-gradient(145deg,#5aabff,#2060dd)', color:'#fff',
          border:'none', borderRadius:10, padding:'8px 14px',
          fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:'inherit',
          opacity: !nuova.trim() ? 0.4 : 1,
          whiteSpace:'nowrap',
        }}>
          + Aggiungi
        </button>
      </div>
      <div style={{fontSize:11, color:'var(--text-muted)', marginTop:6}}>
        Le zone vengono aggiunte anche automaticamente dalla mappa corporea
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
  const [servizi,         setServizi]         = useState([]);
  const [savingRiservato, setSavingRiservato] = useState(false);
  const [fotoUrl,         setFotoUrl]         = useState(null);
  const [uploadingFoto,   setUploadingFoto]   = useState(false);
  const [fotoError,       setFotoError]       = useState('');
  const fotoInputRef = useRef(null);

  // ── Modifica scheda completa ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    nome:         animale.nome         || '',
    specie:       animale.specie       || 'cane',
    razza_id:     animale.razza_id     || '',
    data_nascita: animale.data_nascita || '',
    colore:       animale.colore       || '',
    note:         animale.note         || '',
  });
  const [editFormRazze, setEditFormRazze] = useState([]);
  const [savingEdit,    setSavingEdit]    = useState(false);
  const [editError,     setEditError]     = useState('');

  // Carica razze per il modal di modifica
  useEffect(() => {
    supabase.from('razze').select('id,nome,specie').order('nome')
      .then(({ data }) => setEditFormRazze(data || []));
  }, []);

  const saveEditForm = async () => {
    if (!editForm.nome.trim()) { setEditError('Il nome è obbligatorio'); return; }
    setSavingEdit(true); setEditError('');
    const updates = {
      nome:         editForm.nome.trim(),
      specie:       editForm.specie,
      razza_id:     editForm.razza_id || null,
      data_nascita: editForm.data_nascita || null,
      colore:       editForm.colore.trim() || null,
      note:         editForm.note.trim() || null,
    };
    const { error } = await supabase.from('animali').update(updates).eq('id', animale.id);
    setSavingEdit(false);
    if (error) { setEditError(error.message); return; }
    onUpdate({ ...animale, ...updates });
    setShowEditModal(false);
  };

  // ── Deceduto ──
  const [savingDeceduto, setSavingDeceduto] = useState(false);

  const toggleDeceduto = async () => {
    const isDeceduto = !!animale.data_decesso;
    if (isDeceduto) {
      if (!window.confirm('Rimuovere la segnalazione di decesso?')) return;
      setSavingDeceduto(true);
      await supabase.from('animali').update({ data_decesso: null }).eq('id', animale.id);
      onUpdate({ ...animale, data_decesso: null });
    } else {
      const dataDecesso = window.prompt('Data del decesso (lascia vuoto per oggi):', new Date().toISOString().split('T')[0]);
      if (dataDecesso === null) return; // annullato
      setSavingDeceduto(true);
      const data = dataDecesso.trim() || new Date().toISOString().split('T')[0];
      await supabase.from('animali').update({ data_decesso: data }).eq('id', animale.id);
      onUpdate({ ...animale, data_decesso: data });
    }
    setSavingDeceduto(false);
  };

  // ── Storico visite ──
  const [visite,        setVisite]        = useState([]);
  const [visiteLoding,  setVisiteLoading] = useState(false);

  // ── Scheda sanitaria (editabile) ──
  const [sanEdit,  setSanEdit]  = useState(false);
  const [sanForm,  setSanForm]  = useState({
    allergie:          animale.allergie          || '',
    farmaci_in_corso:  animale.farmaci_in_corso  || '',
    veterinario_nome:  animale.veterinario_nome  || '',
    veterinario_tel:   animale.veterinario_tel   || '',
  });
  const [vaccini,    setVaccini]    = useState(animale.vaccini || []);
  const [nuovoVacc,  setNuovoVacc]  = useState({ nome:'', data_ultima:'', scadenza:'' });
  const [savingSan,  setSavingSan]  = useState(false);

  useEffect(() => {
    supabase.from('servizi').select('id,nome,durata_minuti').order('nome')
      .then(({ data }) => setServizi(data || []));
  }, []);

  // Carica visite quando si apre il tab
  useEffect(() => {
    if (tab !== 'visite') return;
    setVisiteLoading(true);
    supabase
      .from('appuntamenti')
      .select('id, inizio, fine, stato, note, prezzo_confermato, prezzo_proposto, prezzo_confermato_flag, operatori(nome, cognome, colore), appuntamenti_servizi(servizi(nome))')
      .eq('animale_id', animale.id)
      .order('inizio', { ascending: false })
      .limit(30)
      .then(({ data }) => { setVisite(data || []); setVisiteLoading(false); });
  }, [tab, animale.id]);

  const saveSanitaria = async () => {
    setSavingSan(true);
    const updates = { ...sanForm, vaccini };
    await supabase.from('animali').update(updates).eq('id', animale.id);
    onUpdate({ ...animale, ...updates });
    setSavingSan(false);
    setSanEdit(false);
  };

  const addVaccino = () => {
    if (!nuovoVacc.nome.trim()) return;
    setVaccini(v => [...v, { ...nuovoVacc }]);
    setNuovoVacc({ nome:'', data_ultima:'', scadenza:'' });
  };

  const removeVaccino = (i) => setVaccini(v => v.filter((_,idx) => idx !== i));

  // Carica signed URL per la foto
  useEffect(() => {
    if (!animale.foto_url) return;
    supabase.storage.from('animali-foto').createSignedUrl(animale.foto_url, 3600)
      .then(({ data }) => { if (data?.signedUrl) setFotoUrl(data.signedUrl); });
  }, [animale.foto_url]);

  // Comprimi immagine con Canvas (max 800x800, JPEG 80%)
  const comprimi = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 800;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', 0.80);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFoto(true); setFotoError('');
    try {
      const compressed = await comprimi(file);
      const path = `${animale.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('animali-foto').upload(path, compressed, {
        contentType: 'image/jpeg', upsert: true,
      });
      if (upErr) throw upErr;
      // Elimina vecchia foto se esiste
      if (animale.foto_url && animale.foto_url !== path) {
        await supabase.storage.from('animali-foto').remove([animale.foto_url]);
      }
      await supabase.from('animali').update({ foto_url: path }).eq('id', animale.id);
      onUpdate({ ...animale, foto_url: path });
      // Genera signed url per preview immediata
      const { data } = await supabase.storage.from('animali-foto').createSignedUrl(path, 3600);
      if (data?.signedUrl) setFotoUrl(data.signedUrl);
    } catch (err) {
      setFotoError('Errore upload: ' + (err.message || 'riprova'));
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  const handleFotoRemove = async () => {
    if (!animale.foto_url) return;
    if (!window.confirm('Eliminare la foto?')) return;
    await supabase.storage.from('animali-foto').remove([animale.foto_url]);
    await supabase.from('animali').update({ foto_url: null }).eq('id', animale.id);
    onUpdate({ ...animale, foto_url: null });
    setFotoUrl(null);
  };

  const saveRiservato = async (updates) => {
    setSavingRiservato(true);
    await supabase.from('animali').update(updates).eq('id', animale.id);
    onUpdate({ ...animale, ...updates });
    setSavingRiservato(false);
  };

  const CAMPI = [
    { field:'preferenze_proprietario',label:'💬 Preferenze proprietario' },
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
    <>
    <motion.div style={{width:'100%'}}>
      <div style={{marginBottom:14, display:'flex', gap:8, alignItems:'center'}}>
        <button onClick={onBack} style={{...btnSecondary,padding:'8px 14px',fontSize:13}}>← Indietro</button>
        <button
          onClick={() => { setEditForm({ nome: animale.nome||'', specie: animale.specie||'cane', razza_id: animale.razza_id||'', data_nascita: animale.data_nascita||'', colore: animale.colore||'', note: animale.note||'' }); setEditError(''); setShowEditModal(true); }}
          style={{...btnSecondary, padding:'8px 14px', fontSize:13, display:'flex', alignItems:'center', gap:6}}>
          ✏️ Modifica scheda
        </button>
        <button
          onClick={toggleDeceduto}
          disabled={savingDeceduto}
          style={{
            padding:'8px 14px', fontSize:13, borderRadius:13, cursor:'pointer', fontFamily:'inherit',
            border: animale.data_decesso ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(100,100,100,0.3)',
            background: animale.data_decesso ? 'rgba(220,38,38,0.1)' : 'var(--input-bg)',
            color: animale.data_decesso ? '#dc2626' : 'var(--text-muted)',
            fontWeight:600, opacity: savingDeceduto ? 0.6 : 1,
          }}>
          {animale.data_decesso ? `🕊️ Deceduto ${new Date(animale.data_decesso).toLocaleDateString('it-IT')}` : '🕊️ Segna deceduto'}
        </button>
      </div>

      {/* Header card */}
      <div style={{...glass,padding:'18px 20px',marginBottom:14,display:'flex',alignItems:'center',gap:14, opacity: animale.data_decesso ? 0.75 : 1}}>
        {animale.data_decesso && (
          <div style={{position:'absolute', top:0, left:0, right:0, background:'rgba(220,38,38,0.1)', border:'1px solid rgba(220,38,38,0.2)', borderRadius:'20px 20px 0 0', padding:'6px 16px', fontSize:12, fontWeight:600, color:'#dc2626', textAlign:'center'}}>
            🕊️ Deceduto il {new Date(animale.data_decesso).toLocaleDateString('it-IT')}
          </div>
        )}
        {/* Avatar — foto o emoji */}
        <div style={{position:'relative', flexShrink:0}}>
          <div
            onClick={() => fotoInputRef.current?.click()}
            style={{
              width:64, height:64, borderRadius:18,
              background: fotoUrl ? 'transparent' : 'linear-gradient(145deg,#5aabff,#2060dd)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:28, cursor:'pointer', overflow:'hidden',
              boxShadow:'0 4px 14px rgba(50,100,220,0.35)',
              border: fotoUrl ? '2px solid rgba(255,255,255,0.7)' : 'none',
            }}
          >
            {fotoUrl
              ? <img src={fotoUrl} alt={animale.nome} style={{width:'100%',height:'100%',objectFit:'cover'}} />
              : specieEmoji(animale.specie)
            }
            {/* Overlay camera al hover */}
            <div style={{
              position:'absolute', inset:0, background:'rgba(0,0,0,0.35)',
              display:'flex', alignItems:'center', justifyContent:'center',
              opacity:0, transition:'opacity 0.2s',
              borderRadius:18,
            }}
              onMouseEnter={e => e.currentTarget.style.opacity=1}
              onMouseLeave={e => e.currentTarget.style.opacity=0}
            >
              <span style={{fontSize:20}}>{uploadingFoto ? '⏳' : '📷'}</span>
            </div>
          </div>
          {/* Tasto rimuovi foto */}
          {fotoUrl && (
            <button onClick={handleFotoRemove} style={{
              position:'absolute', top:-6, right:-6,
              width:18, height:18, borderRadius:'50%',
              background:'#dc2626', color:'#fff', border:'2px solid #fff',
              fontSize:10, cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center',
              fontFamily:'inherit', lineHeight:1, padding:0,
            }}>×</button>
          )}
          <input ref={fotoInputRef} type="file" accept="image/*"
            onChange={handleFotoUpload} style={{display:'none'}} />
        </div>
        {fotoError && (
          <div style={{fontSize:11, color:'#dc2626', position:'absolute', marginTop:68, marginLeft:0}}>
            {fotoError}
          </div>
        )}
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
        {[{id:'scheda',label:'📋 Scheda'},{id:'mappa',label:'🗺️ Mappa'},{id:'salute',label:'🏥 Salute'},{id:'storico',label:'📌 Note'},{id:'visite',label:'📅 Visite'}].map(t=>(
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

          {/* Operatore preferito */}
          <div style={{...glass,padding:'15px 17px'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:9}}>
              <div style={secLabel}>👤 Operatore preferito</div>
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button
                onClick={async()=>{
                  await supabase.from('animali').update({operatore_preferito_id:null}).eq('id',animale.id);
                  onUpdate({...animale,operatore_preferito_id:null});
                }}
                style={{
                  padding:'8px 14px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                  fontSize:13,fontWeight:600,border:'1px solid var(--card-border)',
                  background:!animale.operatore_preferito_id?'rgba(37,99,235,0.15)':'var(--card-bg-sm)',
                  color:!animale.operatore_preferito_id?'#2563eb':'var(--text-muted)',
                }}>
                Nessuna preferenza
              </button>
              {operatori.map(op=>(
                <button key={op.id}
                  onClick={async()=>{
                    await supabase.from('animali').update({operatore_preferito_id:op.id}).eq('id',animale.id);
                    onUpdate({...animale,operatore_preferito_id:op.id});
                  }}
                  style={{
                    padding:'8px 14px',borderRadius:12,cursor:'pointer',fontFamily:'inherit',
                    fontSize:13,fontWeight:600,border:'1px solid var(--card-border)',
                    background:animale.operatore_preferito_id===op.id?'rgba(37,99,235,0.15)':'var(--card-bg-sm)',
                    color:animale.operatore_preferito_id===op.id?'#2563eb':'var(--text-primary)',
                    display:'flex',alignItems:'center',gap:8,
                  }}>
                  <div style={{width:20,height:20,borderRadius:'50%',
                    background:op.colore||'#2563eb',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:10,fontWeight:700,color:'#fff'}}>
                    {op.nome[0]}
                  </div>
                  {op.nome}
                </button>
              ))}
            </div>
          </div>

          {/* Impostazioni riservate */}
          <div style={{...glass, padding:'15px 17px'}}>
            <div style={{...secLabel, marginBottom:4}}>⭐ Impostazioni riservate</div>
            <div style={{fontSize:11, color:'var(--text-muted)', marginBottom:12}}>
              Precompilano automaticamente il calendario alla prenotazione
            </div>

            {/* Servizi riservati — selezione multipla */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:8}}>✂️ Servizi preferiti</div>
              <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
                {servizi.map(s => {
                  const ids = animale.servizi_riservati_ids || [];
                  const sel = ids.includes(s.id);
                  return (
                    <button key={s.id} onClick={async () => {
                      const nuovi = sel ? ids.filter(id => id !== s.id) : [...ids, s.id];
                      await saveRiservato({ servizi_riservati_ids: nuovi });
                    }} style={{
                      padding:'7px 12px', borderRadius:10, cursor:'pointer',
                      fontFamily:'inherit', fontSize:12, fontWeight:600,
                      border:`1px solid ${sel ? 'rgba(37,99,235,0.4)' : 'var(--card-border)'}`,
                      background: sel ? 'rgba(37,99,235,0.12)' : 'var(--card-bg-sm)',
                      color: sel ? '#2563eb' : 'var(--text-primary)',
                      display:'flex', alignItems:'center', gap:6,
                    }}>
                      {sel && <span style={{fontSize:10}}>✓</span>}
                      {s.nome}
                      {s.durata_minuti && <span style={{fontSize:10, opacity:0.6}}>{s.durata_minuti}min</span>}
                    </button>
                  );
                })}
              </div>
              {(animale.servizi_riservati_ids?.length > 0) && (
                <div style={{fontSize:11, color:'var(--text-muted)', marginTop:6}}>
                  {animale.servizi_riservati_ids.length} servizio/i selezionato/i
                </div>
              )}
            </div>

            {/* Durata riservata */}
            <div>
              <div style={{fontSize:12, fontWeight:600, color:'var(--text-secondary)', marginBottom:8}}>⏱️ Durata preferita</div>
              <div style={{display:'flex', gap:10, alignItems:'center'}}>
                <input
                  type="number" min="5" max="480" step="5"
                  placeholder="Es. 90"
                  defaultValue={animale.durata_riservata || ''}
                  onBlur={async e => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    if (val !== animale.durata_riservata) await saveRiservato({ durata_riservata: val });
                  }}
                  style={{...inputStyle, width:100}}
                />
                <span style={{fontSize:12, color:'var(--text-muted)'}}>minuti</span>
                {animale.durata_riservata && (
                  <span style={{fontSize:12, color:'#2563eb', fontWeight:600}}>
                    {Math.floor(animale.durata_riservata/60) > 0 ? `${Math.floor(animale.durata_riservata/60)}h ` : ''}
                    {animale.durata_riservata%60 > 0 ? `${animale.durata_riservata%60}min` : ''}
                  </span>
                )}
              </div>
              <div style={{fontSize:11, color:'var(--text-muted)', marginTop:5}}>
                Lascia vuoto per usare la somma dei servizi selezionati
              </div>
            </div>
          </div>

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

          {/* Zone critiche con gestione tag */}
          <ZoneCritiche animale={animale} onUpdate={onUpdate} />

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

      {/* ── SCHEDA SANITARIA ─────────────────────────────────── */}
      {tab==='salute' && (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>

          {/* Header azioni */}
          <div style={{display:'flex',justifyContent:'flex-end',gap:8}}>
            {sanEdit ? (
              <>
                <button onClick={()=>setSanEdit(false)} style={{...btnSecondary,padding:'8px 14px',fontSize:13}}>Annulla</button>
                <button onClick={saveSanitaria} disabled={savingSan}
                  style={{...btnPrimary,padding:'8px 18px',fontSize:13,opacity:savingSan?0.7:1}}>
                  {savingSan?'Salvataggio...':'Salva'}
                </button>
              </>
            ) : (
              <button onClick={()=>setSanEdit(true)} style={{...btnSecondary,padding:'8px 14px',fontSize:13}}>
                ✏️ Modifica
              </button>
            )}
          </div>

          {/* Allergie */}
          <div style={{...glass,padding:'16px 18px'}}>
            <div style={{...secLabel,marginBottom:10}}>⚠️ Allergie e intolleranze</div>
            {sanEdit ? (
              <textarea rows={3} placeholder="Es. allergia al profumo X, intolleranza al lattosio..."
                value={sanForm.allergie}
                onChange={e=>setSanForm(p=>({...p,allergie:e.target.value}))}
                style={{...inputStyle,resize:'vertical'}}/>
            ) : (
              <div style={{fontSize:13,color:animale.allergie?'var(--text-primary)':'var(--text-muted)',lineHeight:1.6}}>
                {animale.allergie || 'Nessuna allergia nota'}
              </div>
            )}
          </div>

          {/* Farmaci */}
          <div style={{...glass,padding:'16px 18px'}}>
            <div style={{...secLabel,marginBottom:10}}>💊 Farmaci in corso</div>
            {sanEdit ? (
              <textarea rows={2} placeholder="Es. Apoquel 5mg una volta al giorno..."
                value={sanForm.farmaci_in_corso}
                onChange={e=>setSanForm(p=>({...p,farmaci_in_corso:e.target.value}))}
                style={{...inputStyle,resize:'vertical'}}/>
            ) : (
              <div style={{fontSize:13,color:animale.farmaci_in_corso?'var(--text-primary)':'var(--text-muted)',lineHeight:1.6}}>
                {animale.farmaci_in_corso || 'Nessun farmaco in corso'}
              </div>
            )}
          </div>

          {/* Vaccini */}
          <div style={{...glass,padding:'16px 18px'}}>
            <div style={{...secLabel,marginBottom:10}}>💉 Vaccini</div>
            {vaccini.length === 0 && !sanEdit && (
              <div style={{fontSize:13,color:'var(--text-muted)'}}>Nessun vaccino registrato</div>
            )}
            {vaccini.map((v,i) => (
              <div key={i} style={{...glassCard,padding:'10px 13px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)'}}>{v.nome}</div>
                  <div style={{fontSize:11,color:'var(--text-secondary)',marginTop:2}}>
                    {v.data_ultima && `Ultima: ${new Date(v.data_ultima).toLocaleDateString('it-IT')}`}
                    {v.scadenza && ` · Scade: `}
                    {v.scadenza && (
                      <span style={{color: new Date(v.scadenza) < new Date() ? '#dc2626' : '#059669', fontWeight:600}}>
                        {new Date(v.scadenza).toLocaleDateString('it-IT')}
                        {new Date(v.scadenza) < new Date() ? ' ⚠️ SCADUTO' : ''}
                      </span>
                    )}
                  </div>
                </div>
                {sanEdit && (
                  <button onClick={()=>removeVaccino(i)} style={{background:'rgba(220,38,38,0.1)',border:'1px solid rgba(220,38,38,0.2)',
                    borderRadius:8,padding:'4px 8px',cursor:'pointer',color:'#dc2626',fontSize:12}}>✕</button>
                )}
              </div>
            ))}
            {sanEdit && (
              <div style={{...glassCard,padding:'12px 14px',marginTop:8}}>
                <div style={{fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:8}}>AGGIUNGI VACCINO</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
                  <input placeholder="Nome vaccino" value={nuovoVacc.nome}
                    onChange={e=>setNuovoVacc(p=>({...p,nome:e.target.value}))}
                    style={{...inputStyle,fontSize:12}}/>
                  <input type="date" placeholder="Data ultima" value={nuovoVacc.data_ultima}
                    onChange={e=>setNuovoVacc(p=>({...p,data_ultima:e.target.value}))}
                    style={{...inputStyle,fontSize:12}}/>
                  <input type="date" placeholder="Scadenza" value={nuovoVacc.scadenza}
                    onChange={e=>setNuovoVacc(p=>({...p,scadenza:e.target.value}))}
                    style={{...inputStyle,fontSize:12}}/>
                </div>
                <button onClick={addVaccino} style={{...btnPrimary,width:'100%',padding:'9px',fontSize:13}}>
                  + Aggiungi vaccino
                </button>
              </div>
            )}
          </div>

          {/* Veterinario */}
          <div style={{...glass,padding:'16px 18px'}}>
            <div style={{...secLabel,marginBottom:10}}>🩺 Veterinario di riferimento</div>
            {sanEdit ? (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <input placeholder="Nome veterinario o studio" value={sanForm.veterinario_nome}
                  onChange={e=>setSanForm(p=>({...p,veterinario_nome:e.target.value}))}
                  style={inputStyle}/>
                <input type="tel" placeholder="Telefono" value={sanForm.veterinario_tel}
                  onChange={e=>setSanForm(p=>({...p,veterinario_tel:e.target.value}))}
                  style={inputStyle}/>
              </div>
            ) : (
              <div style={{fontSize:13,color:'var(--text-primary)',lineHeight:1.8}}>
                {animale.veterinario_nome ? (
                  <>
                    <div style={{fontWeight:600}}>{animale.veterinario_nome}</div>
                    {animale.veterinario_tel && (
                      <a href={'tel:'+animale.veterinario_tel}
                        style={{color:'#2563eb',textDecoration:'none'}}>
                        📞 {animale.veterinario_tel}
                      </a>
                    )}
                  </>
                ) : (
                  <span style={{color:'var(--text-muted)'}}>Nessun veterinario registrato</span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STORICO VISITE ───────────────────────────────────── */}
      {tab==='visite' && (
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {visiteLoding ? (
            <div style={{textAlign:'center',padding:'40px 0',color:'var(--text-muted)',fontSize:13}}>
              Caricamento visite...
            </div>
          ) : visite.length === 0 ? (
            <div style={{...glass,padding:'40px 20px',textAlign:'center'}}>
              <div style={{fontSize:36,marginBottom:12}}>📅</div>
              <div style={{fontSize:15,fontWeight:600,color:'var(--text-primary)',marginBottom:6}}>
                Nessuna visita registrata
              </div>
              <div style={{fontSize:13,color:'var(--text-secondary)'}}>
                Le visite appariranno qui una volta completate
              </div>
            </div>
          ) : (
            <>
              {/* Totale speso */}
              <div style={{...glassCard,padding:'12px 16px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.5px',textTransform:'uppercase'}}>
                    Totale speso
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:'#2563eb',letterSpacing:'-0.5px'}}>
                    € {visite.reduce((sum,v)=>{
                      const p = v.prezzo_confermato_flag ? Number(v.prezzo_confermato||0) : Number(v.prezzo_proposto||0);
                      return sum + p;
                    }, 0).toFixed(2)}
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',letterSpacing:'0.5px',textTransform:'uppercase'}}>
                    Visite totali
                  </div>
                  <div style={{fontSize:22,fontWeight:800,color:'var(--text-primary)',letterSpacing:'-0.5px'}}>
                    {visite.length}
                  </div>
                </div>
              </div>

              {/* Lista visite */}
              {visite.map((v,i) => {
                const coloreStato = {confermato:'#2563eb','in attesa':'#d97706',completato:'#059669',cancellato:'#dc2626'}[v.stato]||'#888';
                const prezzo = v.prezzo_confermato_flag ? Number(v.prezzo_confermato||0) : Number(v.prezzo_proposto||0);
                const servizi = (v.appuntamenti_servizi||[]).map(s=>s.servizi?.nome).filter(Boolean).join(', ');
                return (
                  <div key={v.id} style={{...glassCard,padding:'13px 15px'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                      {/* Data */}
                      <div style={{flexShrink:0,textAlign:'center',minWidth:44}}>
                        <div style={{fontSize:18,fontWeight:800,color:'var(--text-primary)',lineHeight:1}}>
                          {new Date(v.inizio).getDate()}
                        </div>
                        <div style={{fontSize:10,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.3px'}}>
                          {new Date(v.inizio).toLocaleDateString('it-IT',{month:'short'})}
                        </div>
                        <div style={{fontSize:10,color:'var(--text-muted)'}}>
                          {new Date(v.inizio).getFullYear()}
                        </div>
                      </div>
                      {/* Barra colore */}
                      <div style={{width:3,alignSelf:'stretch',borderRadius:99,background:coloreStato,flexShrink:0}}/>
                      {/* Info */}
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--text-primary)'}}>
                            {new Date(v.inizio).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}
                            {v.fine && ` — ${new Date(v.fine).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'})}`}
                          </span>
                          <span style={{fontSize:10,fontWeight:700,background:coloreStato+'18',color:coloreStato,
                            padding:'2px 7px',borderRadius:20}}>{v.stato}</span>
                        </div>
                        {servizi && (
                          <div style={{fontSize:12,color:'var(--text-secondary)',marginBottom:2,
                            whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                            ✂️ {servizi}
                          </div>
                        )}
                        {v.operatori?.nome && (
                          <div style={{fontSize:11,color:'var(--text-muted)'}}>
                            👤 {v.operatori.nome} {v.operatori.cognome||''}
                          </div>
                        )}
                        {v.note && (
                          <div style={{fontSize:12,color:'var(--text-secondary)',marginTop:4,
                            background:'var(--card-bg-sm)',borderRadius:8,padding:'6px 8px',
                            fontStyle:'italic',lineHeight:1.4}}>
                            "{v.note}"
                          </div>
                        )}
                      </div>
                      {/* Prezzo */}
                      {prezzo > 0 && (
                        <div style={{flexShrink:0,fontSize:14,fontWeight:800,color:'#059669'}}>
                          € {prezzo.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </motion.div>

      {/* ── MODALE MODIFICA SCHEDA ─────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position:'fixed', inset:0, zIndex:300, background:'rgba(10,24,64,0.45)',
              backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
              display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
            onClick={e => e.target===e.currentTarget && setShowEditModal(false)}>
            <motion.div
              initial={{ opacity:0, y:24, scale:0.97 }}
              animate={{ opacity:1, y:0, scale:1 }}
              exit={{ opacity:0, y:12, scale:0.98 }}
              transition={{ type:'spring', stiffness:380, damping:28 }}
              style={{...glass, padding:24, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto'}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20}}>
                <div style={{fontSize:18, fontWeight:700, color:'var(--text-primary)'}}>✏️ Modifica scheda</div>
                <button onClick={() => setShowEditModal(false)} style={{background:'var(--card-bg-sm)', border:'1px solid rgba(255,255,255,0.7)', borderRadius:10, width:32, height:32, cursor:'pointer', fontSize:18, color:'var(--text-secondary)', fontFamily:'inherit'}}>×</button>
              </div>

              <div style={{display:'flex', flexDirection:'column', gap:13}}>
                <div>
                  <div style={secLabel}>Nome *</div>
                  <input type="text" value={editForm.nome}
                    onChange={e => setEditForm(p=>({...p, nome:e.target.value}))}
                    style={inputStyle} placeholder="Nome animale" />
                </div>

                <div>
                  <div style={secLabel}>Specie</div>
                  <div style={{display:'flex', gap:8}}>
                    {['cane','gatto','altro'].map(s => (
                      <button key={s} onClick={() => setEditForm(p=>({...p, specie:s, razza_id:''}))} style={{
                        flex:1, padding:'9px', borderRadius:12, cursor:'pointer', fontFamily:'inherit',
                        fontSize:13, fontWeight:600, border:'1px solid rgba(255,255,255,0.8)',
                        background: editForm.specie===s ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
                        color: editForm.specie===s ? 'var(--text-primary)' : 'var(--text-secondary)',
                        boxShadow: editForm.specie===s ? '0 2px 0 rgba(255,255,255,0.9) inset' : 'none',
                      }}>{specieEmoji(s)} {s.charAt(0).toUpperCase()+s.slice(1)}</button>
                    ))}
                  </div>
                </div>

                {editFormRazze.filter(r => r.specie === editForm.specie).length > 0 && (
                  <div>
                    <div style={secLabel}>Razza</div>
                    <select value={editForm.razza_id}
                      onChange={e => setEditForm(p=>({...p, razza_id:e.target.value}))}
                      style={{...inputStyle}}>
                      <option value="">— Nessuna razza —</option>
                      {editFormRazze.filter(r => r.specie === editForm.specie).map(r => (
                        <option key={r.id} value={r.id}>{r.nome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <div style={secLabel}>Data di nascita</div>
                  <input type="date" value={editForm.data_nascita}
                    onChange={e => setEditForm(p=>({...p, data_nascita:e.target.value}))}
                    style={inputStyle} />
                </div>

                <div>
                  <div style={secLabel}>Colore mantello</div>
                  <input type="text" value={editForm.colore}
                    onChange={e => setEditForm(p=>({...p, colore:e.target.value}))}
                    style={inputStyle} placeholder="Es. nero, bianco, fulvo..." />
                </div>

                <div>
                  <div style={secLabel}>Note generali</div>
                  <textarea rows={3} value={editForm.note}
                    onChange={e => setEditForm(p=>({...p, note:e.target.value}))}
                    style={{...inputStyle, resize:'vertical'}}
                    placeholder="Carattere, abitudini, altro..." />
                </div>
              </div>

              {editError && (
                <div style={{fontSize:13, color:'#dc2626', margin:'12px 0', padding:'8px 12px',
                  background:'rgba(239,68,68,0.08)', borderRadius:10}}>{editError}</div>
              )}

              <div style={{display:'flex', gap:10, marginTop:18}}>
                <button onClick={() => setShowEditModal(false)} style={{...btnSecondary, flex:1}}>Annulla</button>
                <button onClick={saveEditForm} disabled={savingEdit}
                  style={{...btnPrimary, flex:2, opacity:savingEdit?0.7:1}}>
                  {savingEdit ? 'Salvataggio...' : '✓ Salva modifiche'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
// ─────────────────────────────────────────────────────────────
const PAGE_SIZE = 20;

function ListaAnimali({ animali, loading, onSelect, onAdd }) {
  const [search,   setSearch]   = useState('');
  const [visibili, setVisibili] = useState(PAGE_SIZE);
  const loaderRef = useRef(null);

  const filtered = animali.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    `${a.clienti?.cognome||''} ${a.clienti?.nome||''}`.toLowerCase().includes(search.toLowerCase()) ||
    (a.razze?.nome||'').toLowerCase().includes(search.toLowerCase())
  );

  const visibiliList = filtered.slice(0, visibili);
  const hasMore = visibili < filtered.length;

  // Reset paginazione quando cambia la ricerca
  useEffect(() => { setVisibili(PAGE_SIZE); }, [search]);

  // IntersectionObserver per infinite scroll
  useEffect(() => {
    if (!loaderRef.current || !hasMore) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) setVisibili(v => v + PAGE_SIZE);
    }, { threshold: 0.1 });
    obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore, visibiliList.length]);

  return (
    <div style={{width:'100%'}}>
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
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',gap:10}}>
          {visibiliList.map((a,i)=>(
            <motion.button
              key={a.id}
              onClick={()=>onSelect(a)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25, ease: [0.22,1,0.36,1] }}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...glassCard,display:'flex',alignItems:'center',gap:14,
                padding:'14px 16px',cursor:'pointer',textAlign:'left',
                width:'100%',fontFamily:'inherit',
              }}
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
            </motion.button>
          ))}
          {/* Sentinel per infinite scroll */}
          {hasMore && (
            <div ref={loaderRef} style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Caricamento altri animali...
            </div>
          )}
          {!hasMore && filtered.length > PAGE_SIZE && (
            <div style={{ padding: '12px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              Tutti i {filtered.length} animali caricati
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PetView({ initialPetId, onPetOpened }) {
  const [animali,   setAnimali]   = useState([]);
  const [clienti,   setClienti]   = useState([]);
  const [operatori, setOperatori] = useState([]);
  const [razze,     setRazze]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  // Apri automaticamente l'animale richiesto da ClientiView
  useEffect(() => {
    if (!initialPetId || animali.length === 0) return;
    const target = animali.find(a => a.id === initialPetId);
    if (target) { setSelected(target); onPetOpened?.(); }
  }, [initialPetId, animali]);

  const fetchAll = async () => {
    setLoading(true);
    const [an, cl, op, rz] = await Promise.all([
      supabase.from('animali').select('*, clienti(id,nome,cognome), razze(id,nome), operatori(id,nome,cognome)').order('nome'), // foto_url incluso in *
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
      <AnimatePresence>
        {showModal && <ModalAggiungi clienti={clienti} razze={razze} onClose={()=>setShowModal(false)} onSaved={handleSaved}/>}
      </AnimatePresence>
    </>
  );
}