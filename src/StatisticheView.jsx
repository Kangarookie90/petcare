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

// ── Export Excel con foglio Prima Nota ────────────────────────
async function exportExcelConPrimaNota(dati, appuntamenti, clienti, animali, meseLabel, sel, dal, al) {
  const XLSX2 = XLSX; // usa l'import statico già presente
  const wb = XLSX2.utils.book_new();

  // Riepilogo
  if (sel?.riepilogo) {
    const riepilogo = [
      ['PetCare — Report', meseLabel],
      [],
      ['Metrica', 'Valore'],
      ['Appuntamenti totali', dati.totaleAp],
      ['Completati', dati.completati],
      ['Cancellati', dati.cancellati],
      ['Tasso completamento', dati.tassoCompletamento + '%'],
      ['Ricavo stimato', dati.ricavoMese],
      ['Clienti nuovi', dati.nuoviClienti],
    ];
    XLSX2.utils.book_append_sheet(wb, XLSX2.utils.aoa_to_sheet(riepilogo), 'Riepilogo');
  }

  // Prima Nota reale
  if (sel?.primanota) {
    // usa il client supabase già importato staticamente in cima al file
    const { data: movimenti } = await supabase
      .from('primanota')
      .select('*, operatori(nome)')
      .gte('data', dal)
      .lte('data', al)
      .order('data')
      .order('created_at');

    const TIPI_LABEL = {
      toelettatura: 'Toelettatura', pos: 'POS', ecc: 'ECC',
      uscita: 'Uscita', versamento: 'Versamento banca',
    };
    const TIPI_SEGNO = { uscita: -1, versamento: -1 };

    const pnRows = [
      ['Data', 'Tipo', 'Descrizione', 'Operatore', 'Segno', 'Importo (EUR)'],
      ...(movimenti || []).map(r => [
        new Date(r.data).toLocaleDateString('it-IT'),
        TIPI_LABEL[r.tipo] || r.tipo,
        r.descrizione || '',
        r.operatori?.nome || '',
        TIPI_SEGNO[r.tipo] === -1 ? 'Uscita' : 'Entrata',
        Number(r.importo) * (TIPI_SEGNO[r.tipo] || 1),
      ]),
    ];
    XLSX2.utils.book_append_sheet(wb, XLSX2.utils.aoa_to_sheet(pnRows), 'Prima Nota');
  }

  // Appuntamenti
  if (sel?.appuntamenti && appuntamenti?.length > 0) {
    const apRows = [
      ['Data', 'Ora', 'Cliente', 'Animale', 'Specie', 'Servizio', 'Operatore', 'Stato', 'Prezzo'],
      ...appuntamenti.map(a => [
        new Date(a.inizio).toLocaleDateString('it-IT'),
        new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
        ((a.clienti?.cognome || '') + ' ' + (a.clienti?.nome || '')).trim(),
        a.animali?.nome || '',
        a.animali?.specie || '',
        (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', ') || '',
        a.operatori?.nome || '',
        a.stato,
        a.prezzo_confermato_flag ? Number(a.prezzo_confermato).toFixed(2) : (a.prezzo_proposto ? Number(a.prezzo_proposto).toFixed(2) : ''),
      ]),
    ];
    XLSX2.utils.book_append_sheet(wb, XLSX2.utils.aoa_to_sheet(apRows), 'Appuntamenti');
  }

  // Clienti
  if (sel?.clienti && clienti?.length > 0) {
    const clRows = [
      ['Cognome', 'Nome', 'Telefono', 'Email', 'Indirizzo', 'Note', 'Registrato'],
      ...clienti.map(c => [
        c.cognome || '', c.nome || '', c.telefono || '', c.email || '',
        c.indirizzo || '', c.note || '',
        c.created_at ? new Date(c.created_at).toLocaleDateString('it-IT') : '',
      ]),
    ];
    XLSX2.utils.book_append_sheet(wb, XLSX2.utils.aoa_to_sheet(clRows), 'Clienti');
  }

  // Animali
  if (sel?.animali && animali?.length > 0) {
    const anRows = [
      ['Nome', 'Specie', 'Razza', 'Proprietario', 'Data nascita', 'Colore', 'Operatore pref.', 'Note', 'Registrato'],
      ...animali.map(a => [
        a.nome || '', a.specie || '', a.razze?.nome || '',
        a.clienti ? ((a.clienti.cognome || '') + ' ' + (a.clienti.nome || '')).trim() : '',
        a.data_nascita ? new Date(a.data_nascita).toLocaleDateString('it-IT') : '',
        a.colore || '', a.operatori?.nome || '', a.note || '',
        a.created_at ? new Date(a.created_at).toLocaleDateString('it-IT') : '',
      ]),
    ];
    XLSX2.utils.book_append_sheet(wb, XLSX2.utils.aoa_to_sheet(anRows), 'Animali');
  }

  XLSX2.writeFile(wb, 'PetCare_' + meseLabel.replace(' ', '_') + '.xlsx');
}

// ── Export CSV statistiche ────────────────────────────────────
function exportCSV(appuntamenti, meseLabel) {
  const intestazione = ['Data', 'Ora', 'Cliente', 'Animale', 'Specie', 'Servizio', 'Operatore', 'Stato', 'Prezzo (EUR)'];
  const righe = appuntamenti.map(a => [
    new Date(a.inizio).toLocaleDateString('it-IT'),
    new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    ((a.clienti?.cognome || '') + ' ' + (a.clienti?.nome || '')).trim(),
    a.animali?.nome || '',
    a.animali?.specie || '',
    (a.appuntamenti_servizi || []).map(r => r.servizi?.nome).filter(Boolean).join(', ') || '',
    a.operatori?.nome || '',
    a.stato,
    a.prezzo_confermato_flag ? Number(a.prezzo_confermato).toFixed(2) : (a.prezzo_proposto ? Number(a.prezzo_proposto).toFixed(2) : ''),
  ]);

  const csv = [intestazione, ...righe]
    .map(row => row.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(';'))
    .join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'PetCare_' + meseLabel.replace(' ', '_') + '_appuntamenti.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPALE
// ─────────────────────────────────────────────────────────────
export default function StatisticheView({ role, session }) {
  const [loading,         setLoading]         = useState(true);
  const [exporting,       setExporting]       = useState('');
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportSel, setExportSel] = useState({
    riepilogo:     true,
    primanota:     true,
    appuntamenti:  true,
    clienti:       true,
    animali:       true,
  });
  const [exportPeriodo, setExportPeriodo] = useState('mese');
  const [exportDal, setExportDal]   = useState('');
  const [exportAl,  setExportAl]    = useState('');
  const [meseSel,      setMeseSel]      = useState(new Date().getMonth());
  const [annoSel,      setAnnoSel]      = useState(new Date().getFullYear());
  const [appuntamenti, setAppuntamenti] = useState([]);
  const [clienti,      setClienti]      = useState([]);
  const [animali,      setAnimali]      = useState([]);
  const [operatori,    setOperatori]    = useState([]);
  const [servizi,      setServizi]      = useState([]);
  const [primanota,    setPrimanota]    = useState([]);
  const [apConf,       setApConf]       = useState([]);
  const [opSelezionato, setOpSelezionato] = useState(null); // drill-down operatore

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    const [ap, cl, an, op, sv, pn, apC] = await Promise.all([
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
      supabase.from('primanota').select('id, data, tipo, importo, descrizione, operatore_id').order('data'),
      supabase.from('appuntamenti')
        .select('id, inizio, prezzo_confermato, prezzo_proposto, metodo_pagamento')
        .eq('prezzo_confermato_flag', true)
        .order('inizio'),
    ]);
    setAppuntamenti(ap.data || []);
    setClienti(cl.data || []);
    setAnimali(an.data || []);
    setOperatori(op.data || []);
    setServizi(sv.data || []);
    setPrimanota(pn.data || []);
    setApConf(apC.data || []);
    setLoading(false);
  };

  // ── Filtraggio per ruolo ─────────────────────────────────────
  // opCorrente: il record operatori che corrisponde all'utente loggato (match per email)
  const isAdmin    = role === 'admin';
  const opCorrente = !isAdmin
    ? operatori.find(op => op.email === session?.user?.email) ?? null
    : null;

  // apMese: tutti gli appuntamenti del mese/anno selezionato
  const apMese = appuntamenti.filter(a => {
    const d = new Date(a.inizio);
    return d.getMonth() === meseSel && d.getFullYear() === annoSel;
  });

  // apMeseVis: per l'operatore mostra solo i propri appuntamenti del mese
  const apMeseVis = !isAdmin && opCorrente
    ? apMese.filter(a => a.operatori?.id === opCorrente.id)
    : apMese;

  const oggi = new Date();
  const apOggi = appuntamenti.filter(a =>
    new Date(a.inizio).toDateString() === oggi.toDateString()
  ).length;

  const completati  = apMeseVis.filter(a => a.stato === 'completato').length;
  const cancellati  = apMeseVis.filter(a => a.stato === 'cancellato').length;
  const inAttesa    = apMeseVis.filter(a => a.stato === 'in attesa').length;
  const confermati  = apMeseVis.filter(a => a.stato === 'confermato').length;
  const tassoCompletamento = apMeseVis.length > 0 ? Math.round((completati / apMeseVis.length) * 100) : 0;

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

  const ricavoMese = apMeseVis
    .filter(a => a.stato === 'completato')
    .reduce((acc, a) => acc + getPrezzoAp(a), 0);

  const ricavoConfermato = apMeseVis
    .filter(a => a.prezzo_confermato_flag)
    .reduce((acc, a) => acc + Number(a.prezzo_confermato), 0);

  const nuoviClienti = clienti.filter(c => {
    const d = new Date(c.created_at);
    return d.getMonth() === meseSel && d.getFullYear() === annoSel;
  }).length;

  // Trend 6 mesi — per l'operatore filtrato sui propri appuntamenti
  const trend6 = Array.from({ length: 6 }, (_, i) => {
    let m = meseSel - 5 + i;
    let y = annoSel;
    if (m < 0) { m += 12; y -= 1; }
    const apTutti = appuntamenti.filter(a => {
      const d = new Date(a.inizio);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const ap = !isAdmin && opCorrente
      ? apTutti.filter(a => a.operatori?.id === opCorrente.id)
      : apTutti;
    const ricavo = ap.filter(a => a.stato === 'completato')
      .reduce((acc, a) => acc + getPrezzoAp(a), 0);
    return {
      mese: MESI_SHORT[m],
      appuntamenti: ap.length,
      completati: ap.filter(a => a.stato === 'completato').length,
      ricavo: Math.round(ricavo),
    };
  });

  // Per operatore — l'operatore vede solo sé stesso, già selezionato
  const perOperatore = operatori.map((op, i) => {
    const apOp = apMese.filter(a => a.operatori?.id === op.id);
    return {
      id:         op.id,
      nome:       op.nome,
      totale:     apOp.length,
      completati: apOp.filter(a => a.stato === 'completato').length,
      colore:     op.colore || COLORI[i % COLORI.length],
    };
  }).filter(o => o.totale > 0).sort((a,b) => b.totale - a.totale);

  const maxOpTotale = Math.max(...perOperatore.map(o => o.totale), 1);

  // Per servizio — filtrato su apMeseVis
  const perServizio = servizi.map(s => {
    const apSv = apMeseVis.filter(a =>
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

  // ── Dati Prima Nota ──────────────────────────────────────────
  // Calcola incassi prima nota per un dato mese/anno
  const calcolaPrimaNotaMese = (m, y) => {
    const pnMese = primanota.filter(r => {
      const d = new Date(r.data);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const apMeseConf = apConf.filter(a => {
      const d = new Date(a.inizio);
      return d.getMonth() === m && d.getFullYear() === y;
    });

    let contanti = 0, pos = 0, ecc = 0, uscite = 0, versamenti = 0;
    // Toelettatura dagli appuntamenti confermati
    apMeseConf.forEach(a => {
      const imp = Number(a.prezzo_confermato || a.prezzo_proposto || 0);
      if (a.metodo_pagamento === 'pos') pos += imp;
      else contanti += imp;
    });
    // Movimenti manuali prima nota
    pnMese.forEach(r => {
      const imp = Number(r.importo || 0);
      if (r.tipo === 'pos')        pos += imp;
      else if (r.tipo === 'ecc')   ecc += imp;
      else if (r.tipo === 'uscita')     uscite += imp;
      else if (r.tipo === 'versamento') versamenti += imp;
    });
    return {
      contanti: Math.round(contanti),
      pos:      Math.round(pos),
      ecc:      Math.round(ecc),
      uscite:   Math.round(uscite),
      versamenti: Math.round(versamenti),
      incassi:  Math.round(contanti + pos + ecc),
      netto:    Math.round(contanti + pos + ecc - uscite - versamenti),
      cassa:    Math.round(contanti + ecc - uscite - versamenti),
    };
  };

  const pnMeseCorrente = calcolaPrimaNotaMese(meseSel, annoSel);

  // Trend 6 mesi prima nota
  const trend6PrimaNote = Array.from({ length: 6 }, (_, i) => {
    let m = meseSel - 5 + i;
    let y = annoSel;
    if (m < 0) { m += 12; y -= 1; }
    const dati = calcolaPrimaNotaMese(m, y);
    return { mese: MESI_SHORT[m], ...dati };
  });

  // Composizione incassi del mese per tipo
  const pieIncassi = [
    { name: 'Contanti', value: pnMeseCorrente.contanti, color: C.blue },
    { name: 'POS',      value: pnMeseCorrente.pos,      color: C.purple },
    { name: 'ECC',      value: pnMeseCorrente.ecc,      color: C.cyan },
  ].filter(p => p.value > 0);

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
    const dal = exportPeriodo === 'mese'
      ? new Date(annoSel, meseSel, 1).toISOString().split('T')[0]
      : (exportDal || '');
    const al = exportPeriodo === 'mese'
      ? new Date(annoSel, meseSel + 1, 0).toISOString().split('T')[0]
      : (exportAl || '');
    await exportExcelConPrimaNota(datiExport, apFiltrati, clienti, animali, periodoLabel, exportSel, dal, al);
    setExporting('');
  };

  const handleCSV = () => {
    setExporting('csv');
    setShowExportPanel(false);
    exportCSV(apFiltrati, periodoLabel);
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
    <div style={{ width: '100%' }}>

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
                  { k: 'primanota',    l: 'Prima Nota',             c: '#d97706' },
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
              <button onClick={handleCSV} disabled={!!exporting}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px', borderRadius: 13, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)', background: 'rgba(124,58,237,0.08)', opacity: exporting && exporting !== 'csv' ? 0.4 : 1 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M8 13h2m2 0h2M8 17h8"/></svg>
                {exporting === 'csv' ? 'Esporto...' : 'CSV appuntamenti'}
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

      {/* ── PRIMA NOTA: KPI MESE ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Prima Nota — {meseLabel}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Incassi totali',    value: pnMeseCorrente.incassi,    color: C.green,  icon: '💰' },
            { label: 'Netto (dopo uscite)', value: pnMeseCorrente.netto,   color: C.blue,   icon: '📊' },
            { label: 'Uscite / versamenti', value: pnMeseCorrente.uscite + pnMeseCorrente.versamenti, color: C.red, icon: '💸' },
            { label: 'Cassa contante',    value: pnMeseCorrente.cassa,      color: C.orange, icon: '🏦' },
          ].map(s => (
            <div key={s.label} style={{ ...glassCard, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: s.color, letterSpacing: '-0.5px' }}>
                  € {s.value.toLocaleString('it-IT')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Composizione incassi: barre orizzontali */}
        {pieIncassi.length > 0 && (
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Composizione incassi
            </div>
            {pieIncassi.map(p => (
              <BarraOrizzontale
                key={p.name}
                label={p.name}
                value={p.value}
                max={pnMeseCorrente.incassi}
                color={p.color}
                extra={`€ ${p.value.toLocaleString('it-IT')} · ${pnMeseCorrente.incassi > 0 ? Math.round(p.value / pnMeseCorrente.incassi * 100) : 0}%`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* ── PRIMA NOTA: TREND 6 MESI ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
      >
        <div style={secLabel}>Incassi Prima Nota — ultimi 6 mesi</div>
        <ResponsiveContainer width="100%" height={210}>
          <BarChart data={trend6PrimaNote} barGap={2} barSize={16}>
            <XAxis dataKey="mese" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={44}
              tickFormatter={v => `€${v}`} />
            <Tooltip content={<Tip />} formatter={(v, name) => [`€ ${v}`, name]} />
            <Bar dataKey="contanti"   name="Contanti"  fill={C.blue}   radius={[4,4,0,0]} />
            <Bar dataKey="pos"        name="POS"        fill={C.purple} radius={[4,4,0,0]} />
            <Bar dataKey="ecc"        name="ECC"        fill={C.cyan}   radius={[4,4,0,0]} />
            <Bar dataKey="uscite"     name="Uscite"     fill={C.red}    radius={[4,4,0,0]} fillOpacity={0.6} />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { c: C.blue,   l: 'Contanti' },
            { c: C.purple, l: 'POS' },
            { c: C.cyan,   l: 'ECC' },
            { c: C.red,    l: 'Uscite', op: 0.6 },
          ].map(({ c, l, op }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: c, opacity: op || 1 }} />
              {l}
            </div>
          ))}
        </div>

        {/* LineChart netto sovrapposto */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            Netto mensile (incassi − uscite)
          </div>
          <ResponsiveContainer width="100%" height={130}>
            <LineChart data={trend6PrimaNote}>
              <XAxis dataKey="mese" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={44}
                tickFormatter={v => `€${v}`} />
              <Tooltip content={<Tip />} formatter={v => [`€ ${v}`, 'Netto']} />
              <Line type="monotone" dataKey="netto" stroke={C.green} strokeWidth={2.5}
                dot={{ fill: C.green, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, fill: C.green }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ── OPERATORI ── */}
      {/* ── CARICO PER OPERATORE ── */}
      {perOperatore.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ ...glass, padding: '22px 24px', marginBottom: 14 }}
        >
          <div style={secLabel}>
            {isAdmin ? `Carico per operatore — ${meseLabel}` : `Le mie statistiche — ${meseLabel}`}
          </div>

          {/* Rings e barre — solo per admin */}
          {isAdmin && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {perOperatore.map(op => (
                  <div key={op.nome} onClick={() => setOpSelezionato(opSelezionato?.nome === op.nome ? null : op)}
                    style={{ cursor: 'pointer', opacity: opSelezionato && opSelezionato.nome !== op.nome ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                    <DonutRing
                      value={op.totale}
                      max={maxOpTotale}
                      color={op.colore}
                      size={100}
                      strokeWidth={11}
                      label={op.nome}
                      sublabel={`${op.completati} ok`}
                    />
                  </div>
                ))}
              </div>
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
          )}

          {/* ── DRILL-DOWN: admin → cliccabile, operatore → sempre aperto su sé stesso ── */}
          <AnimatePresence>
          {(() => {
            const soggetto = isAdmin ? opSelezionato : (opCorrente
              ? { ...opCorrente, totale: apMeseVis.length, completati: apMeseVis.filter(a => a.stato === 'completato').length }
              : null);
            if (!soggetto) return null;
            const apOp = apMese.filter(a => a.operatori?.id === soggetto.id || a.operatore_id === soggetto.id);
            const completatiOp = apOp.filter(a => a.stato === 'completato');
            const incassoOp = completatiOp.reduce((s,a) => s + Number(a.prezzo_confermato || a.prezzo_proposto || 0), 0);
            const mediaOp   = completatiOp.length > 0 ? incassoOp / completatiOp.length : 0;
            // Servizi più fatti da questo operatore
            const svCount = {};
            apOp.forEach(a => (a.appuntamenti_servizi||[]).forEach(s => {
              const n = s.servizi?.nome; if(n) svCount[n]=(svCount[n]||0)+1;
            }));
            const svTop = Object.entries(svCount).sort((a,b)=>b[1]-a[1]).slice(0,4);
            // Giorno della settimana più affollato
            const giorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
            const perGiorno = Array(7).fill(0);
            apOp.forEach(a => { perGiorno[new Date(a.inizio).getDay()]++; });
            const maxGiorno = Math.max(...perGiorno, 1);
            // Clienti serviti da questo operatore
            const clientiUnici = new Set(apOp.map(a => a.clienti?.id || a.cliente_id).filter(Boolean)).size;

            return (
              <motion.div
                key={soggetto.nome}
                initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ overflow:'hidden', marginTop:20 }}
              >
                <div style={{ borderTop:`2px solid ${soggetto.colore}30`, paddingTop:18 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
                    <div style={{ width:32, height:32, borderRadius:10, background:soggetto.colore,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:800, color:'#fff' }}>
                      {soggetto.nome[0]}
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
                      {soggetto.nome} — {meseLabel}
                    </div>
                    {/* Bottone chiudi — solo per admin */}
                    {isAdmin && (
                      <button onClick={() => setOpSelezionato(null)}
                        style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                          fontSize:18, color:'var(--text-muted)' }}>×</button>
                    )}
                  </div>

                  {/* KPI operatore */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom:16 }}>
                    {[
                      { label:'Appuntamenti', val: apOp.length,             color: soggetto.colore },
                      { label:'Completati',   val: completatiOp.length,     color:'#059669' },
                      { label:'Incasso',      val:`€${incassoOp.toFixed(0)}`,color:'#2563eb' },
                      { label:'Media/sessione',val:`€${mediaOp.toFixed(0)}`,  color:'#7c3aed' },
                      { label:'Clienti unici',val: clientiUnici,             color:'#d97706' },
                      { label:'In attesa',    val: apOp.filter(a=>a.stato==='in attesa').length, color:'#d97706' },
                      { label:'Cancellati',   val: apOp.filter(a=>a.stato==='cancellato').length, color:'#dc2626' },
                      { label:'Tasso OK',     val:`${apOp.length>0?Math.round(completatiOp.length/apOp.length*100):0}%`, color:'#059669' },
                    ].map(k => (
                      <div key={k.label} style={{ ...glassCard, padding:'10px 12px' }}>
                        <div style={{ fontSize:9, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:4 }}>{k.label}</div>
                        <div style={{ fontSize:18, fontWeight:800, color:k.color, letterSpacing:'-0.5px' }}>{k.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Distribuzione per giorno settimana */}
                  <div style={{ ...glassCard, padding:'14px 16px', marginBottom:12 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>
                      Distribuzione settimanale
                    </div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:50 }}>
                      {perGiorno.map((cnt, i) => (
                        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3, height:'100%', justifyContent:'flex-end' }}>
                          <div style={{ width:'100%', borderRadius:4, background: soggetto.colore,
                            height:`${(cnt/maxGiorno)*100}%`, minHeight: cnt>0?4:0, opacity: cnt>0?1:0.15 }}/>
                          <div style={{ fontSize:9, fontWeight:600, color:'var(--text-muted)' }}>{giorni[i]}</div>
                          {cnt > 0 && <div style={{ fontSize:9, fontWeight:700, color:soggetto.colore }}>{cnt}</div>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Servizi top */}
                  {svTop.length > 0 && (
                    <div style={{ ...glassCard, padding:'14px 16px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:10 }}>
                        Servizi più eseguiti
                      </div>
                      {svTop.map(([nome, cnt], i) => (
                        <div key={nome} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                          <div style={{ fontSize:12, color:'var(--text-secondary)', minWidth:16, fontWeight:700 }}>{i+1}.</div>
                          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)', flex:1 }}>{nome}</div>
                          <div style={{ fontSize:12, fontWeight:700, color:soggetto.colore,
                            background:`${soggetto.colore}18`, padding:'2px 8px', borderRadius:20 }}>{cnt}×</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })()}
          </AnimatePresence>
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

      {/* ── Previsioni & Trend ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginTop: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 14 }}>
          Previsioni &amp; Trend
        </div>

        {(() => {
          // ── Calcoli per le previsioni ────────────────────────────
          const oggi = new Date();
          const meseCorrente = oggi.getMonth();
          const annoCorrente = oggi.getFullYear();
          const giornoDelMese = oggi.getDate();
          const giorniNelMese = new Date(annoCorrente, meseCorrente + 1, 0).getDate();
          const frازioneMese = giornoDelMese / giorniNelMese;

          // Solo se siamo nel mese selezionato — altrimenti usa dati storici puri
          const èMeseCorrente = meseSel === meseCorrente && annoSel === annoCorrente;

          // Appuntamenti completati questo mese finora
          const apCompletatiMese = apMese.filter(a => a.stato === 'completato');
          const ricavoFinora = apCompletatiMese.reduce((acc, a) => acc + getPrezzoAp(a), 0);

          // Proiezione fine mese (solo se nel mese corrente e almeno 3 giorni di dati)
          const ricavoProiettato = èMeseCorrente && giornoDelMese >= 3 && frازioneMese > 0
            ? Math.round(ricavoFinora / frازioneMese)
            : null;

          // Appuntamenti futuri prenotati nel mese corrente (già in agenda)
          const apFuturi = appuntamenti.filter(a => {
            const d = new Date(a.inizio);
            return d.getMonth() === meseSel && d.getFullYear() === annoSel
              && d > oggi && a.stato !== 'cancellato';
          });
          const ricavoAtteso = apFuturi.reduce((acc, a) => acc + getPrezzoAp(a), 0);
          const ricavoTotaleAtteso = Math.round(ricavoFinora + ricavoAtteso);

          // Trend mese su mese (confronto con stesso mese anno precedente)
          const apMesePrecedente = appuntamenti.filter(a => {
            const d = new Date(a.inizio);
            const mp = meseSel === 0 ? 11 : meseSel - 1;
            const yp = meseSel === 0 ? annoSel - 1 : annoSel;
            return d.getMonth() === mp && d.getFullYear() === yp && a.stato === 'completato';
          });
          const ricavoMesePrecedente = apMesePrecedente.reduce((acc, a) => acc + getPrezzoAp(a), 0);
          const deltaMoM = ricavoMesePrecedente > 0
            ? Math.round(((ricavoFinora - ricavoMesePrecedente) / ricavoMesePrecedente) * 100)
            : null;

          // Clienti inattivi (>60gg senza appuntamenti completati)
          const soglia60 = new Date(oggi.getTime() - 60 * 24 * 60 * 60 * 1000);
          const ultimiApPerCliente = {};
          appuntamenti
            .filter(a => a.stato === 'completato' && a.clienti?.id)
            .forEach(a => {
              const cid = a.clienti.id;
              const d = new Date(a.inizio);
              if (!ultimiApPerCliente[cid] || d > ultimiApPerCliente[cid].data) {
                ultimiApPerCliente[cid] = { data: d, nome: `${a.clienti.cognome} ${a.clienti.nome}` };
              }
            });
          const inativiConNome = Object.values(ultimiApPerCliente)
            .filter(c => c.data < soglia60)
            .sort((a, b) => a.data - b.data)
            .slice(0, 5);
          const totInattivi = Object.values(ultimiApPerCliente).filter(c => c.data < soglia60).length;

          // Servizio con crescita più rapida (ultimi 3 mesi vs 3 mesi precedenti)
          const contaServizioPeriodo = (mesiIndietroStart, mesiIndietroEnd) => {
            const start = new Date(oggi); start.setMonth(start.getMonth() - mesiIndietroStart);
            const end   = new Date(oggi); end.setMonth(end.getMonth() - mesiIndietroEnd);
            const counts = {};
            appuntamenti
              .filter(a => { const d = new Date(a.inizio); return d >= start && d < end && a.stato === 'completato'; })
              .forEach(a => {
                (a.appuntamenti_servizi || []).forEach(r => {
                  const nome = r.servizi?.nome;
                  if (nome) counts[nome] = (counts[nome] || 0) + 1;
                });
              });
            return counts;
          };
          const recenti   = contaServizioPeriodo(3, 0);
          const precedenti = contaServizioPeriodo(6, 3);
          let servizioCrescita = null;
          let maxCrescita = 0;
          Object.entries(recenti).forEach(([nome, count]) => {
            const prec = precedenti[nome] || 0;
            if (prec > 0) {
              const delta = ((count - prec) / prec) * 100;
              if (delta > maxCrescita) { maxCrescita = delta; servizioCrescita = { nome, delta: Math.round(delta), count }; }
            } else if (count >= 2) {
              // Servizio nuovo con almeno 2 utilizzi
              if (count > maxCrescita) { maxCrescita = count; servizioCrescita = { nome, delta: null, count }; }
            }
          });

          // Giorno della settimana più trafficato (ultimi 3 mesi)
          const start3m = new Date(oggi); start3m.setMonth(start3m.getMonth() - 3);
          const conteggioGiorni = [0,0,0,0,0,0,0];
          appuntamenti
            .filter(a => new Date(a.inizio) >= start3m && a.stato !== 'cancellato')
            .forEach(a => { conteggioGiorni[new Date(a.inizio).getDay()]++; });
          const nomiGiorni = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab'];
          const giornoTop = conteggioGiorni.indexOf(Math.max(...conteggioGiorni));

          // Tasso cancellazioni mese
          const tassoCancellazioni = apMese.length > 0
            ? Math.round((apMese.filter(a => a.stato === 'cancellato').length / apMese.length) * 100)
            : 0;

          // Card stile KPI
          const CardPrevisione = ({ titolo, valore, sotto, colore, icona, highlight }) => (
            <div style={{
              background: highlight ? `linear-gradient(135deg, ${colore}18, ${colore}08)` : 'var(--card-bg)',
              border: `1px solid ${highlight ? colore + '35' : 'var(--card-border)'}`,
              borderRadius: 18, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 6 }}>{titolo}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: highlight ? colore : 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{valore}</div>
                  {sotto && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1.45 }}>{sotto}</div>}
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 11, background: colore + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {icona}
                </div>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* Riga 1: proiezione + atteso */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CardPrevisione
                  titolo="Proiezione fine mese"
                  valore={ricavoProiettato != null ? `€ ${ricavoProiettato.toLocaleString('it-IT')}` : '—'}
                  sotto={ricavoProiettato != null
                    ? `Basata su ${giornoDelMese} gg su ${giorniNelMese} (${Math.round(frازioneMese * 100)}% del mese)`
                    : 'Disponibile solo per il mese corrente'}
                  colore="#2060dd"
                  highlight={ricavoProiettato != null}
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2060dd" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
                />
                <CardPrevisione
                  titolo="Totale atteso mese"
                  valore={`€ ${ricavoTotaleAtteso.toLocaleString('it-IT')}`}
                  sotto={`€ ${Math.round(ricavoFinora).toLocaleString('it-IT')} incassati + € ${Math.round(ricavoAtteso).toLocaleString('it-IT')} in agenda`}
                  colore="#059669"
                  highlight={ricavoAtteso > 0}
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>}
                />
              </div>

              {/* Riga 2: trend MoM + cancellazioni */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CardPrevisione
                  titolo="Trend vs mese prec."
                  valore={deltaMoM != null ? `${deltaMoM > 0 ? '+' : ''}${deltaMoM}%` : '—'}
                  sotto={deltaMoM != null
                    ? `${deltaMoM >= 0 ? '↑ In crescita' : '↓ In calo'} rispetto a ${MESI_SHORT[meseSel === 0 ? 11 : meseSel - 1]}`
                    : 'Dati mese precedente insufficienti'}
                  colore={deltaMoM != null && deltaMoM >= 0 ? '#059669' : '#e85c3a'}
                  highlight={deltaMoM != null}
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={deltaMoM != null && deltaMoM >= 0 ? '#059669' : '#e85c3a'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>}
                />
                <CardPrevisione
                  titolo="Tasso cancellazioni"
                  valore={`${tassoCancellazioni}%`}
                  sotto={`${apMese.filter(a => a.stato === 'cancellato').length} canc. su ${apMese.length} ap. ${tassoCancellazioni > 15 ? '⚠️ Alto' : tassoCancellazioni > 8 ? '— Nella norma' : '✓ Ottimo'}`}
                  colore={tassoCancellazioni > 15 ? '#e85c3a' : tassoCancellazioni > 8 ? '#d97706' : '#059669'}
                  highlight={tassoCancellazioni > 15}
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={tassoCancellazioni > 15 ? '#e85c3a' : '#d97706'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>}
                />
              </div>

              {/* Giorno top + servizio in crescita */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <CardPrevisione
                  titolo="Giorno più trafficato"
                  valore={nomiGiorni[giornoTop]}
                  sotto={`${conteggioGiorni[giornoTop]} ap. negli ultimi 3 mesi — pianifica le risorse`}
                  colore="#a855f7"
                  highlight
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                />
                <CardPrevisione
                  titolo="Servizio in crescita"
                  valore={servizioCrescita ? servizioCrescita.nome : '—'}
                  sotto={servizioCrescita
                    ? servizioCrescita.delta != null
                      ? `+${servizioCrescita.delta}% vs trimestre prec. (${servizioCrescita.count} utilizzi)`
                      : `Nuovo — ${servizioCrescita.count} utilizzi negli ultimi 3 mesi`
                    : 'Dati insufficienti'}
                  colore="#f97316"
                  highlight={servizioCrescita != null}
                  icona={<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
                />
              </div>

              {/* Clienti inattivi */}
              {totInattivi > 0 && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 18, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: 3 }}>Clienti da richiamare</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <span style={{ fontWeight: 700, color: '#d97706' }}>{totInattivi}</span> clienti assenti da più di 60 giorni
                      </div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(217,119,6,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.72A2 2 0 012 .93h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/>
                      </svg>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {inativiConNome.map((c, i) => {
                      const giorni = Math.floor((oggi - c.data) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--card-bg-sm)', borderRadius: 12, border: '1px solid var(--card-border-sm)' }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.nome}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: giorni > 90 ? '#dc2626' : '#d97706', background: giorni > 90 ? 'rgba(220,38,38,0.08)' : 'rgba(217,119,6,0.08)', padding: '3px 8px', borderRadius: 8 }}>
                            {giorni} gg fa
                          </span>
                        </div>
                      );
                    })}
                    {totInattivi > 5 && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 4 }}>
                        + altri {totInattivi - 5} clienti inattivi
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          );
        })()}

      </motion.div>

    </div>
  );
}