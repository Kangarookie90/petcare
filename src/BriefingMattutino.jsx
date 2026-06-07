/**
 * BriefingMattutino.jsx
 * Briefing mattutino AI — riassunto personalizzato della giornata
 *
 * Viene montato in HomeView (App.jsx) appena sotto l'header data/saluto.
 * Genera il testo una sola volta al giorno, lo mette in cache su
 * localStorage con la data odierna: ricaricando l'app non costa token.
 *
 * Dipendenze: già presenti nel progetto
 *   framer-motion, supabase (solo per leggere animali.problemi_carattere)
 *
 * Chiamata API: POST /api/briefing  { prompt: string }
 *   → { text: string }
 * (stesso pattern di /api/social)
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Cache chiave localStorage ─────────────────────────────────
const CACHE_KEY = 'nemora_briefing_v1';

function getCached() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { date, text } = JSON.parse(raw);
    const oggi = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    return date === oggi ? text : null;
  } catch {
    return null;
  }
}

function setCache(text) {
  try {
    const oggi = new Date().toISOString().slice(0, 10);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ date: oggi, text }));
  } catch {
    // localStorage pieno o bloccato in incognito — ignora silenziosamente
  }
}

// ── Helper: costruisce il prompt per Groq ─────────────────────
function buildPrompt(appuntamenti, inattivi) {
  const ora = new Date().getHours();
  const fascia = ora < 12 ? 'mattina' : ora < 15 ? 'tarda mattinata / primo pomeriggio' : 'pomeriggio';

  // Compatta ogni appuntamento in una riga leggibile per il modello
  const righeAp = appuntamenti.map((a, i) => {
    const orario = new Date(a.inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    const pet    = a.animali?.nome || 'Animale';
    const specie = a.animali?.specie || '';
    const cliente = a.clienti ? `${a.clienti.cognome} ${a.clienti.nome}` : '';
    const op     = a.operatori?.nome || '';
    const servizi = (a.appuntamenti_servizi || []).map(s => s.servizi?.nome).filter(Boolean).join(', ') || 'toelettatura';
    const problemi = [
      a.animali?.problemi_carattere,
      a.animali?.problemi_salute,
    ].filter(Boolean).join('; ');

    return `${i + 1}. ${orario} — ${pet} (${specie}), cliente ${cliente}, operatore ${op}, servizi: ${servizi}${problemi ? `, NOTE: ${problemi}` : ''}`;
  });

  const righeInattivi = inattivi.slice(0, 5).map(a => {
    const giorni = Math.floor((Date.now() - new Date(a.inizio).getTime()) / (1000 * 60 * 60 * 24));
    return `${a.clienti?.cognome} ${a.clienti?.nome} (${a.animali?.nome || 'pet'}, assente da ${giorni} giorni)`;
  });

  return `Sei l'assistente di "Nemora", un salone di toelettatura professionale.
È la ${fascia}. Scrivi un briefing conciso e caldo (massimo 4 righe) per l'operatore del salone, in italiano informale.

Appuntamenti di oggi (${appuntamenti.length} totali):
${righeAp.length > 0 ? righeAp.join('\n') : 'Nessun appuntamento programmato.'}

${righeInattivi.length > 0 ? `Clienti da richiamare (inattivi >60 giorni, i più urgenti):
${righeInattivi.join('\n')}` : ''}

Istruzioni:
- Tono: caldo, diretto, come una collega di fiducia — non un robot.
- Segnala eventuali animali con note caratteriali o di salute (senza ripetere tutto, solo un avviso utile).
- Se ci sono clienti inattivi, suggerisci brevemente di contattarli.
- Se la giornata è scarica, di' qualcosa di incoraggiante o pratico.
- NON iniziare con "Ecco il briefing" o formule burocratiche. Vai dritto al punto.
- Rispondi SOLO con il testo del briefing, senza etichette, senza markdown, senza virgolette.`;
}

// ── Componente principale ─────────────────────────────────────
export default function BriefingMattutino({ appuntamenti, inattivi, loading, inativiPronti }) {
  const [testo,    setTesto]    = useState(() => getCached()); // carica da cache subito
  const [genera,   setGenera]   = useState(false);             // avvia la chiamata
  const [errore,   setErrore]   = useState('');
  const [carica,   setCarica]   = useState(false);
  const [espanso,  setEspanso]  = useState(true);              // collassabile

  // Avvia generazione solo quando ENTRAMBE le fasi di caricamento sono complete:
  // - loading=false → appuntamenti di oggi pronti (Fase 1)
  // - inativiPronti=true → clienti inattivi pronti (Fase 2)
  // Così il briefing include sempre tutti i dati rilevanti.
  useEffect(() => {
    if (loading || !inativiPronti) return; // aspetta entrambe le fasi
    if (getCached()) return;               // già generato oggi
    if (appuntamenti.length === 0 && inattivi.length === 0) return;
    setGenera(true);
  }, [loading, inativiPronti]);

  // Effettua la chiamata API quando genera === true
  useEffect(() => {
    if (!genera) return;
    let cancelled = false;

    const chiamaAI = async () => {
      setCarica(true);
      setErrore('');
      try {
        const prompt = buildPrompt(appuntamenti, inattivi);
        const res = await fetch('/api/briefing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Errore server');
        const testo = (data.text || '').trim();
        if (!cancelled && testo) {
          setTesto(testo);
          setCache(testo);
        }
      } catch (e) {
        if (!cancelled) setErrore('Briefing non disponibile — ' + e.message);
      } finally {
        if (!cancelled) setCarica(false);
      }
      setGenera(false);
    };

    chiamaAI();
    return () => { cancelled = true; };
  }, [genera]); // eslint-disable-line react-hooks/exhaustive-deps

  // Non mostrare nulla se i dati stanno ancora caricando e non c'è cache
  if ((loading || !inativiPronti) && !testo) return null;

  // Non mostrare se giornata vuota e niente cache
  if (!testo && !carica && !errore && appuntamenti.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      style={{ marginBottom: 20 }}
    >
      {/* Card briefing */}
      <div style={{
        background:   'var(--card-bg)',
        border:       '1px solid var(--card-border)',
        borderRadius: 20,
        boxShadow:    'var(--card-shadow)',
        overflow:     'hidden',
      }}>
        {/* Header cliccabile */}
        <button
          onClick={() => setEspanso(v => !v)}
          style={{
            width: '100%', background: 'none', border: 'none',
            padding: '13px 16px', cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 10,
            textAlign: 'left',
          }}
        >
          {/* Icona stellina */}
          <div style={{
            width: 30, height: 30, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(145deg, rgba(90,171,255,0.25), rgba(32,96,221,0.15))',
            border: '1px solid rgba(90,171,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15,
          }}>
            ✦
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: 12, fontWeight: 700,
              color: 'var(--text-muted)',
              letterSpacing: '0.5px', textTransform: 'uppercase',
            }}>
              Briefing del giorno
            </p>
            {!espanso && testo && (
              <p style={{
                margin: '2px 0 0', fontSize: 13,
                color: 'var(--text-secondary)',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {testo.slice(0, 60)}…
              </p>
            )}
          </div>

          {/* Freccia + bottone rigenera */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {testo && !carica && (
              <div
                role="button"
                tabIndex={0}
                title="Rigenera briefing"
                onClick={e => {
                  e.stopPropagation();
                  localStorage.removeItem(CACHE_KEY);
                  setTesto(null);
                  setGenera(true);
                  setEspanso(true);
                }}
                onKeyDown={e => e.key === 'Enter' && e.currentTarget.click()}
                style={{
                  padding: '4px 6px', borderRadius: 8, cursor: 'pointer',
                  color: 'var(--text-muted)',
                  fontSize: 14, lineHeight: 1,
                  transition: 'color 0.15s',
                }}
              >
                ↺
              </div>
            )}
            <motion.svg
              width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="var(--text-muted)" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"
              animate={{ rotate: espanso ? 0 : -90 }}
              transition={{ duration: 0.2 }}
            >
              <path d="M6 9l6 6 6-6" />
            </motion.svg>
          </div>
        </button>

        {/* Corpo espanso */}
        <AnimatePresence initial={false}>
          {espanso && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                padding: '0 16px 15px',
                borderTop: '1px solid var(--card-border)',
              }}>
                {/* Stato caricamento */}
                {carica && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    paddingTop: 14,
                  }}>
                    {/* Tre pallini animati */}
                    {[0, 1, 2].map(i => (
                      <motion.div
                        key={i}
                        animate={{ opacity: [0.3, 1, 0.3], y: [0, -4, 0] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                        style={{
                          width: 7, height: 7, borderRadius: '50%',
                          background: 'var(--text-accent)',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 2 }}>
                      Sto pensando alla tua giornata…
                    </span>
                  </div>
                )}

                {/* Testo briefing */}
                {!carica && testo && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      margin: '14px 0 0',
                      fontSize: 14, lineHeight: 1.65,
                      color: 'var(--text-primary)',
                      whiteSpace: 'pre-line', // rispetta gli a-capo del modello
                    }}
                  >
                    {testo}
                  </motion.p>
                )}

                {/* Errore */}
                {!carica && errore && (
                  <p style={{
                    margin: '14px 0 0', fontSize: 13,
                    color: 'rgba(220,60,60,0.8)',
                  }}>
                    {errore}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}