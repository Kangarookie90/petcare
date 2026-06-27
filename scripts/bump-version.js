/**
 * bump-version.js
 * Aggiorna automaticamente src/version.js con la data di oggi.
 * Viene eseguito come prebuild da package.json.
 *
 * Versioning automatico:
 *   MAJOR.MINOR.PATCH dove PATCH = giorni dall'ultima release MINOR
 *   In pratica: ogni deploy aggiorna la data, la versione sale solo manualmente.
 *
 * Uso manuale: node scripts/bump-version.js
 * Uso automatico: aggiunto come "prebuild" in package.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionPath = join(__dirname, '../src/version.js');

// Leggi versione attuale
let currentVersion = '1.4.0';
try {
  const current = readFileSync(versionPath, 'utf8');
  const match = current.match(/APP_VERSION = '([^']+)'/);
  if (match) currentVersion = match[1];
} catch {}

// Data di oggi
const today = new Date().toISOString().slice(0, 10);

// Incrementa PATCH automaticamente
const [major, minor, patch] = currentVersion.split('.').map(Number);
const newVersion = `${major}.${minor}.${patch + 1}`;

const content = `// Questo file viene generato automaticamente da scripts/bump-version.js
// Non modificare manualmente — verrà sovrascritto ad ogni build
export const APP_VERSION = '${newVersion}';
export const BUILD_DATE = '${today}';
`;

writeFileSync(versionPath, content);
console.log(`[bump-version] ${currentVersion} → ${newVersion} (${today})`);