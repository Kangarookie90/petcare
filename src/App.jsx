import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from './supabaseClient';
import { APP_VERSION, BUILD_DATE } from './version';
import LoginView from './LoginView';
import PetView from './PetView';
import ClientiView from './ClientiView';
import CalendarioView from './CalendarioView';
import StatisticheView from './StatisticheView';
import OperatoriView from './OperatoriView';
import OfflineIndicator from './OfflineIndicator';
import PrimanotaView from './PrimanotaView';
import ProssimiView from './ProssimiView';
import RicercaGlobale from './RicercaGlobale';
import ProfiloView from './ProfiloView';
import SocialView from './SocialView';
import DashboardOperatoreView from './DashboardOperatoreView';
import ListaAttesaView from './ListaAttesaView';
import {
  useNotifiche,
  NotificaToast,
  NotifichePanel,
  CampanellaNotifiche,
} from './NotifichePanel';

// ── Varianti animazione pagine ──────────────────────────────
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, transition: { duration: 0.12, ease: 'easeIn' } },
};

// ── Varianti staggered list ─────────────────────────────────
const listVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

const NAV_ITEMS = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 10.5L12 4l8 6.5V20a1.5 1.5 0 01-1.5 1.5h-4V15h-5v6.5H5A1.5 1.5 0 014 20v-9.5z"/>
      </svg>
    ),
  },
  {
    id: "calendario",
    label: "Calendario",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="16" rx="3"/>
        <path d="M16 3v4M8 3v4M3 11h18"/>
        <path d="M8 15h2M8 18h2M13 15h3M13 18h3"/>
      </svg>
    ),
  },
  {
    id: "prossimi",
    label: "Prossimi",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <path d="M12 7.5V12l3 3"/>
        <path d="M17.5 4.5l.5.5"/>
      </svg>
    ),
  },
  {
    id: "clienti",
    label: "Clienti",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8.5" cy="7" r="3.5"/>
        <path d="M2 20v-1.5A4.5 4.5 0 016.5 14h4A4.5 4.5 0 0115 18.5V20"/>
        <path d="M16 3.5a3.5 3.5 0 010 7"/>
        <path d="M20 20v-1a3.5 3.5 0 00-3.5-3.5"/>
      </svg>
    ),
  },
  {
    id: "pet",
    label: "Pet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="9" cy="5" rx="2" ry="3"/>
        <ellipse cx="15" cy="5" rx="2" ry="3"/>
        <ellipse cx="5" cy="12" rx="2.5" ry="3"/>
        <ellipse cx="19" cy="12" rx="2.5" ry="3"/>
        <path d="M12 10c-4 0-6 2.5-6 5 0 3.5 3 5 6 5s6-1.5 6-5c0-2.5-2-5-6-5z"/>
      </svg>
    ),
  },
  {
    id: "statistiche",
    label: "Statistiche",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V14"/>
        <path d="M9 20V9"/>
        <path d="M14 20V12"/>
        <path d="M19 20V5"/>
        <path d="M4 11l5-5 5 4 5-5"/>
      </svg>
    ),
  },
  {
    id: "primanota",
    label: "Prima Nota",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2.5H6A1.5 1.5 0 004.5 4v16A1.5 1.5 0 006 21.5h12A1.5 1.5 0 0019.5 20V8L14 2.5z"/>
        <path d="M14 2.5V8H19.5"/>
        <path d="M12 13v4M10 15h4"/>
      </svg>
    ),
  },
  {
    id: "operatori",
    label: "Operatori",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="6" r="3"/>
        <path d="M7 21v-1a5 5 0 0110 0v1"/>
        <path d="M8 11l-1 3h10l-1-3"/>
        <path d="M10 11V9.5M14 11V9.5"/>
        <rect x="10.5" y="14" width="3" height="2.5" rx="0.5"/>
      </svg>
    ),
  },
  {
    id: "profilo",
    label: "Profilo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5"/>
        <path d="M5 20v-1a7 7 0 0114 0v1"/>
      </svg>
    ),
  },
  {
    id: "social",
    label: "Social",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/>
        <circle cx="6" cy="12" r="3"/>
        <circle cx="18" cy="19" r="3"/>
        <path d="M8.7 10.7l6.6-3.4M8.7 13.3l6.6 3.4"/>
      </svg>
    ),
  },
  {
    id: "dashboard_op",
    label: "Dashboard Op.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="9" rx="2"/>
        <rect x="14" y="3" width="7" height="5" rx="2"/>
        <rect x="14" y="12" width="7" height="9" rx="2"/>
        <rect x="3" y="16" width="7" height="5" rx="2"/>
      </svg>
    ),
  },
  {
    id: "lista_attesa",
    label: "Lista Attesa",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
        <path d="M20 8h2M21 7v2"/>
      </svg>
    ),
  },
];



function HomeView() {
  const [dati, setDati] = useState({ operatori: [], appuntamenti: [], totaleOggi: 0, inAttesa: 0, totaleClienti: 0 });
  const [loading, setLoading] = useState(true);
  const [inattivi, setInattivi] = useState([]);

  useEffect(() => {
    const load = async () => {
      const oggi = new Date();
      const inizioGiorno = new Date(oggi.setHours(0,0,0,0)).toISOString();
      const fineGiorno   = new Date(oggi.setHours(23,59,59,999)).toISOString();
      const soglia60     = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const [opRes, apRes, clRes, apTuttiRes] = await Promise.all([
        supabase.from("operatori").select("id,nome,cognome,colore").eq("attivo", true).order("nome"),
        supabase.from("appuntamenti").select(`
          id, inizio, fine, stato,
          clienti(nome, cognome),
          animali(nome, specie),
          operatori(id, nome, colore),
          appuntamenti_servizi(servizi(nome))
        `).gte("inizio", inizioGiorno).lte("inizio", fineGiorno).order("inizio"),
        supabase.from("clienti").select("id", { count: "exact", head: true }),
        supabase.from("appuntamenti").select("id, inizio, clienti(id, nome, cognome, telefono), animali(nome)").order("inizio", { ascending: false }),
      ]);

      const ops = opRes.data || [];
      const aps = apRes.data || [];
      const maxAp = Math.max(...ops.map(op => aps.filter(a => a.operatori?.id === op.id).length), 1);

      // Calcola clienti inattivi da >60 giorni
      const tuttiAp = apTuttiRes.data || [];
      const ultimoPerCliente = {};
      tuttiAp.forEach(a => {
        const cid = a.clienti?.id;
        if (!cid) return;
        if (!ultimoPerCliente[cid] || new Date(a.inizio) > new Date(ultimoPerCliente[cid].inizio)) {
          ultimoPerCliente[cid] = a;
        }
      });
      const listaInattivi = Object.values(ultimoPerCliente)
        .filter(a => new Date(a.inizio) < new Date(soglia60))
        .sort((a, b) => new Date(a.inizio) - new Date(b.inizio));
      setInattivi(listaInattivi);

      setDati({
        operatori: ops.map(op => ({
          ...op,
          appuntamentiOggi: aps.filter(a => a.operatori?.id === op.id).length,
          maxAp,
        })),
        appuntamenti: aps,
        totaleOggi: aps.length,
        inAttesa: aps.filter(a => a.stato === "in attesa").length,
        totaleClienti: clRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const ora = new Date().getHours();
  const saluto = ora < 12 ? "Buongiorno" : ora < 18 ? "Buon pomeriggio" : "Buonasera";
  const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  const specieEmoji = s => s === "gatto" ? "🐈" : "🐕";
  const COLORI_STATI = { confermato: "#2563eb", "in attesa": "#d97706", completato: "#059669", cancellato: "#dc2626" };

  return (
    <motion.div style={{ padding: "0 0 2rem", width: "100%" }}
      variants={listVariants} initial="initial" animate="animate">

      {/* Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 4px", textTransform: "capitalize", fontWeight: 500 }}>{oggi}</p>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.6px" }}>
          {saluto}!
        </h1>
      </motion.div>

      {/* KPI cards */}
      <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { value: loading ? "-" : dati.totaleOggi,    label: "appuntamenti",  sub: "oggi",       accent: "#2563eb", icon: "📅" },
          { value: loading ? "-" : dati.inAttesa,      label: "in attesa",     sub: "da confermare", accent: "#d97706", icon: "⏳" },
          { value: loading ? "-" : dati.totaleClienti, label: "clienti",       sub: "registrati", accent: "#059669", icon: "👤" },
        ].map((s) => (
          <motion.div key={s.label}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 20, padding: "16px 12px", textAlign: "center", boxShadow: "var(--card-shadow)", cursor: "default", position: "relative", overflow: "hidden" }}
          >
            {/* Background accent circle */}
            <div style={{ position: "absolute", top: -14, right: -14, width: 60, height: 60, borderRadius: "50%", background: s.accent + "18" }} />
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <p style={{ fontSize: 28, fontWeight: 800, color: s.accent, margin: 0, lineHeight: 1, letterSpacing: "-1px" }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "var(--text-primary)", margin: "4px 0 0", fontWeight: 600 }}>{s.label}</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "1px 0 0" }}>{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Operatori */}
      <motion.p variants={itemVariants} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", margin: "0 2px 10px", letterSpacing: "0.6px", textTransform: "uppercase" }}>
        Operatori oggi
      </motion.p>
      <motion.div variants={listVariants} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0" }}>Caricamento...</div>
        ) : dati.operatori.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0" }}>Nessun operatore attivo</div>
        ) : dati.operatori.map((op) => {
          const pct = op.maxAp > 0 ? (op.appuntamentiOggi / op.maxAp) * 100 : 0;
          const colore = op.colore || "#2563eb";
          return (
            <motion.div key={op.id} variants={itemVariants}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{ background: "var(--card-bg-sm)", border: "1px solid var(--card-border-sm)", borderRadius: 16, padding: "13px 15px", boxShadow: "var(--card-shadow-sm)" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                {/* Avatar */}
                <div style={{ width: 38, height: 38, borderRadius: 12, background: colore, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", flexShrink: 0, boxShadow: "0 3px 10px " + colore + "55" }}>
                  {op.nome[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{op.nome} {op.cognome}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
                    {op.appuntamentiOggi} appuntament{op.appuntamentiOggi === 1 ? "o" : "i"} oggi
                  </p>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colore }}>
                  {op.appuntamentiOggi}
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: 5, borderRadius: 99, background: colore + "20", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: pct + "%" }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
                  style={{ height: "100%", borderRadius: 99, background: colore, boxShadow: "0 0 6px " + colore + "80" }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Appuntamenti di oggi */}
      <motion.p variants={itemVariants} style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", margin: "0 2px 10px", letterSpacing: "0.6px", textTransform: "uppercase" }}>
        Appuntamenti di oggi
      </motion.p>
      <motion.div variants={listVariants} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          <div style={{ fontSize: 13, color: "var(--text-muted)", padding: "16px 0" }}>Caricamento...</div>
        ) : dati.appuntamenti.length === 0 ? (
          <motion.div variants={itemVariants} style={{ background: "var(--card-bg-sm)", border: "1px solid var(--card-border-sm)", borderRadius: 16, padding: "24px", textAlign: "center", boxShadow: "var(--card-shadow-sm)" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🌿</div>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Nessun appuntamento oggi</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-muted)" }}>Giornata libera!</p>
          </motion.div>
        ) : dati.appuntamenti.map((a, i) => {
          const ora = new Date(a.inizio).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          const oraFine = new Date(a.fine).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
          const colore = a.operatori?.colore || "#2563eb";
          const statoColore = COLORI_STATI[a.stato] || "#2563eb";
          return (
            <motion.div key={a.id} variants={itemVariants}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              style={{ background: "var(--card-bg-sm)", border: "1px solid var(--card-border-sm)", borderRadius: 16, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--card-shadow-sm)" }}
            >
              {/* Ora */}
              <div style={{ minWidth: 44, textAlign: "center", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{ora}</p>
                <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>{oraFine}</p>
              </div>
              {/* Barra colore operatore */}
              <div style={{ width: 3, height: 40, borderRadius: 99, background: colore, flexShrink: 0 }} />
              {/* Avatar animale */}
              <div style={{ width: 36, height: 36, borderRadius: 12, background: colore + "18", border: "1px solid " + colore + "30", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                {a.animali ? specieEmoji(a.animali.specie) : "🐾"}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.animali?.nome || "Animale"} — {(a.appuntamenti_servizi?.[0]?.servizi?.nome) || 'Servizio'}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {a.clienti ? a.clienti.cognome + " " + a.clienti.nome : ""}{a.operatori ? " · " + a.operatori.nome : ""}
                </p>
              </div>
              {/* Badge stato */}
              <div style={{ fontSize: 10, fontWeight: 700, background: statoColore + "18", color: statoColore, padding: "3px 9px", borderRadius: 20, flexShrink: 0, whiteSpace: "nowrap" }}>
                {a.stato}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Clienti inattivi da >60 giorni ── */}
      {inattivi.length > 0 && (
        <motion.div variants={itemVariants} style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
              Clienti inattivi — oltre 60 giorni
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(217,119,6,0.12)', color: '#d97706', padding: '2px 8px', borderRadius: 20 }}>
              {inattivi.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {inattivi.map((a) => {
              const giorni = Math.floor((Date.now() - new Date(a.inizio).getTime()) / (1000 * 60 * 60 * 24));
              const tel = a.clienti?.telefono;
              return (
                <motion.div key={a.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 16, padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Avatar */}
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(217,119,6,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
                    🐾
                  </div>
                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {a.clienti?.nome} {a.clienti?.cognome}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {a.animali?.nome && <span>🐶 {a.animali.nome}</span>}
                      <span>Ultimo: {new Date(a.inizio).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  {/* Giorni + contatta */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: giorni > 120 ? '#dc2626' : '#d97706', background: giorni > 120 ? 'rgba(220,38,38,0.1)' : 'rgba(217,119,6,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                      {giorni}gg
                    </span>
                    {tel && (
                      <a href={`tel:${tel}`}
                        style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: 'rgba(37,99,235,0.08)', padding: '4px 10px', borderRadius: 10, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.12 1.18 2 2 0 012.11 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.09a16 16 0 006 6l.45-.45a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                        </svg>
                        Chiama
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

    </motion.div>
  );
}

function PlaceholderView({ title, description }) {
  return (
    <motion.div
      variants={pageVariants} initial="initial" animate="animate" exit="exit"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center", padding: "2rem" }}
    >
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 10px" }}>{title}</h2>
      <p style={{ fontSize: 15, color: "var(--text-secondary)", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>{description}</p>
    </motion.div>
  );
}

export default function App() {
  const [active, setActive] = useState("home");
  const [navHidden, setNavHidden] = useState(false);
  const [navDrawerOpen, setNavDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showRicerca,    setShowRicerca]    = useState(false);
  const [pendingPetId,   setPendingPetId]   = useState(null);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [showEasterEgg,  setShowEasterEgg]  = useState(false);
  const [session, setSession] = useState(undefined);

  // ── Notifiche: DEVE stare qui, prima di qualsiasi return condizionale ──
  const { notifiche, nonLette, nuovaToast, marcaLette } = useNotifiche();

  // ── Auth: carica sessione iniziale e ascolta cambiamenti ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cmd+K / Ctrl+K apre la ricerca globale
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowRicerca(v => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Forza resize su FullCalendar dopo la transizione sidebar (310ms = durata CSS)
  useEffect(() => {
    const t = setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
    return () => clearTimeout(t);
  }, [sidebarCollapsed]);

  // Loading iniziale mentre Supabase verifica la sessione
  if (session === undefined) {
    return (
      <>
        <div className="app-bg" />
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(37,99,235,0.6)" strokeWidth="2.5" strokeLinecap="round"
            style={{ animation: 'spin 0.8s linear infinite' }}>
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/>
            <path d="M21 12a9 9 0 00-9-9"/>
          </svg>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  // Non autenticato → mostra login
  if (!session) {
    return (
      <>
        <div className="app-bg" />
        <LoginView />
      </>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleNav = (id) => {
    setActive(id);
  };

  const renderView = () => {
    switch (active) {
      case "home":       return <HomeView key="home" />;
      case "calendario": return <CalendarioView />;
      case "prossimi":   return <ProssimiView key="prossimi" />;
      case "clienti":    return <ClientiView key="clienti" onNavigateToPet={(id) => { setPendingPetId(id); setActive('pet'); }} />;
      case "pet":        return <PetView key="pet" initialPetId={pendingPetId} onPetOpened={() => setPendingPetId(null)} />;
      case "operatori":    return <OperatoriView key="operatori" />;
      case "statistiche":  return <StatisticheView key="statistiche" />;
      case "primanota":    return <PrimanotaView key="primanota" />;
      case "profilo":      return <ProfiloView key="profilo" />;
      case "social":       return <SocialView key="social" />;
      case "dashboard_op": return <DashboardOperatoreView key="dashboard_op" />;
      case "lista_attesa": return <ListaAttesaView key="lista_attesa" onNavigateToCalendario={() => setActive('calendario')} />;
      default:           return null;
    }
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── LIGHT MODE ── */
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
          background: #dde8f8;
        }
        .app-bg {
          position: fixed; inset: 0; z-index: 0;
          background:
            radial-gradient(ellipse 55% 45% at 15% 15%, rgba(160,200,255,0.9) 0%, transparent 60%),
            radial-gradient(ellipse 50% 55% at 85% 10%, rgba(190,220,255,0.75) 0%, transparent 55%),
            radial-gradient(ellipse 65% 50% at 55% 85%, rgba(150,195,250,0.65) 0%, transparent 60%),
            linear-gradient(145deg, #bdd6ff 0%, #d4e6ff 40%, #a8c8ff 100%);
        }
        .sidebar {
          background: rgba(200,220,255,0.5);
          border-right: 1px solid rgba(255,255,255,0.75);
          box-shadow: 2px 0 24px rgba(80,120,200,0.1);
        }
        @supports not (backdrop-filter: blur(1px)) {
          .sidebar { background: rgba(200,220,255,0.95); }
          .bottom-nav { background: rgba(210,228,255,0.97); }
        }
        .sidebar-logo { color: #081840; }
        .sidebar-item { color: rgba(20,50,120,0.5); }
        .sidebar-item:hover { background: rgba(255,255,255,0.4); color: rgba(15,40,110,0.85); }
        .sidebar-item.active {
          background: rgba(255,255,255,0.65);
          border: 1px solid rgba(255,255,255,0.85);
          color: #0f2050;
          box-shadow: 0 2px 0 rgba(255,255,255,0.92) inset, 0 4px 16px rgba(60,100,200,0.15);
        }
        .bottom-nav {
          background: rgba(210,228,255,0.62);
          border: 1px solid rgba(255,255,255,0.82);
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset, 0 16px 48px rgba(60,100,200,0.22);
        }
        .nav-item { color: rgba(20,60,140,0.55); }
        .nav-item.active {
          background: rgba(255,255,255,0.65);
          color: #0a1e5e;
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset;
        }

        /* ── DARK MODE ── */
        @media (prefers-color-scheme: dark) {
          body { background: #0c1628; }
          .app-bg {
            background:
              radial-gradient(ellipse 55% 45% at 15% 15%, rgba(30,70,160,0.7) 0%, transparent 60%),
              radial-gradient(ellipse 50% 55% at 85% 10%, rgba(20,55,140,0.5) 0%, transparent 55%),
              radial-gradient(ellipse 65% 50% at 55% 85%, rgba(15,50,130,0.55) 0%, transparent 60%),
              linear-gradient(145deg, #0c1628 0%, #111e3a 40%, #0a1422 100%);
          }
          .sidebar {
            background: rgba(15,32,75,0.65);
            border-right: 1px solid rgba(100,150,255,0.15);
          }
          .sidebar-logo { color: #ddeeff; }
          .sidebar-item { color: rgba(180,210,255,0.45); }
          .sidebar-item:hover { background: rgba(80,120,220,0.15); color: rgba(200,225,255,0.8); }
          .sidebar-item.active {
            background: rgba(60,100,220,0.25);
            border: 1px solid rgba(100,150,255,0.3);
            color: #c8deff;
            box-shadow: 0 1px 0 rgba(120,170,255,0.12) inset;
          }
          .bottom-nav {
            background: rgba(20,40,90,0.6);
            border: 1px solid rgba(100,150,255,0.2);
            box-shadow: 0 1px 0 rgba(120,170,255,0.15) inset, 0 16px 48px rgba(0,0,0,0.45);
          }
          .nav-item { color: rgba(160,200,255,0.45); }
          .nav-item.active {
            background: rgba(60,100,220,0.3);
            color: #c8e0ff;
            box-shadow: 0 1px 0 rgba(120,170,255,0.15) inset;
          }
        }

        /* ── LAYOUT ── */
        .app-layout {
          display: flex;
          min-height: 100vh;
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 100%;
          overflow-x: hidden;
        }
        .sidebar {
          display: none;
          width: 240px;
          flex-shrink: 0;
          position: fixed;
          top: 0; left: 0;
          height: 100vh;
          padding: 28px 14px 24px;
          flex-direction: column;
          gap: 4px;
          z-index: 20;
          backdrop-filter: blur(40px) saturate(1.8);
          -webkit-backdrop-filter: blur(40px) saturate(1.8);
          transition: width 0.3s cubic-bezier(0.4,0,0.2,1), padding 0.3s cubic-bezier(0.4,0,0.2,1);
          overflow: hidden;
        }
        .sidebar.collapsed {
          width: 68px;
          padding: 28px 10px 24px;
        }
        .sidebar.collapsed .sidebar-label { display: none; }
        .sidebar.collapsed .sidebar-logo span { display: none; }
        .sidebar.collapsed .sidebar-item { justify-content: center; gap: 0; padding: 13px 0; }
        .sidebar-toggle-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px;
          border-radius: 99px;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.82);
          background: rgba(255,255,255,0.52);
          backdrop-filter: blur(20px) saturate(1.8);
          -webkit-backdrop-filter: blur(20px) saturate(1.8);
          width: 100%;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          transition: all 0.2s;
          font-family: inherit;
          color: rgba(20,50,120,0.75);
          white-space: nowrap;
          overflow: hidden;
          margin-top: 6px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.9) inset, 0 4px 14px rgba(60,100,200,0.12);
        }
        .sidebar-toggle-btn:hover {
          background: rgba(255,255,255,0.68);
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset, 0 6px 20px rgba(60,100,200,0.18);
          border-color: rgba(255,255,255,0.95);
        }
        .sidebar-toggle-btn:active { transform: scale(0.97); }
        .sidebar-toggle-btn svg { width: 18px; height: 18px; flex-shrink: 0; }
        .sidebar.collapsed .sidebar-toggle-btn {
          justify-content: center;
          gap: 0;
          padding: 9px 0;
          border-radius: 14px;
        }
        @media (prefers-color-scheme: dark) {
          .sidebar-toggle-btn {
            border: 1px solid rgba(100,150,255,0.28);
            background: rgba(60,100,220,0.18);
            color: rgba(180,210,255,0.8);
            box-shadow: 0 1px 0 rgba(120,170,255,0.15) inset, 0 4px 14px rgba(0,0,0,0.2);
          }
          .sidebar-toggle-btn:hover {
            background: rgba(60,100,220,0.28);
            border-color: rgba(100,150,255,0.45);
            box-shadow: 0 1px 0 rgba(120,170,255,0.2) inset, 0 6px 20px rgba(0,0,0,0.3);
          }
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 10px 26px;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .logo-icon {
          width: 38px; height: 38px;
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 13px 14px;
          border-radius: 14px;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          font-size: 16px;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s;
          font-family: inherit;
          white-space: nowrap;
          overflow: hidden;
        }
        .sidebar-item svg { width: 22px; height: 22px; flex-shrink: 0; }
        .main {
          flex: 1;
          padding: 28px 22px 110px;
          position: relative;
          z-index: 1;
          width: 100%;
          transition: padding-bottom 0.3s ease;
        }
        .main.nav-hidden {
          padding-bottom: 28px;
        }
        .bottom-nav {
          position: fixed;
          bottom: 20px;
          left: 16px;
          right: 16px;
          transform: none;
          display: flex;
          flex-direction: column;
          gap: 0;
          border-radius: 26px;
          z-index: 100;
          width: auto;
          max-width: 420px;
          margin: 0 auto;
          backdrop-filter: blur(40px) saturate(2);
          -webkit-backdrop-filter: blur(40px) saturate(2);
          overflow: hidden;
        }
        .bottom-nav-row {
          display: flex;
          gap: 2px;
          padding: 8px 10px;
        }
        .bottom-nav-drawer {
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
          padding: 4px 10px 10px;
          border-top: 1px solid rgba(255,255,255,0.15);
        }
        .nav-item {
          flex: 1;
          min-width: 52px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 4px;
          border-radius: 17px;
          cursor: pointer;
          border: none;
          background: transparent;
          transition: all 0.2s;
          font-family: inherit;
        }
        .nav-item svg { width: 22px; height: 22px; }
        .nav-item span { font-size: 10px; font-weight: 600; letter-spacing: 0.1px; }
        @media (min-width: 640px) {
          .sidebar { display: flex; padding-top: max(28px, calc(20px + env(safe-area-inset-top))); }
          .bottom-nav { display: none; }
          .nav-toggle { display: none !important; }
          .main { margin-left: 240px; padding: max(32px, calc(20px + env(safe-area-inset-top))) 36px 36px; transition: margin-left 0.3s cubic-bezier(0.4,0,0.2,1); }
          .main.sidebar-collapsed { margin-left: 68px; }
          .main.nav-hidden { padding: max(32px, calc(20px + env(safe-area-inset-top))) 36px 36px; }
        }

        /* ── View Transitions — definiti in index.css ── */
      `}</style>

      <div className="app-bg" />

      <div className="app-layout">
        {/* Sidebar */}
        <nav className={"sidebar" + (sidebarCollapsed ? " collapsed" : "")}>
          <div className="sidebar-logo" onClick={() => setShowEasterEgg(true)}
            style={{ cursor: 'pointer' }} title="Il cuore di Nemora">
            <div className="logo-icon">
              <img src="/assets/nemora-icon-1024.svg" alt="Nemora" style={{ width: 38, height: 38, borderRadius: 10 }} />
            </div>
            <span>Nemora</span>
          </div>
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.id}
              className={"sidebar-item" + (active === item.id ? " active" : "")}
              onClick={() => handleNav(item.id)}
              whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              title={sidebarCollapsed ? item.label : undefined}
            >
              {item.icon}
              <span className="sidebar-label">{item.label}</span>
            </motion.button>
          ))}

          {/* Bottone ricerca globale */}
          <button
            className="sidebar-item"
            onClick={() => setShowRicerca(true)}
            title={sidebarCollapsed ? "Cerca (⌘K)" : undefined}
            style={{ color: 'rgba(20,50,120,0.55)', marginTop: 4 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <span className="sidebar-label">Cerca <span style={{fontSize:11,opacity:0.5,fontWeight:400}}>⌘K</span></span>
          </button>

          {/* Spacer + Notifiche + Profilo + Logout */}
          <div style={{ flex: 1 }} />

          {/* Campanella notifiche WhatsApp */}
          <div style={{ display: 'flex', alignItems: 'center',
            padding: sidebarCollapsed ? '6px 0' : '6px 8px',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            gap: 10, marginBottom: 2 }}>
            <CampanellaNotifiche nonLette={nonLette} onClick={() => setNotifPanelOpen(v => !v)} />
            {!sidebarCollapsed && nonLette > 0 && (
              <span style={{ fontSize: 13, fontWeight: 600, color: '#d97706' }}>
                {nonLette} nuov{nonLette === 1 ? 'a' : 'e'}
              </span>
            )}
          </div>

          {/* Avatar → Profilo */}
          <motion.button
            className={"sidebar-item" + (active === "profilo" ? " active" : "")}
            onClick={() => handleNav("profilo")}
            whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            title={sidebarCollapsed ? "Profilo" : undefined}
            style={{ marginBottom: 2 }}
          >
            <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(145deg, #5aabff, #2060dd)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 800, color: '#fff' }}>
              {session?.user?.email ? session.user.email.slice(0, 2).toUpperCase() : '?'}
            </div>
            <span className="sidebar-label" style={{ fontSize: 14 }}>
              {session?.user?.email?.split('@')[0] || 'Profilo'}
            </span>
          </motion.button>

          {/* Toggle comprimi/espandi — liquid glass pill */}
          <button
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(c => !c)}
            title={sidebarCollapsed ? "Espandi menu" : "Comprimi menu"}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, flexShrink: 0, transition: 'transform 0.3s' }}>
              {sidebarCollapsed
                ? <><path d="M13 18l6-6-6-6"/><path d="M5 18l6-6-6-6"/></>
                : <><path d="M11 18l-6-6 6-6"/><path d="M19 18l-6-6 6-6"/></>
              }
            </svg>
            <span className="sidebar-label" style={{ letterSpacing: '0.1px' }}>
              {sidebarCollapsed ? "Espandi" : "Comprimi"}
            </span>
          </button>

          <motion.button
            className="sidebar-item"
            onClick={handleLogout}
            whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            title={sidebarCollapsed ? "Esci" : undefined}
            style={{ color: 'rgba(220,60,60,0.7)', marginTop: 4 }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 22, height: 22, flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            <span className="sidebar-label">Esci</span>
          </motion.button>
        </nav>

        {/* Main — AnimatePresence per transizioni tra pagine */}
        <main className={"main" + (navHidden ? " nav-hidden" : "") + (sidebarCollapsed ? " sidebar-collapsed" : "")}>
          <AnimatePresence mode="sync">
            <motion.div
              key={active}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              style={{ height: "100%" }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottone toggle nav — visibile solo quando nav è nascosta */}
        <AnimatePresence>
          {navHidden && (
            <motion.button
              className="nav-toggle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 28 }}
              onClick={() => setNavHidden(false)}
              style={{
                position: "fixed", bottom: 16, left: "50%",
                transform: "translateX(-50%)",
                zIndex: 100,
                background: "rgba(210,228,255,0.75)",
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: 20,
                padding: "8px 18px",
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, fontWeight: 600,
                color: "rgba(20,50,130,0.8)",
                WebkitBackdropFilter: "blur(20px)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 2px 0 rgba(255,255,255,0.9) inset, 0 4px 16px rgba(60,100,200,0.2)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
              Menu
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom nav */}
        <AnimatePresence>
          {!navHidden && (() => {
            const NAV_MAIN  = NAV_ITEMS.filter(i => ['home','calendario','clienti','pet'].includes(i.id));
            const NAV_EXTRA = NAV_ITEMS.filter(i => !['home','calendario','clienti','pet'].includes(i.id));
            return (
              <motion.nav
                className="bottom-nav"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              >
                {/* Riga principale — 4 voci + tasto cassetto */}
                <div className="bottom-nav-row">
                  {NAV_MAIN.map((item) => (
                    <motion.button
                      key={item.id}
                      className={"nav-item" + (active === item.id ? " active" : "")}
                      onClick={() => { handleNav(item.id); setNavDrawerOpen(false); }}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <motion.span
                        animate={active === item.id ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ display: "flex" }}
                      >
                        {item.icon}
                      </motion.span>
                      <span>{item.label}</span>
                    </motion.button>
                  ))}

                  {/* Tasto apri cassetto */}
                  <motion.button
                    className={"nav-item" + (navDrawerOpen || NAV_EXTRA.some(i => i.id === active) ? " active" : "")}
                    onClick={() => setNavDrawerOpen(v => !v)}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <motion.svg
                      width="22" height="22" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
                      animate={{ rotate: navDrawerOpen ? 90 : 0 }}
                      transition={{ duration: 0.22 }}
                    >
                      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                    </motion.svg>
                    <span>Altro</span>
                  </motion.button>
                </div>

                {/* Cassetto — voci extra */}
                <AnimatePresence>
                  {navDrawerOpen && (
                    <motion.div
                      className="bottom-nav-drawer"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: "hidden", maxWidth: "100%" }}
                    >
                      {NAV_EXTRA.map((item) => (
                        <motion.button
                          key={item.id}
                          className={"nav-item" + (active === item.id ? " active" : "")}
                          onClick={() => { handleNav(item.id); setNavDrawerOpen(false); }}
                          whileTap={{ scale: 0.9 }}
                          style={{ flex: "0 0 calc(25% - 2px)" }}
                        >
                          <motion.span
                            animate={active === item.id ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                            transition={{ duration: 0.3 }}
                            style={{ display: "flex" }}
                          >
                            {item.icon}
                          </motion.span>
                          <span>{item.label}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.nav>
            );
          })()}
        </AnimatePresence>
      </div>
      {/* Toast notifica WhatsApp in tempo reale */}
      <AnimatePresence>
        {nuovaToast && (
          <NotificaToast
            notifica={nuovaToast}
            onClose={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Pannello notifiche slide-in */}
      <AnimatePresence>
        {notifPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setNotifPanelOpen(false)}
              style={{ position: 'fixed', inset: 0, zIndex: 399,
                background: 'rgba(0,0,0,0.25)', WebkitBackdropFilter: 'blur(2px)', backdropFilter: 'blur(2px)' }}
            />
            <NotifichePanel
              notifiche={notifiche}
              nonLette={nonLette}
              onMarcaLette={marcaLette}
              onClose={() => setNotifPanelOpen(false)}
              onNavigate={(sezione) => { setActive(sezione); setNotifPanelOpen(false); }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Ricerca globale overlay */}
      <AnimatePresence>
        {showRicerca && <RicercaGlobale onClose={() => setShowRicerca(false)} onNavigate={(id) => { setActive(id); }} />}
      </AnimatePresence>

      {/* ── Easter egg: Il cuore di Nemora ── */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEasterEgg(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: '100%', maxWidth: 400,
                background: 'rgba(255,255,255,0.72)',
                border: '1px solid rgba(255,255,255,0.9)',
                borderRadius: 28, padding: '36px 32px 32px',
                boxShadow: '0 2px 0 rgba(255,255,255,0.95) inset, 0 20px 60px rgba(0,0,0,0.18)',
                backdropFilter: 'blur(40px) saturate(1.8)', WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <img src="/assets/nemora-icon-1024.svg" alt="Nemora"
                  style={{ width: 72, height: 72, borderRadius: 18, margin: '0 auto' }} />
              </div>
              <h2 style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                Il cuore di Nemora
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: '0 0 20px' }}>
                Nemora non è solo un nome, è un tributo alla nostra famiglia. Nasce dall'intreccio delle anime che hanno vissuto e che vivono con noi.
              </p>
              <div style={{ background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.18)', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: 13, color: '#0F6E56', lineHeight: 1.7 }}>
                  Il nome affonda le sue radici nel termine latino <em>nemora</em> — i boschi, i luoghi sacri della natura — evocando rifugio, pace e rigenerazione.
                </p>
              </div>
              {[
                { titolo: 'Purezza', testo: 'Come un respiro nel bosco, un servizio che mette al centro il benessere naturale del tuo animale.' },
                { titolo: 'Innovazione e Cura', testo: 'Tecnologia moderna e dedizione artigianale del grooming, in equilibrio perfetto.' },
                { titolo: 'Identità', testo: 'Ogni lettera custodisce il nome di un compagno di vita, perché la cura deve sempre partire dal cuore.' },
              ].map(({ titolo, testo }) => (
                <div key={titolo} style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', flexShrink: 0, marginTop: 6 }} />
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{titolo}:</strong> {testo}
                  </p>
                </div>
              ))}
              <p style={{ textAlign: 'center', margin: '20px 0 8px', fontSize: 13, fontStyle: 'italic', color: '#1D9E75', letterSpacing: '0.2px' }}>
                Dove la tecnologia incontra il benessere, ispirata da chi amiamo.
              </p>
              <p style={{ textAlign: 'center', margin: '0 0 20px', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.3px' }}>
                v{APP_VERSION} · {BUILD_DATE}
              </p>
              <button
                onClick={() => setShowEasterEgg(false)}
                style={{
                  width: '100%', padding: '13px', borderRadius: 16,
                  border: '1px solid rgba(29,158,117,0.3)',
                  background: 'rgba(29,158,117,0.08)',
                  color: '#0F6E56', fontSize: 14, fontWeight: 600,
                  fontFamily: 'inherit', cursor: 'pointer',
                }}
              >
                ✦ Chiudi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

     <OfflineIndicator />
    </>
  );
}