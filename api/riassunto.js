/**
 * api/riassunto.js — Endpoint Vercel per generazione scheda visita AI
 *
 * Flusso:
 *   1. Riceve audioUrl (signed URL Supabase) + dati pet
 *   2. Scarica l'audio e lo manda a Groq Whisper → trascrizione
 *   3. Manda trascrizione + dati pet a Groq Llama → scheda strutturata
 *   4. Restituisce { trascrizione, riassunto }
 *
 * Variabili d'ambiente richieste (Vercel):
 *   GROQ_API_KEY
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { audioUrl, pet } = req.body;

  if (!audioUrl || !pet) {
    return res.status(400).json({ error: 'audioUrl e pet sono obbligatori' });
  }

  try {
    // ── Step 1: scarica l'audio dal signed URL di Supabase Storage ──
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) {
      throw new Error(`Impossibile scaricare l'audio: ${audioRes.statusText}`);
    }
    const audioBuffer = await audioRes.arrayBuffer();

    // ── Step 2: Groq Whisper — trascrizione audio ──
    const formData = new FormData();
    formData.append(
      'file',
      new Blob([audioBuffer], { type: 'audio/webm' }),
      'memo.webm'
    );
    formData.append('model', 'whisper-large-v3-turbo'); // veloce, ottimo per italiano
    formData.append('language', 'it');
    formData.append('response_format', 'json');

    const whisperRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: formData,
    });

    if (!whisperRes.ok) {
      const err = await whisperRes.text();
      throw new Error(`Whisper error: ${err}`);
    }

    const { text: trascrizione } = await whisperRes.json();

    if (!trascrizione || trascrizione.trim().length === 0) {
      throw new Error('Trascrizione vuota — l\'audio potrebbe essere silenzioso');
    }

    // ── Step 3: Groq Llama — genera scheda strutturata ──
    const righeContesto = [
      `Nome: ${pet.nome}`,
      `Specie: ${pet.specie}`,
      pet.razza              ? `Razza: ${pet.razza}`                         : null,
      pet.allergie           ? `Allergie note: ${pet.allergie}`              : null,
      pet.farmaci_in_corso   ? `Farmaci in corso: ${pet.farmaci_in_corso}`   : null,
      pet.comportamento_note ? `Note carattere: ${pet.comportamento_note}`   : null,
    ].filter(Boolean).join('\n');

    const prompt = `Sei un assistente per una struttura di toelettatura e cura animali.
Hai ricevuto la nota vocale di un operatore registrata al termine di una visita.

Dati del pet:
${righeContesto}

Nota vocale trascritta:
"${trascrizione}"

Genera una scheda visita professionale, concisa e in italiano.
Usa esattamente questo formato (ometti le sezioni non menzionate nella nota):

🐾 SCHEDA VISITA
Servizi effettuati: ...
Osservazioni: ...
Da monitorare: ...
Note per prossima visita: ...

Sii diretto. Non aggiungere sezioni non presenti nella nota vocale.`;

    const llmRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       'llama-3.1-8b-instant',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  450,
        temperature: 0.3,
      }),
    });

    if (!llmRes.ok) {
      const err = await llmRes.text();
      throw new Error(`LLM error: ${err}`);
    }

    const llmData = await llmRes.json();
    const riassunto = llmData.choices?.[0]?.message?.content || '';

    return res.status(200).json({ trascrizione, riassunto });

  } catch (e) {
    console.error('[riassunto] Errore:', e.message);
    return res.status(500).json({ error: e.message });
  }
}