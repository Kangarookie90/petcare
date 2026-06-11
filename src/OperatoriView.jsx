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
        WebkitBackdropFilter: 'blur(10px)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ ...glass, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
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
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: fotoUrl ? 0 : 1, transition: 'opacity 0.2s',
                    pointerEvents: 'none',
                  }}>
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

        {/* Gestione ruolo — solo per operatori esistenti con auth_user_id */}
        {isEdit && operatore?.auth_user_id && (
          <RuoloManager operatore={operatore} onRuoloChanged={(nuovoRuolo) => onSaved({ ...operatore, ruolo: nuovoRuolo })} />
        )}

        {/* Orari lavorativi — solo in modifica */}
        {isEdit && <OrariOperatore operatore={operatore} />}
      </motion.div>
    </motion.div>
  );
}


// ─────────────────────────────────────────────────────────────
// ORARI LAVORATIVI — configurazione per operatore
// ─────────────────────────────────────────────────────────────
const GIORNI = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
const GIORNI_FULL = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];

function OrariOperatore({ operatore }) {
  const [orari,   setOrari]   = useState([]); // array di 7 elementi (uno per giorno)
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Carica orari esistenti e normalizza in array[0..6]
  useEffect(() => {
    if (!operatore?.id) return;
    supabase.from('operatori_orari')
      .select('*')
      .eq('operatore_id', operatore.id)
      .then(({ data }) => {
        const base = Array.from({ length: 7 }, (_, g) => ({
          giorno_settimana: g,
          ora_inizio: '09:00',
          ora_fine:   '18:00',
          attivo:     g >= 1 && g <= 5, // Lun-Ven attivi di default
          _id:        null,
        }));
        (data || []).forEach(r => {
          base[r.giorno_settimana] = {
            giorno_settimana: r.giorno_settimana,
            ora_inizio: r.ora_inizio.slice(0, 5),
            ora_fine:   r.ora_fine.slice(0, 5),
            attivo:     r.attivo,
            _id:        r.id,
          };
        });
        setOrari(base);
        setLoading(false);
      });
  }, [operatore?.id]);

  const updateGiorno = (g, campo, val) => {
    setOrari(prev => prev.map((r, i) => i === g ? { ...r, [campo]: val } : r));
    setSaved(false);
  };

  const salva = async () => {
    setSaving(true);
    setSaved(false);
    try {
      for (const o of orari) {
        const payload = {
          operatore_id:     operatore.id,
          giorno_settimana: o.giorno_settimana,
          ora_inizio:       o.ora_inizio,
          ora_fine:         o.ora_fine,
          attivo:           o.attivo,
        };
        if (o._id) {
          await supabase.from('operatori_orari').update(payload).eq('id', o._id);
        } else {
          const { data } = await supabase.from('operatori_orari').insert(payload).select().single();
          if (data) {
            setOrari(prev => prev.map((r, i) =>
              i === o.giorno_settimana ? { ...r, _id: data.id } : r
            ));
          }
        }
      }
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div style={{ padding: '12px 0', fontSize: 12, color: 'var(--text-muted)' }}>
      Caricamento orari...
    </div>
  );

  // Calcola ore settimanali totali
  const oreSettimana = orari
    .filter(o => o.attivo)
    .reduce((tot, o) => {
      const [hi, mi] = o.ora_inizio.split(':').map(Number);
      const [hf, mf] = o.ora_fine.split(':').map(Number);
      return tot + Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
    }, 0);
  const oreH = Math.floor(oreSettimana / 60);
  const oreM = oreSettimana % 60;

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Orari lavorativi
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)',
          background: 'var(--card-bg-sm)', border: '1px solid var(--card-border-sm)',
          borderRadius: 8, padding: '2px 8px' }}>
          {oreH}h{oreM > 0 ? `${oreM}m` : ''} / settimana
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {orari.map((o, g) => (
          <div key={g} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 10px', borderRadius: 12,
            background: o.attivo ? 'var(--card-bg-sm)' : 'transparent',
            border: `1px solid ${o.attivo ? 'var(--card-border-sm)' : 'transparent'}`,
            opacity: o.attivo ? 1 : 0.5,
            transition: 'all 0.15s',
          }}>
            {/* Toggle giorno */}
            <button onClick={() => updateGiorno(g, 'attivo', !o.attivo)}
              style={{
                width: 34, height: 20, borderRadius: 99, flexShrink: 0,
                background: o.attivo ? operatore?.colore || '#2563eb' : 'var(--card-border)',
                border: 'none', cursor: 'pointer', position: 'relative',
                transition: 'background 0.18s',
              }}>
              <motion.div
                animate={{ x: o.attivo ? 16 : 2 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                style={{ position: 'absolute', top: 2, width: 16, height: 16,
                  borderRadius: '50%', background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
              />
            </button>

            {/* Nome giorno */}
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              minWidth: 32 }}>
              {GIORNI[g]}
            </span>

            {/* Orari — visibili solo se attivo */}
            {o.attivo ? (
              <>
                <input
                  type="time"
                  value={o.ora_inizio}
                  onChange={e => updateGiorno(g, 'ora_inizio', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: 13,
                    minWidth: 0, textAlign: 'center' }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
                <input
                  type="time"
                  value={o.ora_fine}
                  onChange={e => updateGiorno(g, 'ora_fine', e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '5px 8px', fontSize: 13,
                    minWidth: 0, textAlign: 'center' }}
                />
                {/* Ore del giorno */}
                <span style={{ fontSize: 11, color: 'var(--text-muted)',
                  flexShrink: 0, minWidth: 30, textAlign: 'right' }}>
                  {(() => {
                    const [hi, mi] = o.ora_inizio.split(':').map(Number);
                    const [hf, mf] = o.ora_fine.split(':').map(Number);
                    const tot = Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
                    return tot > 0 ? `${Math.floor(tot/60)}h${tot%60>0?tot%60+'m':''}` : '';
                  })()}
                </span>
              </>
            ) : (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Riposo
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottone salva */}
      <button
        onClick={salva}
        disabled={saving}
        style={{
          marginTop: 12, width: '100%', padding: '10px',
          borderRadius: 12, border: 'none', cursor: saving ? 'wait' : 'pointer',
          fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          background: saved
            ? 'rgba(5,150,105,0.12)'
            : 'linear-gradient(145deg,#5aabff,#2060dd)',
          color: saved ? '#059669' : '#fff',
          transition: 'all 0.2s',
          opacity: saving ? 0.7 : 1,
        }}>
        {saving ? 'Salvataggio...' : saved ? '✓ Orari salvati' : 'Salva orari'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GESTIONE RUOLO — promuovi / revoca
// ─────────────────────────────────────────────────────────────
function RuoloManager({ operatore, onRuoloChanged }) {
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [confirm,  setConfirm]  = useState(false);

  const ruoloAttuale = operatore.ruolo || 'operatore';
  const isAdmin      = ruoloAttuale === 'admin';
  const nuovoRuolo   = isAdmin ? 'operatore' : 'admin';
  const label        = isAdmin ? 'Revoca admin → operatore' : 'Promuovi ad admin';
  const colorAccent  = isAdmin ? '#d97706' : '#2563eb';

  const cambia = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/set-role`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId: operatore.auth_user_id, role: nuovoRuolo }),
        }
      );
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Errore durante il cambio ruolo.'); return; }
      // Aggiorna anche la colonna locale su operatori
      await supabase.from('operatori').update({ ruolo: nuovoRuolo }).eq('id', operatore.id);
      onRuoloChanged(nuovoRuolo);
      setConfirm(false);
    } catch (e) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 16, borderTop: '1px solid var(--card-border)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
        Ruolo account
      </div>

      <div style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 6,
          background: isAdmin ? 'rgba(37,99,235,0.12)' : 'rgba(5,150,105,0.1)',
          color: isAdmin ? '#2563eb' : '#059669',
        }}>
          {ruoloAttuale}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>
          {isAdmin ? 'Accesso completo a tutte le funzioni' : 'Accesso operativo, senza gestione avanzata'}
        </span>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#dc2626', marginBottom: 8 }}>{error}</div>
      )}

      {!confirm ? (
        <button onClick={() => setConfirm(true)}
          style={{ width: '100%', padding: '9px', borderRadius: 12, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
            border: `1px solid ${colorAccent}30`,
            background: `${colorAccent}0d`, color: colorAccent }}>
          {label}
        </button>
      ) : (
        <div style={{ ...glassCard, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <p style={{ margin: 0, flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
            Cambia ruolo a <strong>{nuovoRuolo}</strong>?
          </p>
          <button onClick={cambia} disabled={loading}
            style={{ padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12, fontWeight: 700,
              background: colorAccent, color: '#fff', opacity: loading ? 0.6 : 1 }}>
            {loading ? '...' : 'Conferma'}
          </button>
          <button onClick={() => setConfirm(false)}
            style={{ ...btnSecondary, padding: '7px 12px', fontSize: 12 }}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
// ── Modal Invito Operatore via Email ─────────────────────────
function ModalInvito({ onClose, onInviato }) {
  const [f, setF] = useState({ email: '', nome: '', cognome: '' });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const invia = async () => {
    if (!f.email.trim() || !f.nome.trim() || !f.cognome.trim()) {
      setError('Tutti i campi sono obbligatori.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-operatore`,
        {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email:   f.email.trim().toLowerCase(),
            nome:    f.nome.trim(),
            cognome: f.cognome.trim(),
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Errore durante l\'invio.'); return; }

      setSuccess(true);
      onInviato?.({ nome: f.nome, cognome: f.cognome, email: f.email });
    } catch (e) {
      setError('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(10,24,64,0.4)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{   opacity: 0, y: 12,  scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ ...glass, width: '100%', maxWidth: 420, padding: '28px 24px' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Invita operatore
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Riceverà un'email con il link per accedere
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        {success ? (
          /* Stato: invito inviato */
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✉️</div>
            <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              Invito inviato!
            </p>
            <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-secondary)' }}>
              {f.nome} {f.cognome} riceverà un'email a <strong>{f.email}</strong> con il link per impostare la password.
            </p>
            <button onClick={onClose} style={{ ...btnPrimary, width: '100%' }}>
              Chiudi
            </button>
          </motion.div>
        ) : (
          /* Form */
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div>
                <p style={secLabel}>Nome *</p>
                <input style={inputStyle} value={f.nome} onChange={e => set('nome', e.target.value)}
                  placeholder="Mario" autoFocus />
              </div>
              <div>
                <p style={secLabel}>Cognome *</p>
                <input style={inputStyle} value={f.cognome} onChange={e => set('cognome', e.target.value)}
                  placeholder="Rossi" />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={secLabel}>Email *</p>
              <input style={inputStyle} type="email" value={f.email}
                onChange={e => set('email', e.target.value)}
                placeholder="mario.rossi@email.com"
                onKeyDown={e => e.key === 'Enter' && invia()} />
            </div>

            {/* Info ruolo */}
            <div style={{
              ...glassCard, padding: '10px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
              </svg>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Il nuovo utente entrerà come <strong style={{ color: 'var(--text-primary)' }}>operatore</strong>.
                Potrai promuoverlo ad admin in seguito.
              </p>
            </div>

            {error && (
              <p style={{ fontSize: 13, color: '#dc2626', margin: '-4px 0 14px', fontWeight: 500 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={invia} disabled={loading}
                style={{ ...btnPrimary, flex: 1, opacity: loading ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? 'Invio in corso...' : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                      <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
                    </svg>
                    Invia invito
                  </>
                )}
              </button>
              <button onClick={onClose} style={btnSecondary}>Annulla</button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function OperatoriView() {
  const [operatori,   setOperatori]  = useState([]);
  const [loading,     setLoading]    = useState(true);
  const [showModal,   setShowModal]  = useState(false);
  const [selected,    setSelected]   = useState(null);
  const [showInvito,  setShowInvito] = useState(false);
  const [toastInvito, setToastInvito] = useState(null); // { nome, cognome }

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
    <div style={{ width: '100%' }}>

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
        <div style={{ display: 'flex', gap: 8 }}>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInvito(true)}
            style={{ ...btnSecondary, display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13"/><path d="M22 2L15 22 11 13 2 9l20-7z"/>
            </svg>
            Invita
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => { setSelected(null); setShowModal(true); }}
            style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap' }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nuovo
          </motion.button>
        </div>
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

      {/* Modal modifica */}
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

      {/* Modal invito */}
      <AnimatePresence>
        {showInvito && (
          <ModalInvito
            onClose={() => setShowInvito(false)}
            onInviato={(op) => {
              setShowInvito(false);
              setToastInvito(op);
              setTimeout(() => setToastInvito(null), 4000);
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast conferma invito */}
      <AnimatePresence>
        {toastInvito && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
              zIndex: 400, background: 'rgba(5,150,105,0.95)', color: '#fff',
              padding: '12px 20px', borderRadius: 16, fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 20px rgba(5,150,105,0.4)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              whiteSpace: 'nowrap',
            }}
          >
            ✉️ Invito inviato a {toastInvito.nome} {toastInvito.cognome}
          </motion.div>
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

      {/* Badge ruolo + colore + freccia */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {op.ruolo === 'admin' && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6,
            background: 'rgba(37,99,235,0.12)', color: '#2563eb', letterSpacing: '0.3px',
          }}>
            admin
          </span>
        )}
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