# Testing

There is no test framework. There is a browser, some fixtures, and a script that
clicks things — which for a static site with no build step is the honest amount
of machinery.

## The harness

`test/harness.html` is `index.html` with three classic scripts injected ahead of
the module entry point:

| Script | Role |
|---|---|
| `collect-errors.js` | Traps uncaught errors, unhandled rejections and `console.error` into `#__errs`. Ignores `<img>` load failures, which are expected offline. |
| `stub-fetch.js` | Rewrites the five feed URLs to `test/fixtures/`. No network needed. |
| `drive.js` | With `?drive=1`, clicks through the app and reports into `#__probe`. Also clears the `tott.community.*` localStorage keys on load, so a second run in the same browser profile is not blocked by the first run's publish cooldown. |

A `<base href="../">` tag makes the harness resolve `css/` and `src/` against
the repo root, so it tests the real files — not a copy.

## Running

```bash
python3 -m http.server 8000
```

- `http://localhost:8000/test/harness.html` — manual poking, offline, instant
- `http://localhost:8000/test/harness.html?drive=1` — scripted run

Then read `#__probe` (should end `DONE`) and `#__errs` (should be empty).

## What the scripted run covers

boot → rankings browser → random matchup → all three tabs → dream card setup →
shuffle → poster render → tape modal + next → **PNG export** → publish to the
community → vote → publish again and hit the rate limit → publish a blocklisted
name → confirm it is hidden from Top but present in Review → approve it → open
someone else's card → back to build → close.

Two of those matter more than the rest. The **PNG export** is the only thing
that exercises the seven `src/poster/` modules, and it is the part most likely
to break silently. The **shadow-hold** assertions are the only automated check
that a held card produces an empty `#puberr` and still shows up under Mine —
if a future change starts telling the poster their card was held, that line is
where it shows up.

## What it does not cover

- Record reconciliation edge cases — the fixtures are internally consistent, so
  the interesting branches never fire. See `docs/records.md`.
- Anything visual. Layout, spacing and the poster's appearance need eyes.
- Real feed data — fixtures are 20 fighters, not 4,000. Performance problems and
  name-variant bugs only show up against the live feeds.
- **`firebase/firestore.rules`.** The harness runs against the localStorage
  adapter, which *simulates* the rate limit and the hold but enforces nothing.
  The rules are the actual security boundary and nothing here tests them —
  the Firebase console refuses to publish rules that do not compile, and its
  Rules Playground is where you check behaviour. The manual pass is the
  checklist at the end of `firebase/SETUP.md`.

## Fixtures

`test/fixtures/` is generated, small, and deliberately boring: 20 current
fighters, 12 events, ~120 bouts, plus roster and rankings JSON in the exact
shape the real APIs return. Fight results are seeded from a fixed RNG seed, so
the same fixtures produce the same records every time.

To exercise a specific case, add a fighter to the fixtures rather than reaching
for the live feed.

## Comparing against a known-good build

When making a risky structural change, keep a copy of the previous `index.html`,
point a second harness at it, and diff the `#__probe` output. Structural counts
(bouts, slots, stat rows, pills) must match. Fighter *names* will not — random
matchup and shuffle use `Math.random()`.
