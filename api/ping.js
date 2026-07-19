// api/ping.js
// Vercel Cron — eseguito ogni 3 giorni per tenere attivo il progetto Supabase.
// Non richiede autenticazione: fa solo una query leggera su una tabella pubblica.

export default async function handler(req, res) {
  try {
    const url  = process.env.SUPABASE_URL;
    const key  = process.env.SUPABASE_ANON_KEY;

    if (!url || !key) {
      return res.status(500).json({ error: 'Variabili d\'ambiente mancanti' });
    }

    const response = await fetch(
      `${url}/rest/v1/razze?select=id&limit=1`,
      {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
        },
      }
    );

    if (!response.ok) {
      return res.status(502).json({ error: `Supabase ha risposto con ${response.status}` });
    }

    const now = new Date().toISOString();
    console.log(`[ping] Supabase attivo — ${now}`);
    return res.status(200).json({ ok: true, ts: now });

  } catch (err) {
    console.error('[ping] errore:', err);
    return res.status(500).json({ error: err.message });
  }
}