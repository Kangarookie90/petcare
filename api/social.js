/**
 * api/social.js — Vercel Serverless Function
 * Proxy per Google Gemini 1.5 Flash (gratuito)
 *
 * Setup variabile d'ambiente su Vercel:
 *   GEMINI_API_KEY = AIza...
 */

export const config = { runtime: 'nodejs18.x' };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata su Vercel' });
  }

  let body = '';
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Body non valido' });
  }

  const prompt = body?.prompt;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt mancante' });
  }

  try {
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature:     0.85,
            maxOutputTokens: 1200,
          },
        }),
      }
    );

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      const msg = data?.error?.message || 'Errore Gemini';
      return res.status(geminiRes.status).json({ error: msg });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return res.status(200).json({ text });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Errore interno' });
  }
}