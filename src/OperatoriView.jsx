/**
 * OperatoriView.jsx
 * Lista operatori con modifica inline e aggiunta nuovo operatore
 * Collegato a Supabase: tabella operatori
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
  background: 'rgba(239,68,68,0.08)', color: '#dc2626',
  border: '1px solid rgba(239,68,68,0.2)', borderRadius: 13,
  padding: '11px 18px', fontSize: 14, fontWeight: 600,
  cursor: 'pointer', fontFamily: 'inherit',
};
const secLabel = {
  fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8,
};

// ── Palette colori predefiniti ────────────────────────────────
// Colori neon per operatori — vivaci e distinguibili nel calendario
const COLORI_PRESET = [
  '#3b82f6', // blu elettrico
  '#22c55e', // verde neon
  '#f97316', // arancio neon
  '#a855f7', // viola neon
  '#ec4899', // rosa neon
  '#06b6d4', // cyan neon
  '#eab308', // giallo neon
  '#ef4444', // rosso neon
  '#14b8a6', // teal neon
  '#8b5cf6', // indaco neon
];

// ── Selezione colore ──────────────────────────────────────────
function SeletoreColore({ value, onChange }) {
  const [custom, setCustom] = useState(false);
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {COLORI_PRESET.map(c => (
          <button
            key={c}
            onClick={() => { onChange(c); setCustom(false); }}
            style={{
              width: 28, height: 28, borderRadius: '50%', background: c,
              border: value === c ? '3px solid var(--text-primary)' : '2px solid transparent',
              cursor: 'pointer', padding: 0, flexShrink: 0,
              boxShadow: value === c ? `0 0 0 2px var(--card-bg), 0 0 0 4px ${c}` : 'none',
              transition: 'all 0.15s',
            }}
          />
        ))}
        {/* Colore personalizzato */}
        <div style={{ position: 'relative', width: 28, height: 28 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)',
            cursor: 'pointer', border: '2px solid var(--card-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
            onClick={() => setCustom(true)}
          >
            <span style={{ fontSize: 12, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>+</span>
          </div>
          {custom && (
            <input
              type="color"
              value={value}
              onChange={e => onChange(e.target.value)}
              style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
              autoFocus
            />
          )}
        </div>
      </div>
      {/* Preview */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: value, flexShrink: 0 }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{value}</span>
      </div>
    </div>
  );
}

// ── Modal Nuovo / Modifica Operatore ──────────────────────────
function ModalOperatore({ operatore, onClose, onSaved, onDeleted }) {
  const isEdit = !!operatore;
  const [f, setF] = useState({
    nome:    operatore?.nome    || '',
    cognome: operatore?.cognome || '',
    colore:  operatore?.colore  || COLORI_PRESET[0],
    attivo:  operatore?.attivo  ?? true,
    email:   operatore?.email   || '',
    telefono:operatore?.telefono|| '',
    note:    operatore?.note    || '',
  });
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');
  const [fotoUrl,       setFotoUrl]       = useState(null);
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const [fotoError,     setFotoError]     = useState('');
  const fotoInputRef = useRef(null);
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  // Carica signed URL foto esistente
  useEffect(() => {
    if (!operatore?.foto_url) return;
    supabase.storage.from('operatori-foto').createSignedUrl(operatore.foto_url, 3600)
      .then(({ data }) => { if (data?.signedUrl) setFotoUrl(data.signedUrl); });
  }, []);

  // Comprimi immagine con Canvas (max 600x600, JPEG 85%)
  const comprimi = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(resolve, 'image/jpeg', 0.85);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });

  const handleFotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    setUploadingFoto(true); setFotoError('');
    try {
      const compressed = await comprimi(file);
      const path = `${operatore.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from('operatori-foto').upload(path, compressed, {
        contentType: 'image/jpeg', upsert: true,
      });
      if (upErr) throw upErr;
      if (operatore.foto_url && operatore.foto_url !== path) {
        await supabase.storage.from('operatori-foto').remove([operatore.foto_url]);
      }
      await supabase.from('operatori').update({ foto_url: path }).eq('id', operatore.id);
      const { data } = await supabase.storage.from('operatori-foto').createSignedUrl(path, 3600);
      if (data?.signedUrl) setFotoUrl(data.signedUrl);
      // Aggiorna l'operatore in memoria
      onSaved({ ...operatore, foto_url: path });
    } catch (err) {
      setFotoError('Errore upload: ' + (err.message || 'riprova'));
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = '';
    }
  };

  const handleFotoRemove = async () => {
    if (!operatore?.foto_url || !isEdit) return;
    if (!window.confirm('Eliminare la foto?')) return;
    await supabase.storage.from('operatori-foto').remove([operatore.foto_url]);
    await supabase.from('operatori').update({ foto_url: null }).eq('id', operatore.id);
    setFotoUrl(null);
    onSaved({ ...operatore, foto_url: null });
  };

  const save = async () => {
    if (!f.nome.trim())    { setError('Inserisci il nome'); return; }
    if (!f.cognome.trim()) { setError('Inserisci il cognome'); return; }
    setLoading(true); setError('');

    const payload = {
      nome:     f.nome.trim(),
      cognome:  f.cognome.trim(),
      colore:   f.colore,
      attivo:   f.attivo,
      email:    f.email.trim() || null,
      telefono: f.telefono.trim() || null,
      note:     f.note.trim() || null,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('operatori').update(payload).eq('id', operatore.id).select().single();
    } else {
      result = await supabase.from('operatori').insert([payload]).select().single();
    }

    setLoading(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Eliminare ${operatore.nome} ${operatore.cognome}? Gli appuntamenti collegati resteranno nel database.`)) return;
    await supabase.from('operatori').delete().eq('id', operatore.id);
    onDeleted(operatore.id);
    onClose();
  };

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
        style={{ ...glass, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Avatar cliccabile solo in modifica */}
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => isEdit && fotoInputRef.current?.click()}
                style={{
                  width: 48, height: 48, borderRadius: 16, overflow: 'hidden',
                  background: fotoUrl ? 'transparent' : f.colore,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, color: '#fff',
                  boxShadow: `0 4px 12px ${f.colore}55`,
                  cursor: isEdit ? 'pointer' : 'default',
                  border: fotoUrl ? '2px solid rgba(255,255,255,0.7)' : 'none',
                  position: 'relative',
                }}
              >
                {fotoUrl
                  ? <img src={fotoUrl} alt={f.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (f.nome[0] || '?').toUpperCase()
                }
                {isEdit && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0, transition: 'opacity 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                    onMouseLeave={e => e.currentTarget.style.opacity = 0}
                  >
                    <span style={{ fontSize: 16 }}>{uploadingFoto ? '⏳' : '📷'}</span>
                  </div>
                )}
              </div>
              {fotoUrl && isEdit && (
                <button onClick={handleFotoRemove} style={{
                  position: 'absolute', top: -5, right: -5,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#dc2626', color: '#fff', border: '1.5px solid #fff',
                  fontSize: 9, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit', lineHeight: 1, padding: 0,
                }}>×</button>
              )}
              <input ref={fotoInputRef} type="file" accept="image/*"
                onChange={handleFotoUpload} style={{ display: 'none' }} />
            </div>
            {fotoError && (
              <div style={{ fontSize: 11, color: '#dc2626' }}>{fotoError}</div>
            )}
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
              {isEdit ? 'Modifica operatore' : 'Nuovo operatore'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--card-bg-sm)', border: '1px solid var(--card-border)',
            borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
            fontSize: 18, color: 'var(--text-secondary)', fontFamily: 'inherit',
          }}>×</button>
        </div>

        {/* Nome + Cognome */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div>
            <div style={secLabel}>Nome *</div>
            <input autoFocus type="text" placeholder="Mario" value={f.nome}
              onChange={e => set('nome', e.target.value)} style={inputStyle} />
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
            <div style={secLabel}>Telefono</div>
            <input type="tel" placeholder="+39 333..." value={f.telefono}
              onChange={e => set('telefono', e.target.value)} style={inputStyle} />
          </div>
          <div>
            <div style={secLabel}>Email</div>
            <input type="email" placeholder="mario@..." value={f.email}
              onChange={e => set('email', e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Colore */}
        <div style={{ marginBottom: 14 }}>
          <div style={secLabel}>Colore nel calendario</div>
          <SeletoreColore value={f.colore} onChange={v => set('colore', v)} />
        </div>

        {/* Note */}
        <div style={{ marginBottom: 14 }}>
          <div style={secLabel}>Note</div>
          <textarea rows={2} placeholder="Specializzazioni, orari particolari..."
            value={f.note} onChange={e => set('note', e.target.value)}
            style={{ ...inputStyle, resize: 'vertical' }} />
        </div>

        {/* Attivo toggle */}
        <div style={{ marginBottom: 20 }}>
          <button onClick={() => set('attivo', !f.attivo)} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', textAlign: 'left',
            border: `1px solid ${f.attivo ? 'rgba(5,150,105,0.3)' : 'var(--card-border)'}`,
            background: f.attivo ? 'rgba(5,150,105,0.08)' : 'var(--card-bg-sm)',
          }}>
            {/* Toggle pill */}
            <div style={{
              width: 38, height: 22, borderRadius: 99, flexShrink: 0,
              background: f.attivo ? '#059669' : 'var(--card-border)',
              position: 'relative', transition: 'background 0.2s',
            }}>
              <motion.div
                animate={{ x: f.attivo ? 18 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{
                  position: 'absolute', top: 2, width: 18, height: 18,
                  borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: f.attivo ? '#059669' : 'var(--text-muted)' }}>
                {f.attivo ? 'Operatore attivo' : 'Operatore disattivato'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                {f.attivo ? 'Appare nel calendario e nelle statistiche' : 'Non appare nel calendario'}
              </div>
            </div>
          </button>
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
            <button onClick={handleDelete} style={{ ...btnDanger, padding: '11px 14px' }}>
              Elimina
            </button>
          )}
          <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
          <button onClick={save} disabled={loading} style={{ ...btnPrimary, flex: 2, opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Salvataggio...' : isEdit ? 'Salva modifiche' : '+ Aggiungi operatore'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function OperatoriView() {
  const [operatori,  setOperatori]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [selected,   setSelected]   = useState(null); // operatore da modificare

  useEffect(() => { fetchOperatori(); }, []);

  const fetchOperatori = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('operatori')
      .select('*')
      .order('nome');
    setOperatori(data || []);
    setLoading(false);
  };

  const handleSaved = (op) => {
    setOperatori(prev => {
      const exists = prev.find(o => o.id === op.id);
      const updated = exists
        ? prev.map(o => o.id === op.id ? op : o)
        : [...prev, op];
      return updated.sort((a, b) => a.nome.localeCompare(b.nome));
    });
  };

  const handleDeleted = (id) => {
    setOperatori(prev => prev.filter(o => o.id !== id));
  };

  const attivi    = operatori.filter(o => o.attivo);
  const disattivi = operatori.filter(o => !o.attivo);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Operatori
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {attivi.length} attivi{disattivi.length > 0 ? `, ${disattivi.length} disattivati` : ''}
          </div>
        </div>
        <motion.button
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setSelected(null); setShowModal(true); }}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuovo operatore
        </motion.button>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          Caricamento operatori...
        </div>
      ) : operatori.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '60px 20px' }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>✂️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Nessun operatore registrato
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Aggiungi il primo operatore per iniziare
          </div>
          <button onClick={() => { setSelected(null); setShowModal(true); }} style={btnPrimary}>
            + Nuovo operatore
          </button>
        </motion.div>
      ) : (
        <>
          {/* Operatori attivi */}
          {attivi.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ ...glass, padding: '18px 20px', marginBottom: 14 }}
            >
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14,
              }}>
                Attivi ({attivi.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {attivi.map((op, i) => (
                  <OperatoreCard
                    key={op.id}
                    operatore={op}
                    delay={i * 0.06}
                    onClick={() => { setSelected(op); setShowModal(true); }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Operatori disattivi */}
          {disattivi.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{ ...glass, padding: '18px 20px' }}
            >
              <div style={{
                fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
                letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14,
              }}>
                Disattivati ({disattivi.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {disattivi.map((op, i) => (
                  <OperatoreCard
                    key={op.id}
                    operatore={op}
                    delay={i * 0.06}
                    disattivo
                    onClick={() => { setSelected(op); setShowModal(true); }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalOperatore
            operatore={selected}
            onClose={() => { setShowModal(false); setSelected(null); }}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Avatar operatore con foto o iniziali ─────────────────────
function AvatarOperatore({ op, size = 46, radius = 16 }) {
  const [fotoUrl, setFotoUrl] = useState(null);

  useEffect(() => {
    if (!op.foto_url) return;
    supabase.storage.from('operatori-foto').createSignedUrl(op.foto_url, 3600)
      .then(({ data }) => { if (data?.signedUrl) setFotoUrl(data.signedUrl); });
  }, [op.foto_url]);

  const colore = op.colore || '#2563eb';
  return (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
      background: fotoUrl ? 'transparent' : colore,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.38), fontWeight: 700, color: '#fff',
      boxShadow: `0 4px 12px ${colore}44`,
      border: fotoUrl ? `2px solid rgba(255,255,255,0.7)` : 'none',
    }}>
      {fotoUrl
        ? <img src={fotoUrl} alt={op.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : `${op.nome[0] || ''}${op.cognome?.[0] || ''}`
      }
    </div>
  );
}

// ── Card singolo operatore ────────────────────────────────────
function OperatoreCard({ operatore: op, delay, disattivo, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25, ease: [0.22,1,0.36,1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        ...glassCard,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
        width: '100%', fontFamily: 'inherit',
        opacity: disattivo ? 0.6 : 1,
      }}
    >
      {/* Avatar — foto o iniziali */}
      <AvatarOperatore op={op} size={46} radius={16} />

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          {op.nome} {op.cognome}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {op.telefono && <span>📱 {op.telefono}</span>}
          {op.email    && <span>📧 {op.email}</span>}
          {!op.telefono && !op.email && <span>Nessun contatto</span>}
        </div>
        {op.note && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {op.note}
          </div>
        )}
      </div>

      {/* Colore badge + freccia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 12, height: 12, borderRadius: '50%',
          background: op.colore || '#2563eb',
          boxShadow: `0 0 6px ${op.colore || '#2563eb'}80`,
        }} />
        <div style={{ fontSize: 18, color: 'var(--text-muted)' }}>›</div>
      </div>
    </motion.button>
  );
}