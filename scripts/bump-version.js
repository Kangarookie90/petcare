/**
 * scripts/bump-version.js
 * Aggiorna src/version.js con data e versione incrementale prima di ogni build.
 * Viene eseguito automaticamente da "prebuild" in package.json.
 *
 * Logica versioning: ANNO.MESE.BUILD_DEL_GIORNO
 * Es: 2026.4.3 = terza build del 19 aprile 2026
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const versionFile = resolve(__dirname, '../src/version.js');

const now = new Date();
const year  = now.getFullYear();
const month = now.getMonth() + 1;
const day   = now.getDate();

const buildDate = `${String(day).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
const dateKey   = `${year}.${month}.${day}`;

// Legge la versione attuale per incrementare il contatore giornaliero
let buildCount = 1;
if (existsSync(versionFile)) {
  const current = readFileSync(versionFile, 'utf8');
  const matchVer = current.match(/APP_VERSION = '(\d+\.\d+)\.(\d+)'/);
  const matchDate = current.match(/\/\/ buildKey: (.+)/);
  if (matchVer && matchDate && matchDate[1] === dateKey) {
    buildCount = parseInt(matchVer[2]) + 1;
  }
}

const version = `${year}.${month}.${buildCount}`;

const content = `// Questo file viene generato automaticamente da scripts/bump-version.js
// Non modificare manualmente — verrà sovrascritto ad ogni build
// buildKey: ${dateKey}
export const APP_VERSION = '${version}';
export const BUILD_DATE = '${buildDate}';
`;

writeFileSync(versionFile, content, 'utf8');
console.log(`✓ Versione aggiornata: v${version} (${buildDate})`);