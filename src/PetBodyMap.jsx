/**
 * PetBodyMap.jsx — Mappa corporea 3 viste
 *
 * Copia le immagini in src/assets/:
 *   dog-side.png   ← Gemini_Generated_Image_9c4w769c4w769c4w.png
 *   dog-head.png   ← Gemini_Generated_Image_ql89y1ql89y1ql89.png
 *   dog-belly.png  ← Gemini_Generated_Image_svbf90svbf90svbf.png
 *
 * Props:
 *   pet          { specie, annotazioni: [] }
 *   onZoneSaved  (zonaLabel, annotations) => void
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import dogSideImg  from './assets/dog-side.png';
import dogHeadImg  from './assets/dog-head.png';
import dogBellyImg from './assets/dog-belly.png';

// ─────────────────────────────────────────────────────────────
// ZONE ANATOMICHE  (x1,y1,x2,y2 in % 0-100)
// ─────────────────────────────────────────────────────────────
const ZONES = {

  /* ── FIANCO — vista laterale sinistra ──────────────────────
     Cane rivolto a sinistra. Testa top-left, coda top-right.  */
  fianco: [
    { id:'orecchio_sx',    name:'Orecchio',              lato:'sinistro (visibile)',
      desc:'Padiglione auricolare sinistro, in primo piano',
      tip:'Pulire il padiglione delicatamente, verificare odori o secrezioni',
      x1:17, y1:2,  x2:30, y2:18 },
    { id:'orecchio_dx',    name:'Orecchio',              lato:'destro (parzialmente visibile)',
      desc:'Padiglione auricolare destro, parzialmente nascosto',
      tip:'Meno accessibile — controllare solo l\'esterno',
      x1:28, y1:2,  x2:40, y2:17 },
    { id:'testa',          name:'Testa / Cranio',        lato:'centrale',
      desc:'Volta cranica e zona frontale',
      tip:'Controllare la cute, cercare parassiti o lesioni',
      x1:12, y1:10, x2:36, y2:30 },
    { id:'occhio_sx',      name:'Occhio',                lato:'sinistro (visibile)',
      desc:'Occhio sinistro e area perioculare',
      tip:'Verificare secrezioni, arrossamenti o opacità della cornea',
      x1:13, y1:22, x2:24, y2:32 },
    { id:'muso',           name:'Muso / Naso',           lato:'centrale',
      desc:'Naso, narici, labbra e mento',
      tip:'Controllare umidità del tartufo e condizione delle labbra',
      x1:2,  y1:30, x2:18, y2:48 },
    { id:'collo',          name:'Collo',                 lato:'centrale',
      desc:'Zona giugulare, trachea e zona collare',
      tip:'Verificare irritazioni da collare, gonfiori o linfonodi',
      x1:20, y1:30, x2:38, y2:52 },
    { id:'spalla_sx',      name:'Spalla',                lato:'sinistra (visibile)',
      desc:'Articolazione scapolo-omerale sinistra',
      tip:'Zona comune per displasie — manipolare con delicatezza',
      x1:28, y1:28, x2:46, y2:55 },
    { id:'petto',          name:'Petto / Sterno',        lato:'centrale',
      desc:'Zona sternale e torace anteriore',
      tip:'Area con cute sensibile, verificare prima di sfoltire',
      x1:17, y1:45, x2:36, y2:70 },
    { id:'schiena',        name:'Schiena / Dorso',       lato:'centrale',
      desc:'Colonna vertebrale e muscolatura dorsale',
      tip:'Non applicare pressione eccessiva sulle vertebre',
      x1:32, y1:18, x2:80, y2:42 },
    { id:'costole',        name:'Costole / Fianco',      lato:'sinistro (visibile)',
      desc:'Gabbia toracica e fianco laterale sinistro',
      tip:'Zona di frequente ipersensibilità — procedere con cautela',
      x1:35, y1:38, x2:66, y2:64 },
    { id:'addome',         name:'Addome',                lato:'centrale',
      desc:'Zona ventrale, inguine e ipocondrio',
      tip:'Spesso ipersensibile; verificare tensione addominale',
      x1:36, y1:60, x2:66, y2:78 },
    { id:'anca',           name:'Anca / Groppa',         lato:'sinistra (visibile)',
      desc:'Articolazione coxo-femorale e zona sacrale',
      tip:'Zona comune per displasia dell\'anca nei cani grandi',
      x1:63, y1:24, x2:84, y2:58 },
    { id:'coscia_post',    name:'Coscia posteriore',     lato:'sinistra (visibile)',
      desc:'Muscolatura della coscia posteriore sinistra',
      tip:'Verificare tono muscolare e sensibilità alla palpazione',
      x1:60, y1:50, x2:76, y2:74 },
    { id:'coda',           name:'Coda',                  lato:'centrale',
      desc:'Base, fusto e punta della coda',
      tip:'Attenzione alla base — spesso pruriginosa o irritata',
      x1:72, y1:3,  x2:98, y2:44 },
    { id:'gomito_sx',      name:'Gomito',                lato:'sinistro anteriore (visibile)',
      desc:'Articolazione del gomito dell\'arto anteriore sinistro',
      tip:'Zona frequente di calli; controllare durezza e irritazioni',
      x1:22, y1:52, x2:35, y2:64 },
    { id:'avambraccio_sx', name:'Avambraccio anteriore', lato:'sinistro (visibile)',
      desc:'Avambraccio arto anteriore sinistro',
      tip:'Verificare abrasioni o irritazioni cutanee',
      x1:18, y1:62, x2:30, y2:80 },
    { id:'zampa_ant_sx',   name:'Zampa anteriore',       lato:'sinistra (visibile, primo piano)',
      desc:'Polso, metacarpo e dita arto anteriore sinistro',
      tip:'Controllare cuscinetti, interdigitale e lunghezza unghie',
      x1:14, y1:78, x2:28, y2:100 },
    { id:'zampa_ant_dx',   name:'Zampa anteriore',       lato:'destra (parzialmente visibile)',
      desc:'Arto anteriore destro, parzialmente nascosto',
      tip:'Controllare cuscinetti e unghie lato destro',
      x1:28, y1:74, x2:42, y2:100 },
    { id:'garretto_sx',    name:'Ginocchio / Garretto',  lato:'sinistro posteriore (visibile)',
      desc:'Articolazione femoro-tibio-rotulea e garretto sinistro',
      tip:'Zona di lussazione rotulea nei cani piccoli; verificare stabilità',
      x1:57, y1:66, x2:70, y2:78 },
    { id:'zampa_post_sx',  name:'Zampa posteriore',      lato:'sinistra (visibile, primo piano)',
      desc:'Tarso, metatarso e dita arto posteriore sinistro',
      tip:'Controllare cuscinetti, interdigitale e unghie posteriori',
      x1:55, y1:76, x2:69, y2:100 },
    { id:'zampa_post_dx',  name:'Zampa posteriore',      lato:'destra (parzialmente visibile)',
      desc:'Arto posteriore destro, parzialmente nascosto',
      tip:'Controllare cuscinetti lato destro',
      x1:68, y1:76, x2:82, y2:100 },
  ],

  /* ── TESTA — vista frontale ─────────────────────────────────
     Immagine landscape ~1500x900. Testa centrata.
     Dx/Sx = lato del CANE (dx cane = lato sinistro immagine)  */
  testa: [
    { id:'cranio',         name:'Cranio / Fronte',       lato:'centrale',
      desc:'Volta cranica, fronte e area interauricolare',
      tip:'Cercare parassiti, lesioni cutanee o alopecia',
      x1:28, y1:2,  x2:72, y2:22 },
    { id:'orecchio_dx_f',  name:'Orecchio',              lato:'destro (lato sinistro immagine)',
      desc:'Padiglione auricolare destro, orecchio pendente',
      tip:'Pulire con garza umida, verificare secrezioni o odori',
      x1:2,  y1:18, x2:28, y2:68 },
    { id:'orecchio_sx_f',  name:'Orecchio',              lato:'sinistro (lato destro immagine)',
      desc:'Padiglione auricolare sinistro, orecchio pendente',
      tip:'Pulire con garza umida, verificare secrezioni o odori',
      x1:72, y1:18, x2:98, y2:68 },
    { id:'occhio_dx_f',    name:'Occhio',                lato:'destro (lato sinistro immagine)',
      desc:'Occhio destro e area perioculare destra',
      tip:'Verificare secrezioni, entropion, lacrimazione eccessiva',
      x1:25, y1:24, x2:46, y2:43 },
    { id:'occhio_sx_f',    name:'Occhio',                lato:'sinistro (lato destro immagine)',
      desc:'Occhio sinistro e area perioculare sinistra',
      tip:'Verificare secrezioni, entropion, lacrimazione eccessiva',
      x1:54, y1:24, x2:75, y2:43 },
    { id:'naso_f',         name:'Naso / Tartufo',        lato:'centrale',
      desc:'Tartufo, narici e filtro',
      tip:'Controllare umidità, screpolature o secrezioni nasali',
      x1:38, y1:34, x2:62, y2:56 },
    { id:'guancia_dx_f',   name:'Guancia',               lato:'destra (lato sinistro immagine)',
      desc:'Guancia e regione mascellare destra',
      tip:'Palpare per verificare linfonodi sottomandibolari',
      x1:5,  y1:38, x2:30, y2:72 },
    { id:'guancia_sx_f',   name:'Guancia',               lato:'sinistra (lato destro immagine)',
      desc:'Guancia e regione mascellare sinistra',
      tip:'Palpare per verificare linfonodi sottomandibolari',
      x1:70, y1:38, x2:95, y2:72 },
    { id:'bocca_f',        name:'Bocca / Labbra',        lato:'centrale',
      desc:'Labbra superiori, commissure labiali',
      tip:'Verificare igiene dentale e condizione delle gengive',
      x1:28, y1:55, x2:72, y2:78 },
    { id:'denti_f',        name:'Denti / Gengive',       lato:'centrale',
      desc:'Arcata dentale visibile, gengive e lingua',
      tip:'Controllare tartaro, gengive pallide o sanguinanti',
      x1:32, y1:62, x2:68, y2:82 },
    { id:'mento_f',        name:'Mento / Giogaia',       lato:'centrale',
      desc:'Mento, zona sottomandibolare e giogaia',
      tip:'Verificare gonfiori, linfonodi e irritazioni da pelo bagnato',
      x1:30, y1:78, x2:70, y2:100 },
  ],

  /* ── PANCIA — vista ventrale (cane sul dorso) ───────────────
     Immagine quadrata ~1024x1024.
     Testa → top-left. Coda → bottom-right.
     Zampe anteriori → sinistra. Zampe posteriori → destra.   */
  pancia: [
    { id:'zampa_ant_sx_p', name:'Zampa anteriore',       lato:'sinistra (faccia interna)',
      desc:'Faccia interna arto anteriore sinistro e zona ascellare',
      tip:'Controllare ascella per irritazioni e cuscino carpale',
      x1:2,  y1:10, x2:20, y2:52 },
    { id:'zampa_ant_dx_p', name:'Zampa anteriore',       lato:'destra (faccia interna)',
      desc:'Faccia interna arto anteriore destro e zona ascellare',
      tip:'Controllare ascella per irritazioni e cuscino carpale',
      x1:3,  y1:52, x2:22, y2:90 },
    { id:'petto_sterno',   name:'Petto / Sterno',        lato:'centrale (zona toracica)',
      desc:'Zona sternale e torace ventrale',
      tip:'Verificare presenza di noduli o irritazioni cutanee',
      x1:18, y1:14, x2:42, y2:42 },
    { id:'mammelle_cr',    name:'Mammelle craniali',      lato:'centrale',
      desc:'Prima e seconda coppia di mammelle (zona toracica)',
      tip:'Controllare irregolarità, induriménti o secrezioni',
      x1:22, y1:38, x2:52, y2:58 },
    { id:'addome_p',       name:'Addome',                lato:'centrale',
      desc:'Zona addominale centrale, ombelico e linea alba',
      tip:'Verificare tensione addominale e sensibilità alla palpazione',
      x1:35, y1:42, x2:65, y2:65 },
    { id:'mammelle_ca',    name:'Mammelle caudali',       lato:'centrale',
      desc:'Terza e quarta coppia di mammelle (zona addominale)',
      tip:'Controllare irregolarità, induriménti o secrezioni',
      x1:48, y1:45, x2:72, y2:68 },
    { id:'inguine_p',      name:'Zona inguinale',         lato:'centrale',
      desc:'Area inguinale, genitali esterni e zona perineale',
      tip:'Verificare gonfiori inguinali, igiene e parassiti',
      x1:60, y1:48, x2:80, y2:72 },
    { id:'zampa_post_sx_p',name:'Zampa posteriore',       lato:'sinistra (faccia interna)',
      desc:'Faccia interna arto posteriore sinistro e zona inguinale',
      tip:'Verificare la piega inguinale e cuscini plantari',
      x1:68, y1:8,  x2:90, y2:52 },
    { id:'zampa_post_dx_p',name:'Zampa posteriore',       lato:'destra (faccia interna)',
      desc:'Faccia interna arto posteriore destro e zona inguinale',
      tip:'Verificare la piega inguinale e cuscini plantari',
      x1:72, y1:52, x2:95, y2:88 },
    { id:'coda_p',         name:'Coda (base)',            lato:'centrale',
      desc:'Base della coda e zona perineale',
      tip:'Pulire zona perineale; verificare base coda per irritazioni',
      x1:78, y1:75, x2:98, y2:98 },
  ],
};

// ─────────────────────────────────────────────────────────────
// CONFIG VISTE
// ─────────────────────────────────────────────────────────────
const VIEWS = [
  { id:'fianco', label:'Fianco', icon:'👁️', img:dogSideImg,  zones:ZONES.fianco },
  { id:'testa',  label:'Testa',  icon:'🐶', img:dogHeadImg,  zones:ZONES.testa  },
  { id:'pancia', label:'Pancia', icon:'🔄', img:dogBellyImg, zones:ZONES.pancia },
];

// ─────────────────────────────────────────────────────────────
// RILEVAMENTO ZONA
// ─────────────────────────────────────────────────────────────
function detectZone(px, py, zones) {
  let best = null, bestDist = Infinity;
  for (const z of zones) {
    if (px >= z.x1 && px <= z.x2 && py >= z.y1 && py <= z.y2) {
      const d = Math.hypot(px - (z.x1 + z.x2) / 2, py - (z.y1 + z.y2) / 2);
      if (d < bestDist) { bestDist = d; best = z; }
    }
  }
  if (!best) {
    for (const z of zones) {
      const d = Math.hypot(px - (z.x1 + z.x2) / 2, py - (z.y1 + z.y2) / 2);
      if (d < bestDist) { bestDist = d; best = z; }
    }
  }
  return best;
}

// ─────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────
export default function PetBodyMap({ pet, onZoneSaved }) {
  const [vista,       setVista]       = useState('fianco');
  const [drawings,    setDrawings]    = useState([]);
  const [currentPath, setCurrentPath] = useState([]);
  const [isDrawing,   setIsDrawing]   = useState(false);
  const [result,      setResult]      = useState(null);
  const [annotations, setAnnotations] = useState(pet?.annotazioni || []);

  const canvasRef = useRef(null);
  const imgRef    = useRef(null);
  const currentView = VIEWS.find(v => v.id === vista);

  const changeVista = (id) => {
    setVista(id); setDrawings([]); setCurrentPath([]); setResult(null);
    const cv = canvasRef.current;
    if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  };

  const syncSize = useCallback(() => {
    const img = imgRef.current, cv = canvasRef.current;
    if (!img || !cv) return;
    cv.width  = img.naturalWidth  || img.offsetWidth;
    cv.height = img.naturalHeight || img.offsetHeight;
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    img.complete ? syncSize() : (img.onload = syncSize);
  }, [vista, syncSize]);

  const getPos = (e, cv) => {
    const r = cv.getBoundingClientRect();
    const sx = cv.width / r.width, sy = cv.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (cx - r.left) * sx, y: (cy - r.top) * sy };
  };

  const redraw = useCallback((all) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    all.forEach(({ path, color }) => {
      if (path.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color || '#ef4444';
      ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = 0.85;
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
      const xs = path.map(p => p.x), ys = path.map(p => p.y);
      const ccx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const ccy = (Math.min(...ys) + Math.max(...ys)) / 2;
      ctx.beginPath(); ctx.arc(ccx, ccy, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(239,68,68,0.2)'; ctx.globalAlpha = 1; ctx.fill();
    });
  }, []);

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    setCurrentPath([getPos(e, canvasRef.current)]);
    setResult(null);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const np = [...currentPath, getPos(e, canvasRef.current)];
    setCurrentPath(np);
    redraw([...drawings, { path: np, color: '#ef4444' }]);
  };

  const endDraw = (e) => {
    e?.preventDefault();
    if (!isDrawing || currentPath.length < 3) { setIsDrawing(false); return; }
    setIsDrawing(false);
    const nd = { path: [...currentPath], color: '#ef4444', id: Date.now() };
    const upd = [...drawings, nd];
    setDrawings(upd); setCurrentPath([]);
    redraw(upd);
    identifyZone(nd);
  };

  const identifyZone = (drawing) => {
    const cv = canvasRef.current;
    if (!cv) return;
    const xs = drawing.path.map(p => p.x), ys = drawing.path.map(p => p.y);
    const px = ((Math.min(...xs) + Math.max(...xs)) / 2) / cv.width  * 100;
    const py = ((Math.min(...ys) + Math.max(...ys)) / 2) / cv.height * 100;
    const zone = detectZone(px, py, currentView.zones);
    if (!zone) return;
    setResult(zone);
    const label = `${zone.name} (${zone.lato})`;
    const ann = {
      id: Date.now(), zona: label, vista,
      descrizione: zone.desc, suggerimento: zone.tip,
      data: new Date().toLocaleDateString('it-IT'),
    };
    const upd = [...annotations, ann];
    setAnnotations(upd);
    onZoneSaved?.(label, upd);
  };

  const clearCanvas = () => {
    setDrawings([]); setResult(null);
    const cv = canvasRef.current;
    if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  };

  const glass = {
    background: 'var(--card-bg)',
    border: '1px solid rgba(255,255,255,0.8)',
    borderRadius: 20,
    boxShadow: 'var(--card-shadow)',
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12, maxWidth:720, margin:'0 auto' }}>

      {/* Istruzioni */}
      <div style={{ ...glass, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
        <span style={{ fontSize:22 }}>✏️</span>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>Segna una zona critica</div>
          <div style={{ fontSize:12, color:'var(--text-secondary)', marginTop:2 }}>
            Disegna o cerchia — riconoscimento istantaneo su {currentView.zones.length} zone
          </div>
        </div>
      </div>

      {/* Selettore vista */}
      <div style={{ ...glass, padding:'6px', display:'flex', gap:4 }}>
        {VIEWS.map(v => (
          <button key={v.id} onClick={() => changeVista(v.id)} style={{
            flex:1, padding:'9px 6px', borderRadius:14, border:'none', cursor:'pointer',
            fontFamily:'inherit', fontSize:13, transition:'all 0.2s',
            background: vista===v.id ? 'var(--card-border)' : 'transparent',
            color:      vista===v.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: vista===v.id ? 600 : 500,
            boxShadow:  vista===v.id
              ? 'var(--card-shadow-sm)'
              : 'none',
          }}>
            {v.icon} {v.label}
          </button>
        ))}
      </div>

      {/* Area disegno */}
      <div style={{ ...glass, padding:14 }}>
        <div style={{ position:'relative', width:'100%', borderRadius:14, overflow:'hidden', lineHeight:0 }}>
          <img
            ref={imgRef}
            src={currentView.img}
            alt={`Sagoma ${vista}`}
            style={{ width:'100%', display:'block', borderRadius:14 }}
            onLoad={syncSize}
          />
          <canvas
            ref={canvasRef}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%',
              cursor:'crosshair', touchAction:'none', borderRadius:14 }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={() => isDrawing && endDraw()}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>

        {/* Risultato */}
        {result && (
          <div style={{ marginTop:14, background:'rgba(59,130,246,0.08)',
            border:'1px solid rgba(59,130,246,0.2)', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#2563eb',
              textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:7 }}>
              ⚡ Zona riconosciuta istantaneamente
            </div>
            <div style={{ fontSize:16, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>
              {result.name}
            </div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', fontWeight:500, marginBottom:6 }}>
              {result.lato}
            </div>
            <div style={{ fontSize:13, color:'var(--text-primary)', lineHeight:1.5, marginBottom:6 }}>
              {result.desc}
            </div>
            <div style={{ fontSize:12, color:'var(--text-secondary)', fontStyle:'italic' }}>
              💡 {result.tip}
            </div>
            <div style={{ fontSize:11, color:'#059669', marginTop:10, fontWeight:600 }}>
              ✅ Aggiunto automaticamente a "Zone critiche"
            </div>
          </div>
        )}

        {/* Cancella */}
        {drawings.length > 0 && (
          <button onClick={clearCanvas} style={{
            marginTop:12, width:'100%', padding:'9px', borderRadius:12, cursor:'pointer',
            border:'1px solid rgba(255,255,255,0.8)', background:'rgba(239,68,68,0.08)',
            color:'#dc2626', fontSize:13, fontWeight:600, fontFamily:'inherit',
          }}>
            🗑️ Cancella disegni
          </button>
        )}
      </div>

      {/* Zone segnate */}
      {annotations.length > 0 && (
        <div style={{ ...glass, padding:'16px 18px' }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-secondary)',
            letterSpacing:'0.5px', textTransform:'uppercase', marginBottom:12 }}>
            📌 Zone segnate ({annotations.length})
          </div>
          {annotations.map(ann => (
            <div key={ann.id} style={{
              display:'flex', alignItems:'flex-start', gap:10,
              padding:'10px 12px', borderRadius:12, marginBottom:8,
              background:'var(--card-bg-sm)', border:'1px solid rgba(255,255,255,0.7)',
            }}>
              <div style={{ width:10, height:10, borderRadius:'50%', background:'#ef4444',
                marginTop:3, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{ann.zona}</div>
                <div style={{ fontSize:11, color:'var(--text-secondary)', marginTop:2 }}>
                  Vista: {ann.vista} - {ann.descrizione}
                </div>
                {ann.suggerimento && (
                  <div style={{ fontSize:11, color:'var(--text-secondary)',
                    fontStyle:'italic', marginTop:3 }}>
                    💡 {ann.suggerimento}
                  </div>
                )}
              </div>
              <div style={{ fontSize:10, color:'var(--text-muted)', flexShrink:0 }}>
                {ann.data}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}