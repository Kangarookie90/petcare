/**
 * api/briefing.js — Vercel Serverless Function
 * Proxy verso Groq per il briefing mattutino di Nemora.
 *
 * Stesso pattern di api/social.js già in produzione.
 * Variabile d'ambiente richiesta: GROQ_API_KEY
 *
 * Deploy: mettere questo file in /api/briefing.js nella root del progetto.
 */

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const { prompt } = req.body || {};
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt mancante' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY non configurata' });
  }

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:       'llama-3.1-8b-instant', // veloce, economico, ottimo per testi brevi
        max_tokens:  300,                    // briefing max 4 righe — 300 token bastano
        temperature: 0.65,                   // un po' di calore ma non troppo creativo
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    const data = await groqRes.json();

    if (!groqRes.ok) {
      const msg = data?.error?.message || `Errore Groq ${groqRes.status}`;
      return res.status(502).json({ error: msg });
    }

    const text = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });

  } catch (err) {
    console.error('[briefing] Errore fetch Groq:', err);
    return res.status(500).json({ error: 'Errore di rete verso Groq' });
  }
}