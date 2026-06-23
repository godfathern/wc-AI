# World Cup 2026 TV Wall-Chart — Design

**Date:** 2026-06-23
**Status:** Approved (brainstorming complete)

## Summary

A single-screen website that displays the **FIFA World Cup 2026** (USA/Canada/Mexico,
11 June – 19 July 2026) as a **wall chart**: all 12 groups around the edges, the
knockout bracket through the middle. It is designed to run unattended on a **55″ flat
TV**, so it is **passive** (no clicks), fits one fixed 16:9 screen with **no scrolling**,
and **auto-refreshes**. Matches happening **today** (in the viewer's local timezone)
**glow in place** and are listed in a center **Today panel** with **live scores**.
Labels are in **Vietnamese**. Hosted on **GitHub Pages**.

## Goals

- Show the whole tournament at a glance on a TV, like a printed wall poster.
- Highlight the day's matches automatically, using the viewer's local time.
- Show near-real-time scores for in-progress matches without any human intervention.
- Be trivially hostable as static files on GitHub Pages, with no exposed secrets.

## Non-Goals (YAGNI)

- Filters / team search / any interactivity (it's a passive wall display).
- Betting odds, player stats, lineups, xG.
- Websockets / push / sub-second live updates.
- Multi-tournament support, multiple seasons, theme toggle.
- A build step or front-end framework.

## Key Constraint & Resulting Architecture

GitHub Pages serves **static files only** — there is no server to poll a live API.
So the system is split in two:

1. **Data refresher (server-side, in CI):** A scheduled **GitHub Action** runs every
   ~10 minutes, fetches live data from football-data.org using a **secret** API token,
   normalizes it, and commits `data/worldcup.json` to the repo. The token lives only in
   GitHub Actions secrets — it never reaches the browser. No CORS issues because the
   fetch happens server-side.

2. **Display (client-side, static):** `index.html` + `styles.css` + `app.js`
   (plain vanilla JS, no build) read `data/worldcup.json`, render the wall chart,
   and **re-fetch the JSON every 60 s** so the TV updates itself.

```
football-data.org ──(GitHub Action, every ~10 min, secret token)──▶ data/worldcup.json
                                                                          │
                                                          (committed to main, Pages redeploys)
                                                                          │
                              Browser on TV ──(fetch on load + every 60s)─┘──▶ render wall chart
```

Two refresh layers: the Action refreshes the *data* (~10 min — GitHub cron's practical
floor), and the client re-fetches the *file* (60 s) so a freshly-committed update appears
quickly without reloading the page.

## Data Source

- **Provider:** football-data.org, competition code **`WC`**. Confirmed: World Cup is in
  the **free tier**; provides fixtures, scores, in-play match status, and group standings.
  Free-tier rate limit (~10 req/min) is irrelevant given the ~10-min cron.
- **Endpoints used:**
  - `GET /v4/competitions/WC/matches` — all matches: `utcDate`, `status`
    (`SCHEDULED`/`TIMED`/`IN_PLAY`/`PAUSED`/`FINISHED`), `stage`, `group`, home/away
    teams (name, code, crest), `score`, and `minute` (best-effort).
  - `GET /v4/competitions/WC/standings` — standings per group.
- **Auth:** header `X-Auth-Token: $FOOTBALL_DATA_TOKEN` (GitHub Actions secret).

### `data/worldcup.json` shape

```json
{
  "updatedAt": "2026-06-23T18:05:00Z",
  "standings": [
    { "group": "A", "table": [
      { "team": "Mexico", "code": "MEX", "crest": "https://…",
        "played": 2, "won": 1, "draw": 1, "lost": 0, "gf": 4, "ga": 2, "gd": 2, "points": 4 }
    ]}
  ],
  "matches": [
    { "id": 12345, "utcDate": "2026-06-23T19:00:00Z", "status": "IN_PLAY",
      "stage": "GROUP_STAGE", "group": "B", "minute": 67,
      "home": { "name": "Argentina", "code": "ARG", "crest": "https://…" },
      "away": { "name": "Nigeria",   "code": "NGA", "crest": "https://…" },
      "score": { "home": 2, "away": 1 } }
  ]
}
```

`stage` values for placing knockout matches: `GROUP_STAGE`, `LAST_32`, `LAST_16`,
`QUARTER_FINALS`, `SEMI_FINALS`, `THIRD_PLACE`, `FINAL`.

## Components

### `scripts/fetch-data.mjs` (Node, no dependencies)
- Uses built-in `fetch` (Node 20+ on the GitHub runner).
- Calls the two endpoints, normalizes responses into the `worldcup.json` shape above.
- Writes the file **only if the serialized content changed** (compare to existing file);
  this avoids empty commits and means a transient API failure (non-200, malformed JSON)
  **aborts without overwriting** the last good data.
- Pure, testable helper `normalize(matchesResp, standingsResp)` separated from I/O.

### `.github/workflows/update-scores.yml`
- Triggers: `schedule` (`cron: "*/10 * * * *"`) + `workflow_dispatch` (manual) +
  `push` (so first deploy seeds data).
- Steps: checkout → setup-node 20 → `node scripts/fetch-data.mjs` →
  commit & push `data/worldcup.json` if changed (`git diff --quiet` guard).
- Uses `secrets.FOOTBALL_DATA_TOKEN`; needs `contents: write` permission.
- **Concurrency guard** so overlapping runs don't race on a push.

### `index.html` / `styles.css` / `app.js` (the display)
- **Layout:** CSS grid, fixed 16:9. Left column = groups A–F, right column = G–L,
  center = Today panel (top) over the knockout bracket. Trophy centerpiece in the bracket.
  Sized in viewport units so it fills a 1920×1080 (and scales to 4K) screen with no scroll.
- **Group box:** live mini standings table sorted by points (then GD, GF), Vietnamese
  header `NHÓM A`…`NHÓM L`, team crest + 3-letter code + P + Pts.
- **Bracket:** fixed skeleton with Vietnamese round labels (`VÒNG 32`, `VÒNG 16`,
  `VÒNG TỨ KẾT`, `VÒNG BÁN KẾT`, `CHUNG KẾT`, `TRANH HẠNG BA`); slots show `TBD` until
  the matching knockout fixture exists, then fill from `matches` by `stage`.
- **Today logic (client, viewer's local TZ):**
  - "Today" = matches whose `utcDate`, converted to local time, falls on the local
    calendar date now.
  - Today's fixtures **glow in place** (group cell or bracket slot) **and** appear in the
    center **Today panel** (`HÔM NAY`).
  - Per-match display by status: `IN_PLAY`/`PAUSED` → live score + minute + `TRỰC TIẾP`
    badge; `FINISHED` → final score; `SCHEDULED`/`TIMED` → local kickoff time.
- **Auto-refresh:** `fetch('data/worldcup.json?t='+Date.now())` on load and every 60 s;
  re-render. A live clock updates every second. The page also re-evaluates "today" at
  local midnight so an always-on TV rolls over correctly.
- **Resilience:** if a fetch fails, keep showing the last good render; show a subtle
  "updated HH:MM" timestamp from `updatedAt` so staleness is visible.
- **Styling:** dark navy poster theme; tri-color (red/blue/green) + gold (final/trophy)
  + green (live) accents. Large type for legibility from across a room.

## Repo Layout

```
index.html
styles.css
app.js
data/worldcup.json          # generated/committed by the Action
scripts/fetch-data.mjs
scripts/fetch-data.test.mjs  # node:test against a saved sample API response
test/fixtures/              # sample football-data.org responses for tests
.github/workflows/update-scores.yml
docs/superpowers/specs/…    # this spec
README.md                   # setup: token secret, enable Pages, enable Actions
```

## Hosting & Deploy

- GitHub Pages serves from `main` (root). The Action commits `worldcup.json` to `main`;
  Pages redeploys automatically.
- **README** documents one-time setup: add `FOOTBALL_DATA_TOKEN` secret, enable Pages
  (Settings → Pages → `main`/root), enable Actions, optionally trigger the first run.
- **Trade-off (accepted):** a commit roughly every 10 minutes grows git history. Fine for
  a hobby/display site; if it ever matters, history can be squashed or the data moved to a
  dedicated branch later.

## Testing

- **Unit (`node:test`, no extra deps):**
  - `normalize()` — sample API responses → expected `worldcup.json` shape.
  - `isToday(utcDate, nowLocal, tz)` — boundary cases around local midnight & DST.
  - `toLocalTime(utcDate, tz)` — formatting.
  - `sortStandings(table)` — points → GD → GF ordering.
  - `placeKnockout(matches)` — maps `stage` to bracket slots; missing → TBD.
- **Manual:** open `index.html` with a sample `worldcup.json`, view at 1920×1080; verify
  no scrollbars, today highlight correct, live/finished/upcoming states render.

## Risks & Mitigations

- **API gaps during group stage** (knockout fixtures TBD): bracket renders placeholders;
  fills automatically — by design.
- **Live `minute` missing on free tier:** treated as best-effort; fall back to the
  `TRỰC TIẾP` badge + score with no minute.
- **football-data.org outage:** Action skips committing on failure; last good data stays
  on screen with a visible "updated" timestamp.
- **Group/stage labels from API vs. Vietnamese UI:** API group/stage codes are mapped to
  Vietnamese display strings in `app.js` (small lookup table), independent of API wording.
