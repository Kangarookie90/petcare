// api/backup-sql.js
// Genera un file .sql completo (schema + dati) scaricabile dal browser.
// Protetto da password via query string: /api/backup-sql?pwd=TUA_PASSWORD
//
// Configura la password come variabile d'ambiente su Vercel:
//   BACKUP_PASSWORD=qualcosa-di-sicuro
//
// Uso: apri nel browser https://tuoapp.vercel.app/api/backup-sql?pwd=TUA_PASSWORD
// Il browser scarica automaticamente nemora-backup-YYYY-MM-DD.sql

export default async function handler(req, res) {
  // ── 1. Autenticazione semplice via query string ──────────────
  const pwd = process.env.BACKUP_PASSWORD;
  if (pwd && req.query.pwd !== pwd) {
    return res.status(401).send('Non autorizzato');
  }

  const SUPABASE_URL      = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE) {
    return res.status(500).send('Variabili d\'ambiente mancanti');
  }

  // ── 2. Helper: query Supabase con service role ───────────────
  async function query(table, select = '*') {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${select}&order=created_at.asc`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE,
          'Authorization': `Bearer ${SUPABASE_SERVICE}`,
          'Range': '0-9999',
        },
      }
    );
    if (!r.ok) {
      console.error(`Errore fetch ${table}:`, r.status, await r.text());
      return [];
    }
    return r.json();
  }

  // ── 3. Helper: escape valore SQL ─────────────────────────────
  function escapeVal(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
    if (typeof v === 'number') return String(v);
    // Stringa — escape singolo apice
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  // ── 4. Helper: genera INSERT per una tabella ─────────────────
  function toInserts(table, rows) {
    if (!rows || rows.length === 0) return `-- (${table}: nessun dato)\n`;
    const cols = Object.keys(rows[0]);
    const lines = rows.map(row => {
      const vals = cols.map(c => escapeVal(row[c])).join(', ');
      return `INSERT INTO public.${table} (${cols.join(', ')}) VALUES (${vals}) ON CONFLICT (id) DO NOTHING;`;
    });
    return lines.join('\n') + '\n';
  }

  // ── 5. Recupera tutti i dati ─────────────────────────────────
  try {
    const [
      saloni, utenti_salone, operatori, clienti, animali,
      servizi, razze, appuntamenti, appuntamenti_servizi,
      appuntamenti_animali, primanota, notifiche,
      lista_attesa, operatori_orari
    ] = await Promise.all([
      query('saloni'),
      query('utenti_salone'),
      query('operatori'),
      query('clienti'),
      query('animali'),
      query('servizi'),
      query('razze'),
      query('appuntamenti'),
      query('appuntamenti_servizi'),
      query('appuntamenti_animali'),
      query('primanota'),
      query('notifiche'),
      query('lista_attesa'),
      query('operatori_orari'),
    ]);

    // ── 6. Componi il file SQL ───────────────────────────────────
    const now    = new Date();
    const dateFmt = now.toISOString().slice(0, 10);
    const tsLabel = now.toISOString().replace('T', ' ').slice(0, 19);

    const sql = `-- ============================================================
-- NEMORA — Backup completo
-- Generato il: ${tsLabel}
-- ============================================================
-- Per ripristinare su un nuovo progetto Supabase:
--   1. Esegui prima nemora_migrazione_finale.sql (crea schema + RLS)
--   2. Poi esegui questo file per reinserire i dati
-- ============================================================

BEGIN;

-- Disabilita temporaneamente i trigger per velocizzare l'import
SET session_replication_role = 'replica';

-- ── saloni ────────────────────────────────────────────────────
${toInserts('saloni', saloni)}

-- ── utenti_salone ─────────────────────────────────────────────
${toInserts('utenti_salone', utenti_salone)}

-- ── operatori ────────────────────────────────────────────────
${toInserts('operatori', operatori)}

-- ── clienti ──────────────────────────────────────────────────
${toInserts('clienti', clienti)}

-- ── animali ──────────────────────────────────────────────────
${toInserts('animali', animali)}

-- ── servizi ──────────────────────────────────────────────────
${toInserts('servizi', servizi)}

-- ── razze ────────────────────────────────────────────────────
${toInserts('razze', razze)}

-- ── appuntamenti ─────────────────────────────────────────────
${toInserts('appuntamenti', appuntamenti)}

-- ── appuntamenti_servizi ─────────────────────────────────────
${toInserts('appuntamenti_servizi', appuntamenti_servizi)}

-- ── appuntamenti_animali ─────────────────────────────────────
${toInserts('appuntamenti_animali', appuntamenti_animali)}

-- ── primanota ────────────────────────────────────────────────
${toInserts('primanota', primanota)}

-- ── notifiche ────────────────────────────────────────────────
${toInserts('notifiche', notifiche)}

-- ── lista_attesa ─────────────────────────────────────────────
${toInserts('lista_attesa', lista_attesa)}

-- ── operatori_orari ──────────────────────────────────────────
${toInserts('operatori_orari', operatori_orari)}

-- Ripristina trigger
SET session_replication_role = 'origin';

COMMIT;

-- ============================================================
-- Fine backup — ${tsLabel}
-- Righe totali:
--   saloni:               ${saloni.length}
--   utenti_salone:        ${utenti_salone.length}
--   operatori:            ${operatori.length}
--   clienti:              ${clienti.length}
--   animali:              ${animali.length}
--   servizi:              ${servizi.length}
--   razze:                ${razze.length}
--   appuntamenti:         ${appuntamenti.length}
--   appuntamenti_servizi: ${appuntamenti_servizi.length}
--   appuntamenti_animali: ${appuntamenti_animali.length}
--   primanota:            ${primanota.length}
--   notifiche:            ${notifiche.length}
--   lista_attesa:         ${lista_attesa.length}
--   operatori_orari:      ${operatori_orari.length}
-- ============================================================
`;

    // ── 7. Restituisce il file SQL come download ─────────────────
    const filename = `nemora-backup-${dateFmt}.sql`;
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(sql);

  } catch (err) {
    console.error('[backup-sql] errore:', err);
    return res.status(500).send(`Errore: ${err.message}`);
  }
}