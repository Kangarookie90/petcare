/**
 * api/appuntamento-da-chiamata.js
 *
 * Pipeline:
 *   1. Riceve l'audio della telefonata (multipart/form-data)
 *   2. Groq Whisper → trascrizione
 *   3. Fuzzy matching (Fuse.js) su clienti/animali presi da Supabase server-side
 *   4. Groq LLM → JSON strutturato dell'appuntamento
 *
 * Variabili d'ambiente richieste:
 *   GROQ_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   ← service role key (mai esposta al client)
 */

import Fuse from 'fuse.js';
import { createClient } from '@supabase/supabase-js';

// Disabilita il body parser di Vercel — gestiamo noi il multipart
export const config = { api: { bodyParser: false } };

// ── Helper: legge il body multipart e restituisce { audioBuffer, mimeType } ──
async function parseAudio(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      // Estrai il boundary dal Content-Type header
      const ct = req.headers['content-type'] || '';
      const boundary = ct.split('boundary=')[1];
      if (!boundary) return reject(new Error('Boundary multipart non trovato'));

      // Split grezzo per trovare il campo "audio"
      const parts = body.toString('binary').split('--' + boundary);
      for (const part of parts) {
        if (part.includes('name="audio"')) {
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd === -1) continue;
          const headerStr = part.slice(0, headerEnd);
          const mimeMatch = headerStr.match(/Content-Type:\s*([\w/]+)/i);
          const mimeType = mimeMatch ? mimeMatch[1] : 'audio/webm';
          // Dati binari dopo il doppio \r\n, senza il \r\n-- finale
          const rawData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
          const audioBuffer = Buffer.from(rawData, 'binary');
          return resolve({ audioBuffer, mimeType });
        }
      }
      reject(new Error('Campo "audio" non trovato nel form'));
    });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const GROQ_KEY     = process.env.GROQ_API_KEY;
  const SUPA_URL     = process.env.SUPABASE_URL;
  const SUPA_SERVICE = process.env.SUPABASE_SERVICE_KEY;

  if (!GROQ_KEY || !SUPA_URL || !SUPA_SERVICE) {
    return res.status(500).json({ error: 'Variabili d\'ambiente mancanti' });
  }

  try {
    // ── 1. Leggi audio dal body multipart ────────────────────────────────
    const { audioBuffer, mimeType } = await parseAudio(req);

    // ── 2. Groq Whisper — trascrizione ───────────────────────────────────
    const audioBlob = new Blob([audioBuffer], { type: mimeType });
    const formData  = new FormData();
    formData.append('file', audioBlob, 'chiamata.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'it');
    formData.append('response_format', 'json');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method:  'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}` },
      body:    formData,
    });
    if (!whisperRes.ok) throw new Error(`Whisper: ${await whisperRes.text()}`);

    const { text: trascrizione } = await whisperRes.json();
    if (!trascrizione?.trim()) throw new Error('Trascrizione vuota');

    // ── 3. Carica clienti + animali da Supabase (service key) ────────────
    const supabase = createClient(SUPA_URL, SUPA_SERVICE);

    const [{ data: clienti }, { data: animali }, { data: operatori }] = await Promise.all([
      supabase.from('clienti').select('id, nome, cognome, telefono').order('cognome'),
      supabase.from('animali').select('id, nome, specie, cliente_id, clienti(nome, cognome)').order('nome'),
      supabase.from('operatori').select('id, nome, cognome').eq('attivo', true).order('nome'),
    ]);

    // ── 4. Fuzzy matching ─────────────────────────────────────────────────
    // Cerca corrispondenze nelle parole della trascrizione
    const parole = [...new Set(trascrizione.split(/\s+/).filter(p => p.length > 2))];

    const fuseClienti = new Fuse(clienti || [], {
      keys: ['nome', 'cognome'],
      threshold: 0.35,
      includeScore: true,
    });
    const fuseAnimali = new Fuse(animali || [], {
      keys: ['nome'],
      threshold: 0.30,
      includeScore: true,
    });
    const fuseOperatori = new Fuse(operatori || [], {
      keys: ['nome', 'cognome'],
      threshold: 0.35,
      includeScore: true,
    });

    // Prendi i migliori candidati (score più basso = match migliore in Fuse)
    const candidatiClienti = parole
      .flatMap(p => fuseClienti.search(p))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.item);

    const candidatiAnimali = parole
      .flatMap(p => fuseAnimali.search(p))
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(r => r.item);

    const candidatiOperatori = parole
      .flatMap(p => fuseOperatori.search(p))
      .sort((a, b) => a.score - b.score)
      .slice(0, 2)
      .map(r => r.item);

    // Deduplication per id
    const unici = (arr) => [...new Map(arr.map(x => [x.id, x])).values()];
    const clientiFiltrati   = unici(candidatiClienti);
    const animaliFiltrati   = unici(candidatiAnimali);
    const operatoriFiltrati = unici(candidatiOperatori);

    // ── 5. Groq LLM — estrazione strutturata ─────────────────────────────
    const oggi = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const contestoClienti = clientiFiltrati.length > 0
      ? clientiFiltrati.map(c => `  - id:"${c.id}" → ${c.cognome} ${c.nome}`).join('\n')
      : '  (nessun match trovato)';

    const contestoAnimali = animaliFiltrati.length > 0
      ? animaliFiltrati.map(a => `  - id:"${a.id}" → ${a.nome} (${a.specie}) — proprietario: ${a.clienti?.cognome} ${a.clienti?.nome} [cliente_id:"${a.cliente_id}"]`).join('\n')
      : '  (nessun match trovato)';

    const contestoOperatori = operatoriFiltrati.length > 0
      ? operatoriFiltrati.map(o => `  - id:"${o.id}" → ${o.nome} ${o.cognome}`).join('\n')
      : '  (nessun match trovato)';

    const prompt = `Sei un assistente per un salone di toelettatura. Oggi è ${oggi}.
Hai ricevuto la trascrizione di una telefonata per fissare un appuntamento.

Candidati trovati nel database:

CLIENTI:
${contestoClienti}

ANIMALI:
${contestoAnimali}

OPERATORI:
${contestoOperatori}

TRASCRIZIONE:
"${trascrizione}"

Estrai le informazioni sull'appuntamento e rispondi SOLO con un oggetto JSON valido, nessun testo aggiuntivo:

{
  "cliente_id": "uuid o null",
  "cliente_nome": "nome cognome o null",
  "animale_id": "uuid o null",
  "animale_nome": "nome o null",
  "animale_specie": "cane|gatto|altro o null",
  "operatore_id": "uuid o null",
  "operatore_nome": "nome o null",
  "data_ora": "ISO 8601 o null (es: 2025-04-25T15:00:00)",
  "servizio_ipotizzato": "descrizione breve o null",
  "note": "note aggiuntive dalla chiamata o null",
  "confidenza": "alta|media|bassa",
  "motivo_bassa_confidenza": "spiegazione se confidenza è bassa, altrimenti null"
}

Regole:
- Usa gli id esatti dai candidati. Se non sei sicuro del match, metti null e abbassa la confidenza.
- Per la data: se dicono "giovedì 25" o "giovedì prossimo" calcola la data assoluta rispetto ad oggi.
- Se menzione un orario come "alle 15" → usa T15:00:00.
- confidenza "alta" = cliente+animale+data certi. "media" = 1-2 elementi incerti. "bassa" = troppo ambiguo.`;

    const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${GROQ_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        temperature: 0.1,   // bassa temperatura per output deterministico
        max_tokens:  400,
        messages:    [{ role: 'user', content: prompt }],
      }),
    });
    if (!llmRes.ok) throw new Error(`LLM: ${await llmRes.text()}`);

    const llmData = await llmRes.json();
    const raw     = llmData.choices?.[0]?.message?.content || '';
    const clean   = raw.replace(/```json|```/g, '').trim();
    const appuntamento = JSON.parse(clean);

    return res.status(200).json({ trascrizione, appuntamento });

  } catch (e) {
    console.error('[appuntamento-da-chiamata]', e.message);
    return res.status(500).json({ error: e.message });
  }
}