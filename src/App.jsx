import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from './supabaseClient';
import PetView from './PetView';
import ClientiView from './ClientiView';
import CalendarioView from './CalendarioView';
import StatisticheView from './StatisticheView';
import OperatoriView from './OperatoriView';

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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    id: "calendario",
    label: "Calendario",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="8" cy="16" r="1" fill="currentColor" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
        <circle cx="16" cy="16" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "clienti",
    label: "Clienti",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="4" />
        <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
        <path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87" />
      </svg>
    ),
  },
  {
    id: "pet",
    label: "Pet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C9 2 7 4 7 6.5c0 1.5.5 2.8 1.5 3.5C6 11 4 13.5 4 16.5 4 19.5 6.5 22 12 22s8-2.5 8-5.5c0-3-2-5.5-4.5-6.5C16.5 9.3 17 8 17 6.5 17 4 15 2 12 2z" />
        <circle cx="9" cy="6" r="1" fill="currentColor" />
        <circle cx="15" cy="6" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "statistiche",
    label: "Statistiche",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10M12 20V4M6 20v-6" />
      </svg>
    ),
  },
  {
    id: "operatori",
    label: "Operatori",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M12 11v4M10 13h4" />
      </svg>
    ),
  },
];

const OPERATORI_MOCK = [
  { nome: "Luca",  colore: "#2563eb", appuntamenti: 5 },
  { nome: "Marco", colore: "#059669", appuntamenti: 3 },
  { nome: "Sara",  colore: "#d97706", appuntamenti: 7 },
];

const PROSSIMI_MOCK = [
  { ora: "09:00", cliente: "Famiglia Rossi",   animale: "Rex",  servizio: "Toeletta",          operatore: "Luca",  colore: "#2563eb" },
  { ora: "10:30", cliente: "Famiglia Bianchi", animale: "Luna", servizio: "Bagno e Asciugatura",operatore: "Sara",  colore: "#d97706" },
  { ora: "11:00", cliente: "Famiglia Verdi",   animale: "Milo", servizio: "Taglio",             operatore: "Marco", colore: "#059669" },
  { ora: "14:00", cliente: "Famiglia Ferrari", animale: "Kira", servizio: "Toeletta completa",  operatore: "Sara",  colore: "#d97706" },
];

function HomeView() {
  const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <motion.div
      style={{ padding: "0 0 2rem" }}
      variants={listVariants}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <motion.div variants={itemVariants} style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "0 0 3px", textTransform: "capitalize", fontWeight: 500 }}>{oggi}</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.5px" }}>Buongiorno!</h1>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { value: "15",  sub: "oggi" },
          { value: "3",   sub: "in attesa", accent: "#d97706" },
          { value: "128", sub: "clienti",   accent: "#059669" },
        ].map((s) => (
          <motion.div
            key={s.sub}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", borderRadius: 18, padding: "14px 12px", textAlign: "center", boxShadow: "var(--card-shadow)", cursor: "default" }}
          >
            <p style={{ fontSize: 26, fontWeight: 700, color: s.accent || "var(--text-primary)", margin: 0, lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "3px 0 0", fontWeight: 500 }}>{s.sub}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Operatori */}
      <motion.p variants={itemVariants} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: "0 2px 10px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Operatori</motion.p>
      <motion.div variants={listVariants} style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 20 }}>
        {OPERATORI_MOCK.map((op) => (
          <motion.div
            key={op.nome}
            variants={itemVariants}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ background: "var(--card-bg-sm)", border: "1px solid var(--card-border-sm)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 13, boxShadow: "var(--card-shadow-sm)" }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: op.colore + "22", border: "2px solid " + op.colore + "55", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: op.colore, flexShrink: 0 }}>
              {op.nome[0]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{op.nome}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{op.appuntamenti} appuntamenti oggi</p>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: op.colore }} />
          </motion.div>
        ))}
      </motion.div>

      {/* Appuntamenti */}
      <motion.p variants={itemVariants} style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", margin: "0 2px 10px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Prossimi appuntamenti</motion.p>
      <motion.div variants={listVariants} style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {PROSSIMI_MOCK.map((a, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            style={{ background: "var(--card-bg-sm)", border: "1px solid var(--card-border-sm)", borderRadius: 16, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--card-shadow-sm)" }}
          >
            <div style={{ minWidth: 42, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{a.ora}</p>
            </div>
            <div style={{ width: 3, height: 36, borderRadius: 99, background: a.colore, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.animale} - {a.servizio}</p>
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{a.cliente} - {a.operatore}</p>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, background: a.colore + "22", color: a.colore, padding: "3px 9px", borderRadius: 20 }}>conf.</div>
          </motion.div>
        ))}
      </motion.div>
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

  const handleNav = (id) => {
    setActive(id);
  };

  const renderView = () => {
    switch (active) {
      case "home":       return <HomeView key="home" />;
      case "calendario": return <CalendarioView />;
      case "clienti":    return <ClientiView key="clienti" />;
      case "pet":        return <PetView key="pet" />;
      case "operatori":    return <OperatoriView key="operatori" />;
      case "statistiche":  return <StatisticheView key="statistiche" />;
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
          border-radius: 12px;
          background: linear-gradient(145deg, #5aabff, #2060dd);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px;
          box-shadow: 0 4px 12px rgba(60,120,220,0.35);
          flex-shrink: 0;
        }
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 11px 13px;
          border-radius: 14px;
          cursor: pointer;
          border: 1px solid transparent;
          background: transparent;
          width: 100%;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          transition: all 0.2s;
          font-family: inherit;
        }
        .sidebar-item svg { width: 18px; height: 18px; flex-shrink: 0; }
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
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 2px;
          padding: 8px 10px;
          border-radius: 26px;
          z-index: 100;
          width: calc(100% - 32px);
          max-width: 440px;
          backdrop-filter: blur(40px) saturate(2);
          -webkit-backdrop-filter: blur(40px) saturate(2);
        }
        .nav-item {
          flex: 1;
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
          .sidebar { display: flex; }
          .bottom-nav { display: none; }
          .nav-toggle { display: none !important; }
          .main { margin-left: 240px; padding: 32px 36px 36px; }
          .main.nav-hidden { padding: 32px 36px 36px; }
        }

        /* ── View Transitions ── */
        ::view-transition-old(root) { animation: 120ms ease both vtFadeOut; }
        ::view-transition-new(root) { animation: 180ms ease both vtFadeIn; }
        @keyframes vtFadeOut { to   { opacity: 0; } }
        @keyframes vtFadeIn  { from { opacity: 0; } }
      `}</style>

      <div className="app-bg" />

      <div className="app-layout">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-icon">P</div>
            <span>PetCare</span>
          </div>
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.id}
              className={"sidebar-item" + (active === item.id ? " active" : "")}
              onClick={() => handleNav(item.id)}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {item.icon}
              {item.label}
            </motion.button>
          ))}
        </nav>

        {/* Main — AnimatePresence per transizioni tra pagine */}
        <main className={"main" + (navHidden ? " nav-hidden" : "")}>
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
          {!navHidden && (
            <motion.nav
              className="bottom-nav"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              {NAV_ITEMS.map((item) => (
                <motion.button
                  key={item.id}
                  className={"nav-item" + (active === item.id ? " active" : "")}
                  onClick={() => handleNav(item.id)}
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
              {/* Tasto nascondi */}
              <motion.button
                className="nav-item"
                onClick={() => setNavHidden(true)}
                whileTap={{ scale: 0.9 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ maxWidth: 36 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M19 9l-7 7-7-7"/>
                </svg>
              </motion.button>
            </motion.nav>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}