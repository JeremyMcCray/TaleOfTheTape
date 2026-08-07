# Tale of the Tape — working notes

UFC fighter head-to-head comparison + a fantasy "dream card" builder that
exports a real-looking fight poster as a PNG.

**Read `ARCHITECTURE.md` before changing anything structural.** This file is the
short version: how to run it, the rules, and the traps.

---

## Run it

There is no build step and no `npm install`. It is plain ES modules served as
static files.

```bash
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000
```

`file://` will **not** work — ES modules and `fetch` both need a real origin.

Deploy is `git push`; GitHub Pages serves the repo root as-is.

## Test it

The app normally pulls ~40 MB of live CSVs. `test/` boots it against small local
fixtures instead, so you can verify a change offline in seconds.

```bash
python3 -m http.server 8000
# manual:    http://localhost:8000/test/harness.html
# scripted:  http://localhost:8000/test/harness.html?drive=1
```

`?drive=1` clicks through the whole app — boot, rankings, random matchup, tabs,
the three card-builder steps, the tape modal, the PNG export, and the whole
community flow (publish, vote, rate limit, shadow-hold, review queue, opening
someone else's card) — and writes the result into `#__probe`. Any uncaught
error, rejected promise, or `console.error` lands in `#__errs`. **Both should
be checked after any change.**

Headless, for an agent:

```bash
python3 -m http.server 8199 &
chromium --headless --no-sandbox --virtual-time-budget=120000 \
  --dump-dom "http://127.0.0.1:8199/test/harness.html?drive=1" > /tmp/dom.html
grep -o '<pre id="__probe".*</pre>' /tmp/dom.html
grep -o '<pre id="__errs".*</pre>'  /tmp/dom.html
```

A passing run ends with `DONE` in `#__probe` and `(none)` in `#__errs`.
Counts in `#__probe` vary run to run where `Math.random()` is involved (random
matchup, shuffle) — structural counts (bouts, slots, stat rows) should not.

---

## Rules

1. **No build step.** Do not add a bundler, a framework, TypeScript, or an npm
   dependency without being asked. The whole point is that `git push` deploys.
   Anything from a CDN must be loaded at runtime, not installed.
2. **`index.html` is markup only.** No `<style>`, no `<script>` beyond the one
   module tag. If you are adding CSS or JS to it, you are in the wrong file.
3. **One concern per module.** If a file passes ~300 lines, split it.
4. **Imports are explicit.** There are no globals. If a symbol is used in two
   modules, it is exported from the one that owns it and imported by the other.
5. **Never assign to an imported binding** — it is a runtime error in ES modules.
   Shared mutable state is exported as a `let` plus a setter (`setRankings`,
   `setCardStep`, `setLastCorner`, `setPickers`, …). Call the setter.
6. **`esc()` everything** that comes from the data feeds before it goes into
   `innerHTML`. Fighter names and nicknames are third-party strings.
7. **Comments explain *why*.** The existing ones document real upstream quirks
   (403s on certain photo styles, name variants, the duplicate P4P champion).
   Do not delete them as noise; they are load-bearing knowledge.

---

## Traps

- **The two record systems.** Fighters have `rec` (UFC bouts only, computed from
  the fight CSVs) and `pro` (full professional record from the roster API).
  They disagree constantly. `src/data/reconcile.js` is the referee — read
  `docs/records.md` before touching anything record-shaped.
- **Fighter keys are normalised names** (`norm()`: lowercase, accents stripped,
  non-alphanumerics removed). Two feeds spell the same fighter differently, so
  `altNormKey()` and the alias block in `src/data/photo-map.js` exist to bridge
  them. New name mismatches get fixed there, not with a special case at the
  call site.
- **The poster is a `<canvas>`, not DOM.** `src/poster/` draws it pixel by pixel
  because it has to export a PNG. CSS changes do not affect it, and it needs its
  own visual check. Flags are drawn as shapes on purpose — emoji flags do not
  render on Windows.
- **Cross-origin photos.** `src/poster/images.js` probes a direct load first and
  falls back through proxies, because a canvas tainted by a cross-origin image
  cannot be exported. Expect some photos to fail; that path is normal, not a bug.
- **CSS load order matters.** `css/tokens.css` first, `css/responsive.css` near
  last. The `<link>` order in `index.html` is the cascade.
- **`Math.random()` is used** in random matchup and shuffle. Do not write a test
  that asserts on which fighters appear.

---

## Where things live

| I want to change… | Go to |
|---|---|
| Where data comes from | `src/config.js`, `src/data/load.js` |
| Win/loss record logic | `src/data/reconcile.js`, `src/data/store.js` (`tally`) |
| The comparison stat rows | `src/features/tape.js` (`statRows`) |
| The rankings browser | `src/features/rankings-browser.js` |
| The dream card flow | `src/cardbuilder/` |
| The exported PNG | `src/poster/` |
| Colours, spacing | `css/tokens.css` |
| Share link (`#card=`) | `src/cardbuilder/share.js` |
| Surviving a refresh | `src/cardbuilder/draft.js` |
| Who the poster is signed by | `CARD.credit` — set in `step-build.js`, drawn in `src/poster/draw.js` |
| Community backend | `src/community/`, `firebase/firestore.rules` |
| Community UI | `src/features/community-gallery.js`, `src/features/community-publish.js` |
| The blocklist | `src/community/wordlist.js` |

## The community gallery

Publish a dream card to a shared Firestore gallery and vote on other people's.
Read `src/community/README.md` for how it hangs together; `firebase/SETUP.md`
is the console checklist.

- **It runs with no backend.** Until `src/community/config.js` has Firebase
  keys in it, `client.js` falls back to a localStorage adapter with the same
  contract — which is exactly what the offline harness tests. A fresh clone
  has a working, solitary gallery.
- **The rules file is the backend.** There is no server and no Cloud Function,
  so `firebase/firestore.rules` is where one-vote-per-user, the publish rate
  limit and the charset caps actually live. Changing the shape of a card
  document means changing that file too, or the write is simply refused.
- **The poster credit shares the community handle.** The "Your name" field on
  the build step writes through `identity.js`, so it is the same value the
  publish dialog offers. It follows the same shadow-hold rule as the dialog:
  length/charset/link mistakes get an inline error, a blocklisted name is
  accepted in silence. Publishing already drops a held handle from the shared
  card — do not add an error path here, or the field becomes a blocklist oracle.
- **A blocked card is held, not rejected** — it publishes, stays visible to
  its author, and waits in the owner's Review tab. If you touch the publish
  dialog, keep the held and public paths producing *identical* feedback.
  The moment one is distinguishable the whole design is just a slow reject.
