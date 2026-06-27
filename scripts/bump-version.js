/**
 * bump-version.js
 * Aggiorna automaticamente src/version.js ad ogni build.
 * Viene eseguito come prebuild da package.json.
 *
 * Uso manuale: node scripts/bump-version.js
 * Uso automatico: aggiunto come "prebuild" in package.json
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, '../src/version.js');

// Versione "semantica" base (cambiala a mano quando vuoi segnare una release importante)
const BASE_VERSION = '1.4';

// Identificatore univoco di build: commit SHA (Vercel) oppure timestamp (locale)
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA;
const buildId = commitSha ? commitSha.slice(0, 7) : Date.now().toString(36);

// Data in formato YYMMDD, per leggere a colpo d'occhio quando è stato fatto il deploy
const today = new Date().toISOString().slice(0, 10);
const shortDate = today.slice(2).replace(/-/g, ''); // es. 2026-06-27 -> 260627

const newVersion = `${BASE_VERSION}.${shortDate}-${buildId}`;

const content = `// Questo file viene generato automaticamente da scripts/bump-version.js
// Non modificare manualmente — verrà sovrascritto ad ogni build
export const APP_VERSION = '${newVersion}';
export const BUILD_DATE = '${today}';
`;

writeFileSync(versionPath, content);
console.log(`[bump-version] → ${newVersion} (${today})`);