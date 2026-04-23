/**
 * SocialView.jsx
 * Generatore di post per Facebook e Instagram
 * Usa l'API Anthropic per generare testi con toni diversi
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TONI = [
  {
    id: 'caldo',
    label: 'Caldo & familiare',
    emoji: '🤗',
    desc: 'Vicino ai clienti, come di famiglia',
    color: '#d97706',
    bg: 'rgba(217,119,6,0.08)',
    border: 'rgba(217,119,6,0.2)',
  },
  {
    id: 'professionale',
    label: 'Professionale',
    emoji: '✨',
    desc: 'Curato, elegante, affidabile',
    color: '#2563eb',
    bg: 'rgba(37,99,235,0.08)',
    border: 'rgba(37,99,235,0.2)',
  },
  {
    id: 'spiritoso',
    label: 'Spiritoso',
    emoji: '😄',
    desc: 'Leggero, divertente, virale',
    color: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
  },
  {
    id: 'promo',
    label: 'Promozione',
    emoji: '🎉',
    desc: 'Offerta, sconto o novità',
    color: '#059669',
    bg: 'rgba(5,150,105,0.08)',
    border: 'rgba(5,150,105,0.2)',
  },
];

const TEMI = [
  'Presentazione del salone',
  'Promozione stagionale',
  'Servizio di toelettatura cani',
  'Servizio di toelettatura gatti',
  'Nuovo servizio offerto',
  'Prima visita con sconto',
  'Prima visita gratuita',
  'Benvenuto cliente',
  'Curiosità sulla cura del pelo',
  'Consiglio per la cura a casa',
  'Testimonial / cliente felice',
  'Dietro le quinte del lavoro',
  'Stagione estiva / invernale',
  'Libero (scrivi tu)',
];

export default function SocialView() {
  const [tono,       setTono]       = useState('caldo');
  const [tema,       setTema]       = useState(TEMI[0]);
  const [temaLibero, setTemaLibero] = useState('');
  const [piattaforma,setPiattaforma]= useState('instagram'); // instagram | facebook
  const [emoji,      setEmoji]      = useState(true);
  const [hashtag,    setHashtag]    = useState(true);
  const [loading,    setLoading]    = useState(false);
  const [posts,      setPosts]      = useState([]);
  const [copiato,    setCopiato]    = useState(null);
  const [errore,     setErrore]     = useState('');

  const genera = async () => {
    setLoading(true);
    setErrore('');
    setPosts([]);

    const tonoSel  = TONI.find(t => t.id === tono);
    const temaFin  = tema === 'Libero (scrivi tu)' ? temaLibero : tema;
    const piattStr = piattaforma === 'instagram' ? 'Instagram' : 'Facebook';

    const prompt = `Sei il social media manager di "Nemora", un salone di toelettatura professionale per cani e gatti.

Genera 3 post distinti per ${piattStr} sul tema: "${temaFin}".
Tono: ${tonoSel.label} — ${tonoSel.desc}.
${emoji ? 'Usa emoji pertinenti.' : 'Non usare emoji.'}
${hashtag && piattaforma === 'instagram' ? 'Aggiungi 5-8 hashtag rilevanti in italiano e inglese alla fine.' : ''}
${piattaforma === 'facebook' ? 'Testo più lungo e narrativo, adatto a Facebook (150-250 parole).' : 'Testo breve e d\'impatto, adatto a Instagram (80-120 parole).'}

Rispondi SOLO con un oggetto JSON valido, senza testo aggiuntivo, senza backtick, nel seguente formato:
{"posts": ["testo post 1", "testo post 2", "testo post 3"]}`;

    try {
      const res = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Errore server');
      const text  = data.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setPosts(parsed.posts || []);
    } catch (e) {
      setErrore('Errore nella generazione. Riprova.');
    }
    setLoading(false);
  };

  const copia = (testo, i) => {
    navigator.clipboard.writeText(testo).then(() => {
      setCopiato(i);
      setTimeout(() => setCopiato(null), 2000);
    });
  };

  const tonoSel = TONI.find(t => t.id === tono);

  return (
    <div style={{ padding: '0 0 2rem', width: '100%' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px', letterSpacing: '-0.5px' }}>
          Generatore post social
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
          Crea testi pronti per Facebook e Instagram con un click
        </p>
      </motion.div>

      {/* Piattaforma */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['instagram', 'facebook'].map(p => (
          <button key={p} onClick={() => setPiattaforma(p)}
            style={{ flex: 1, padding: '11px', borderRadius: 14, border: `1.5px solid ${piattaforma === p ? (p === 'instagram' ? '#db2777' : '#2563eb') : 'var(--card-border)'}`, background: piattaforma === p ? (p === 'instagram' ? 'rgba(219,39,119,0.08)' : 'rgba(37,99,235,0.08)') : 'var(--card-bg)', color: piattaforma === p ? (p === 'instagram' ? '#db2777' : '#2563eb') : 'var(--text-muted)', fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {p === 'instagram' ? '📸' : '👍'} {p === 'instagram' ? 'Instagram' : 'Facebook'}
          </button>
        ))}
      </motion.div>

      {/* Tono */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>Tono</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {TONI.map(t => (
            <button key={t.id} onClick={() => setTono(t.id)}
              style={{ padding: '12px 14px', borderRadius: 14, border: `1.5px solid ${tono === t.id ? t.border : 'var(--card-border)'}`, background: tono === t.id ? t.bg : 'var(--card-bg)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>{t.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: tono === t.id ? t.color : 'var(--text-primary)', marginBottom: 2 }}>{t.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.desc}</div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Tema */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>Tema del post</div>
        <select value={tema} onChange={e => setTema(e.target.value)}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}>
          {TEMI.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {tema === 'Libero (scrivi tu)' && (
          <input
            value={temaLibero}
            onChange={e => setTemaLibero(e.target.value)}
            placeholder="Descrivi il tema del post..."
            style={{ marginTop: 8, width: '100%', padding: '12px 14px', borderRadius: 14, border: '1px solid var(--card-border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
          />
        )}
      </motion.div>

      {/* Opzioni */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Emoji', val: emoji, set: setEmoji },
          { label: 'Hashtag', val: hashtag, set: setHashtag, hideOn: 'facebook' },
        ].filter(o => !(o.hideOn && piattaforma === o.hideOn)).map(o => (
          <button key={o.label} onClick={() => o.set(v => !v)}
            style={{ padding: '8px 14px', borderRadius: 20, border: `1.5px solid ${o.val ? tonoSel.border : 'var(--card-border)'}`, background: o.val ? tonoSel.bg : 'var(--card-bg)', color: o.val ? tonoSel.color : 'var(--text-muted)', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
            {o.label}
          </button>
        ))}
      </motion.div>

      {/* Bottone genera */}
      <motion.button
        onClick={genera}
        disabled={loading || (tema === 'Libero (scrivi tu)' && !temaLibero.trim())}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', padding: '15px', borderRadius: 16, border: 'none', background: tonoSel.color, color: '#fff', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', marginBottom: 24, opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.3"/><path d="M21 12a9 9 0 00-9-9"/>
            </svg>
            Generazione in corso...
          </>
        ) : '✦ Genera 3 post'}
      </motion.button>

      {/* Errore */}
      {errore && (
        <div style={{ padding: '12px 16px', borderRadius: 14, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', fontSize: 13, marginBottom: 16 }}>
          {errore}
        </div>
      )}

      {/* Risultati */}
      <AnimatePresence>
        {posts.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              Post generati — tocca per copiare
            </div>
            {posts.map((testo, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                onClick={() => copia(testo, i)}
                style={{ background: 'var(--card-bg)', border: `1.5px solid ${copiato === i ? tonoSel.border : 'var(--card-border)'}`, borderRadius: 18, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' }}>
                {/* Badge numero */}
                <div style={{ position: 'absolute', top: 12, left: 16, fontSize: 11, fontWeight: 700, color: tonoSel.color, background: tonoSel.bg, padding: '2px 8px', borderRadius: 20 }}>
                  Post {i + 1}
                </div>
                {/* Testo */}
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.7, marginTop: 24, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {testo}
                </div>
                {/* Feedback copia */}
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: copiato === i ? '#059669' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {copiato === i ? (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copiato!</>
                    ) : (
                      <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Tocca per copiare</>
                    )}
                  </span>
                </div>
              </motion.div>
            ))}

            {/* Rigenera */}
            <button onClick={genera} disabled={loading}
              style={{ marginTop: 8, padding: '12px', borderRadius: 14, border: `1px solid ${tonoSel.border}`, background: tonoSel.bg, color: tonoSel.color, fontSize: 13, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              Rigenera altri 3 post
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}