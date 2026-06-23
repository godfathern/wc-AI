# World Cup 2026 TV Wall-Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a passive, auto-refreshing single-screen website that shows the FIFA World Cup 2026 as a TV wall-chart (12 groups around the edges, knockout bracket through the middle), with today's matches highlighted in the viewer's local time and live scores.

**Architecture:** Static site (vanilla JS, no build) on GitHub Pages reads a committed `data/worldcup.json`. A scheduled GitHub Action fetches football-data.org every ~10 min (secret token) and commits the JSON; the browser re-fetches it every 60 s. Pure logic lives in importable ES modules so it is unit-tested with Node's built-in `node:test`.

**Tech Stack:** HTML/CSS + vanilla ES modules in the browser; Node 20 (`fetch`, `node:test`) for the data fetcher and tests; GitHub Actions + GitHub Pages.

---

## Conventions for the implementer

- **All commits** must end with the trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- Tests are ES modules named `*.test.mjs`; run the whole suite with `npm test` (which runs `node --test`).
- Vietnamese is the UI language. Keep the diacritics exactly as written.
- The spec lives at `docs/superpowers/specs/2026-06-23-worldcup-tv-wallchart-design.md`.

## File Structure

```
package.json                  # type:module, "test": "node --test"
index.html                    # static chart skeleton, loads app.js as a module
styles.css                    # 16:9 no-scroll grid layout, dark poster theme
app.js                        # browser entry: fetch + render + intervals (imports lib.mjs)
lib.mjs                        # PURE functions (labels, sort, time, today, bracket) — shared by app.js + tests
lib.test.mjs                  # tests for lib.mjs
scripts/normalize.mjs         # PURE: football-data.org responses -> worldcup.json shape
scripts/normalize.test.mjs    # tests for normalize
scripts/fetch-data.mjs        # I/O: fetch the API, normalize, write file if changed
scripts/fetch-data.test.mjs   # tests for writeIfChanged
scripts/demo-data.mjs         # DEV-ONLY generator: writes a demo data/worldcup.json for local UI checks
test/fixtures/matches.sample.json
test/fixtures/standings.sample.json
data/worldcup.json            # generated/committed by the Action (seeded empty initially)
.github/workflows/update-scores.yml
README.md                     # one-time GitHub setup (token secret, Pages, Actions)
```

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `data/worldcup.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "worldcup-2026-wallchart",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Seed an empty but valid `data/worldcup.json`**

This lets the page render the chart skeleton before the first Action run.

```json
{
  "updatedAt": null,
  "standings": [],
  "matches": []
}
```

- [ ] **Step 3: Verify Node version**

Run: `node --version`
Expected: `v20.x` or higher (so built-in `fetch` and `node:test` are available).

- [ ] **Step 4: Commit**

```bash
git add package.json data/worldcup.json
git commit -m "chore: scaffold project (package.json + seed data)"
```

---

### Task 2: Labels, groups, and standings sort (`lib.mjs`)

**Files:**
- Create: `lib.mjs`
- Test: `lib.test.mjs`

- [ ] **Step 1: Write the failing test** — create `lib.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROUPS, KNOCKOUT_STAGES, STAGE_LABEL, groupLabel, sortStandings } from './lib.mjs';

test('GROUPS lists the 12 groups A..L', () => {
  assert.equal(GROUPS.length, 12);
  assert.equal(GROUPS[0], 'A');
  assert.equal(GROUPS[11], 'L');
});

test('groupLabel and STAGE_LABEL are Vietnamese', () => {
  assert.equal(groupLabel('A'), 'NHÓM A');
  assert.equal(STAGE_LABEL.FINAL, 'CHUNG KẾT');
  assert.equal(STAGE_LABEL.LAST_32, 'VÒNG 32');
  assert.deepEqual(KNOCKOUT_STAGES, [
    'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
  ]);
});

test('sortStandings orders by points, then GD, then GF', () => {
  const table = [
    { team: 'A', points: 3, gd: 1, gf: 2 },
    { team: 'B', points: 6, gd: 0, gf: 1 },
    { team: 'C', points: 6, gd: 2, gf: 3 },
  ];
  assert.deepEqual(sortStandings(table).map(r => r.team), ['C', 'B', 'A']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./lib.mjs` (or export not defined).

- [ ] **Step 3: Write minimal implementation** — create `lib.mjs`:

```js
export const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const KNOCKOUT_STAGES = [
  'LAST_32', 'LAST_16', 'QUARTER_FINALS', 'SEMI_FINALS', 'THIRD_PLACE', 'FINAL',
];

export const STAGE_LABEL = {
  GROUP_STAGE: 'VÒNG BẢNG',
  LAST_32: 'VÒNG 32',
  LAST_16: 'VÒNG 16',
  QUARTER_FINALS: 'VÒNG TỨ KẾT',
  SEMI_FINALS: 'VÒNG BÁN KẾT',
  THIRD_PLACE: 'TRANH HẠNG BA',
  FINAL: 'CHUNG KẾT',
};

export function groupLabel(letter) {
  return `NHÓM ${letter}`;
}

export function sortStandings(table) {
  return [...table].sort(
    (a, b) =>
      b.points - a.points ||
      b.gd - a.gd ||
      b.gf - a.gf ||
      String(a.team).localeCompare(String(b.team)),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib.mjs lib.test.mjs
git commit -m "feat: labels, groups list, and standings sort"
```

---

### Task 3: Local time + "is today" logic (`lib.mjs`)

**Files:**
- Modify: `lib.mjs`
- Test: `lib.test.mjs`

- [ ] **Step 1: Write the failing test** — append to `lib.test.mjs`:

```js
import { toLocalTime, localDateKey, isToday } from './lib.mjs';

test('toLocalTime formats UTC into a 24h local time string', () => {
  assert.equal(toLocalTime('2026-06-23T23:00:00Z', 'America/New_York'), '19:00');
  assert.equal(toLocalTime('2026-06-23T19:00:00Z', 'America/New_York'), '15:00');
});

test('localDateKey returns YYYY-MM-DD in the given zone', () => {
  assert.equal(localDateKey('2026-06-24T01:00:00Z', 'America/New_York'), '2026-06-23');
  assert.equal(localDateKey('2026-06-24T05:00:00Z', 'America/New_York'), '2026-06-24');
});

test('isToday compares local calendar dates, not UTC', () => {
  const now = Date.parse('2026-06-23T20:00:00Z'); // 16:00 in New York on the 23rd
  const tz = 'America/New_York';
  assert.equal(isToday('2026-06-23T23:00:00Z', now, tz), true);  // 19:00 same day
  assert.equal(isToday('2026-06-24T01:00:00Z', now, tz), true);  // 21:00 still the 23rd
  assert.equal(isToday('2026-06-24T05:00:00Z', now, tz), false); // 01:00 the 24th
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `toLocalTime`/`localDateKey`/`isToday` not exported.

- [ ] **Step 3: Write minimal implementation** — append to `lib.mjs`:

```js
export function toLocalTime(utcISO, tz) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(utcISO));
}

export function localDateKey(utcISO, tz) {
  // en-CA renders as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(utcISO));
}

export function isToday(utcISO, nowMs, tz) {
  const nowISO = new Date(nowMs).toISOString();
  return localDateKey(utcISO, tz) === localDateKey(nowISO, tz);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all tests, including the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add lib.mjs lib.test.mjs
git commit -m "feat: local-time and is-today helpers (timezone aware)"
```

---

### Task 4: Match display, today filter, bracket placement (`lib.mjs`)

**Files:**
- Modify: `lib.mjs`
- Test: `lib.test.mjs`

- [ ] **Step 1: Write the failing test** — append to `lib.test.mjs`:

```js
import { matchDisplay, todaysMatches, placeKnockout } from './lib.mjs';

test('matchDisplay describes live, finished, and upcoming matches', () => {
  const live = matchDisplay(
    { status: 'IN_PLAY', minute: 67, score: { home: 2, away: 1 } },
    'America/New_York',
  );
  assert.deepEqual(live, { state: 'live', score: '2–1', minute: "67'", badge: 'TRỰC TIẾP' });

  const done = matchDisplay(
    { status: 'FINISHED', score: { home: 0, away: 0 } },
    'America/New_York',
  );
  assert.deepEqual(done, { state: 'finished', score: '0–0', minute: null, badge: 'KẾT THÚC' });

  const soon = matchDisplay(
    { status: 'TIMED', utcDate: '2026-06-23T19:00:00Z', score: { home: null, away: null } },
    'America/New_York',
  );
  assert.deepEqual(soon, { state: 'upcoming', score: null, minute: null, time: '15:00', badge: null });
});

test('todaysMatches filters to today and sorts by kickoff', () => {
  const now = Date.parse('2026-06-23T20:00:00Z');
  const tz = 'America/New_York';
  const matches = [
    { id: 1, utcDate: '2026-06-23T23:00:00Z' },
    { id: 2, utcDate: '2026-06-23T21:00:00Z' },
    { id: 3, utcDate: '2026-06-25T19:00:00Z' },
  ];
  assert.deepEqual(todaysMatches(matches, now, tz).map(m => m.id), [2, 1]);
});

test('placeKnockout buckets knockout matches by stage and ignores group games', () => {
  const matches = [
    { id: 1, stage: 'FINAL', utcDate: '2026-07-19T19:00:00Z' },
    { id: 2, stage: 'GROUP_STAGE', utcDate: '2026-06-23T19:00:00Z' },
    { id: 3, stage: 'LAST_16', utcDate: '2026-07-05T19:00:00Z' },
    { id: 4, stage: 'LAST_16', utcDate: '2026-07-04T19:00:00Z' },
  ];
  const out = placeKnockout(matches);
  assert.equal(out.GROUP_STAGE, undefined);
  assert.deepEqual(out.LAST_16.map(m => m.id), [4, 3]); // sorted by kickoff
  assert.equal(out.FINAL[0].id, 1);
  assert.deepEqual(out.QUARTER_FINALS, []); // present but empty
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `matchDisplay`/`todaysMatches`/`placeKnockout` not exported.

- [ ] **Step 3: Write minimal implementation** — append to `lib.mjs`:

```js
export function matchDisplay(match, tz) {
  const status = match.status;
  if (status === 'IN_PLAY' || status === 'PAUSED') {
    return {
      state: 'live',
      score: `${match.score?.home ?? 0}–${match.score?.away ?? 0}`,
      minute: match.minute ? `${match.minute}'` : null,
      badge: 'TRỰC TIẾP',
    };
  }
  if (status === 'FINISHED') {
    return {
      state: 'finished',
      score: `${match.score?.home ?? 0}–${match.score?.away ?? 0}`,
      minute: null,
      badge: 'KẾT THÚC',
    };
  }
  return {
    state: 'upcoming',
    score: null,
    minute: null,
    time: toLocalTime(match.utcDate, tz),
    badge: null,
  };
}

export function todaysMatches(matches, nowMs, tz) {
  return matches
    .filter((m) => isToday(m.utcDate, nowMs, tz))
    .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
}

export function placeKnockout(matches) {
  const out = {};
  for (const stage of KNOCKOUT_STAGES) out[stage] = [];
  for (const m of matches) {
    if (out[m.stage]) out[m.stage].push(m);
  }
  for (const stage of KNOCKOUT_STAGES) {
    out[stage].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all tests).

- [ ] **Step 5: Commit**

```bash
git add lib.mjs lib.test.mjs
git commit -m "feat: match-display, today filter, and knockout bucketing"
```

---

### Task 5: Normalize API responses (`scripts/normalize.mjs`)

**Files:**
- Create: `scripts/normalize.mjs`
- Create: `test/fixtures/matches.sample.json`
- Create: `test/fixtures/standings.sample.json`
- Test: `scripts/normalize.test.mjs`

- [ ] **Step 1: Create the fixtures** — `test/fixtures/matches.sample.json`:

```json
{
  "matches": [
    {
      "id": 1,
      "utcDate": "2026-06-23T19:00:00Z",
      "status": "IN_PLAY",
      "minute": 67,
      "stage": "GROUP_STAGE",
      "group": "GROUP_B",
      "homeTeam": { "name": "Argentina", "tla": "ARG", "crest": "https://x/arg.png" },
      "awayTeam": { "name": "Nigeria", "tla": "NGA", "crest": "https://x/nga.png" },
      "score": { "fullTime": { "home": 2, "away": 1 } }
    },
    {
      "id": 2,
      "utcDate": "2026-07-19T19:00:00Z",
      "status": "SCHEDULED",
      "stage": "FINAL",
      "group": null,
      "homeTeam": { "name": null, "tla": null, "crest": null },
      "awayTeam": { "name": null, "tla": null, "crest": null },
      "score": { "fullTime": { "home": null, "away": null } }
    }
  ]
}
```

- [ ] **Step 2: Create the fixtures** — `test/fixtures/standings.sample.json`:

```json
{
  "standings": [
    {
      "stage": "GROUP_STAGE",
      "type": "TOTAL",
      "group": "GROUP_B",
      "table": [
        {
          "position": 1,
          "team": { "name": "Argentina", "tla": "ARG", "crest": "https://x/arg.png" },
          "playedGames": 2, "won": 2, "draw": 0, "lost": 0,
          "goalsFor": 5, "goalsAgainst": 1, "goalDifference": 4, "points": 6
        }
      ]
    },
    { "stage": "GROUP_STAGE", "type": "HOME", "group": "GROUP_B", "table": [] }
  ]
}
```

- [ ] **Step 3: Write the failing test** — create `scripts/normalize.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalize } from './normalize.mjs';

const matchesResp = JSON.parse(readFileSync(new URL('../test/fixtures/matches.sample.json', import.meta.url)));
const standingsResp = JSON.parse(readFileSync(new URL('../test/fixtures/standings.sample.json', import.meta.url)));

test('normalize maps a live group match', () => {
  const { matches } = normalize(matchesResp, standingsResp);
  assert.deepEqual(matches[0], {
    id: 1,
    utcDate: '2026-06-23T19:00:00Z',
    status: 'IN_PLAY',
    stage: 'GROUP_STAGE',
    group: 'B',
    minute: 67,
    home: { name: 'Argentina', code: 'ARG', crest: 'https://x/arg.png' },
    away: { name: 'Nigeria', code: 'NGA', crest: 'https://x/nga.png' },
    score: { home: 2, away: 1 },
  });
});

test('normalize handles a TBD knockout match (null team/score)', () => {
  const { matches } = normalize(matchesResp, standingsResp);
  assert.equal(matches[1].group, null);
  assert.equal(matches[1].home.name, 'TBD');
  assert.equal(matches[1].score.home, null);
  assert.equal(matches[1].stage, 'FINAL');
});

test('normalize keeps only TOTAL standings and strips GROUP_ prefix', () => {
  const { standings } = normalize(matchesResp, standingsResp);
  assert.equal(standings.length, 1);
  assert.equal(standings[0].group, 'B');
  assert.equal(standings[0].table[0].code, 'ARG');
  assert.equal(standings[0].table[0].points, 6);
  assert.equal(standings[0].table[0].gd, 4);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./normalize.mjs`.

- [ ] **Step 5: Write minimal implementation** — create `scripts/normalize.mjs`:

```js
function team(t) {
  return {
    name: t?.name ?? 'TBD',
    code: t?.tla ?? '',
    crest: t?.crest ?? '',
  };
}

export function normalize(matchesResp, standingsResp) {
  const matches = (matchesResp.matches || []).map((m) => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    stage: m.stage,
    group: m.group ? m.group.replace(/^GROUP_/, '') : null,
    minute: m.minute ?? null,
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    score: {
      home: m.score?.fullTime?.home ?? null,
      away: m.score?.fullTime?.away ?? null,
    },
  }));

  const standings = (standingsResp.standings || [])
    .filter((s) => s.type === 'TOTAL')
    .map((s) => ({
      group: s.group ? s.group.replace(/^GROUP_/, '') : null,
      table: (s.table || []).map((r) => ({
        team: r.team?.name ?? '',
        code: r.team?.tla ?? '',
        crest: r.team?.crest ?? '',
        played: r.playedGames ?? 0,
        won: r.won ?? 0,
        draw: r.draw ?? 0,
        lost: r.lost ?? 0,
        gf: r.goalsFor ?? 0,
        ga: r.goalsAgainst ?? 0,
        gd: r.goalDifference ?? 0,
        points: r.points ?? 0,
      })),
    }));

  return { standings, matches };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all tests).

- [ ] **Step 7: Commit**

```bash
git add scripts/normalize.mjs scripts/normalize.test.mjs test/fixtures/
git commit -m "feat: normalize football-data.org responses to worldcup.json shape"
```

---

### Task 6: Data fetcher with change-detection (`scripts/fetch-data.mjs`)

**Files:**
- Create: `scripts/fetch-data.mjs`
- Test: `scripts/fetch-data.test.mjs`

- [ ] **Step 1: Write the failing test** — create `scripts/fetch-data.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeIfChanged } from './fetch-data.mjs';

test('writeIfChanged writes first time, ignores updatedAt-only changes, writes real changes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wc-'));
  const p = join(dir, 'worldcup.json');
  try {
    const a = { updatedAt: '2026-06-23T10:00:00Z', standings: [], matches: [{ id: 1 }] };
    assert.equal(writeIfChanged(p, a), true); // first write

    const b = { updatedAt: '2026-06-23T10:10:00Z', standings: [], matches: [{ id: 1 }] };
    assert.equal(writeIfChanged(p, b), false); // only timestamp differs -> skip

    const c = { updatedAt: '2026-06-23T10:20:00Z', standings: [], matches: [{ id: 2 }] };
    assert.equal(writeIfChanged(p, c), true); // real data change -> write
    assert.match(readFileSync(p, 'utf8'), /"id": 2/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot find module `./fetch-data.mjs`.

- [ ] **Step 3: Write minimal implementation** — create `scripts/fetch-data.mjs`:

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (all tests). The network `main()` does NOT run during tests because of the direct-execution guard.

- [ ] **Step 5: Commit**

```bash
git add scripts/fetch-data.mjs scripts/fetch-data.test.mjs
git commit -m "feat: data fetcher with updatedAt-aware change detection"
```

---

### Task 7: Page skeleton + styles + dev data generator

**Files:**
- Create: `index.html`
- Create: `styles.css`
- Create: `scripts/demo-data.mjs`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>World Cup 2026</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <header id="topbar">
    <span class="logo">🏆</span>
    <span class="brand">WORLD CUP 2026</span>
    <span id="datetime"></span>
    <span id="livecount" class="badge-live" hidden>● <span id="livenum">0</span> TRỰC TIẾP</span>
  </header>

  <main id="chart">
    <section id="groups-left" class="groups"></section>

    <section id="center">
      <div id="today-panel">
        <div class="today-head">⭐ HÔM NAY ⭐</div>
        <div id="today-list"></div>
      </div>
      <div id="bracket"></div>
    </section>

    <section id="groups-right" class="groups"></section>
  </main>

  <footer id="statusbar">
    <span id="updated"></span>
    <span id="tzlabel"></span>
  </footer>

  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `styles.css`**

```css
:root {
  --bg: #0a1330;
  --panel: #101c3d;
  --panel-2: #0c1838;
  --line: #1e2a4d;
  --text: #e8eef7;
  --muted: #9fb0c8;
  --accent: #7fd4ff;
  --live: #00e587;
  --gold: #ffd43b;
  --red: #ff3b3b;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

body {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
}

#topbar {
  display: flex;
  align-items: center;
  gap: 1.2vw;
  padding: 0.6vh 1.2vw;
  background: linear-gradient(90deg, #e3242b22, #3b5bdb22, #00b89422);
  border-bottom: 1px solid var(--line);
}
#topbar .logo { font-size: 2.6vh; }
#topbar .brand { font-weight: 800; letter-spacing: 0.15vw; font-size: 2.2vh; }
#datetime { margin-left: auto; color: var(--muted); font-size: 1.6vh; }
.badge-live {
  background: var(--red); color: #fff; font-weight: 700;
  font-size: 1.4vh; padding: 0.4vh 0.8vw; border-radius: 0.6vh;
}

#chart {
  display: grid;
  grid-template-columns: 1fr 1.6fr 1fr;
  gap: 0.8vw;
  padding: 0.8vh 1vw;
  min-height: 0; /* allow children to shrink, no scroll */
}

.groups {
  display: grid;
  grid-template-rows: repeat(6, 1fr);
  gap: 0.6vh;
  min-height: 0;
}

.group-box {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 0.8vh;
  padding: 0.4vh 0.6vw;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.group-box.today {
  border-color: var(--live);
  box-shadow: 0 0 1.2vh #00e58766;
}
.group-head {
  color: var(--accent);
  font-weight: 700;
  font-size: 1.4vh;
  letter-spacing: 0.05vw;
  margin-bottom: 0.2vh;
}
.group-box.today .group-head { color: var(--live); }

.group-box .row {
  display: grid;
  grid-template-columns: 1.6vh 1fr auto auto;
  align-items: center;
  gap: 0.4vw;
  font-size: 1.4vh;
  padding: 0.1vh 0;
}
.row .crest { width: 1.6vh; height: 1.6vh; object-fit: contain; }
.row .code { font-weight: 600; }
.row .p { color: var(--muted); }
.row .pts { font-weight: 800; color: var(--gold); min-width: 1.6vh; text-align: right; }
.row.empty { color: var(--muted); }

#center {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 0.8vh;
  min-height: 0;
}

#today-panel {
  background: linear-gradient(135deg, #152a52, #1d2f63);
  border: 1px solid #2a52ff55;
  border-radius: 0.8vh;
  padding: 0.8vh 1vw;
}
.today-head {
  text-align: center; font-weight: 800; letter-spacing: 0.2vw;
  color: var(--gold); font-size: 1.8vh; margin-bottom: 0.6vh;
}
.today-match {
  display: flex; justify-content: space-between; align-items: center;
  background: var(--bg); border-radius: 0.6vh;
  padding: 0.5vh 0.8vw; margin-bottom: 0.4vh; font-size: 1.6vh;
  border-left: 0.4vh solid var(--muted);
}
.today-match.live { border-left-color: var(--red); }
.today-match.finished { border-left-color: var(--muted); opacity: 0.85; }
.today-match.upcoming { border-left-color: var(--accent); }
.today-match .t-score { font-weight: 800; color: var(--live); }
.today-match.finished .t-score { color: var(--text); }
.today-match .t-min { color: var(--live); margin-left: 0.6vw; font-size: 1.3vh; }
.today-match .t-time { color: var(--muted); }
.today-empty { text-align: center; color: var(--muted); font-size: 1.6vh; padding: 0.8vh; }

#bracket {
  background: var(--panel-2);
  border-radius: 0.8vh;
  padding: 0.6vh 0.6vw;
  display: flex;
  align-items: stretch;
  justify-content: space-around;
  gap: 0.4vw;
  min-height: 0;
  overflow: hidden;
}
.bracket-col {
  display: flex; flex-direction: column; align-items: center;
  gap: 0.4vh; flex: 1; min-width: 0;
}
.bracket-label { color: var(--accent); font-size: 1.2vh; font-weight: 700; text-align: center; }
.bracket-col.final .bracket-label { color: var(--gold); }
.slot {
  background: var(--panel); border-radius: 0.5vh;
  padding: 0.3vh 0.4vw; font-size: 1.2vh; width: 100%;
  display: flex; justify-content: space-between; align-items: center; gap: 0.3vw;
}
.slot.tbd { color: var(--muted); justify-content: center; }
.slot.today { border: 1px solid var(--live); box-shadow: 0 0 0.8vh #00e58766; }
.slot.live b { color: var(--live); }
.slot .trophy { font-size: 3vh; text-align: center; }

#statusbar {
  display: flex; justify-content: space-between;
  padding: 0.5vh 1.2vw; color: var(--muted); font-size: 1.4vh;
  border-top: 1px solid var(--line);
}
```

- [ ] **Step 3: Create `scripts/demo-data.mjs`** (dev-only; lets us see live/upcoming/today states locally without the API)

```js
// Dev-only: writes a demo data/worldcup.json with a live + upcoming match dated "today"
// so the UI's glow/Today-panel can be verified locally. Real data comes from the Action.
import { writeFileSync } from 'node:fs';

const now = Date.now();
const startedAgo = new Date(now - 60 * 60 * 1000).toISOString(); // kicked off 1h ago
const soon = new Date(now + 90 * 60 * 1000).toISOString();       // 90 min from now

const data = {
  updatedAt: new Date(now).toISOString(),
  standings: [
    {
      group: 'B',
      table: [
        { team: 'Argentina', code: 'ARG', crest: '', played: 2, won: 2, draw: 0, lost: 0, gf: 5, ga: 1, gd: 4, points: 6 },
        { team: 'Nigeria', code: 'NGA', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 3, ga: 3, gd: 0, points: 3 },
        { team: 'Croatia', code: 'CRO', crest: '', played: 2, won: 1, draw: 0, lost: 1, gf: 2, ga: 2, gd: 0, points: 3 },
        { team: 'Canada', code: 'CAN', crest: '', played: 2, won: 0, draw: 0, lost: 2, gf: 1, ga: 5, gd: -4, points: 0 },
      ],
    },
  ],
  matches: [
    { id: 1, utcDate: startedAgo, status: 'IN_PLAY', minute: 55, stage: 'GROUP_STAGE', group: 'B',
      home: { name: 'Argentina', code: 'ARG', crest: '' }, away: { name: 'Nigeria', code: 'NGA', crest: '' },
      score: { home: 2, away: 1 } },
    { id: 2, utcDate: soon, status: 'TIMED', stage: 'GROUP_STAGE', group: 'C',
      home: { name: 'Brazil', code: 'BRA', crest: '' }, away: { name: 'Germany', code: 'GER', crest: '' },
      score: { home: null, away: null } },
  ],
};

writeFileSync('data/worldcup.json', JSON.stringify(data, null, 2) + '\n');
console.log('Wrote demo data/worldcup.json');
```

- [ ] **Step 4: Verify the skeleton renders (no scroll) with a local server**

App.js does not exist yet, so groups/bracket will be empty — that's expected here. We are only checking the static frame, header, and footer.

```bash
node scripts/demo-data.mjs
python3 -m http.server 8000
```
Open `http://localhost:8000` and confirm:
- Header shows 🏆 WORLD CUP 2026.
- Three columns + center panel are visible.
- **No scrollbars** at 1920×1080 (resize the window / use device-toolbar). Then stop the server (Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css scripts/demo-data.mjs
git commit -m "feat: page skeleton, 16:9 styles, and dev data generator"
```

---

### Task 8: Render logic + auto-refresh (`app.js`)

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create `app.js`**

```js
import {
  GROUPS, KNOCKOUT_STAGES, STAGE_LABEL, groupLabel,
  sortStandings, matchDisplay, todaysMatches, placeKnockout,
} from './lib.mjs';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
let lastData = null;
let lastDateKey = null;

async function load() {
  try {
    const res = await fetch('data/worldcup.json?t=' + Date.now());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    lastData = await res.json();
    render(lastData);
  } catch (err) {
    console.error('fetch failed, keeping last render', err);
  }
}

function render(data) {
  const now = Date.now();
  const matches = data.matches || [];
  const standingsByGroup = Object.fromEntries((data.standings || []).map((s) => [s.group, s.table]));
  const today = todaysMatches(matches, now, TZ);
  const todayIds = new Set(today.map((m) => m.id));

  renderGroups(standingsByGroup, matches, todayIds);
  renderToday(today);
  renderBracket(placeKnockout(matches), todayIds);
  renderLiveCount(matches);
  renderStatus(data.updatedAt);
  lastDateKey = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(now));
}

function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

function teamLabel(t) {
  return t.code || t.name || 'TBD';
}

function renderGroups(standingsByGroup, matches, todayIds) {
  const todayGroups = new Set(
    matches.filter((m) => todayIds.has(m.id) && m.group).map((m) => m.group),
  );
  const left = document.getElementById('groups-left');
  const right = document.getElementById('groups-right');
  left.innerHTML = '';
  right.innerHTML = '';

  GROUPS.forEach((g, i) => {
    const box = el('div', 'group-box' + (todayGroups.has(g) ? ' today' : ''));
    box.appendChild(el('div', 'group-head', groupLabel(g)));

    const table = sortStandings(standingsByGroup[g] || []);
    if (table.length === 0) {
      box.appendChild(el('div', 'row empty', '—'));
    } else {
      table.forEach((r) => {
        box.appendChild(
          el(
            'div',
            'row',
            `<img class="crest" src="${r.crest}" alt="" onerror="this.style.visibility='hidden'">` +
              `<span class="code">${r.code || r.team}</span>` +
              `<span class="p">${r.played}</span>` +
              `<span class="pts">${r.points}</span>`,
          ),
        );
      });
    }
    (i < 6 ? left : right).appendChild(box);
  });
}

function renderToday(today) {
  const list = document.getElementById('today-list');
  list.innerHTML = '';
  if (today.length === 0) {
    list.appendChild(el('div', 'today-empty', 'Không có trận đấu hôm nay'));
    return;
  }
  today.forEach((m) => {
    const d = matchDisplay(m, TZ);
    let right;
    if (d.state === 'upcoming') {
      right = `<span class="t-time">${d.time}</span>`;
    } else {
      const minute = d.minute ? `<span class="t-min">${d.minute}</span>`
        : d.state === 'live' ? '<span class="t-min">LIVE</span>' : '';
      right = `<span class="t-score">${d.score}</span>${minute}`;
    }
    list.appendChild(
      el('div', 'today-match ' + d.state,
        `<span class="t-teams">${teamLabel(m.home)} v ${teamLabel(m.away)}</span>${right}`),
    );
  });
}

function renderBracket(byStage, todayIds) {
  const wrap = document.getElementById('bracket');
  wrap.innerHTML = '';
  KNOCKOUT_STAGES.forEach((stage) => {
    const isFinal = stage === 'FINAL';
    const col = el('div', 'bracket-col' + (isFinal ? ' final' : ''));
    col.appendChild(el('div', 'bracket-label', STAGE_LABEL[stage]));
    if (isFinal) col.appendChild(el('div', 'slot trophy', '🏆'));

    const ms = byStage[stage] || [];
    if (ms.length === 0) {
      col.appendChild(el('div', 'slot tbd', '—'));
    } else {
      ms.forEach((m) => {
        const d = matchDisplay(m, TZ);
        const mid = d.state === 'upcoming' ? d.time : d.score;
        col.appendChild(
          el('div', 'slot ' + d.state + (todayIds.has(m.id) ? ' today' : ''),
            `<span>${teamLabel(m.home)}</span><b>${mid}</b><span>${teamLabel(m.away)}</span>`),
        );
      });
    }
    wrap.appendChild(col);
  });
}

function renderLiveCount(matches) {
  const live = matches.filter((m) => m.status === 'IN_PLAY' || m.status === 'PAUSED').length;
  const badge = document.getElementById('livecount');
  document.getElementById('livenum').textContent = String(live);
  badge.hidden = live === 0;
}

function renderStatus(updatedAt) {
  const upd = document.getElementById('updated');
  if (!updatedAt) {
    upd.textContent = 'Chưa có dữ liệu';
    return;
  }
  const t = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(updatedAt));
  upd.textContent = 'Cập nhật ' + t;
}

function tick() {
  document.getElementById('datetime').textContent = new Intl.DateTimeFormat('vi-VN', {
    timeZone: TZ, weekday: 'long', day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(new Date());
}

function maybeRollover() {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
  if (key !== lastDateKey && lastData) render(lastData);
}

document.getElementById('tzlabel').textContent = 'Giờ địa phương: ' + TZ;
tick();
load();
setInterval(tick, 1000);
setInterval(load, 60000);
setInterval(maybeRollover, 60000);
```

- [ ] **Step 2: Verify rendering with demo data + local server**

```bash
node scripts/demo-data.mjs
python3 -m http.server 8000
```
Open `http://localhost:8000` and confirm:
- **Group B** box glows green (it has a today match) and shows the standings rows sorted by points (ARG 6, then NGA/CRO 3, CAN 0).
- **Today panel** lists "ARG v NGA  2–1 55'" (live, red bar) and "BRA v GER  <local time>" (upcoming, blue bar).
- Header shows the live clock and "● 1 TRỰC TIẾP" badge.
- Bracket shows the six Vietnamese round columns with `—` placeholders and a 🏆 in CHUNG KẾT.
- Footer shows "Cập nhật HH:MM" and "Giờ địa phương: <your TZ>".
- Still **no scrollbars** at 1920×1080. Stop the server.

- [ ] **Step 3: Restore the empty seed (so we don't commit demo scores)**

```bash
printf '{\n  "updatedAt": null,\n  "standings": [],\n  "matches": []\n}\n' > data/worldcup.json
```

- [ ] **Step 4: Commit**

```bash
git add app.js data/worldcup.json
git commit -m "feat: render groups, today panel, bracket + auto-refresh"
```

---

### Task 9: Scheduled GitHub Action

**Files:**
- Create: `.github/workflows/update-scores.yml`

- [ ] **Step 1: Create the workflow**

```yaml
name: Update scores

on:
  schedule:
    - cron: '*/10 * * * *'   # every ~10 min (GitHub's practical floor)
  workflow_dispatch: {}
  push:
    branches: [main]
    paths-ignore:
      - 'data/worldcup.json'  # don't loop on the bot's own data commits

permissions:
  contents: write

concurrency:
  group: update-scores
  cancel-in-progress: false

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Fetch latest World Cup data
        env:
          FOOTBALL_DATA_TOKEN: ${{ secrets.FOOTBALL_DATA_TOKEN }}
        run: node scripts/fetch-data.mjs

      - name: Commit if data changed
        run: |
          if [ -n "$(git status --porcelain data/worldcup.json)" ]; then
            git config user.name "github-actions[bot]"
            git config user.email "github-actions[bot]@users.noreply.github.com"
            git add data/worldcup.json
            git commit -m "chore: update scores [skip ci]"
            git push
          else
            echo "No changes"
          fi
```

- [ ] **Step 2: Validate the YAML locally**

Run: `node -e "import('node:fs').then(fs=>{const s=fs.readFileSync('.github/workflows/update-scores.yml','utf8');if(!s.includes('FOOTBALL_DATA_TOKEN'))process.exit(1);console.log('workflow references the token secret: OK')})"`
Expected: `workflow references the token secret: OK`

(Full end-to-end validation happens after deploy in Task 10, since it needs the repo secret.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/update-scores.yml
git commit -m "ci: scheduled action to refresh scores every ~10 min"
```

---

### Task 10: README + deploy & live verification

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

````markdown
# World Cup 2026 — TV Wall-Chart

A passive, auto-refreshing single-screen site that shows the FIFA World Cup 2026 as a
wall-chart (12 groups around the edges, knockout bracket in the middle), with **today's
matches highlighted in your local time** and **live scores**. Built for an always-on
55″ TV. Labels are in Vietnamese.

## How it works

- A scheduled **GitHub Action** runs `scripts/fetch-data.mjs` every ~10 minutes, pulls
  fixtures/scores/standings from [football-data.org](https://www.football-data.org), and
  commits `data/worldcup.json`.
- The static page (`index.html` + `app.js`) reads that JSON and re-fetches it every 60 s,
  converting kickoff times to the **viewer's** local timezone.

## One-time setup

1. **Get a free API token:** register at https://www.football-data.org/client/register
   and copy your API token.
2. **Add it as a repository secret:** GitHub → repo **Settings → Secrets and variables →
   Actions → New repository secret**, name it exactly `FOOTBALL_DATA_TOKEN`.
3. **Enable Pages:** **Settings → Pages → Build and deployment → Source: Deploy from a
   branch → Branch: `main` / root**, then Save.
4. **Enable Actions** if prompted (**Actions** tab → enable workflows).
5. **Seed the first data pull:** **Actions → "Update scores" → Run workflow**. After it
   finishes, your site is live at `https://<user>.github.io/<repo>/`.

## Local development

```bash
npm test                 # run the unit test suite (Node 20+, no dependencies)
node scripts/demo-data.mjs   # write demo data so the UI shows live/upcoming states
python3 -m http.server 8000  # serve over http (ES modules + fetch need http, not file://)
# open http://localhost:8000

# To pull REAL data locally instead of demo data:
FOOTBALL_DATA_TOKEN=xxxxx node scripts/fetch-data.mjs
```

## Notes

- The Action commits roughly every 10 minutes during the tournament, so git history grows
  — expected for a live display.
- If the API is briefly unavailable, the fetch fails without committing, so the last good
  data stays on screen (see the "Cập nhật HH:MM" timestamp in the footer).
````

- [ ] **Step 2: Run the full test suite one last time**

Run: `npm test`
Expected: PASS — all tests across `lib.test.mjs`, `scripts/normalize.test.mjs`, `scripts/fetch-data.test.mjs`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: setup, deploy, and local-dev instructions"
```

- [ ] **Step 4: Push to GitHub and deploy**

```bash
# create the repo on GitHub first (gh repo create <name> --public --source=. --remote=origin)
git push -u origin main
```
Then follow `README.md` setup steps 2–5.

- [ ] **Step 5: Live verification**

- In the **Actions** tab, confirm the "Update scores" run is green and that it committed an
  updated `data/worldcup.json` (open the file — it should contain real teams/groups).
- Open the Pages URL on the TV/browser. Confirm: 12 groups populate with standings,
  any matches scheduled **today (your local date)** glow and appear in the HÔM NAY panel,
  live matches show scores, and the page fits the screen with no scrollbars.
- Leave it open a few minutes and confirm scores/clock refresh without manual reload.

---

## Self-Review (completed during planning)

- **Spec coverage:** GitHub Action + secret token (Tasks 6, 9); `worldcup.json` shape
  (Task 5); static vanilla-JS display (Tasks 7, 8); 16:9 no-scroll layout (Task 7);
  live standings per group (Task 8); today logic in local TZ with glow + Today panel
  (Tasks 3, 4, 8); Vietnamese labels (Tasks 2, 7, 8); knockout placeholders filling by
  stage (Tasks 4, 8); 60 s client refresh + midnight rollover + resilience (Task 8);
  change-detection commits (Task 6); hosting/README (Task 10); tests (Tasks 2–6). All
  spec sections map to tasks.
- **Placeholders:** none — every code/test/command step is concrete.
- **Type consistency:** the `worldcup.json` shape produced by `normalize` (Task 5) and
  `demo-data` (Task 7) matches the fields consumed by `app.js` (Task 8) and the helpers in
  `lib.mjs` (Tasks 2–4): `match.{id,utcDate,status,stage,group,minute,home,away,score}`
  and `standings[].{group,table[].{team,code,crest,played,points,gd,gf,...}}`.
```
