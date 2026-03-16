import { useState, useRef, useEffect } from "react";

import PetBodyMap from './PetBodyMap';

<PetBodyMap
  pet={pet}
  onZoneSaved={(zona, annotations) => {
    setPet(prev => ({
      ...prev,
      zone_critiche: prev.zone_critiche
        ? `${prev.zone_critiche}, ${zona}`
        : zona,
      annotazioni: annotations
    }));
  }}
/>

// ── Sagome SVG cane e gatto ──────────────────────────────────
const DOG_SILHOUETTE = `
  <ellipse cx="200" cy="180" rx="110" ry="65" fill="currentColor"/>
  <ellipse cx="310" cy="155" rx="45" ry="38" fill="currentColor"/>
  <ellipse cx="340" cy="130" rx="18" ry="28" fill="currentColor"/>
  <ellipse cx="310" cy="130" rx="12" ry="18" fill="currentColor"/>
  <rect x="110" y="230" width="28" height="70" rx="12" fill="currentColor"/>
  <rect x="155" y="235" width="28" height="65" rx="12" fill="currentColor"/>
  <rect x="220" y="233" width="28" height="68" rx="12" fill="currentColor"/>
  <rect x="262" y="230" width="28" height="70" rx="12" fill="currentColor"/>
  <path d="M90 185 Q60 195 55 215 Q50 230 75 225 Q85 205 100 200" fill="currentColor"/>
`;

const CAT_SILHOUETTE = `
  <ellipse cx="200" cy="185" rx="95" ry="60" fill="currentColor"/>
  <ellipse cx="295" cy="155" rx="42" ry="38" fill="currentColor"/>
  <polygon points="275,122 268,92 290,112" fill="currentColor"/>
  <polygon points="315,120 308,90 330,110" fill="currentColor"/>
  <rect x="120" y="232" width="24" height="62" rx="11" fill="currentColor"/>
  <rect x="162" y="237" width="24" height="57" rx="11" fill="currentColor"/>
  <rect x="222" y="235" width="24" height="60" rx="11" fill="currentColor"/>
  <rect x="260" y="232" width="24" height="62" rx="11" fill="currentColor"/>
  <path d="M105 185 Q80 195 70 225 Q80 235 90 215 Q95 200 108 195" fill="currentColor"/>
`;

// ── Colori zona per label ────────────────────────────────────
const ZONE_COLORS = {
  "testa": "#ef4444",
  "orecchio": "#f97316",
  "collo": "#eab308",
  "schiena": "#22c55e",
  "zampa": "#3b82f6",
  "coda": "#a855f7",
  "pancia": "#ec4899",
  "fianco": "#14b8a6",
};

// ── Mock dati animale ────────────────────────────────────────
const MOCK_PET = {
  id: "1",
  nome: "Rex",
  specie: "cane",
  razza: "Labrador Retriever",
  data_nascita: "2019-03-15",
  colore: "Giallo",
  cliente: "Famiglia Rossi",
  operatore_preferito: "Luca",
  servizi_abituali: "Toeletta completa mensile, bagno ogni 2 settimane",
  preferenze_proprietario: "Asciugatura con phon a bassa temperatura, no profumo",
  zone_critiche: "Orecchio destro sensibile, zampe posteriori",
  problemi_salute: "Allergia stagionale al polline, displasia lieve all'anca sinistra",
  problemi_carattere: "Agitato con altri cani in sala d'attesa, tranquillo da solo",
  annotazioni: [],
};

// ── Componente principale ────────────────────────────────────
export default function PetView() {
  const [tab, setTab] = useState("scheda");
  const [pet, setPet] = useState(MOCK_PET);
  const [editing, setEditing] = useState(null);
  const [editVal, setEditVal] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState([]);
  const [currentPath, setCurrentPath] = useState([]);

  const canvasRef = useRef(null);
  const svgRef = useRef(null);

  // ── Gestione disegno su canvas ───────────────────────────
  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e, canvasRef.current);
    setCurrentPath([pos]);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e, canvasRef.current);
    setCurrentPath((prev) => [...prev, pos]);
    redrawCanvas([...drawings, { path: [...currentPath, pos], color: "#ef4444" }]);
  };

  const endDraw = async (e) => {
    e.preventDefault();
    if (!isDrawing || currentPath.length < 3) return;
    setIsDrawing(false);
    const newDrawing = { path: currentPath, color: "#ef4444", id: Date.now() };
    setDrawings((prev) => [...prev, newDrawing]);
    setCurrentPath([]);
    await analyzeDrawing(newDrawing);
  };

  const redrawCanvas = (allDrawings) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    allDrawings.forEach(({ path, color }) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color || "#ef4444";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.globalAlpha = 0.8;
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach((p) => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });
  };

  useEffect(() => {
    redrawCanvas(drawings);
  }, [drawings]);

  const clearCanvas = () => {
    setDrawings([]);
    setAiResult(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  // ── Analisi AI ───────────────────────────────────────────
  const analyzeDrawing = async (drawing) => {
    setIsAnalyzing(true);
    setAiResult(null);

    try {
      // Calcola bounding box e centroide del disegno
      const xs = drawing.path.map((p) => p.x);
      const ys = drawing.path.map((p) => p.y);
      const cx = Math.round((Math.min(...xs) + Math.max(...xs)) / 2);
      const cy = Math.round((Math.min(...ys) + Math.max(...ys)) / 2);
      const canvasW = canvasRef.current?.width || 400;
      const canvasH = canvasRef.current?.height || 300;

      // Normalizza posizione 0-100
      const px = Math.round((cx / canvasW) * 100);
      const py = Math.round((cy / canvasH) * 100);

      const prompt = `Sei un assistente veterinario. L'utente ha disegnato un segno su una sagoma di ${pet.specie} (vista laterale destra).
Il segno è centrato approssimativamente alla posizione x=${px}%, y=${py}% della sagoma (0,0 = angolo in alto a sinistra, 100,100 = in basso a destra).

Mappa delle zone anatomiche (approssimativa):
- Testa/muso: x 60-85%, y 30-55%
- Orecchie: x 65-80%, y 20-40%
- Collo: x 55-68%, y 35-55%
- Schiena/dorso: x 25-60%, y 25-45%
- Pancia/addome: x 25-60%, y 50-70%
- Fianco posteriore: x 15-30%, y 30-55%
- Zampe anteriori: x 50-70%, y 65-90%
- Zampe posteriori: x 20-40%, y 65-90%
- Coda: x 5-18%, y 40-65%
- Spalla: x 60-72%, y 45-60%

Rispondi SOLO in JSON, senza markdown, con questo formato esatto:
{
  "zona": "nome zona anatomica preciso",
  "lato": "sinistro|destro|centrale",
  "descrizione": "descrizione breve 5-8 parole",
  "suggerimento": "consiglio pratico breve per il toelettatore"
}`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setAiResult(parsed);

      // Aggiorna automaticamente zone_critiche
      const zonaLabel = `${parsed.zona} ${parsed.lato !== "centrale" ? parsed.lato : ""}`.trim();
      setPet((prev) => ({
        ...prev,
        zone_critiche: prev.zone_critiche
          ? `${prev.zone_critiche}, ${zonaLabel}`
          : zonaLabel,
        annotazioni: [
          ...(prev.annotazioni || []),
          {
            id: Date.now(),
            zona: zonaLabel,
            descrizione: parsed.descrizione,
            suggerimento: parsed.suggerimento,
            data: new Date().toLocaleDateString("it-IT"),
          },
        ],
      }));
    } catch (err) {
      setAiResult({ zona: "Errore", descrizione: "Impossibile analizzare", suggerimento: "" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ── Editing campo ────────────────────────────────────────
  const startEdit = (field, value) => {
    setEditing(field);
    setEditVal(value || "");
  };
  const saveEdit = () => {
    setPet((prev) => ({ ...prev, [editing]: editVal }));
    setEditing(null);
  };

  // ── Stili glass ──────────────────────────────────────────
  const glass = {
    background: "rgba(255,255,255,0.48)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: 20,
    boxShadow: "0 2px 0 rgba(255,255,255,0.92) inset, 0 8px 32px rgba(80,120,200,0.15)",
  };

  const fieldStyle = {
    width: "100%",
    background: "rgba(255,255,255,0.5)",
    border: "1px solid rgba(255,255,255,0.8)",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    color: "#0f2050",
    resize: "vertical",
    fontFamily: "inherit",
    outline: "none",
  };

  // ── Età animale ──────────────────────────────────────────
  const eta = () => {
    const diff = new Date() - new Date(pet.data_nascita);
    const anni = Math.floor(diff / (1000 * 60 * 60 * 24 * 365));
    return `${anni} anni`;
  };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>

      {/* Header scheda */}
      <div style={{ ...glass, padding: "20px 22px", marginBottom: 16, display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          background: "linear-gradient(145deg,#5aabff,#2060dd)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, flexShrink: 0,
          boxShadow: "0 4px 14px rgba(50,100,220,0.35)"
        }}>🐕</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0a1840", letterSpacing: "-0.4px" }}>{pet.nome}</div>
          <div style={{ fontSize: 13, color: "rgba(20,50,130,0.6)", marginTop: 2 }}>
            {pet.razza} · {eta()} · {pet.cliente}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          background: "rgba(59,130,246,0.12)", color: "#2563eb",
          padding: "4px 10px", borderRadius: 20
        }}>
          Op. preferito: {pet.operatore_preferito}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ ...glass, padding: "6px", marginBottom: 16, display: "flex", gap: 4 }}>
        {[
          { id: "scheda", label: "📋 Scheda" },
          { id: "mappa", label: "🗺️ Mappa corporea" },
          { id: "storico", label: "📌 Note" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "9px 8px", borderRadius: 14, border: "none",
            background: tab === t.id ? "rgba(255,255,255,0.75)" : "transparent",
            color: tab === t.id ? "#0a1840" : "rgba(20,50,130,0.5)",
            fontWeight: tab === t.id ? 600 : 500,
            fontSize: 13, cursor: "pointer",
            boxShadow: tab === t.id ? "0 2px 0 rgba(255,255,255,0.9) inset, 0 3px 10px rgba(80,120,200,0.15)" : "none",
            transition: "all 0.2s",
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: SCHEDA ── */}
      {tab === "scheda" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { field: "servizi_abituali", label: "✂️ Servizi abituali", icon: "✂️" },
            { field: "preferenze_proprietario", label: "💬 Preferenze del proprietario", icon: "💬" },
            { field: "zone_critiche", label: "⚠️ Zone critiche", icon: "⚠️" },
            { field: "problemi_salute", label: "🏥 Problemi di salute", icon: "🏥" },
            { field: "problemi_carattere", label: "🧠 Problemi caratteriali", icon: "🧠" },
          ].map(({ field, label }) => (
            <div key={field} style={{ ...glass, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,50,130,0.5)", letterSpacing: "0.4px", textTransform: "uppercase" }}>{label}</div>
                <button onClick={() => startEdit(field, pet[field])} style={{
                  fontSize: 11, fontWeight: 600,
                  background: "rgba(59,130,246,0.1)", color: "#2563eb",
                  border: "none", borderRadius: 8, padding: "3px 10px", cursor: "pointer"
                }}>Modifica</button>
              </div>
              {editing === field ? (
                <div>
                  <textarea
                    value={editVal}
                    onChange={(e) => setEditVal(e.target.value)}
                    rows={3}
                    style={fieldStyle}
                    autoFocus
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={saveEdit} style={{
                      flex: 1, padding: "8px", borderRadius: 10, border: "none",
                      background: "linear-gradient(145deg,#5aabff,#2060dd)",
                      color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer"
                    }}>Salva</button>
                    <button onClick={() => setEditing(null)} style={{
                      padding: "8px 16px", borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.8)",
                      background: "rgba(255,255,255,0.4)", color: "rgba(20,50,130,0.6)",
                      fontSize: 13, cursor: "pointer"
                    }}>Annulla</button>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 14, color: pet[field] ? "#0f2050" : "rgba(20,50,130,0.35)", lineHeight: 1.6 }}>
                  {pet[field] || "Nessuna nota"}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB: MAPPA CORPOREA ── */}
      {tab === "mappa" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          {/* Istruzioni */}
          <div style={{ ...glass, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 24 }}>✏️</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1840" }}>Segna una zona critica</div>
              <div style={{ fontSize: 12, color: "rgba(20,50,130,0.55)", marginTop: 2 }}>
                Disegna o cerchia un'area sulla sagoma. L'AI riconoscerà la zona automaticamente.
              </div>
            </div>
          </div>

          {/* Selettore specie */}
          <div style={{ display: "flex", gap: 8 }}>
            {["cane", "gatto"].map((s) => (
              <button key={s} onClick={() => setPet((p) => ({ ...p, specie: s }))} style={{
                flex: 1, padding: "9px", borderRadius: 13,
                border: "1px solid rgba(255,255,255,0.8)",
                background: pet.specie === s ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.3)",
                color: pet.specie === s ? "#0a1840" : "rgba(20,50,130,0.5)",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                boxShadow: pet.specie === s ? "0 2px 0 rgba(255,255,255,0.9) inset" : "none",
                transition: "all 0.2s",
              }}>
                {s === "cane" ? "🐕 Cane" : "🐈 Gatto"}
              </button>
            ))}
          </div>

          {/* Canvas area */}
          <div style={{ ...glass, padding: 16, position: "relative" }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", borderRadius: 14, overflow: "hidden", background: "rgba(200,220,255,0.15)" }}>
              {/* SVG sagoma */}
              <svg
                ref={svgRef}
                viewBox="0 0 400 300"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: "rgba(30,80,180,0.15)" }}
                dangerouslySetInnerHTML={{ __html: pet.specie === "cane" ? DOG_SILHOUETTE : CAT_SILHOUETTE }}
              />
              {/* Canvas disegno */}
              <canvas
                ref={canvasRef}
                width={400}
                height={300}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "crosshair", touchAction: "none" }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {/* Overlay analisi */}
              {isAnalyzing && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(200,220,255,0.5)",
                  backdropFilter: "blur(6px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 10, borderRadius: 14
                }}>
                  <div style={{ fontSize: 28 }}>🔍</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a3a7a" }}>Claude sta analizzando la zona...</div>
                </div>
              )}
            </div>

            {/* Risultato AI */}
            {aiResult && !isAnalyzing && (
              <div style={{
                marginTop: 14,
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
                borderRadius: 14, padding: "14px 16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 14 }}>🤖</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                    Zona riconosciuta da Claude
                  </div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#0a1840", marginBottom: 4 }}>
                  {aiResult.zona} {aiResult.lato && aiResult.lato !== "centrale" ? `(${aiResult.lato})` : ""}
                </div>
                <div style={{ fontSize: 13, color: "#0f2050", marginBottom: 6 }}>{aiResult.descrizione}</div>
                {aiResult.suggerimento && (
                  <div style={{ fontSize: 12, color: "rgba(20,50,130,0.65)", fontStyle: "italic" }}>
                    💡 {aiResult.suggerimento}
                  </div>
                )}
                <div style={{ fontSize: 11, color: "#059669", marginTop: 8, fontWeight: 600 }}>
                  ✅ Aggiunto automaticamente a "Zone critiche"
                </div>
              </div>
            )}

            {/* Pulsante cancella */}
            {drawings.length > 0 && (
              <button onClick={clearCanvas} style={{
                marginTop: 12, width: "100%", padding: "9px",
                borderRadius: 12, border: "1px solid rgba(255,255,255,0.8)",
                background: "rgba(239,68,68,0.08)", color: "#dc2626",
                fontSize: 13, fontWeight: 600, cursor: "pointer"
              }}>
                🗑️ Cancella disegni
              </button>
            )}
          </div>

          {/* Annotazioni salvate */}
          {pet.annotazioni?.length > 0 && (
            <div style={{ ...glass, padding: "16px 18px" }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,50,130,0.5)", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 12 }}>
                📌 Zone segnate
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {pet.annotazioni.map((ann) => (
                  <div key={ann.id} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 12px", borderRadius: 12,
                    background: "rgba(255,255,255,0.4)",
                    border: "1px solid rgba(255,255,255,0.7)"
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", marginTop: 3, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#0a1840" }}>{ann.zona}</div>
                      <div style={{ fontSize: 12, color: "rgba(20,50,130,0.6)", marginTop: 2 }}>{ann.descrizione}</div>
                      {ann.suggerimento && (
                        <div style={{ fontSize: 11, color: "rgba(20,50,130,0.5)", fontStyle: "italic", marginTop: 3 }}>💡 {ann.suggerimento}</div>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(20,50,130,0.4)", flexShrink: 0 }}>{ann.data}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: NOTE / STORICO ── */}
      {tab === "storico" && (
        <div style={{ ...glass, padding: "20px 22px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(20,50,130,0.5)", letterSpacing: "0.4px", textTransform: "uppercase", marginBottom: 16 }}>
            Storico note e osservazioni
          </div>
          {[
            { data: "12/03/2026", op: "Sara", nota: "Pelo in ottimo stato. Cliente ha chiesto taglio più corto sulle zampe." },
            { data: "10/02/2026", op: "Luca", nota: "Orecchio destro leggermente arrossato, segnalato al proprietario. Consigliata visita veterinaria." },
            { data: "15/01/2026", op: "Luca", nota: "Prima visita. Animale collaborativo. Preferisce essere tenuto fermo dal proprietario durante il taglio unghie." },
          ].map((n, i) => (
            <div key={i} style={{
              padding: "13px 15px", borderRadius: 14, marginBottom: 10,
              background: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.7)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#2563eb" }}>{n.data}</div>
                <div style={{ fontSize: 12, color: "rgba(20,50,130,0.5)" }}>Op. {n.op}</div>
              </div>
              <div style={{ fontSize: 13, color: "#0f2050", lineHeight: 1.55 }}>{n.nota}</div>
            </div>
          ))}
          <button style={{
            width: "100%", padding: "11px", borderRadius: 14,
            border: "1px dashed rgba(59,130,246,0.4)",
            background: "rgba(59,130,246,0.05)",
            color: "#2563eb", fontWeight: 600, fontSize: 13, cursor: "pointer"
          }}>+ Aggiungi nota</button>
        </div>
      )}
    </div>
  );
}