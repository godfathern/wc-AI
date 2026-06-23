import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { normalize } from './normalize.mjs';

const API = 'https://api.football-data.org/v4/competitions/WC';
const OUT = 'data/worldcup.json';

// Compare ignoring updatedAt so we only commit on real data changes.
function withoutTimestamp(obj) {
  return JSON.stringify({ ...obj, updatedAt: undefined });
}

export function writeIfChanged(path, dataObj) {
  if (existsSync(path)) {
    const existing = JSON.parse(readFileSync(path, 'utf8'));
    if (withoutTimestamp(existing) === withoutTimestamp(dataObj)) return false;
  }
  writeFileSync(path, JSON.stringify(dataObj, null, 2) + '\n');
  return true;
}

async function getJSON(url, token) {
  const res = await fetch(url, { headers: { 'X-Auth-Token': token } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function main() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error('FOOTBALL_DATA_TOKEN is not set');

  const [matchesResp, standingsResp] = await Promise.all([
    getJSON(`${API}/matches`, token),
    getJSON(`${API}/standings`, token),
  ]);

  const data = {
    updatedAt: new Date().toISOString(),
    ...normalize(matchesResp, standingsResp),
  };

  const changed = writeIfChanged(OUT, data);
  console.log(changed ? `Updated ${OUT}` : 'No change');
}

// Only run when executed directly (not when imported by tests).
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
