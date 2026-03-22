/**
 * StatisticheView.jsx
 * Statistiche con grafici stile iOS + export PDF ed Excel
 * npm install jspdf jspdf-autotable xlsx
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList
} from 'recharts';
import { supabase } from './supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ── Palette ───────────────────────────────────────────────────
const C = {
  blue:   '#2563eb',
  green:  '#059669',
  orange: '#d97706',
  purple: '#7c3aed',
  pink:   '#db2777',
  cyan:   '#0891b2',
  red:    '#dc2626',
};
const COLORI = Object.values(C);
const MESI_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];

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
const secLabel = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
  letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16,
};

// ── Tooltip custom ────────────────────────────────────────────
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...glassCard, padding: '10px 14px', minWidth: 120, pointerEvents: 'none' }}>
      {label && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color || 'var(--text-primary)' }}>
          {p.name ? `${p.name}: ` : ''}{p.value}
        </div>
      ))}
    </div>
  );
};

// ── Donut Ring (stile iOS Activity) ──────────────────────────
function DonutRing({ value, max, color, size = 120, strokeWidth = 14, label, sublabel }) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Track */}
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={color + '22'}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          {/* Glow */}
          <motion.circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth * 0.4}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
            style={{ filter: `blur(6px)`, opacity: 0.5 }}
          />
        </svg>
        {/* Centro */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: size * 0.22, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
            {value}
          </span>
          {sublabel && (
            <span style={{ fontSize: size * 0.09, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>
              {sublabel}
            </span>
          )}
        </div>
      </div>
      {label && (
        <div style={{ fontSize: 12, fontWeight: 600, color, textAlign: 'center', maxWidth: size }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Barra orizzontale con label ───────────────────────────────
function BarraOrizzontale({ label, value, max, color, extra }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>
          {value}{extra && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>{extra}</span>}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 99, background: color + '20', overflow: 'hidden' }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ height: '100%', borderRadius: 99, background: color,
            boxShadow: `0 0 8px ${color}60` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────
function exportPDF(dati, meseLabel, appuntamenti, clienti, animali, sel) {
  const doc = new jsPDF();
  const y = { cur: 20 };
  const next = (n = 10) => { y.cur += n; return y.cur; };

  // Header
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 36, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont('helvetica', 'bold');
  doc.text('PetCare — Report Mensile', 14, 22);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(meseLabel, 14, 30);
  doc.setTextColor(30, 30, 30);
  y.cur = 50;

  // KPI cards
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('Riepilogo', 14, y.cur); next(8);
  const kpis = [
    ['Appuntamenti totali', dati.totaleAp],
    ['Completati', dati.completati],
    ['Cancellati', dati.cancellati],
    ['Tasso completamento', `${dati.tassoCompletamento}%`],
    ['Ricavo stimato', `€${dati.ricavoMese.toFixed(2)}`],
    ['Clienti nuovi', dati.nuoviClienti],
  ];
  autoTable(doc, {
    startY: y.cur,
    head: [['Metrica', 'Valore']],
    body: kpis,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235] },
    margin: { left: 14 },
  });
  y.cur = doc.lastAutoTable.finalY + 14;

  // Appuntamenti per operatore (sempre nel riepilogo)
  if (dati.perOperatore.length > 0) {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Appuntamenti per Operatore', 14, y.cur); next(6);
    autoTable(doc, {
      startY: y.cur,
      head: [['Operatore', 'Appuntamenti', 'Completati']],
      body: dati.perOperatore.map(o => [o.nome, o.totale, o.completati]),
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
      margin: { left: 14 },
    });
    y.cur = doc.lastAutoTable.finalY + 14;
  }

  // Servizi
  if (dati.perServizio.length > 0) {
    if (y.cur > 220) { doc.addPage(); y.cur = 20; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Servizi Richiesti', 14, y.cur); next(6);
    autoTable(doc, {
      startY: y.cur,
      head: [['Servizio', 'Richieste', 'Ricavo']],
      body: dati.perServizio.map(s => [s.nome, s.count, `€${s.ricavo.toFixed(2)}`]),
      theme: 'striped',
      headStyles: { fillColor: [217, 119, 6] },
      margin: { left: 14 },
    });
    y.cur = doc.lastAutoTable.finalY + 14;
  }

  // Appuntamenti dettaglio
  if (sel?.appuntamenti && appuntamenti?.length > 0) {
    doc.addPage(); y.cur = 20;
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Dettaglio Appuntamenti', 14, y.cur); next(6);
    autoTable(doc, {
      startY: y.cur,
      head: [['Data', 'Ora', 'Cliente', 'Animale', 'Servizio', 'Operatore', 'Stato']],
      body: appuntamenti.map(a => [
        new Date(a.inizio).toLocaleDateString('it-IT'),
        new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        `${a.clienti?.cognome || ''} ${a.clienti?.nome || ''}`.trim(),
        a.animali?.nome || '',
        (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', ') || a.servizi?.nome || '',
        a.operatori?.nome || '',
        a.stato,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] },
      margin: { left: 14 },
      styles: { fontSize: 9 },
    });
    y.cur = doc.lastAutoTable.finalY + 14;
  }

  // Clienti
  if (sel?.clienti && clienti?.length > 0) {
    if (y.cur > 220) { doc.addPage(); y.cur = 20; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Anagrafica Clienti', 14, y.cur); next(6);
    autoTable(doc, {
      startY: y.cur,
      head: [['Cognome', 'Nome', 'Telefono', 'Email', 'Registrato']],
      body: clienti.map(c => [
        c.cognome || '', c.nome || '',
        c.telefono || '', c.email || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [124, 58, 237] },
      margin: { left: 14 },
      styles: { fontSize: 9 },
    });
    y.cur = doc.lastAutoTable.finalY + 14;
  }

  // Animali
  if (sel?.animali && animali?.length > 0) {
    if (y.cur > 220) { doc.addPage(); y.cur = 20; }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text('Anagrafica Animali', 14, y.cur); next(6);
    autoTable(doc, {
      startY: y.cur,
      head: [['Nome', 'Specie', 'Razza', 'Proprietario', 'Registrato']],
      body: animali.map(a => [
        a.nome || '', a.specie || '',
        a.razze?.nome || '',
        a.clienti ? `${a.clienti.cognome || ''} ${a.clienti.nome || ''}`.trim() : '',
        a.created_at ? new Date(a.created_at).toLocaleDateString('it-IT') : '',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [8, 145, 178] },
      margin: { left: 14 },
      styles: { fontSize: 9 },
    });
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`PetCare Report — ${meseLabel} — Pagina ${i} di ${pageCount}`, 14, 290);
    doc.text('Generato automaticamente', 140, 290);
  }

  doc.save(`PetCare_Report_${meseLabel.replace(' ', '_')}.pdf`);
}

function exportExcel(dati, appuntamenti, clienti, animali, meseLabel, sel) {
  const wb = XLSX.utils.book_new();

  // Foglio 1: Riepilogo
  const riepilogo = [
    ['PetCare — Report', meseLabel],
    [],
    ['Metrica', 'Valore'],
    ['Appuntamenti totali', dati.totaleAp],
    ['Completati', dati.completati],
    ['Cancellati', dati.cancellati],
    ['Tasso completamento', `${dati.tassoCompletamento}%`],
    ['Ricavo stimato', dati.ricavoMese],
    ['Clienti nuovi', dati.nuoviClienti],
  ];
  if (sel?.riepilogo) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(riepilogo), 'Riepilogo');
  }

  if (sel?.appuntamenti && appuntamenti?.length > 0) {
    const apRows = [
      ['Data', 'Ora', 'Cliente', 'Animale', 'Specie', 'Servizio', 'Operatore', 'Stato', 'Prezzo'],
      ...appuntamenti.map(a => [
        new Date(a.inizio).toLocaleDateString('it-IT'),
        new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        `${a.clienti?.cognome || ''} ${a.clienti?.nome || ''}`.trim(),
        a.animali?.nome || '',
        a.animali?.specie || '',
(a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', ') || '',
        a.operatori?.nome || '',
        a.stato,
        a.prezzo_confermato_flag ? `€${Number(a.prezzo_confermato).toFixed(2)}` : (a.prezzo_proposto ? `€${Number(a.prezzo_proposto).toFixed(2)}` : (a.servizi?.prezzo ? `€${Number(a.servizi.prezzo).toFixed(2)}` : '')),
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(apRows), 'Appuntamenti');
  }

  if (sel?.clienti && clienti?.length > 0) {
    const clRows = [
      ['Cognome', 'Nome', 'Telefono', 'Email', 'Indirizzo', 'Note', 'Registrato'],
      ...clienti.map(c => [
        c.cognome || '', c.nome || '',
        c.telefono || '', c.email || '',
        c.indirizzo || '', c.note || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(clRows), 'Clienti');
  }

  if (sel?.animali && animali?.length > 0) {
    const anRows = [
      ['Nome', 'Specie', 'Razza', 'Proprietario', 'Data nascita', 'Colore', 'Operatore pref.', 'Zone critiche', 'Note', 'Registrato'],
      ...animali.map(a => [
        a.nome || '', a.specie || '',
        a.razze?.nome || '',
        a.clienti ? `${a.clienti.cognome || ''} ${a.clienti.nome || ''}`.trim() : '',
        a.data_nascita ? new Date(a.data_nascita).toLocaleDateString('it-IT') : '',
        a.colore || '',
        a.operatori?.nome || '',
        a.zone_critiche || '',
        a.note || '',
        a.created_at ? new Date(a.created_at).toLocaleDateString('it-IT') : '',
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(anRows), 'Animali');
  }

  XLSX.writeFile(wb, `PetCare_${meseLabel.replace(' ', '_')}.xlsx`);
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function StatisticheView() {
  const [loading,         setLoading]         = useState(true);
  const [exporting,       setExporting]       = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportSel, setExportSel] = useState({
    riepilogo:     true,
    appuntamenti:  true,
    clienti:       true,
    animali:       true,
  });
  const [exportPeriodo, setExportPeriodo] = useState('mese'); // 'mese' | 'custom'
  const [exportDal, setExportDal]   = useState('');
  const [exportAl,  setExportAl]    = useState('');
  const [meseSel,      setMeseSel]      = useState(new Date().getMonth());
  const [annoSel,      setAnnoSel]      = useState(new Date().getFullYear());
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [clienti,      setClienti]      = useState([]);
  const [animali,      setAnimali]      = useState([]);
  const [operatori,    setOperatori]    = useState([]);
  const [servizi,      setServizi]      = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [ap, cl, an, op, sv] = await Promise.all([
      supabase.from('appuntamenti').select(`
        id, inizio, fine, stato,
        clienti(id, nome, cognome),
        animali(id, nome, specie),
        operatori(id, nome, cognome, colore),
        prezzo_proposto, prezzo_confermato, prezzo_confermato_flag,
        appuntamenti_servizi(servizio_id, prezzo_applicato, servizi(id, nome, prezzo, durata_minuti))
      `).order('inizio'),
      supabase.from('clienti').select('id, nome, cognome, telefono, email, indirizzo, note, created_at'),
      supabase.from('animali').select('id, nome, specie, razza_id, colore, data_nascita, zone_critiche, note, operatore_preferito_id, created_at, razze(nome), clienti(nome, cognome)'), 
      supabase.from('operatori').select('id, nome, cognome, colore').eq('attivo', true),
      supabase.from('servizi').select('id, nome, prezzo, durata_minuti'),
    ]);
    setAppuntamenti(ap.data || []);
    setClienti(cl.data || []);
    setAnimali(an.data || []);
    setOperatori(op.data || []);
    setServizi(sv.data || []);
    setLoading(false);
  };

  // ── Dati calcolati ────────────────────────────────────────
  const apMese = appuntamenti.filter(a => {
    const d = new Date(a.inizio);
    return d.getMonth() === meseSel && d.getFullYear() === annoSel;
  });

  const oggi = new Date();
  const apOggi = appuntamenti.filter(a =>
    new Date(a.inizio).toDateString() === oggi.toDateString()
  ).length;

  const completati  = apMese.filter(a => a.stato === 'completato').length;
  const cancellati  = apMese.filter(a => a.stato === 'cancellato').length;
  const inAttesa    = apMese.filter(a => a.stato === 'in attesa').length;
  const confermati  = apMese.filter(a => a.stato === 'confermato').length;
  const tassoCompletamento = apMese.length > 0 ? Math.round((completati / apMese.length) * 100) : 0;

  // Usa prezzo_confermato se disponibile, altrimenti prezzo_proposto, altrimenti somma dei servizi
  const getPrezzoAp = (a) => {
    if (a.prezzo_confermato_flag && a.prezzo_confermato) return Number(a.prezzo_confermato);
    if (a.prezzo_proposto) return Number(a.prezzo_proposto);
    // Somma prezzi_applicato da appuntamenti_servizi
    const svs = a.appuntamenti_servizi || [];
    const totSv = svs.reduce((acc, r) => acc + Number(r.prezzo_applicato || r.servizi?.prezzo || 0), 0);
    return totSv;
  };

  // Helper: lista servizi di un appuntamento
  const getServiziAp = (a) => (a.appuntamenti_servizi || []).map(r => r.servizi).filter(Boolean);

  const ricavoMese = apMese
    .filter(a => a.stato === 'completato')
    .reduce((acc, a) => acc + getPrezzoAp(a), 0);

  const ricavoConfermato = apMese
    .filter(a => a.prezzo_confermato_flag)
    .reduce((acc, a) => acc + Number(a.prezzo_confermato), 0);

  const nuoviClienti = clienti.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === meseSel && d.getFullYear() === annoSel;
  }).length;

  // Trend 6 mesi
  const trend6 = Array.from({ length: 6 }, (_, i) => {
    let m = meseSel - 5 + i;
    let y = annoSel;
    if (m < 0) { m += 12; y -= 1; }
    const ap = appuntamenti.filter(a => {
      const d = new Date(a.inizio);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const ricavo = ap.filter(a => a.stato === 'completato')
      .reduce((acc, a) => acc + getPrezzoAp(a), 0);
    return {
      mese: MESI_SHORT[m],
      appuntamenti: ap.length,
      completati: ap.filter(a => a.stato === 'completato').length,
      ricavo: Math.round(ricavo),
    };
  });

  // Per operatore
  const perOperatore = operatori.map((op, i) => {
    const apOp = apMese.filter(a => a.operatori?.id === op.id);
    return {
      nome: op.nome,
      totale: apOp.length,
      completati: apOp.filter(a => a.stato === 'completato').length,
      colore: op.colore || COLORI[i % COLORI.length],
    };
  }).filter(o => o.totale > 0).sort((a,b) => b.totale - a.totale);

  const maxOpTotale = Math.max(...perOperatore.map(o => o.totale), 1);

  // Per servizio
  const perServizio = servizi.map(s => {
    // Conta appuntamenti del mese che contengono questo servizio
    const apSv = apMese.filter(a =>
      (a.appuntamenti_servizi || []).some(r => r.servizio_id === s.id)
    );
    // Ricavo: somma prezzo_applicato di questo servizio specifico
    const ricavo = apSv
      .filter(a => a.stato === 'completato')
      .reduce((acc, a) => {
        const riga = (a.appuntamenti_servizi || []).find(r => r.servizio_id === s.id);
        return acc + Number(riga?.prezzo_applicato || s.prezzo || 0);
      }, 0);
    return { nome: s.nome, count: apSv.length, ricavo };
  }).filter(s => s.count > 0).sort((a,b) => b.count - a.count);

  const maxSvCount = Math.max(...perServizio.map(s => s.count), 1);

  // Specie animali
  const specieData = ['cane','gatto','altro'].map((sp, i) => ({
    name: sp.charAt(0).toUpperCase() + sp.slice(1),
    value: animali.filter(a => a.specie === sp).length,
    color: [C.blue, C.orange, C.purple][i],
  })).filter(s => s.value > 0);

  const maxSpecie = Math.max(...specieData.map(s => s.value), 1);

  // Razze top
  const razzeCount = {};
  animali.forEach(a => {
    const r = a.razze?.nome || 'Non specificata';
    razzeCount[r] = (razzeCount[r] || 0) + 1;
  });
  const razzeTop = Object.entries(razzeCount)
    .sort((a,b) => b[1] - a[1]).slice(0, 6)
    .map(([nome, count]) => ({ nome, count }));
  const maxRazza = Math.max(...razzeTop.map(r => r.count), 1);

  const meseLabel = `${MESI_SHORT[meseSel]} ${annoSel}`;

  // Dati per export
  const datiExport = {
    totaleAp: apMese.length, completati, cancellati,
    tassoCompletamento, ricavoMese, nuoviClienti, perOperatore, perServizio,
  };

  // Filtra appuntamenti per periodo custom
  const apFiltrati = exportPeriodo === 'mese' ? apMese : appuntamenti.filter(a => {
    const d = new Date(a.inizio);
    const dal = exportDal ? new Date(exportDal) : null;
    const al  = exportAl  ? new Date(exportAl + 'T23:59:59') : null;
    return (!dal || d >= dal) && (!al || d <= al);
  });

  const periodoLabel = exportPeriodo === 'mese'
    ? meseLabel
    : `${exportDal || '?'} - ${exportAl || '?'}`;

  const handlePDF = async () => {
    setExporting('pdf');
    setShowExportPanel(false);
    await new Promise(r => setTimeout(r, 100));
    exportPDF(datiExport, periodoLabel, apFiltrati, clienti, animali, exportSel);
    setExporting('');
  };

  const handleExcel = async () => {
    setExporting('excel');
    setShowExportPanel(false);
    await new Promise(r => setTimeout(r, 100));
    exportExcel(datiExport, apFiltrati, clienti, animali, periodoLabel, exportSel);
    setExporting('');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        Caricamento statistiche...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Statistiche
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            {apMese.length} appuntamenti in {meseLabel}
          </div>
        </div>

        {/* Selettore mese */}
        <div style={{ ...glassCard, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
          <button onClick={() => {
            if (meseSel === 0) { setMeseSel(11); setAnnoSel(y => y-1); }
            else setMeseSel(m => m-1);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '0 4px' }}>‹</button>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', minWidth: 70, textAlign: 'center' }}>
            {meseLabel}
          </span>
          <button onClick={() => {
            if (meseSel === 11) { setMeseSel(0); setAnnoSel(y => y+1); }
            else setMeseSel(m => m+1);
          }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 16, padding: '0 4px' }}>›</button>
        </div>

        {/* Bottone Esporta */}
        <button
          onClick={() => setShowExportPanel(p => !p)}
          disabled={!!exporting}
          style={{ ...glassCard, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#2563eb', border: '1px solid rgba(37,99,235,0.2)', background: showExportPanel ? 'rgba(37,99,235,0.12)' : 'rgba(37,99,235,0.06)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          {exporting ? 'Esporto...' : 'Esporta'}
        </button>
      </motion.div>

      {/* ── PANNELLO EXPORT ── */}
      <AnimatePresence>
        {showExportPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ ...glass, padding: '20px 22px', marginBottom: 16 }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.6px', textTransform: 'uppercase', marginBottom: 16 }}>
              Opzioni di esportazione
            </div>

            {/* Periodo */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Periodo</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[['mese', `Mese corrente (${meseLabel})`], ['custom', 'Intervallo personalizzato']].map(([v, l]) => (
                  <button key={v} onClick={() => setExportPeriodo(v)} style={{
                    padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 12, fontWeight: 600, border: '1px solid var(--card-border)',
                    background: exportPeriodo === v ? 'rgba(37,99,235,0.15)' : 'var(--card-bg-sm)',
                    color: exportPeriodo === v ? '#2563eb' : 'var(--text-primary)',
                  }}>{l}</button>
                ))}
              </div>
              {exportPeriodo === 'custom' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Dal</div>
                    <input type="date" value={exportDal} onChange={e => setExportDal(e.target.value)}
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                  <div style={{ color: 'var(--text-muted)', marginTop: 16 }}>—</div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Al</div>
                    <input type="date" value={exportAl} onChange={e => setExportAl(e.target.value)}
                      style={{ background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '7px 10px', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Selezione dati */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Dati da includere</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { k: 'riepilogo',    l: 'Riepilogo statistiche', c: '#2563eb' },
                  { k: 'appuntamenti', l: 'Appuntamenti',           c: '#059669' },
                  { k: 'clienti',      l: 'Clienti',                c: '#7c3aed' },
                  { k: 'animali',      l: 'Animali',                c: '#0891b2' },
                ].map(({ k, l, c }) => (
                  <button key={k}
                    onClick={() => setExportSel(p => ({ ...p, [k]: !p[k] }))}
                    style={{
                      padding: '7px 14px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 12, fontWeight: 600,
                      border: `1px solid ${exportSel[k] ? c + '40' : 'var(--card-border)'}`,
                      background: exportSel[k] ? c + '18' : 'var(--card-bg-sm)',
                      color: exportSel[k] ? c : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 4, background: exportSel[k] ? c : 'var(--card-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {exportSel[k] && <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/></svg>}
                    </div>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottoni formato */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handlePDF} disabled={!!exporting || !Object.values(exportSel).some(Boolean)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#dc2626', border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.08)', opacity: !Object.values(exportSel).some(Boolean) ? 0.4 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
                {exporting === 'pdf' ? 'Esporto...' : 'Scarica PDF'}
              </button>
              <button onClick={handleExcel} disabled={!!exporting || !Object.values(exportSel).some(Boolean)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#059669', border: '1px solid rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.08)', opacity: !Object.values(exportSel).some(Boolean) ? 0.4 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>
                {exporting === 'excel' ? 'Esporto...' : 'Scarica Excel'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI RINGS ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Attivita del mese</div>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <DonutRing value={apMese.length} max={Math.max(apMese.length, 30)} color={C.blue}   size={130} label="Appuntamenti" sublabel="tot" />
          <DonutRing value={completati}    max={Math.max(apMese.length, 1)} color={C.green}  size={130} label="Completati"    sublabel={`${tassoCompletamento}%`} />
          <DonutRing value={inAttesa}      max={Math.max(apMese.length, 1)} color={C.orange} size={130} label="In attesa"     sublabel="da conf." />
          <DonutRing value={cancellati}    max={Math.max(apMese.length, 1)} color={C.red}    size={130} label="Cancellati"    sublabel="" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>€{Math.round(ricavoMese)}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.green, marginTop: 4 }}>Ricavo stimato</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>dai completati</div>
            {ricavoConfermato > 0 && (
              <div style={{ marginTop: 8, padding: '4px 10px', borderRadius: 20,
                background: 'rgba(5,150,105,0.15)', display: 'inline-block' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#059669' }}>
                  € {Math.round(ricavoConfermato)} confermati
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Mini stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 20 }}>
          {[
            { label: 'Oggi', value: apOggi, color: C.blue },
            { label: 'Nuovi clienti', value: nuoviClienti, color: C.purple },
            { label: 'Animali totali', value: animali.length, color: C.cyan },
          ].map(s => (
            <div key={s.label} style={{ ...glassCard, padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── TREND 6 MESI ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Trend — ultimi 6 mesi</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend6} barGap={4}>
            <XAxis dataKey="mese" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
            <Tooltip content={<Tip />} />
            <Bar dataKey="appuntamenti" name="Totali" fill={C.blue} radius={[6,6,0,0]} fillOpacity={0.25} />
            <Bar dataKey="completati"   name="Completati" fill={C.green} radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8 }}>
          {[{ c: C.blue, l: 'Totali', op: 0.25 }, { c: C.green, l: 'Completati' }].map(({ c, l, op }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: op || 1 }} />
              {l}
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── RICAVO TREND ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Ricavo stimato — ultimi 6 mesi</div>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={trend6}>
            <XAxis dataKey="mese" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40}
              tickFormatter={v => `€${v}`} />
            <Tooltip content={<Tip />} formatter={v => [`€${v}`, 'Ricavo']} />
            <Line type="monotone" dataKey="ricavo" stroke={C.green} strokeWidth={2.5}
              dot={{ fill: C.green, r: 4, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: C.green }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── OPERATORI ── */}
      {perOperatore.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
        >
          <div style={secLabel}>Carico per operatore — {meseLabel}</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Rings operatori */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {perOperatore.map(op => (
                <DonutRing
                  key={op.nome}
                  value={op.totale}
                  max={maxOpTotale}
                  color={op.colore}
                  size={100}
                  strokeWidth={11}
                  label={op.nome}
                  sublabel={`${op.completati} ok`}
                />
              ))}
            </div>
            {/* Barre dettaglio */}
            <div style={{ flex: 1, minWidth: 200 }}>
              {perOperatore.map(op => (
                <BarraOrizzontale
                  key={op.nome}
                  label={op.nome}
                  value={op.totale}
                  max={maxOpTotale}
                  color={op.colore}
                  extra={`/ ${op.completati} completati`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── SERVIZI ── */}
      {perServizio.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
        >
          <div style={secLabel}>Servizi piu richiesti — {meseLabel}</div>
          {perServizio.map((s, i) => (
            <BarraOrizzontale
              key={s.nome}
              label={s.nome}
              value={s.count}
              max={maxSvCount}
              color={COLORI[i % COLORI.length]}
              extra={s.ricavo > 0 ? `€${s.ricavo.toFixed(0)}` : ''}
            />
          ))}
        </motion.div>
      )}

      {/* ── ANIMALI: SPECIE + RAZZE ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Animali registrati</div>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {/* Donut specie */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Per specie</div>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {specieData.map(s => (
                <DonutRing
                  key={s.name}
                  value={s.value}
                  max={maxSpecie}
                  color={s.color}
                  size={90}
                  strokeWidth={10}
                  label={s.name}
                />
              ))}
            </div>
          </div>
          {/* Razze top */}
          {razzeTop.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 16 }}>Razze piu frequenti</div>
              {razzeTop.map((r, i) => (
                <BarraOrizzontale
                  key={r.nome}
                  label={r.nome}
                  value={r.count}
                  max={maxRazza}
                  color={COLORI[i % COLORI.length]}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}