/**
 * ImpostazioniView.jsx
 * Sezione Impostazioni unificata — quattro tab:
 *   Operatori  · Servizi (nuovo)  · Profilo  · Backup
 *
 * Sostituisce le voci separate "Operatori" e "Profilo" nella nav.
 * Il codice di OperatoriView e ProfiloView è importato direttamente
 * come componenti child — zero duplicazioni.
 *
 * Dipendenze già presenti: framer-motion, supabase, xlsx
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import * as XLSX from 'xlsx';
import OperatoriView from './OperatoriView';
import ProfiloView   from './ProfiloView';

// ── Stili condivisi ───────────────────────────────────────────
const glass = {
  background:   'var(--card-bg)',
  border:       '1px solid var(--card-border)',
  borderRadius: 20,
  boxShadow:    'var(--card-shadow)',
};
const glassCard = {
  background:   'var(--card-bg-sm)',
  border:       '1px solid var(--card-border-sm)',
  borderRadius: 16,
  boxShadow:    'var(--card-shadow-sm)',
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
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8,
};

// ─────────────────────────────────────────────────────────────
// TAB: SERVIZI
// ─────────────────────────────────────────────────────────────
function ModalServizio({ servizio, onClose, onSaved, onDeleted }) {
  const nuovo = !servizio;
  const [f, setF] = useState({
    nome:          servizio?.nome          || '',
    prezzo:        servizio?.prezzo        ?? '',
    durata_minuti: servizio?.durata_minuti ?? '',
    note:          servizio?.note          || '',
  });
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [error,    setError]    = useState('');

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const salva = async () => {
    if (!f.nome.trim()) { setError('Il nome è obbligatorio.'); return; }
    setSaving(true); setError('');
    const payload = {
      nome:          f.nome.trim(),
      prezzo:        f.prezzo !== '' ? Number(f.prezzo) : null,
      durata_minuti: f.durata_minuti !== '' ? Number(f.durata_minuti) : null,
      note:          f.note.trim() || null,
    };
    const { data, error: err } = nuovo
      ? await supabase.from('servizi').insert([payload]).select().single()
      : await supabase.from('servizi').update(payload).eq('id', servizio.id).select().single();
    if (err) { setError(err.message); setSaving(false); return; }
    onSaved(data);
    onClose();
  };

  const elimina = async () => {
    setDeleting(true);
    const { error: err } = await supabase.from('servizi').delete().eq('id', servizio.id);
    if (err) { setError(err.message); setDeleting(false); setConfirm(false); return; }
    onDeleted(servizio.id);
    onClose();
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
        style={{ ...glass, width: '100%', maxWidth: 440, padding: '28px 24px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {nuovo ? 'Nuovo servizio' : 'Modifica servizio'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 22, lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <div style={{ marginBottom: 14 }}>
          <p style={secLabel}>Nome servizio *</p>
          <input style={inputStyle} value={f.nome} onChange={e => set('nome', e.target.value)}
            placeholder="Es. Bagno e asciugatura, Taglio completo..." autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <p style={secLabel}>Prezzo (€)</p>
            <input style={inputStyle} type="number" min="0" step="0.50"
              value={f.prezzo} onChange={e => set('prezzo', e.target.value)}
              placeholder="Es. 35.00" />
          </div>
          <div>
            <p style={secLabel}>Durata (min)</p>
            <input style={inputStyle} type="number" min="0" step="5"
              value={f.durata_minuti} onChange={e => set('durata_minuti', e.target.value)}
              placeholder="Es. 60" />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <p style={secLabel}>Note</p>
          <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={2}
            value={f.note} onChange={e => set('note', e.target.value)}
            placeholder="Note interne, varianti, ecc." />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: '#dc2626', margin: '-6px 0 14px', fontWeight: 500 }}>{error}</p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={salva} disabled={saving} style={{ ...btnPrimary, flex: 1, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvataggio...' : nuovo ? '+ Aggiungi' : 'Salva modifiche'}
          </button>
          <button onClick={onClose} style={btnSecondary}>Annulla</button>
        </div>

        {!nuovo && !confirm && (
          <button onClick={() => setConfirm(true)}
            style={{ ...btnDanger, width: '100%', marginTop: 12, textAlign: 'center' }}>
            Elimina servizio
          </button>
        )}
        {!nuovo && confirm && (
          <div style={{ ...glassCard, padding: '14px 16px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
            <p style={{ margin: 0, flex: 1, fontSize: 13, color: 'var(--text-secondary)' }}>
              Sicuro? L'operazione non è reversibile.
            </p>
            <button onClick={elimina} disabled={deleting}
              style={{ ...btnDanger, padding: '8px 14px', fontSize: 13, opacity: deleting ? 0.6 : 1 }}>
              {deleting ? '...' : 'Elimina'}
            </button>
            <button onClick={() => setConfirm(false)} style={{ ...btnSecondary, padding: '8px 14px', fontSize: 13 }}>
              No
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function ServiziTab() {
  const [servizi,   setServizi]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchServizi(); }, []);

  const fetchServizi = async () => {
    setLoading(true);
    const { data } = await supabase.from('servizi').select('*').order('nome');
    setServizi(data || []);
    setLoading(false);
  };

  const handleSaved = (s) => {
    setServizi(prev => {
      const exists = prev.find(x => x.id === s.id);
      return exists
        ? prev.map(x => x.id === s.id ? s : x).sort((a, b) => a.nome.localeCompare(b.nome))
        : [...prev, s].sort((a, b) => a.nome.localeCompare(b.nome));
    });
  };

  const handleDeleted = (id) => setServizi(prev => prev.filter(x => x.id !== id));

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>Caricamento...</div>;
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          {servizi.length} servizi configurati
        </p>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setSelected(null); setShowModal(true); }}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: 13 }}
        >
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Nuovo servizio
        </motion.button>
      </div>

      {servizi.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ ...glass, padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✂️</div>
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nessun servizio configurato
          </p>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--text-muted)' }}>
            Aggiungi i servizi che offre il salone: bagno, taglio, ecc.
          </p>
          <button onClick={() => { setSelected(null); setShowModal(true); }} style={btnPrimary}>
            + Aggiungi il primo servizio
          </button>
        </motion.div>
      ) : (
        <motion.div style={{ ...glass, padding: '18px 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {servizi.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}
                onClick={() => { setSelected(s); setShowModal(true); }}
                style={{
                  ...glassCard, display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 15px', cursor: 'pointer', textAlign: 'left',
                  width: '100%', fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: 'rgba(37,99,235,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                    <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                    <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                    <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{s.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {s.prezzo != null        && <span>€ {Number(s.prezzo).toFixed(2)}</span>}
                    {s.durata_minuti != null && <span>{s.durata_minuti} min</span>}
                    {s.prezzo == null && s.durata_minuti == null && <span style={{ color: 'var(--text-muted)' }}>Nessun prezzo / durata</span>}
                  </div>
                  {s.note && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.note}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 18, color: 'var(--text-muted)', flexShrink: 0 }}>›</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {showModal && (
          <ModalServizio
            servizio={selected}
            onClose={() => { setShowModal(false); setSelected(null); }}
            onSaved={handleSaved}
            onDeleted={handleDeleted}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TAB: BACKUP
// ─────────────────────────────────────────────────────────────
function BackupTab() {
  const [backupLoading,   setBackupLoading]   = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [ripristinoStep,  setRipristinoStep]  = useState('idle');
  const [ripristinoMsg,   setRipristinoMsg]   = useState('');

  const scaricaBackup = async () => {
    setBackupLoading(true);
    try {
      const [cl, an, op, sv, rz, ap, aps, pn, no] = await Promise.all([
        supabase.from('clienti').select('*'),
        supabase.from('animali').select('*'),
        supabase.from('operatori').select('*'),
        supabase.from('servizi').select('*'),
        supabase.from('razze').select('*'),
        supabase.from('appuntamenti').select('*'),
        supabase.from('appuntamenti_servizi').select('*'),
        supabase.from('primanota').select('*'),
        supabase.from('notifiche').select('*'),
      ]);
      const wb = XLSX.utils.book_new();
      [
        { nome: 'clienti',              data: cl.data  || [] },
        { nome: 'animali',              data: an.data  || [] },
        { nome: 'operatori',            data: op.data  || [] },
        { nome: 'servizi',              data: sv.data  || [] },
        { nome: 'razze',                data: rz.data  || [] },
        { nome: 'appuntamenti',         data: ap.data  || [] },
        { nome: 'appuntamenti_servizi', data: aps.data || [] },
        { nome: 'primanota',            data: pn.data  || [] },
        { nome: 'notifiche',            data: no.data  || [] },
      ].forEach(({ nome, data }) => {
        const ws = data.length > 0 ? XLSX.utils.json_to_sheet(data) : XLSX.utils.json_to_sheet([{}]);
        XLSX.utils.book_append_sheet(wb, ws, nome);
      });
      XLSX.writeFile(wb, `nemora_backup_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.error('Backup fallito:', e);
    }
    setBackupLoading(false);
  };

  const scaricaTemplate = () => {
    setTemplateLoading(true);
    const wb = XLSX.utils.book_new();
    const struttura = {
      clienti:              ['id','nome','cognome','telefono','email','indirizzo','note','created_at'],
      animali:              ['id','cliente_id','nome','specie','razza_id','colore','data_nascita','zone_critiche','note','operatore_preferito_id','created_at'],
      operatori:            ['id','nome','cognome','colore','attivo'],
      servizi:              ['id','nome','prezzo','durata_minuti'],
      razze:                ['id','nome','specie'],
      appuntamenti:         ['id','cliente_id','animale_id','operatore_id','inizio','fine','stato','note','prezzo_proposto','prezzo_confermato','prezzo_confermato_flag','metodo_pagamento'],
      appuntamenti_servizi: ['id','appuntamento_id','servizio_id','prezzo_applicato'],
      primanota:            ['id','data','tipo','importo','descrizione','operatore_id','appuntamento_id'],
      notifiche:            ['id','tipo','appuntamento_id','messaggio','telefono_cliente','letto','created_at'],
    };
    Object.entries(struttura).forEach(([nome, colonne]) => {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([colonne]), nome);
    });
    XLSX.writeFile(wb, 'nemora_template_ripristino.xlsx');
    setTemplateLoading(false);
  };

  const gestisciRipristino = async (file) => {
    if (!file) return;
    setRipristinoStep('uploading');
    setRipristinoMsg('Lettura file in corso...');
    try {
      const buf  = await file.arrayBuffer();
      const wb   = XLSX.read(buf, { type: 'array' });
      const tabs = ['clienti','animali','operatori','servizi','razze','appuntamenti','appuntamenti_servizi','primanota'];
      let tot = 0;
      for (const nome of tabs) {
        if (!wb.SheetNames.includes(nome)) continue;
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[nome], { defval: null });
        if (!rows.length) continue;
        setRipristinoMsg(`Ripristino ${nome} (${rows.length} righe)...`);
        const { error } = await supabase.from(nome).upsert(rows, { onConflict: 'id' });
        if (error) throw new Error(`Errore su ${nome}: ${error.message}`);
        tot += rows.length;
      }
      setRipristinoStep('done');
      setRipristinoMsg(`Ripristino completato — ${tot} record importati.`);
    } catch (e) {
      setRipristinoStep('error');
      setRipristinoMsg(e.message || 'Errore durante il ripristino.');
    }
  };

  const iconBox = (bg) => ({
    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
    background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Backup */}
      <div style={{ ...glass, padding: '18px 20px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={iconBox('rgba(5,150,105,0.1)')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Scarica backup</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Tutte le tabelle in un file Excel. Salva in un posto sicuro.</div>
        </div>
        <button onClick={scaricaBackup} disabled={backupLoading}
          style={{ padding: '9px 18px', borderRadius: 12, border: 'none', background: '#059669', color: '#fff', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', opacity: backupLoading ? 0.6 : 1, flexShrink: 0 }}>
          {backupLoading ? '...' : 'Scarica'}
        </button>
      </div>

      {/* Ripristino */}
      <div style={{ ...glass, padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={iconBox('rgba(217,119,6,0.1)')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>Ripristino dati</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Importa un file Excel. I dati esistenti vengono aggiornati (upsert).</div>
          </div>
        </div>

        <button onClick={scaricaTemplate} disabled={templateLoading}
          style={{ width: '100%', padding: '10px', borderRadius: 12, border: '1px solid var(--card-border)', background: 'var(--card-bg-sm)', color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
            <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          {templateLoading ? 'Download...' : 'Scarica template vuoto'}
        </button>

        {ripristinoStep === 'idle' && (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '10px', borderRadius: 12, border: '2px dashed var(--card-border)', background: 'transparent', color: '#d97706', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            </svg>
            Carica file Excel (.xlsx)
            <input type="file" accept=".xlsx" style={{ display: 'none' }}
              onChange={e => { if (e.target.files[0]) gestisciRipristino(e.target.files[0]); }} />
          </label>
        )}
        {ripristinoStep === 'uploading' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/>
            </svg>
            <span style={{ fontSize: 13, color: '#d97706', fontWeight: 500 }}>{ripristinoMsg}</span>
          </div>
        )}
        {ripristinoStep === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)' }}>
            <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>{ripristinoMsg}</span>
            <button onClick={() => setRipristinoStep('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#059669', fontFamily: 'inherit', fontWeight: 600 }}>Nuovo</button>
          </div>
        )}
        {ripristinoStep === 'error' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}>
            <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 500 }}>{ripristinoMsg}</span>
            <button onClick={() => setRipristinoStep('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#dc2626', fontFamily: 'inherit', fontWeight: 600 }}>Riprova</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// VIEW PRINCIPALE con tab
// ─────────────────────────────────────────────────────────────
const TABS_ADMIN = [
  {
    id: 'operatori', label: 'Operatori',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="6" r="3"/>
        <path d="M7 21v-1a5 5 0 0110 0v1"/>
        <path d="M8 11l-1 3h10l-1-3"/>
        <path d="M10 11V9.5M14 11V9.5"/>
        <rect x="10.5" y="14" width="3" height="2.5" rx="0.5"/>
      </svg>
    ),
  },
  {
    id: 'servizi', label: 'Servizi',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
        <line x1="20" y1="4" x2="8.12" y2="15.88"/>
        <line x1="14.47" y1="14.48" x2="20" y2="20"/>
        <line x1="8.12" y1="8.12" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    id: 'profilo', label: 'Profilo',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5"/>
        <path d="M5 20v-1a7 7 0 0114 0v1"/>
      </svg>
    ),
  },
  {
    id: 'backup', label: 'Backup',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"/>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
      </svg>
    ),
  },
];

export default function ImpostazioniView({ initialTab, role }) {
  const isAdmin = role === 'admin';

  // L'operatore atterra sempre su profilo; l'admin sull'ultima tab visitata (o operatori)
  const [tab, setTab] = useState(isAdmin ? (initialTab || 'operatori') : 'profilo');

  // Tab effettivamente mostrata — l'operatore è bloccato su profilo
  const tabAttiva = isAdmin ? tab : 'profilo';

  const renderTab = () => {
    switch (tabAttiva) {
      case 'operatori': return <OperatoriView />;
      case 'servizi':   return <ServiziTab />;
      case 'profilo':   return <ProfiloView />;
      case 'backup':    return <BackupTab />;
      default:          return null;
    }
  };

  const titoloHeader = isAdmin
    ? TABS_ADMIN.find(t => t.id === tab)?.label
    : 'Profilo';

  return (
    <div style={{ width: '100%', paddingBottom: '2rem' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 4px',
          fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Impostazioni
        </p>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.6px' }}>
          {titoloHeader}
        </h1>
      </motion.div>

      {/* Tab bar — solo admin */}
      {isAdmin && (
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'var(--card-bg-sm)',
          border: '1px solid var(--card-border-sm)',
          borderRadius: 16, padding: 5,
          overflowX: 'auto',
        }}>
          {TABS_ADMIN.map(t => {
            const active = tab === t.id;
            return (
              <motion.button
                key={t.id}
                onClick={() => setTab(t.id)}
                whileTap={{ scale: 0.96 }}
                style={{
                  flex: '1 0 auto',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 12px', borderRadius: 12,
                  border: active ? '1px solid rgba(255,255,255,0.85)' : '1px solid transparent',
                  background: active ? 'rgba(255,255,255,0.65)' : 'transparent',
                  boxShadow: active ? '0 2px 0 rgba(255,255,255,0.9) inset, 0 2px 8px rgba(60,100,200,0.12)' : 'none',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s', whiteSpace: 'nowrap',
                }}
              >
                {t.icon}
                {t.label}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Contenuto tab con transizione */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tabAttiva}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{   opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {renderTab()}
        </motion.div>
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}