# Tale of the Tape

UFC fighter head-to-head comparison and a fantasy fight-card builder that
exports a broadcast-style poster as a PNG.

**Live:** https://jeremymccray.github.io/TaleOfTheTape/

## What it does

- **Tale of the tape** — pick two fighters, compare physicals, records, finish
  rates, striking and grappling splits, and any previous meeting
- **Divisional rankings** — the official top 15 in every division, plus both
  pound-for-pound lists, loadable straight into a corner
- **Random matchup** — weight-class-aware matchmaking, not pure noise
- **Build your dream card** — lay out main card / prelims / early prelims, fill
  the corners, and export the finished poster as a PNG

Data is pulled live in the browser from [UFCStats](http://ufcstats.com) (via
the `scrape_ufc_stats` dataset) and the public UFC athlete roster. No server, no
API key, no tracking beyond page analytics.

## Running locally

No build step, no dependencies.

```bash
git clone https://github.com/JeremyMcCray/TaleOfTheTape.git
cd TaleOfTheTape
python3 -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` from disk will not work —
ES modules and `fetch` both need a real origin.

To work offline against local fixtures, open
http://localhost:8000/test/harness.html instead.

## Project layout

```
index.html      markup only
css/            15 stylesheets, load order = cascade order
src/            45 ES modules — lib, data, features, app, cardbuilder, poster
test/           offline fixture harness
docs/           data sources, record reconciliation, testing
```

- `CLAUDE.md` — conventions, gotchas, how to run and verify
- `ARCHITECTURE.md` — module map, data flow, state ownership

## Deploying

`git push`. GitHub Pages serves the repo root as-is.

## Not affiliated with UFC / Zuffa.
