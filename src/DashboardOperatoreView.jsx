/**
 * DashboardOperatoreView.jsx
 * Vista a schermo intero per gli operatori — appuntamenti del giorno
 * con pulsanti Inizia / Completa / Salta per lavorare senza navigare
 */

import { useState, useEffect, useRef } from 'react';
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

const STATI_COLORI = {
  confermato:  { bg:'rgba(37,99,235,0.12)',  text:'#2563eb',  label:'Confermato' },
  'in attesa': { bg:'rgba(217,119,6,0.12)',  text:'#d97706',  label:'In attesa'  },
  completato:  { bg:'rgba(5,150,105,0.12)',  text:'#059669',  label:'Completato' },
  cancellato:  { bg:'rgba(220,38,38,0.12)',  text:'#dc2626',  label:'Cancellato' },
  in_corso:    { bg:'rgba(124,58,237,0.12)', text:'#7c3aed',  label:'In corso'   },
};

const fmtOra = d => new Date(d).toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });

export default function DashboardOperatoreView({ role, session }) {
  const isAdmin = role === 'admin';

  const [operatori,     setOperatori]     = useState([]);
  const [opSel,         setOpSel]         = useState(null);
  const [appuntamenti,  setAppuntamenti]  = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [apInCorso,     setApInCorso]     = useState(null);
  const [tempoInCorso,  setTempoInCorso]  = useState(0);
  const [showDone,      setShowDone]      = useState(null);
  const [orari,         setOrari]         = useState([]);      // operatori_orari
  const [apSettimana,   setApSettimana]   = useState([]);      // ap settimana corrente
  const [apMese,        setApMese]        = useState([]);      // ap mese corrente
  const timerRef = useRef(null);

  // Carica operatori e, se non admin, auto-seleziona il proprio record
  // Dipende da session e isAdmin — entrambi arrivano dopo il mount iniziale
  useEffect(() => {
    if (!session?.user?.email) return; // sessione non ancora disponibile
    supabase.from('operatori').select('id,nome,cognome,colore,email').eq('attivo', true).order('nome')
      .then(({ data }) => {
        const lista = data || [];
        setOperatori(lista);
        // Auto-seleziona sempre l'operatore loggato:
        // - se è admin: mostra la schermata di selezione (opSel rimane null)
        // - se è operatore: selezione automatica sul proprio record
        if (!isAdmin && session?.user?.email) {
          const proprio = lista.find(op => op.email === session.user.email);
          if (proprio) setOpSel(proprio);
        }
      });
  }, [session, isAdmin]);

  // Carica appuntamenti del giorno + orari + dati saturazione
  useEffect(() => {
    if (!opSel) return;
    setLoading(true);
    const now    = new Date();

    // Giorno
    const inizioGiorno = new Date(now); inizioGiorno.setHours(0,0,0,0);
    const fineGiorno   = new Date(now); fineGiorno.setHours(23,59,59,999);

    // Settimana (Lun-Dom)
    const dayOfWeek    = now.getDay() === 0 ? 6 : now.getDay() - 1; // 0=lun
    const inizioSett   = new Date(now); inizioSett.setDate(now.getDate() - dayOfWeek); inizioSett.setHours(0,0,0,0);
    const fineSett     = new Date(inizioSett); fineSett.setDate(inizioSett.getDate() + 6); fineSett.setHours(23,59,59,999);

    // Mese
    const inizioMese   = new Date(now.getFullYear(), now.getMonth(), 1);
    const fineMese     = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    Promise.all([
      // Appuntamenti oggi
      supabase.from('appuntamenti')
        .select(`id, inizio, fine, stato, note,
          clienti(id, nome, cognome, telefono),
          animali(id, nome, specie, zone_critiche, problemi_carattere, comportamento),
          appuntamenti_servizi(servizi(nome))`)
        .eq('operatore_id', opSel.id)
        .gte('inizio', inizioGiorno.toISOString())
        .lte('inizio', fineGiorno.toISOString())
        .order('inizio'),

      // Appuntamenti settimana (solo id+inizio+fine+stato per saturazione)
      supabase.from('appuntamenti')
        .select('id, inizio, fine, stato')
        .eq('operatore_id', opSel.id)
        .neq('stato', 'cancellato')
        .gte('inizio', inizioSett.toISOString())
        .lte('inizio', fineSett.toISOString()),

      // Appuntamenti mese
      supabase.from('appuntamenti')
        .select('id, inizio, fine, stato')
        .eq('operatore_id', opSel.id)
        .neq('stato', 'cancellato')
        .gte('inizio', inizioMese.toISOString())
        .lte('inizio', fineMese.toISOString()),

      // Orari lavorativi operatore
      supabase.from('operatori_orari')
        .select('*')
        .eq('operatore_id', opSel.id)
        .eq('attivo', true),

    ]).then(([apOggi, apSett, apMeseRes, orariRes]) => {
      setAppuntamenti(apOggi.data || []);
      setApSettimana(apSett.data || []);
      setApMese(apMeseRes.data || []);
      setOrari(orariRes.data || []);
      setLoading(false);
    });
  }, [opSel]);

  // Timer per appuntamento in corso
  useEffect(() => {
    if (apInCorso) {
      timerRef.current = setInterval(() => setTempoInCorso(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setTempoInCorso(0);
    }
    return () => clearInterval(timerRef.current);
  }, [apInCorso]);

  const fmtTimer = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const aggiornaStato = async (apId, nuovoStato) => {
    await supabase.from('appuntamenti').update({ stato: nuovoStato }).eq('id', apId);
    setAppuntamenti(prev => prev.map(a => a.id === apId ? { ...a, stato: nuovoStato } : a));
  };

  const inizia = async (apId) => {
    setApInCorso(apId);
    await aggiornaStato(apId, 'in_corso');
  };

  const completa = async (apId) => {
    await aggiornaStato(apId, 'completato');
    setApInCorso(null);
    setShowDone(apId);
    setTimeout(() => setShowDone(null), 3000);
  };

  const salta = async (apId) => {
    if (!window.confirm('Segnare come "saltato" (cancellato)?')) return;
    await aggiornaStato(apId, 'cancellato');
    if (apInCorso === apId) setApInCorso(null);
  };

  const specieEmoji = s => s === 'gatto' ? '🐈' : s === 'coniglio' ? '🐇' : '🐕';

  // ── Selezione operatore — solo per admin ─────────────────
  if (!opSel) {
    // L'operatore non dovrebbe mai arrivare qui (auto-selezione al mount).
    // Se ci arriva significa che la sua email non è in tabella operatori.
    if (!isAdmin) {
      return (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
          style={{ padding:'0 0 2rem', width:'100%' }}>
          <div style={{ ...glass, padding:'32px 24px', textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
            <p style={{ margin:'0 0 8px', fontSize:15, fontWeight:700, color:'var(--text-primary)' }}>
              Profilo non trovato
            </p>
            <p style={{ margin:0, fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>
              Il tuo account non è ancora collegato a un operatore.<br/>
              Chiedi all'amministratore di aggiungere la tua email al tuo profilo operatore.
            </p>
          </div>
        </motion.div>
      );
    }
    return (
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
        style={{ padding:'0 0 2rem', width:'100%' }}>
        <div style={{ marginBottom:24 }}>
          <h1 style={{ fontSize:26, fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px', letterSpacing:'-0.5px' }}>
            👤 Dashboard Operatore
          </h1>
          <p style={{ fontSize:14, color:'var(--text-secondary)', margin:0 }}>
            Seleziona il tuo nome per vedere i tuoi appuntamenti di oggi
          </p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {operatori.map(op => (
            <motion.button key={op.id}
              whileTap={{ scale:0.97 }}
              onClick={() => setOpSel(op)}
              style={{ ...glass, padding:'18px 20px', display:'flex', alignItems:'center',
                gap:14, cursor:'pointer', border:'none', fontFamily:'inherit', textAlign:'left', width:'100%' }}>
              <div style={{ width:46, height:46, borderRadius:14, background:op.colore||'#2563eb',
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:18, fontWeight:800, color:'#fff', flexShrink:0,
                boxShadow:`0 4px 12px ${op.colore||'#2563eb'}44` }}>
                {op.nome[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)' }}>
                  {op.nome} {op.cognome}
                </div>
                <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
                  Tocca per vedere i tuoi appuntamenti
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Vista giornaliera operatore ──────────────────────────
  const apAttivi    = appuntamenti.filter(a => !['completato','cancellato'].includes(a.stato));
  const apCompletati= appuntamenti.filter(a => a.stato === 'completato');
  const progresso   = appuntamenti.length > 0
    ? Math.round((apCompletati.length / appuntamenti.length) * 100) : 0;

  // ── Calcolo saturazione ─────────────────────────────────────
  // Ore disponibili = somma ore lavorative per i giorni della settimana/mese con orari configurati
  const minutiAp = (lista) => lista.reduce((tot, a) => {
    const min = (new Date(a.fine) - new Date(a.inizio)) / 60000;
    return tot + Math.max(0, min);
  }, 0);

  // Settimana corrente: calcola minuti disponibili per i giorni Lun-Dom di questa settimana
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
  const inizioSett = new Date(now); inizioSett.setDate(now.getDate() - dayOfWeek); inizioSett.setHours(0,0,0,0);
  const minutiDisponibiliSett = Array.from({ length: 7 }, (_, i) => {
    const giorno = new Date(inizioSett); giorno.setDate(inizioSett.getDate() + i);
    const dow = giorno.getDay(); // 0=dom
    const orarioGiorno = orari.find(o => o.giorno_settimana === dow);
    if (!orarioGiorno) return 0;
    const [hi, mi] = orarioGiorno.ora_inizio.slice(0,5).split(':').map(Number);
    const [hf, mf] = orarioGiorno.ora_fine.slice(0,5).split(':').map(Number);
    return Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
  }).reduce((a, b) => a + b, 0);

  // Mese corrente: somma minuti per tutti i giorni lavorativi del mese
  const giorniDelMese = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const minutiDisponibiliMese = Array.from({ length: giorniDelMese }, (_, i) => {
    const giorno = new Date(now.getFullYear(), now.getMonth(), i + 1);
    const dow = giorno.getDay();
    const orarioGiorno = orari.find(o => o.giorno_settimana === dow);
    if (!orarioGiorno) return 0;
    const [hi, mi] = orarioGiorno.ora_inizio.slice(0,5).split(':').map(Number);
    const [hf, mf] = orarioGiorno.ora_fine.slice(0,5).split(':').map(Number);
    return Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
  }).reduce((a, b) => a + b, 0);

  // Oggi: minuti disponibili
  const orarioOggi = orari.find(o => o.giorno_settimana === now.getDay());
  const minutiDisponibiliOggi = orarioOggi ? (() => {
    const [hi, mi] = orarioOggi.ora_inizio.slice(0,5).split(':').map(Number);
    const [hf, mf] = orarioOggi.ora_fine.slice(0,5).split(':').map(Number);
    return Math.max(0, (hf * 60 + mf) - (hi * 60 + mi));
  })() : 0;
  const minutiImpegnatiOggi = minutiAp(appuntamenti.filter(a => a.stato !== 'cancellato'));

  const satOggi = minutiDisponibiliOggi > 0
    ? Math.min(100, Math.round(minutiImpegnatiOggi / minutiDisponibiliOggi * 100)) : 0;
  const satSett = minutiDisponibiliSett > 0
    ? Math.min(100, Math.round(minutiAp(apSettimana) / minutiDisponibiliSett * 100)) : 0;
  const satMese = minutiDisponibiliMese > 0
    ? Math.min(100, Math.round(minutiAp(apMese) / minutiDisponibiliMese * 100)) : 0;
  const percOreOggi = minutiDisponibiliOggi > 0
    ? Math.min(100, Math.round(minutiImpegnatiOggi / minutiDisponibiliOggi * 100)) : 0;

  const fmtOreMin = (min) => min >= 60
    ? `${Math.floor(min/60)}h${min%60>0?` ${min%60}m`:''}`
    : `${min}m`;

  const satColore = (pct) =>
    pct >= 90 ? '#dc2626' : pct >= 70 ? '#d97706' : '#059669';

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
      style={{ padding:'0 0 2rem', width:'100%' }}>

      {/* Header operatore */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <div style={{ width:42, height:42, borderRadius:13, background:opSel.colore||'#2563eb',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:16, fontWeight:800, color:'#fff',
          boxShadow:`0 4px 12px ${opSel.colore||'#2563eb'}44` }}>
          {opSel.nome[0]}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.3px' }}>
            {opSel.nome} {opSel.cognome}
          </div>
          <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
            {new Date().toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' })}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setOpSel(null); setApInCorso(null); }}
            style={{ background:'var(--card-bg-sm)', border:'1px solid var(--card-border-sm)',
              borderRadius:10, padding:'7px 12px', cursor:'pointer', fontFamily:'inherit',
              fontSize:12, fontWeight:600, color:'var(--text-secondary)' }}>
            Cambia
          </button>
        )}
      </div>

      {/* Barra progresso giornata */}
      <div style={{ ...glassCard, padding:'14px 16px', marginBottom:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>
            Progressi di oggi
          </span>
          <span style={{ fontSize:13, fontWeight:800, color: progresso === 100 ? '#059669' : 'var(--text-primary)' }}>
            {apCompletati.length}/{appuntamenti.length} completati
          </span>
        </div>
        <div style={{ height:8, borderRadius:99, background:'var(--card-border-sm)', overflow:'hidden' }}>
          <motion.div
            initial={{ width:0 }}
            animate={{ width:`${progresso}%` }}
            transition={{ duration:0.6, ease:[0.22,1,0.36,1] }}
            style={{ height:'100%', borderRadius:99,
              background: progresso===100
                ? 'linear-gradient(90deg,#34d399,#059669)'
                : `linear-gradient(90deg,${opSel.colore||'#2563eb'}99,${opSel.colore||'#2563eb'})` }}
          />
        </div>
        {progresso === 100 && (
          <div style={{ fontSize:12, color:'#059669', fontWeight:600, marginTop:6, textAlign:'center' }}>
            🎉 Tutti gli appuntamenti completati!
          </div>
        )}
      </div>

      {/* ── Riquadro saturazione ── */}
      {orari.length > 0 && (
        <motion.div initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
          transition={{ delay:0.1 }}
          style={{ ...glassCard, padding:'16px', marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:14 }}>
            Saturazione
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'space-between' }}>
            {[
              { label:'Oggi',        pct: satOggi, sub: `${fmtOreMin(minutiImpegnatiOggi)} / ${fmtOreMin(minutiDisponibiliOggi)}` },
              { label:'Settimana',   pct: satSett, sub: `${fmtOreMin(minutiAp(apSettimana))} / ${fmtOreMin(minutiDisponibiliSett)}` },
              { label:'Mese',        pct: satMese, sub: `${fmtOreMin(minutiAp(apMese))} / ${fmtOreMin(minutiDisponibiliMese)}` },
            ].map(({ label, pct, sub }) => {
              const colore = satColore(pct);
              const r = 28, stroke = 6;
              const circ = 2 * Math.PI * r;
              const dash = (pct / 100) * circ;
              return (
                <div key={label} style={{ flex:1, display:'flex', flexDirection:'column',
                  alignItems:'center', gap:6 }}>
                  {/* Ring SVG */}
                  <div style={{ position:'relative', width:72, height:72 }}>
                    <svg width={72} height={72} viewBox="0 0 72 72">
                      {/* Track */}
                      <circle cx={36} cy={36} r={r}
                        fill="none"
                        stroke="var(--card-border-sm)"
                        strokeWidth={stroke}
                      />
                      {/* Progress */}
                      <motion.circle
                        cx={36} cy={36} r={r}
                        fill="none"
                        stroke={colore}
                        strokeWidth={stroke}
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ - dash }}
                        transition={{ duration: 0.8, ease: [0.22,1,0.36,1], delay: 0.2 }}
                        transform="rotate(-90 36 36)"
                      />
                    </svg>
                    {/* Percentuale centrale */}
                    <div style={{ position:'absolute', inset:0,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      flexDirection:'column' }}>
                      <span style={{ fontSize:15, fontWeight:800, color:colore,
                        lineHeight:1, letterSpacing:'-0.5px' }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                  {/* Label */}
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text-secondary)',
                    textAlign:'center' }}>
                    {label}
                  </div>
                  {/* Ore impegnate / disponibili */}
                  <div style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center',
                    lineHeight:1.4 }}>
                    {sub}
                  </div>
                </div>
              );
            })}
          </div>
          {orari.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text-muted)', textAlign:'center',
              padding:'8px 0' }}>
              Configura gli orari in Impostazioni → Operatori per vedere la saturazione
            </div>
          )}
        </motion.div>
      )}

      {/* Timer appuntamento in corso */}
      <AnimatePresence>
        {apInCorso && (
          <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
            style={{ overflow:'hidden', marginBottom:12 }}>
            <div style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.3)',
              borderRadius:14, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ fontSize:24, fontWeight:800, color:'#7c3aed', fontVariantNumeric:'tabular-nums', letterSpacing:'-1px' }}>
                {fmtTimer(tempoInCorso)}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700, color:'#7c3aed' }}>⏱ In corso</div>
                <div style={{ fontSize:11, color:'rgba(124,58,237,0.7)' }}>
                  {(() => { const a = appuntamenti.find(x=>x.id===apInCorso); return a?.animali?.nome || ''; })()}
                </div>
              </div>
              <button onClick={() => completa(apInCorso)}
                style={{ background:'linear-gradient(145deg,#34d399,#059669)', border:'none',
                  borderRadius:10, padding:'8px 16px', cursor:'pointer', color:'#fff',
                  fontFamily:'inherit', fontSize:13, fontWeight:700 }}>
                ✓ Completa
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast completamento */}
      <AnimatePresence>
        {showDone && (
          <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-10 }}
            style={{ background:'rgba(5,150,105,0.12)', border:'1px solid rgba(5,150,105,0.3)',
              borderRadius:14, padding:'10px 16px', marginBottom:12, fontSize:13,
              fontWeight:600, color:'#059669', textAlign:'center' }}>
            ✅ Appuntamento completato!
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'var(--text-muted)', fontSize:14 }}>
          Caricamento...
        </div>
      ) : appuntamenti.length === 0 ? (
        <div style={{ ...glass, padding:'40px 20px', textAlign:'center' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🌿</div>
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>
            Nessun appuntamento oggi
          </div>
          <div style={{ fontSize:13, color:'var(--text-secondary)' }}>Giornata libera!</div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          {/* Attivi */}
          {apAttivi.map(ap => {
            const isInCorso  = apInCorso === ap.id;
            const statoMeta  = STATI_COLORI[ap.stato] || STATI_COLORI.confermato;
            const zoneCrit   = ap.animali?.zone_critiche || [];
            const comp       = ap.animali?.comportamento || {};
            const hasWarning = Object.values(comp).some(v => v === 'rosso');

            return (
              <motion.div key={ap.id}
                layout
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                style={{ ...glass, padding:'16px 18px',
                  border: isInCorso ? '2px solid rgba(124,58,237,0.5)' : '1px solid var(--card-border)',
                  background: isInCorso ? 'rgba(124,58,237,0.06)' : 'var(--card-bg)' }}>

                {/* Ora + stato */}
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                  <div style={{ minWidth:44 }}>
                    <div style={{ fontSize:15, fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>
                      {fmtOra(ap.inizio)}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text-muted)' }}>{fmtOra(ap.fine)}</div>
                  </div>
                  <div style={{ width:3, height:36, borderRadius:99, background:opSel.colore||'#2563eb', flexShrink:0 }}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:15, fontWeight:700, color:'var(--text-primary)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {ap.animali ? `${specieEmoji(ap.animali.specie)} ${ap.animali.nome}` : '—'}
                    </div>
                    <div style={{ fontSize:12, color:'var(--text-secondary)',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {ap.clienti ? `${ap.clienti.cognome} ${ap.clienti.nome}` : ''}
                      {ap.appuntamenti_servizi?.length > 0
                        ? ' · ' + ap.appuntamenti_servizi.map(s=>s.servizi?.nome).filter(Boolean).join(', ')
                        : ''}
                    </div>
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:20,
                    background:statoMeta.bg, color:statoMeta.text, flexShrink:0 }}>
                    {isInCorso ? '● In corso' : statoMeta.label}
                  </div>
                </div>

                {/* Warning comportamento */}
                {hasWarning && (
                  <div style={{ background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)',
                    borderRadius:10, padding:'7px 10px', marginBottom:10,
                    fontSize:12, color:'#dc2626', fontWeight:600 }}>
                    ⚠️ Attenzione: {Object.entries(comp).filter(([,v])=>v==='rosso')
                      .map(([k]) => ({
                        reattivita_cani:'reattivo con cani', reattivita_estranei:'reattivo con estranei',
                        stress_bagno:'stress bagno', stress_asciugatura:'stress asciugatura',
                        rischio_morso:'rischio morso', collaborazione:'poca collaborazione'
                      }[k] || k)).join(', ')}
                  </div>
                )}

                {/* Zone critiche */}
                {zoneCrit.length > 0 && (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:10 }}>
                    {zoneCrit.slice(0,3).map((z,i) => (
                      <span key={i} style={{ fontSize:11, fontWeight:600, padding:'3px 8px', borderRadius:20,
                        background:'rgba(217,119,6,0.1)', color:'#d97706', border:'1px solid rgba(217,119,6,0.25)' }}>
                        ⚡ {z.zona || z}
                      </span>
                    ))}
                    {zoneCrit.length > 3 && (
                      <span style={{ fontSize:11, color:'var(--text-muted)' }}>+{zoneCrit.length-3} altre</span>
                    )}
                  </div>
                )}

                {/* Note */}
                {ap.note && (
                  <div style={{ fontSize:12, color:'var(--text-secondary)', marginBottom:10,
                    background:'var(--card-bg-sm)', borderRadius:8, padding:'6px 10px', lineHeight:1.5 }}>
                    📝 {ap.note}
                  </div>
                )}

                {/* Contatto cliente */}
                {ap.clienti?.telefono && (
                  <div style={{ marginBottom:10 }}>
                    <a href={`tel:${ap.clienti.telefono}`}
                      style={{ fontSize:12, color:'#2563eb', fontWeight:600, textDecoration:'none',
                        display:'inline-flex', alignItems:'center', gap:4 }}>
                      📞 {ap.clienti.telefono}
                    </a>
                  </div>
                )}

                {/* Bottoni azione */}
                <div style={{ display:'flex', gap:8 }}>
                  {!isInCorso && ap.stato !== 'cancellato' && (
                    <button onClick={() => inizia(ap.id)}
                      style={{ flex:2, padding:'10px', borderRadius:12, cursor:'pointer',
                        fontFamily:'inherit', fontSize:13, fontWeight:700, border:'none',
                        background:`linear-gradient(145deg,${opSel.colore||'#2563eb'}cc,${opSel.colore||'#2563eb'})`,
                        color:'#fff', boxShadow:`0 4px 12px ${opSel.colore||'#2563eb'}44` }}>
                      ▶ Inizia
                    </button>
                  )}
                  {isInCorso && (
                    <button onClick={() => completa(ap.id)}
                      style={{ flex:2, padding:'10px', borderRadius:12, cursor:'pointer',
                        fontFamily:'inherit', fontSize:13, fontWeight:700, border:'none',
                        background:'linear-gradient(145deg,#34d399,#059669)',
                        color:'#fff', boxShadow:'0 4px 12px rgba(5,150,105,0.4)' }}>
                      ✓ Completa
                    </button>
                  )}
                  <button onClick={() => salta(ap.id)}
                    style={{ flex:1, padding:'10px', borderRadius:12, cursor:'pointer',
                      fontFamily:'inherit', fontSize:13, fontWeight:600,
                      background:'rgba(220,38,38,0.08)', border:'1px solid rgba(220,38,38,0.2)',
                      color:'#dc2626' }}>
                    Salta
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Completati */}
          {apCompletati.length > 0 && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', letterSpacing:'0.5px',
                textTransform:'uppercase', marginBottom:8, padding:'0 4px' }}>
                ✅ Completati ({apCompletati.length})
              </div>
              {apCompletati.map(ap => (
                <div key={ap.id} style={{ ...glassCard, padding:'12px 16px', marginBottom:6,
                  opacity:0.65, display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#059669', minWidth:44 }}>
                    {fmtOra(ap.inizio)}
                  </div>
                  <div style={{ width:3, height:28, borderRadius:99, background:'#059669', flexShrink:0 }}/>
                  <div style={{ fontSize:13, color:'var(--text-secondary)' }}>
                    {ap.animali ? `${specieEmoji(ap.animali.specie)} ${ap.animali.nome}` : '—'}
                    {ap.clienti ? ` — ${ap.clienti.cognome}` : ''}
                  </div>
                  <div style={{ marginLeft:'auto', fontSize:11, fontWeight:700, padding:'2px 8px',
                    borderRadius:20, background:'rgba(5,150,105,0.12)', color:'#059669' }}>
                    ✓
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}