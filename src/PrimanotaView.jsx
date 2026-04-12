/**
 * PrimanotaView.jsx
 * Prima nota giornaliera — incassi toelettatura + POS + ECC + uscite/versamenti
 * Tabella: primanota (movimenti manuali) + appuntamenti (prezzo_confermato)
 * npm install jspdf jspdf-autotable xlsx (già installati con StatisticheView)
 *
 * REQUISITO DB: ALTER TABLE appuntamenti ADD COLUMN metodo_pagamento TEXT DEFAULT 'contanti';
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
const secLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8,
};

// ── Tipi movimento ─────────────────────────────────────────────
const TIPI = {
  toelettatura: { label: 'Toelettatura',     color: '#2563eb', bg: 'rgba(37,99,235,0.1)',   segno: +1, icon: '✂️' },
  pos:          { label: 'POS',              color: '#7c3aed', bg: 'rgba(124,58,237,0.1)',  segno: +1, icon: '💳' },
  ecc:          { label: 'ECC',              color: '#0891b2', bg: 'rgba(8,145,178,0.1)',   segno: +1, icon: '🏦' },
  uscita:       { label: 'Uscita',           color: '#dc2626', bg: 'rgba(220,38,38,0.1)',   segno: -1, icon: '💸' },
  versamento:   { label: 'Versamento banca', color: '#059669', bg: 'rgba(5,150,105,0.1)',   segno: -1, icon: '🏛️' },
};

const fmt = (n) => `€ ${Math.abs(n).toFixed(2)}`;
const fmtData = (d) => new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtOra  = (d) => new Date(d).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

// ── Modale aggiungi movimento ─────────────────────────────────
function ModalMovimento({ data, operatori, onClose, onSaved }) {
  const [tipo,        setTipo]        = useState('pos');
  const [importo,     setImporto]     = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [operatoreId, setOperatoreId] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');

  const save = async () => {
    if (!importo || isNaN(Number(importo)) || Number(importo) <= 0) {
      setError('Inserisci un importo valido'); return;
    }
    setSaving(true);
    const { data: row, error: err } = await supabase.from('primanota').insert([{
      data,
      tipo,
      importo: Number(importo),
      descrizione: descrizione.trim() || null,
      operatore_id: operatoreId || null,
    }]).select('*, operatori(id,nome,cognome,colore)').single();
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved(row);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(10,24,64,0.45)',
        backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        style={{ ...glass, padding: 24, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
            Aggiungi movimento
          </div>
          <button onClick={onClose} style={{ background: 'var(--card-bg-sm)', border: '1px solid var(--card-border)',
            borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 18,
            color: 'var(--text-secondary)', fontFamily: 'inherit' }}>×</button>
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: 16 }}>
          <div style={secLabel}>Tipo movimento</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(TIPI).filter(([k]) => k !== 'toelettatura').map(([k, v]) => (
              <button key={k} onClick={() => setTipo(k)} style={{
                padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8,
                border: `1px solid ${tipo === k ? v.color + '50' : 'var(--card-border)'}`,
                background: tipo === k ? v.bg : 'var(--card-bg-sm)',
                color: tipo === k ? v.color : 'var(--text-muted)',
              }}>
                <span>{v.icon}</span> {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Importo */}
        <div style={{ marginBottom: 14 }}>
          <div style={secLabel}>Importo *</div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: 'var(--text-muted)', fontWeight: 600 }}>€</span>
            <input autoFocus type="number" min="0" step="0.01" placeholder="0.00"
              value={importo} onChange={e => setImporto(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 26 }} />
          </div>
        </div>

        {/* Descrizione */}
        <div style={{ marginBottom: 14 }}>
          <div style={secLabel}>Descrizione</div>
          <input type="text" placeholder="Note opzionali..."
            value={descrizione} onChange={e => setDescrizione(e.target.value)}
            style={inputStyle} />
        </div>

        {/* Operatore */}
        {(tipo === 'pos' || tipo === 'toelettatura') && (
          <div style={{ marginBottom: 20 }}>
            <div style={secLabel}>Operatore</div>
            <select value={operatoreId} onChange={e => setOperatoreId(e.target.value)} style={inputStyle}>
              <option value="">Tutti / non specificato</option>
              {operatori.map(op => (
                <option key={op.id} value={op.id}>{op.nome} {op.cognome}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div style={{ fontSize: 13, color: '#dc2626', marginBottom: 12,
            padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 10 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ ...btnSecondary, flex: 1 }}>Annulla</button>
          <button onClick={save} disabled={saving} style={{ ...btnPrimary, flex: 2, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvataggio...' : 'Aggiungi'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Export PDF ────────────────────────────────────────────────
function doExportPDF(righe, dal, al, totali) {
  const doc = new jsPDF();
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('PetCare — Prima Nota', 14, 22);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Periodo: ${dal} — ${al}`, 14, 30);
  doc.setTextColor(30, 30, 30);

  let y = 50;
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo', 14, y); y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Categoria', 'Importo']],
    body: [
      ...Object.entries(totali.perTipo).map(([k, v]) => [
        `${TIPI[k]?.icon || ''} ${TIPI[k]?.label || k}`, `€ ${v.toFixed(2)}`
      ]),
      ['', ''],
      ['Totale incassi', `€ ${totali.incassi.toFixed(2)}`],
      ['Totale uscite',  `€ ${totali.uscite.toFixed(2)}`],
      ['Saldo netto',    `€ ${totali.netto.toFixed(2)}`],
    ],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14 },
  });
  y = doc.lastAutoTable.finalY + 14;

  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Dettaglio movimenti', 14, y); y += 6;
  autoTable(doc, {
    startY: y,
    head: [['Data', 'Tipo', 'Descrizione', 'Operatore', 'Pagamento', 'Importo']],
    body: righe.map(r => [
      fmtData(r.data),
      `${TIPI[r.tipo]?.label || r.tipo}`,
      r.descrizione || (r._appId ? `App. ${r._cliente || ''}` : '—'),
      r.operatori?.nome || '—',
      r.tipo === 'toelettatura' ? (r.metodo_pagamento === 'pos' ? '💳 POS' : '💵 Contanti') : '—',
      (TIPI[r.tipo]?.segno === -1 ? '-' : '+') + ` € ${Number(r.importo).toFixed(2)}`,
    ]),
    theme: 'striped',
    headStyles: { fillColor: [5, 150, 105] },
    margin: { left: 14 },
    styles: { fontSize: 9 },
  });

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`PetCare Prima Nota — ${dal} / ${al} — Pagina ${i} di ${pages}`, 14, 290);
  }
  doc.save(`PrimaNote_${dal.replace(/\//g,'')}_${al.replace(/\//g,'')}.pdf`);
}

// ── Export Excel ──────────────────────────────────────────────
function doExportExcel(righe, dal, al, totali) {
  const wb = XLSX.utils.book_new();

  const riepilogo = [
    ['PetCare — Prima Nota', `${dal} — ${al}`],
    [],
    ['Categoria', 'Importo'],
    ...Object.entries(totali.perTipo).map(([k, v]) => [TIPI[k]?.label || k, v]),
    [],
    ['Totale incassi', totali.incassi],
    ['Totale uscite',  totali.uscite],
    ['Saldo netto',    totali.netto],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(riepilogo), 'Riepilogo');

  const dettaglio = [
    ['Data', 'Tipo', 'Descrizione', 'Operatore', 'Pagamento', 'Segno', 'Importo'],
    ...righe.map(r => [
      fmtData(r.data),
      TIPI[r.tipo]?.label || r.tipo,
      r.descrizione || (r._appId ? `Appuntamento — ${r._cliente || ''}` : ''),
      r.operatori?.nome || '',
      r.tipo === 'toelettatura' ? (r.metodo_pagamento === 'pos' ? 'POS' : 'Contanti') : '—',
      TIPI[r.tipo]?.segno === -1 ? 'Uscita' : 'Entrata',
      Number(r.importo) * (TIPI[r.tipo]?.segno || 1),
    ])
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dettaglio), 'Movimenti');
  XLSX.writeFile(wb, `PrimaNote_${dal.replace(/\//g,'')}_${al.replace(/\//g,'')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function PrimanotaView() {
  const oggi = new Date().toISOString().split('T')[0];
  const [dataSel,     setDataSel]     = useState(oggi);
  const [movimenti,   setMovimenti]   = useState([]);
  const [appConf,     setAppConf]     = useState([]);
  const [operatori,   setOperatori]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [exporting,   setExporting]   = useState('');
  const [showExport,  setShowExport]  = useState(false);
  const [filtroTipo,  setFiltroTipo]  = useState('tutti');
  const [metodiPag,   setMetodiPag]   = useState({}); // { [appuntamento_id]: 'contanti' | 'pos' }

  const [expDal, setExpDal] = useState(oggi);
  const [expAl,  setExpAl]  = useState(oggi);

  useEffect(() => {
    supabase.from('operatori').select('id,nome,cognome,colore').eq('attivo', true).order('nome')
      .then(({ data }) => setOperatori(data || []));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [mov, app] = await Promise.all([
      supabase.from('primanota')
        .select('*, operatori(id,nome,cognome,colore)')
        .eq('data', dataSel)
        .order('created_at'),
      supabase.from('appuntamenti')
        .select('id, prezzo_confermato, prezzo_proposto, stato, metodo_pagamento, clienti(nome,cognome), operatori(id,nome,cognome,colore), appuntamenti_servizi(servizi(nome))')
        .eq('prezzo_confermato_flag', true)
        .gte('inizio', dataSel + 'T00:00:00')
        .lte('inizio', dataSel + 'T23:59:59'),
    ]);
    setMovimenti(mov.data || []);
    setAppConf(app.data || []);

    // Inizializza metodiPag dai dati DB
    const mp = {};
    (app.data || []).forEach(a => { mp[a.id] = a.metodo_pagamento || 'contanti'; });
    setMetodiPag(mp);

    setLoading(false);
  }, [dataSel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Aggiorna metodo_pagamento su Supabase
  const handleMetodoPag = async (appId, metodo) => {
    setMetodiPag(p => ({ ...p, [appId]: metodo }));
    await supabase.from('appuntamenti').update({ metodo_pagamento: metodo }).eq('id', appId);
  };

  // Righe toelettatura: dagli appuntamenti confermati
  const righeToelettatura = appConf.map(a => ({
    id: 'app_' + a.id,
    _appId: a.id,
    _cliente: `${a.clienti?.cognome || ''} ${a.clienti?.nome || ''}`.trim(),
    data: dataSel,
    tipo: 'toelettatura',
    importo: Number(a.prezzo_confermato || a.prezzo_proposto || 0),
    descrizione: (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', '),
    operatori: a.operatori,
    metodo_pagamento: metodiPag[a.id] || 'contanti',
  }));

  const tutteRighe = [
    ...righeToelettatura,
    ...movimenti.map(m => ({ ...m })),
  ].filter(r => filtroTipo === 'tutti' || r.tipo === filtroTipo);

  const calcolaTotali = (righe) => {
    const perTipo = {};
    let contanti = 0, pos = 0, ecc = 0, uscite = 0, versamenti = 0;
    righe.forEach(r => {
      const imp = Number(r.importo || 0);
      if (r.tipo === 'toelettatura') {
        const metodo = r.metodo_pagamento || 'contanti';
        const chiave = metodo === 'pos' ? 'toelettatura_pos' : 'toelettatura_contanti';
        perTipo[chiave] = (perTipo[chiave] || 0) + imp;
        if (metodo === 'pos') pos += imp; else contanti += imp;
      } else if (r.tipo === 'pos') {
        perTipo['pos'] = (perTipo['pos'] || 0) + imp;
        pos += imp;
      } else if (r.tipo === 'ecc') {
        perTipo['ecc'] = (perTipo['ecc'] || 0) + imp;
        ecc += imp;
      } else if (r.tipo === 'uscita') {
        perTipo['uscita'] = (perTipo['uscita'] || 0) + imp;
        uscite += imp;
      } else if (r.tipo === 'versamento') {
        perTipo['versamento'] = (perTipo['versamento'] || 0) + imp;
        versamenti += imp;
      }
    });
    const cassa = contanti + ecc - uscite - versamenti;
    return { perTipo, contanti, pos, ecc, uscite, versamenti, cassa, incassi: contanti + pos + ecc, netto: contanti + pos + ecc - uscite - versamenti };
  };

  const totali = calcolaTotali([...righeToelettatura, ...movimenti]);

  const handleDelete = async (id) => {
    if (!window.confirm('Eliminare questo movimento?')) return;
    await supabase.from('primanota').delete().eq('id', id);
    setMovimenti(p => p.filter(m => m.id !== id));
  };

  const handleExport = async (formato) => {
    setExporting(formato); setShowExport(false);
    const [mov, app] = await Promise.all([
      supabase.from('primanota').select('*, operatori(id,nome,cognome)')
        .gte('data', expDal).lte('data', expAl).order('data').order('created_at'),
      supabase.from('appuntamenti')
        .select('id, prezzo_confermato, prezzo_proposto, stato, metodo_pagamento, clienti(nome,cognome), operatori(id,nome,cognome), appuntamenti_servizi(servizi(nome))')
        .eq('prezzo_confermato_flag', true)
        .gte('inizio', expDal + 'T00:00:00')
        .lte('inizio', expAl + 'T23:59:59'),
    ]);
    const righeApp = (app.data || []).map(a => ({
      data: a.inizio?.split('T')[0], tipo: 'toelettatura',
      importo: Number(a.prezzo_confermato || a.prezzo_proposto || 0),
      descrizione: (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', '),
      operatori: a.operatori, _appId: a.id,
      metodo_pagamento: a.metodo_pagamento || 'contanti',
      _cliente: `${a.clienti?.cognome || ''} ${a.clienti?.nome || ''}`.trim(),
    }));
    const righe = [...righeApp, ...(mov.data || [])].sort((a,b) => a.data.localeCompare(b.data));
    const tot = calcolaTotali(righe);
    const dal = fmtData(expDal); const al = fmtData(expAl);
    if (formato === 'pdf') doExportPDF(righe, dal, al, tot);
    else doExportExcel(righe, dal, al, tot);
    setExporting('');
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Prima Nota
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            Incassi e movimenti giornalieri
          </div>
        </div>

        <input type="date" value={dataSel} onChange={e => setDataSel(e.target.value)}
          style={{ ...glassCard, padding: '8px 12px', fontSize: 13, fontWeight: 600,
            color: 'var(--text-primary)', border: '1px solid var(--card-border)',
            fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }} />

        <button onClick={() => setShowExport(p => !p)}
          style={{ ...glassCard, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6,
            cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb',
            border: '1px solid rgba(37,99,235,0.2)', background: showExport ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          {exporting ? 'Esporto...' : 'Esporta'}
        </button>

        <motion.button whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowModal(true)}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Movimento
        </motion.button>
      </motion.div>

      {/* Pannello export */}
      <AnimatePresence>
        {showExport && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{ ...glass, padding: '18px 20px', marginBottom: 14 }}>
            <div style={secLabel}>Periodo di esportazione</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Dal</div>
                <input type="date" value={expDal} onChange={e => setExpDal(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }} />
              </div>
              <div style={{ color: 'var(--text-muted)', marginTop: 16 }}>—</div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Al</div>
                <input type="date" value={expAl} onChange={e => setExpAl(e.target.value)}
                  style={{ ...inputStyle, width: 'auto' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => handleExport('pdf')} disabled={!!exporting}
                style={{ flex: 1, padding: '11px', borderRadius: 13, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#dc2626',
                  border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
                </svg>
                PDF
              </button>
              <button onClick={() => handleExport('excel')} disabled={!!exporting}
                style={{ flex: 1, padding: '11px', borderRadius: 13, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#059669',
                  border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M3 15h18M9 3v18"/>
                </svg>
                Excel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI del giorno */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14, gridAutoRows: 'auto' }}>
        {[
          { label: '✂️ Contanti',  value: totali.contanti, color: '#059669', icon: '💵' },
          { label: '✂️ POS',       value: totali.pos,      color: '#7c3aed', icon: '💳' },
          { label: 'ECC',          value: totali.ecc,      color: '#0891b2', icon: '🏦' },
          { label: 'Uscite',       value: totali.uscite,   color: '#dc2626', icon: '💸' },
          { label: 'Versamenti',   value: totali.versamenti, color: '#f97316', icon: '🏛️' },
          { label: 'Cassa',        value: totali.cassa,    color: totali.cassa >= 0 ? '#2563eb' : '#dc2626', icon: '💰', bold: true },
        ].map(k => (
          <div key={k.label} style={{ ...glass, padding: '16px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden',
            ...(k.bold ? { gridColumn: 'span 3', borderTop: `3px solid ${k.color}` } : {}) }}>
            <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 36, opacity: 0.08 }}>{k.icon}</div>
            <div style={{ fontSize: k.bold ? 26 : 22, fontWeight: 800, color: k.color, letterSpacing: '-0.5px' }}>
              {fmt(k.value)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{k.label}</div>
            {k.bold && (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                (contanti + ECC − uscite − versamenti)
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Breakdown per tipo */}
      {Object.keys(totali.perTipo).length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ ...glass, padding: '16px 18px', marginBottom: 14 }}>
          <div style={secLabel}>Dettaglio per categoria</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(totali.perTipo).map(([k, v]) => {
              const META = {
                toelettatura_contanti: { icon: '✂️', label: 'Toelettatura contanti', color: '#059669' },
                toelettatura_pos:      { icon: '✂️', label: 'Toelettatura POS',      color: '#7c3aed' },
                pos:                   { icon: '💳', label: 'POS manuale',            color: '#7c3aed' },
                ecc:                   { icon: '🏦', label: 'ECC',                    color: '#0891b2' },
                uscita:                { icon: '💸', label: 'Uscita',                 color: '#dc2626' },
                versamento:            { icon: '🏛️', label: 'Versamento',             color: '#f97316' },
              };
              const m = META[k] || { icon: '•', label: k, color: 'var(--text-muted)' };
              return (
                <div key={k} style={{ ...glassCard, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{m.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{m.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: m.color }}>{fmt(v)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filtro tipo */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {[['tutti', 'Tutti', 'var(--text-primary)'], ...Object.entries(TIPI).map(([k,v]) => [k, v.label, v.color])].map(([k, l, c]) => (
          <button key={k} onClick={() => setFiltroTipo(k)} style={{
            padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
            border: `1px solid ${filtroTipo === k ? (TIPI[k]?.color || '#2563eb') + '50' : 'var(--card-border)'}`,
            background: filtroTipo === k ? (TIPI[k]?.bg || 'rgba(37,99,235,0.1)') : 'transparent',
            color: filtroTipo === k ? c : 'var(--text-muted)',
          }}>{l}</button>
        ))}
      </div>

      {/* Lista movimenti */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
          Caricamento...
        </div>
      ) : tutteRighe.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ ...glass, padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Nessun movimento per {fmtData(dataSel)}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Gli appuntamenti con prezzo confermato appaiono qui automaticamente
          </div>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tutteRighe.map((r, i) => {
            const t = TIPI[r.tipo];
            const isManuale = !r._appId;
            return (
              <motion.div key={r.id || i}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                style={{ ...glassCard, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>

                {/* Icona tipo */}
                <div style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                  background: t?.bg || 'rgba(37,99,235,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {t?.icon || '💶'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {t?.label || r.tipo}
                    </span>
                    {r._cliente && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>— {r._cliente}</span>
                    )}
                    {!isManuale && (
                      <span style={{ fontSize: 10, background: 'rgba(37,99,235,0.1)', color: '#2563eb',
                        borderRadius: 6, padding: '1px 6px', fontWeight: 600 }}>auto</span>
                    )}
                  </div>
                  {r.descrizione && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.descrizione}
                    </div>
                  )}
                  {r.operatori?.nome && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                      {r.operatori.nome}
                    </div>
                  )}
                </div>

                {/* Toggle POS / Contanti (solo righe toelettatura automatiche) */}
                {r._appId && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {[
                      { id: 'contanti', label: '💵 Contanti', activeColor: '#059669', activeBg: 'rgba(5,150,105,0.15)', activeBorder: 'rgba(5,150,105,0.4)' },
                      { id: 'pos',      label: '💳 POS',      activeColor: '#7c3aed', activeBg: 'rgba(124,58,237,0.15)', activeBorder: 'rgba(124,58,237,0.4)' },
                    ].map(m => {
                      const attivo = (metodiPag[r._appId] || 'contanti') === m.id;
                      return (
                        <button key={m.id} onClick={() => handleMetodoPag(r._appId, m.id)} style={{
                          padding: '4px 9px', borderRadius: 9, cursor: 'pointer',
                          fontFamily: 'inherit', fontSize: 11, fontWeight: 700,
                          border: `1px solid ${attivo ? m.activeBorder : 'var(--card-border)'}`,
                          background: attivo ? m.activeBg : 'transparent',
                          color: attivo ? m.activeColor : 'var(--text-muted)',
                          transition: 'all 0.15s',
                        }}>
                          {m.label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Importo */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800,
                    color: t?.segno === -1 ? '#dc2626' : '#059669' }}>
                    {t?.segno === -1 ? '−' : '+'} {fmt(r.importo)}
                  </div>
                </div>

                {/* Elimina (solo movimenti manuali) */}
                {isManuale && (
                  <button onClick={() => handleDelete(r.id)} style={{
                    background: 'rgba(220,38,38,0.08)', color: '#dc2626',
                    border: '1px solid rgba(220,38,38,0.2)', borderRadius: 9,
                    padding: '4px 8px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                    flexShrink: 0,
                  }}>×</button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <ModalMovimento
            data={dataSel}
            operatori={operatori}
            onClose={() => setShowModal(false)}
            onSaved={(row) => setMovimenti(p => [...p, row])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}