import { useState } from "react";

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
  { nome: "Luca", colore: "#3b82f6", appuntamenti: 5 },
  { nome: "Marco", colore: "#10b981", appuntamenti: 3 },
  { nome: "Sara", colore: "#f59e0b", appuntamenti: 7 },
];

const PROSSIMI_MOCK = [
  { ora: "09:00", cliente: "Famiglia Rossi", animale: "Rex", servizio: "Toeletta", operatore: "Luca", colore: "#3b82f6" },
  { ora: "10:30", cliente: "Famiglia Bianchi", animale: "Luna", servizio: "Bagno & Asciugatura", operatore: "Sara", colore: "#f59e0b" },
  { ora: "11:00", cliente: "Famiglia Verdi", animale: "Milo", servizio: "Taglio", operatore: "Marco", colore: "#10b981" },
  { ora: "14:00", cliente: "Famiglia Ferrari", animale: "Kira", servizio: "Toeletta completa", operatore: "Sara", colore: "#f59e0b" },
];

function HomeView() {
  const oggi = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div style={{ padding: "0 0 2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: "0 0 4px", textTransform: "capitalize" }}>{oggi}</p>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#fff", margin: 0, letterSpacing: "-0.5px" }}>Buongiorno! 🐾</h1>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Oggi", value: "15", sub: "appuntamenti" },
          { label: "Attesa", value: "3", sub: "da confermare" },
          { label: "Clienti", value: "128", sub: "totali" },
        ].map((s) => (
          <div key={s.label} style={glassCard}>
            <p style={{ fontSize: 22, fontWeight: 700, color: "#fff", margin: 0 }}>{s.value}</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "2px 0 0" }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Operatori */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Operatori</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {OPERATORI_MOCK.map((op) => (
            <div key={op.nome} style={{ ...glassCard, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: op.colore + "33", border: `2px solid ${op.colore}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: op.colore, flexShrink: 0 }}>
                {op.nome[0]}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#fff" }}>{op.nome}</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{op.appuntamenti} appuntamenti oggi</p>
              </div>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: op.colore }} />
            </div>
          ))}
        </div>
      </div>

      {/* Prossimi appuntamenti */}
      <div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", margin: "0 0 12px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Prossimi appuntamenti</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {PROSSIMI_MOCK.map((a, i) => (
            <div key={i} style={{ ...glassCard, display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ minWidth: 44, textAlign: "center" }}>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#fff" }}>{a.ora}</p>
              </div>
              <div style={{ width: 3, height: 38, borderRadius: 99, background: a.colore, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.animale} · {a.servizio}</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{a.cliente} · {a.operatore}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderView({ title, description, icon }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center", padding: "2rem" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>{icon}</div>
      <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fff", margin: "0 0 10px" }}>{title}</h2>
      <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", margin: 0, maxWidth: 280, lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

const glassCard = {
  background: "rgba(255,255,255,0.08)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 18,
  padding: "14px 16px",
};

const glassNav = {
  background: "rgba(20,20,30,0.6)",
  backdropFilter: "blur(40px)",
  WebkitBackdropFilter: "blur(40px)",
  border: "1px solid rgba(255,255,255,0.1)",
};

export default function App() {
  const [active, setActive] = useState("home");

  const renderView = () => {
    switch (active) {
      case "home": return <HomeView />;
      case "calendario": return <PlaceholderView title="Calendario" description="Vista giornaliera con tutti gli appuntamenti. Trascina per spostare, tocca per creare." icon="📅" />;
      case "clienti": return <PlaceholderView title="Clienti" description="Gestisci proprietari e i loro animali. Cerca, aggiungi, modifica." icon="🐾" />;
      case "operatori": return <PlaceholderView title="Operatori" description="Configura orari, servizi e disponibilità degli operatori." icon="✂️" />;
      default: return null;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          background: #0a0a14;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .app-layout {
          display: flex;
          min-height: 100vh;
          position: relative;
        }
        /* Background blobs */
        .bg-blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        /* Sidebar — desktop */
        .sidebar {
          display: none;
          width: 240px;
          flex-shrink: 0;
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          padding: 32px 16px;
          flex-direction: column;
          gap: 6px;
          z-index: 10;
        }
        /* Main content */
        .main {
            flex: 1;
            padding: 28px 22px 110px;
            position: relative;
            z-index: 1;
            width: 100%;
                }
        /* Bottom nav — mobile */
        .bottom-nav {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 4px;
          padding: 10px 16px;
          border-radius: 30px;
          z-index: 100;
          width: calc(100% - 40px);
          max-width: 420px;
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 8px 4px;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.4);
        }
        .nav-item.active {
          background: rgba(255,255,255,0.12);
          color: #fff;
        }
        .nav-item svg {
          width: 22px;
          height: 22px;
        }
        .nav-item span {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.2px;
        }
        /* Sidebar item */
        .sidebar-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.5);
          width: 100%;
          font-size: 15px;
          font-weight: 500;
          text-align: left;
        }
        .sidebar-item.active {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff;
        }
        .sidebar-item svg {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }
        .sidebar-logo {
          padding: 0 16px 28px;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        @media (min-width: 768px) {
          .sidebar { display: flex; }
          .bottom-nav { display: none; }
          .main {
            margin-left: 240px;
            padding: 40px 40px 40px;
          }
      `}</style>

      {/* Background atmosphere */}
      <div className="bg-blob" style={{ width: 500, height: 500, background: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)", top: -100, left: -100 }} />
      <div className="bg-blob" style={{ width: 400, height: 400, background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)", top: "40%", right: -50 }} />
      <div className="bg-blob" style={{ width: 350, height: 350, background: "radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)", bottom: -50, left: "30%" }} />

      <div className="app-layout">
        {/* Sidebar */}
        <nav className="sidebar" style={glassNav}>
          <div className="sidebar-logo">
            <span>🐾</span> PetCare
          </div>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`sidebar-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* Main content */}
        <main className="main">
          {renderView()}
        </main>

        {/* Bottom nav */}
        <nav className="bottom-nav" style={glassNav}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} className={`nav-item ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}