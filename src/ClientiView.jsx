/**
 * ClientiView.jsx
 * Lista clienti + scheda cliente + animali collegati
 * Collegato a Supabase: tabelle clienti, animali, razze, operatori
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';

// ── Stili condivisi ───────────────────────────────────────────
const glass = {
  background: 'var(--card-bg)',
  border: '1px solid rgba(255,255,255,0.8)',
  borderRadius: 20,
  boxShadow: 'var(--card-shadow)',
};
const glassCard = {
  background: 'var(--card-bg-sm)',
  border: '1px solid rgba(255,255,255,0.72)',
  borderRadius: 16,
  boxShadow: 'var(--card-shadow-sm)',
};
const inputStyle = {
  width: '100%', background: 'var(--input-bg)',
  border: '1px solid rgba(255,255,255,0.8)', borderRadius: 12,
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
  border: '1px solid rgba(255,255,255,0.8)', borderRadius: 13,
  padding: '11px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
const btnGreen = {
  background: 'linear-gradient(145deg,#34d399,#059669)', color: '#fff',
  border: 'none', borderRadius: 13, padding: '11px 18px',
  fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(5,150,105,0.35)',
};
const secLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8,
};
const specieEmoji = s => s === 'gatto' ? '🐈' : s === 'coniglio' ? '🐇' : '🐕';

// ─────────────────────────────────────────────────────────────
// MODAL OVERLAY WRAPPER
// ─────────────────────────────────────────────────────────────
function ModalOverlay({ onClose, children, maxWidth = 520, zIndex = 200 }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex,
        background: 'rgba(10,24,64,0.4)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{
          ...glass, padding: 24, width: '100%',
          maxWidth, maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</div>
      <button onClick={onClose} style={{
        background: 'var(--card-bg-sm)', border: '1px solid rgba(255,255,255,0.7)',
        borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
        fontSize: 18, color: 'var(--text-secondary)', fontFamily: 'inherit',
      }}>×</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL AGGIUNGI ANIMALE (nested)
// ─────────────────────────────────────────────────────────────
function ModalAggiungiAnimale({ clienteId, clienteNome, razze, operatori, onClose, onSaved }) {
  const [f, setF] = useState({
    nome: '', specie: 'cane', razza_id: '', data_nascita: '',
    colore: '', servizi_abituali: '', preferenze_proprietario: '',
    problemi_salute: '', problemi_carattere: '', note: '',
    operatore_preferito_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const razzeFiltered = razze.filter(r => r.specie === f.specie);

  const save = async () => {
    if (!f.nome.trim()) { setError("Inserisci il nome dell'animale"); return; }
    setLoading(true); setError('');
    const { data, error: err } = await supabase
      .from('animali')
      .insert([{
        cliente_id: clienteId,
        nome: f.nome.trim(),
        specie: f.specie,
        razza_id: f.razza_id || null,
        data_nascita: f.data_nascita || null,
        colore: f.colore.trim() || null,
        servizi_abituali: f.servizi_abituali.trim() || null,
        preferenze_proprietario: f.preferenze_proprietario.trim() || null,
        problemi_salute: f.problemi_salute.trim() || null,
        problemi_carattere: f.problemi_carattere.trim() || null,
        note: f.note.trim() || null,
        operatore_preferito_id: f.operatore_preferito_id || null,
      }])
      .select('*, razze(id,nome)')
      .single();
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved(data);
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={500} zIndex={300}>
      <ModalHeader title={`🐾 Nuovo animale — ${clienteNome}`} onClose={onClose} />

      {/* Nome */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>Nome animale *</div>
        <input type="text" placeholder="Es. Rex, Luna..." value={f.nome}
          onChange={e => set('nome', e.target.value)} style={inputStyle} autoFocus />
      </div>

      {/* Specie */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>Specie</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['cane', 'gatto', 'altro'].map(s => (
            <button key={s} onClick={() => { set('specie', s); set('razza_id', ''); }} style={{
              flex: 1, padding: '9px', borderRadius: 12, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.8)',
              background: f.specie === s ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
              color: f.specie === s ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: f.specie === s ? '0 2px 0 rgba(255,255,255,0.9) inset' : 'none',
            }}>
              {specieEmoji(s)} {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Razza */}
      {razzeFiltered.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={secLabel}>Razza</div>
          <select value={f.razza_id} onChange={e => set('razza_id', e.target.value)} style={inputStyle}>
            <option value="">Seleziona razza...</option>
            {razzeFiltered.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </div>
      )}

      {/* Data nascita + Colore */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={secLabel}>Data di nascita</div>
          <input type="date" value={f.data_nascita} onChange={e => set('data_nascita', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={secLabel}>Colore mantello</div>
          <input type="text" placeholder="Es. nero, bianco..." value={f.colore}
            onChange={e => set('colore', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Operatore preferito */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>Operatore preferito</div>
        <select value={f.operatore_preferito_id} onChange={e => set('operatore_preferito_id', e.target.value)} style={inputStyle}>
          <option value="">Nessuna preferenza</option>
          {operatori.map(o => <option key={o.id} value={o.id}>{o.nome} {o.cognome}</option>)}
        </select>
      </div>

      {/* Servizi abituali */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>✂️ Servizi abituali</div>
        <textarea rows={2} placeholder="Es. toeletta completa mensile, bagno ogni 2 settimane..."
          value={f.servizi_abituali} onChange={e => set('servizi_abituali', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Preferenze */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>💬 Preferenze proprietario</div>
        <textarea rows={2} placeholder="Es. asciugatura a bassa temperatura, no profumo..."
          value={f.preferenze_proprietario} onChange={e => set('preferenze_proprietario', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Problemi salute */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>🏥 Problemi di salute</div>
        <textarea rows={2} placeholder="Allergie, patologie, medicinali in corso..."
          value={f.problemi_salute} onChange={e => set('problemi_salute', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Problemi carattere */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>🧠 Problemi caratteriali</div>
        <textarea rows={2} placeholder="Es. agitato con altri cani, morde durante il taglio unghie..."
          value={f.problemi_carattere} onChange={e => set('problemi_carattere', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <div style={secLabel}>📝 Note aggiuntive</div>
        <textarea rows={2} placeholder="Altre informazioni utili..."
          value={f.note} onChange={e => set('note', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
        <button onClick={save} disabled={loading} style={{ ...btnGreen, flex: 2, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Salvataggio...' : '🐾 Aggiungi animale'}
        </button>
      </div>
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL AGGIUNGI CLIENTE
// ─────────────────────────────────────────────────────────────
function ModalAggiungiCliente({ razze, operatori, onClose, onSaved }) {
  const [f, setF] = useState({
    nome: '', cognome: '', telefono: '', email: '', indirizzo: '', note: '', prezzo_riservato: '',
  });
  const [animali, setAnimali] = useState([]);      // animali da aggiungere
  const [showPet, setShowPet] = useState(false);   // mostra modal animale nested
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Aggiunta animale temporanea (prima del salvataggio del cliente)
  const handlePetSaved = (pet) => {
    setAnimali(prev => [...prev, pet]);
  };

  const save = async () => {
    if (!f.nome.trim()) { setError('Inserisci il nome'); return; }
    if (!f.cognome.trim()) { setError('Inserisci il cognome'); return; }
    setLoading(true); setError('');

    // 1. Salva il cliente
    const { data: cliente, error: errC } = await supabase
      .from('clienti')
      .insert([{
        nome: f.nome.trim(),
        cognome: f.cognome.trim(),
        telefono: f.telefono.trim() || null,
        email: f.email.trim() || null,
        indirizzo: f.indirizzo.trim() || null,
        note: f.note.trim() || null,
        prezzo_riservato: f.prezzo_riservato !== '' ? Number(f.prezzo_riservato) : null,
      }])
      .select()
      .single();

    if (errC) { setLoading(false); setError(errC.message); return; }

    // 2. Se ci sono animali da aggiungere, li salva con il cliente_id appena creato
    if (animali.length > 0) {
      const animaliDaSalvare = animali.map(a => ({
        ...a,
        id: undefined,           // rimuovi id temporaneo
        cliente_id: cliente.id,  // assegna il vero cliente_id
        razze: undefined,        // rimuovi join data
      }));
      await supabase.from('animali').insert(animaliDaSalvare);
    }

    setLoading(false);
    onSaved({ ...cliente, animali_count: animali.length });
    onClose();
  };

  return (
    <ModalOverlay onClose={onClose} maxWidth={540} zIndex={200}>
      <ModalHeader title="👤 Nuovo cliente" onClose={onClose} />

      {/* Nome + Cognome */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={secLabel}>Nome *</div>
          <input type="text" placeholder="Mario" value={f.nome}
            onChange={e => set('nome', e.target.value)} style={inputStyle} autoFocus />
        </div>
        <div>
          <div style={secLabel}>Cognome *</div>
          <input type="text" placeholder="Rossi" value={f.cognome}
            onChange={e => set('cognome', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Telefono + Email */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={secLabel}>📱 Telefono</div>
          <input type="tel" placeholder="+39 333 1234567" value={f.telefono}
            onChange={e => set('telefono', e.target.value)} style={inputStyle} />
        </div>
        <div>
          <div style={secLabel}>📧 Email</div>
          <input type="email" placeholder="mario@email.com" value={f.email}
            onChange={e => set('email', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Indirizzo */}
      <div style={{ marginBottom: 14 }}>
        <div style={secLabel}>📍 Indirizzo</div>
        <input type="text" placeholder="Via Roma 1, Milano" value={f.indirizzo}
          onChange={e => set('indirizzo', e.target.value)} style={inputStyle} />
      </div>

      {/* Note */}
      <div style={{ marginBottom: 20 }}>
        <div style={secLabel}>📝 Note</div>
        <textarea rows={2} placeholder="Note sul cliente..."
          value={f.note} onChange={e => set('note', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      {/* Sezione animali già aggiunti */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={secLabel}>🐾 Animali ({animali.length})</div>
          <button onClick={() => setShowPet(true)} style={{
            ...btnGreen, padding: '7px 14px', fontSize: 12,
          }}>
            + Aggiungi pet
          </button>
        </div>

        {animali.length === 0 ? (
          <div style={{ ...glassCard, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Nessun animale aggiunto — puoi aggiungerli anche dopo
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {animali.map((a, i) => (
              <div key={i} style={{ ...glassCard, display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px' }}>
                <span style={{ fontSize: 20 }}>{specieEmoji(a.specie)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{a.nome}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {a.razze?.nome || a.specie}
                    {a.colore && ` - ${a.colore}`}
                  </div>
                </div>
                <button onClick={() => setAnimali(prev => prev.filter((_, idx) => idx !== i))}
                  style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontFamily: 'inherit' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
        <button onClick={save} disabled={loading} style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Salvataggio...' : `✓ Salva cliente${animali.length > 0 ? ` + ${animali.length} pet` : ''}`}
        </button>
      </div>

      {/* Modal animale nested */}
      {showPet && (
        <ModalAggiungiAnimale
          clienteId={null}
          clienteNome={`${f.nome} ${f.cognome}`.trim() || 'nuovo cliente'}
          razze={razze}
          operatori={operatori}
          onClose={() => setShowPet(false)}
          onSaved={(pet) => { handlePetSaved(pet); setShowPet(false); }}
        />
      )}
    </ModalOverlay>
  );
}

// ─────────────────────────────────────────────────────────────
// SCHEDA CLIENTE
// ─────────────────────────────────────────────────────────────
function SchedaCliente({ cliente, razze, operatori, onUpdate, onBack }) {
  const [animali, setAnimali] = useState([]);
  const [loadingAnimali, setLoadingAnimali] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAddPet, setShowAddPet] = useState(false);

  useEffect(() => { fetchAnimali(); }, [cliente.id]);

  const fetchAnimali = async () => {
    setLoadingAnimali(true);
    const { data } = await supabase
      .from('animali')
      .select('*, razze(id,nome)')
      .eq('cliente_id', cliente.id)
      .order('nome');
    setAnimali(data || []);
    setLoadingAnimali(false);
  };

  const saveField = async () => {
    setSaving(true);
    const { error } = await supabase.from('clienti').update({ [editing]: editVal }).eq('id', cliente.id);
    setSaving(false);
    if (!error) { onUpdate({ ...cliente, [editing]: editVal }); setEditing(null); }
  };

  const handlePetAdded = (pet) => {
    setAnimali(prev => [...prev, pet].sort((a, b) => a.nome.localeCompare(b.nome)));
  };

  const CAMPI = [
    { field: 'telefono',  label: '📱 Telefono', type: 'tel' },
    { field: 'email',     label: '📧 Email',     type: 'email' },
    { field: 'indirizzo', label: '📍 Indirizzo', type: 'text' },
    { field: 'note',      label: '📝 Note',      type: 'textarea' },
    { field: 'prezzo_riservato', label: '💰 Prezzo riservato', type: 'number' },
  ];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Back */}
      <div style={{ marginBottom: 14 }}>
        <button onClick={onBack} style={{ ...btnSecondary, padding: '8px 14px', fontSize: 13 }}>← Indietro</button>
      </div>

      {/* Header cliente */}
      <div style={{ ...glass, padding: '18px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(145deg,#5aabff,#2060dd)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: '#fff', flexShrink: 0,
          boxShadow: '0 4px 14px rgba(50,100,220,0.35)',
        }}>
          {cliente.cognome?.[0]}{cliente.nome?.[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>
            {cliente.cognome} {cliente.nome}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12 }}>
            {cliente.telefono && <span>📱 {cliente.telefono}</span>}
            {cliente.email && <span>📧 {cliente.email}</span>}
          </div>
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '4px 10px', borderRadius: 20 }}>
          {animali.length} pet
        </div>
      </div>

      {/* Dati cliente */}
      <div style={{ ...glass, padding: '16px 18px', marginBottom: 14 }}>
        <div style={{ ...secLabel, marginBottom: 14 }}>Dati cliente</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CAMPI.map(({ field, label, type }) => (
            <div key={field}>
              {editing === field ? (
                <div>
                  <div style={{ ...secLabel, marginBottom: 6 }}>{label}</div>
                  {type === 'textarea' ? (
                    <textarea autoFocus rows={3} value={editVal} onChange={e => setEditVal(e.target.value)}
                      style={{ ...inputStyle, resize: 'vertical' }} />
                  ) : type === 'number' ? (
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
                      <input type="number" min="0" step="0.50" autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} style={{ ...inputStyle, paddingLeft: 26 }} />
                    </div>
                  ) : (
                    <input type={type} autoFocus value={editVal} onChange={e => setEditVal(e.target.value)} style={inputStyle} />
                  )}
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button onClick={saveField} disabled={saving} style={{ ...btnPrimary, flex: 1, padding: '8px', fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                      {saving ? 'Salvo...' : 'Salva'}
                    </button>
                    <button onClick={() => setEditing(null)} style={{ ...btnSecondary, padding: '8px 14px', fontSize: 13 }}>Annulla</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 100 }}>{label}</div>
                  <div style={{ flex: 1, fontSize: 14, color: cliente[field] ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: field === 'prezzo_riservato' && cliente[field] ? 700 : 400 }}>
                    {field === 'prezzo_riservato'
                      ? (cliente[field] ? `€ ${Number(cliente[field]).toFixed(2)}` : '— Prezzo standard')
                      : (cliente[field] || '—')}
                  </div>
                  <button onClick={() => { setEditing(field); setEditVal(cliente[field] || ''); }} style={{
                    fontSize: 11, fontWeight: 600, background: 'rgba(59,130,246,0.1)', color: '#2563eb',
                    border: 'none', borderRadius: 8, padding: '3px 10px', cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Modifica
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Animali del cliente */}
      <div style={{ ...glass, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={secLabel}>🐾 Animali ({animali.length})</div>
          <button onClick={() => setShowAddPet(true)} style={{ ...btnGreen, padding: '7px 14px', fontSize: 12 }}>
            + Aggiungi pet
          </button>
        </div>

        {loadingAnimali ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            Caricamento...
          </div>
        ) : animali.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>🐾</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
              Nessun animale registrato per questo cliente
            </div>
            <button onClick={() => setShowAddPet(true)} style={{ ...btnGreen, fontSize: 13 }}>
              + Aggiungi il primo pet
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {animali.map(a => (
              <div key={a.id} style={{ ...glassCard, display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px' }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(145deg,rgba(90,171,255,0.2),rgba(32,96,221,0.12))',
                  border: '2px solid rgba(90,171,255,0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                }}>
                  {specieEmoji(a.specie)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{a.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 1 }}>
                    {a.razze?.nome || a.specie}
                    {a.data_nascita && (() => {
                      const anni = Math.floor((new Date() - new Date(a.data_nascita)) / (1000 * 60 * 60 * 24 * 365));
                      return anni > 0 ? ` - ${anni}a` : ' - < 1a';
                    })()}
                    {a.colore && ` - ${a.colore}`}
                  </div>
                  {a.zone_critiche && (
                    <div style={{ fontSize: 11, color: '#d97706', marginTop: 3 }}>⚠️ {a.zone_critiche}</div>
                  )}
                </div>
                <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal aggiungi pet */}
      {showAddPet && (
        <ModalAggiungiAnimale
          clienteId={cliente.id}
          clienteNome={`${cliente.cognome} ${cliente.nome}`}
          razze={razze}
          operatori={operatori}
          onClose={() => setShowAddPet(false)}
          onSaved={(pet) => { handlePetAdded(pet); setShowAddPet(false); }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// LISTA CLIENTI
// ─────────────────────────────────────────────────────────────
function ListaClienti({ clienti, loading, onSelect, onAdd }) {
  const [search, setSearch] = useState('');
  const filtered = clienti.filter(c =>
    `${c.cognome} ${c.nome}`.toLowerCase().includes(search.toLowerCase()) ||
    (c.telefono || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.animali_nomi || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ maxWidth: 720, margin: '0 auto' }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>👤 Clienti</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{clienti.length} clienti registrati</div>
        </div>
        <button onClick={onAdd} style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Aggiungi cliente
        </button>
      </motion.div>

      {/* Ricerca */}
      <div style={{ ...glassCard, padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 16, opacity: 0.5 }}>🔍</span>
        <input type="text" placeholder="Cerca per nome, telefono, email o animale..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit' }} />
        {search && (
          <button onClick={() => setSearch('')} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>×</button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Caricamento clienti...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            {search ? 'Nessun risultato' : 'Nessun cliente registrato'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            {search ? 'Prova con un altro termine' : 'Aggiungi il primo cliente per iniziare'}
          </div>
          {!search && <button onClick={onAdd} style={btnPrimary}>+ Aggiungi cliente</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((c, i) => (
            <motion.button
              key={c.id}
              onClick={() => onSelect(c)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.25, ease: [0.22,1,0.36,1] }}
              whileHover={{ scale: 1.01, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                ...glassCard, display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                width: '100%', fontFamily: 'inherit',
              }}
            >
              {/* Avatar iniziali */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(145deg,rgba(90,171,255,0.25),rgba(32,96,221,0.15))',
                border: '2px solid rgba(90,171,255,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#2563eb',
              }}>
                {c.cognome?.[0]}{c.nome?.[0]}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {c.cognome} {c.nome}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 10 }}>
                  {c.telefono && <span>📱 {c.telefono}</span>}
                  {c.email && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📧 {c.email}</span>}
                </div>
              </div>

              {/* Badge animali + freccia */}
              <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                {c.animali_count > 0 && (
                  <div style={{ fontSize: 11, fontWeight: 600, background: 'rgba(16,185,129,0.12)', color: '#059669', padding: '3px 8px', borderRadius: 20 }}>
                    {c.animali_count} 🐾
                  </div>
                )}
                {c.prezzo_riservato && (
                  <div style={{ fontSize: 11, fontWeight: 700, background: 'rgba(37,99,235,0.1)', color: '#2563eb', padding: '3px 8px', borderRadius: 20 }}>
                    € {Number(c.prezzo_riservato).toFixed(0)}
                  </div>
                )}
                <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function ClientiView() {
  const [clienti,   setClienti]   = useState([]);
  const [razze,     setRazze]     = useState([]);
  const [operatori, setOperatori] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [cl, rz, op] = await Promise.all([
      supabase
        .from('clienti')
        .select('*, animali(id, nome)')
        .order('cognome'),
      supabase.from('razze').select('id,nome,specie').order('nome'),
      supabase.from('operatori').select('id,nome,cognome').eq('attivo', true).order('nome'),
    ]);

    // Normalize animali — count e nomi per la ricerca
    const clientiWithCount = (cl.data || []).map(c => ({
      ...c,
      animali_count: c.animali?.length || 0,
      animali_nomi: (c.animali || []).map(a => a.nome).join(' '),
    }));

    setClienti(clientiWithCount);
    setRazze(rz.data || []);
    setOperatori(op.data || []);
    setLoading(false);
  };

  const handleClienteSaved = (c) => {
    setClienti(prev => [...prev, { ...c, animali_count: c.animali_count || 0 }]
      .sort((a, b) => a.cognome.localeCompare(b.cognome)));
  };

  const handleClienteUpdate = (c) => {
    setClienti(prev => prev.map(x => x.id === c.id ? { ...x, ...c } : x));
    setSelected(c);
  };

  if (selected) {
    return (
      <SchedaCliente
        cliente={selected}
        razze={razze}
        operatori={operatori}
        onUpdate={handleClienteUpdate}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <>
      <ListaClienti
        clienti={clienti}
        loading={loading}
        onSelect={setSelected}
        onAdd={() => setShowModal(true)}
      />
      <AnimatePresence>
        {showModal && (
          <ModalAggiungiCliente
            razze={razze}
            operatori={operatori}
            onClose={() => setShowModal(false)}
            onSaved={handleClienteSaved}
          />
        )}
      </AnimatePresence>
    </>
  );
}