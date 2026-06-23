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
npm test                     # run the unit test suite (Node 20+, no dependencies)
node scripts/demo-data.mjs   # write demo data so the UI shows live/upcoming states
python3 -m http.server 8000  # serve over http (ES modules + fetch need http, not file://)
# open http://localhost:8000

# To pull REAL data locally instead of demo data:
cp .env.example .env                          # then paste your token into .env
node --env-file=.env scripts/fetch-data.mjs   # Node 20.6+ reads .env natively (no dependency)
```

`.env` is gitignored, so your token never gets committed.

## Notes

- The Action commits roughly every 10 minutes during the tournament, so git history grows
  — expected for a live display.
- If the API is briefly unavailable, the fetch fails without committing, so the last good
  data stays on screen (see the "Cập nhật HH:MM" timestamp in the footer).
