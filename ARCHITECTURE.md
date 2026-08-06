# Architecture

Static site, no build step. `index.html` is markup; every line of behaviour is
an ES module under `src/`, and every rule is a file under `css/`.

```
index.html          ~230 lines of markup — the DOM the modules write into
css/                16 files, load order = cascade order
src/                52 modules
firebase/           security rules + indexes; the community feature's backend
test/               offline fixture harness
docs/               the things that are not obvious from the code
```

## Boot sequence

```
index.html
  └─ <script type="module" src="src/main.js">
       ├─ analytics.js               PostHog, first so replay covers the load
       ├─ boot()      data/load.js   fetch → parse → index → reconcile
       └─ initUI()    app/init.js    pickers, tabs, rankings, card builder, hash
```

`boot()` resolves to `true`/`false`; `initUI()` only runs on `true`. On failure
the loading overlay explains itself and the app stops. That is the only place
either function is called.

## Data flow

```
 3 CSVs (jsdelivr)          2 JSON feeds (octagon-api)
 tott / results / events    fighters / rankings
        │                          │
        └────────── load.js ───────┘
                       │
              DB.byKey  Map<key, Fighter>          key = norm(name)
              DB.list   Fighter[]                  sorted, display-ready
              RANKINGS / RANKS_BY_KEY / RANKED_FIGHTERS
                       │
        ┌──────────────┼───────────────┬────────────────┐
     features/        app/         cardbuilder/       poster/
     comparison     wiring +       fantasy card     canvas → PNG
     & rankings     routing         builder
```

Nothing below `data/` fetches. Nothing above it parses. A `Fighter` is a plain
object built in `load.js`; see `docs/data-sources.md` for its shape.

## Modules

### `src/lib/` — no app knowledge, no imports from elsewhere
| File | |
|---|---|
| `dom.js` | `$`, `el`, `esc`. `esc` guards every `innerHTML` write. |
| `text.js` | `norm` (the key function), `titleCase` |
| `csv.js` | minimal RFC4180 parser |
| `format.js` | dates, heights, ages, loose number parsing |
| `fight.js` | method names, fight duration |

### `src/data/` — fetching, parsing, and the store
| File | |
|---|---|
| `load.js` | `boot()`. The only module that fetches feed data. |
| `store.js` | `DB`, ranking state, lookups (`getF`, `resolveFighter`, `findByName`), `tally` |
| `reconcile.js` | UFC-only record vs full pro record. See `docs/records.md`. |
| `rankings.js` | rank rows, division matching, P4P handling |
| `photos.js` / `photo-map.js` | photo URL resolution + the hand-maintained legends and aliases |
| `default-picks.js` | what the search box offers before you type |

### `src/features/` — the comparison page, and the community UI
`search.js` (the two corner pickers) · `tape.js` (cards, stat rows, history,
breakdown, head-to-head — the biggest module) · `rankings-browser.js` ·
`random-matchup.js` (weight-class-aware matchmaking) · `division-badge.js`
(delegated click handler, imported for its side effect) · `easter-egg.js` ·
`community-gallery.js` (the full-screen gallery overlay, four tabs, delegated
tile actions) · `community-publish.js` (the publish dialog)

### `src/app/` — wiring
`init.js` (event wiring, first render) · `render.js` (`renderAll`, the single
repaint entry point) · `router.js` (`#hash` ↔ selection, and the pickers)

### `src/cardbuilder/` — the dream card, a three-step flow
```
state.js ── the CARD object + SETUP sizes; every step reads and writes it
view.js  ── openCardView / renderCardView: dispatches on CARD_STEP
             ├─ step-setup.js    how many bouts per section
             ├─ step-build.js    fill the corners  (search.js, rank-pick.js, shuffle.js)
             └─ step-poster.js   the finished card (tape-modal.js, poster/)
index.js ── initCardBuilder: buttons, Escape, deep links
share.js ── the #card=… URL hash
```

### `src/poster/` — the PNG export
Pure canvas, no DOM. Split so each part is independently readable:
`theme.js` (sizes, fonts, tiering) · `layout.js` (rows, balancing) ·
`canvas.js` (rounded rects, letter-spacing, fit-to-width) · `flags.js` (every
flag drawn as shapes) · `images.js` (CORS probing and proxy fallback) ·
`draw.js` (background, header, bands, bouts, footer) · `export.js`
(`buildPosterCanvas`, `downloadPosterPNG` — supersamples, then downscales).

### `src/community/` — the share-and-vote backend seam
```
config.js   ── the only file you edit to point at a Firebase project
client.js   ── the single import the UI is allowed to use
payload.js  ── CARD <-> wire-safe JSON, plus the duplicate fingerprint
moderation.js ─ clean / reject / hold for every free-text field
wordlist.js ── the blocklist
identity.js ── the display handle (the uid lives in the adapter)
adapters/
  firebase.js ─ Firestore. Lazy-imports the SDK from gstatic on first use.
  local.js    ─ localStorage. Fallback + what the offline harness exercises.
```
Nothing in here touches the DOM. The UI half is `src/features/community-*.js`.
`firebase/firestore.rules` is the other half of `adapters/firebase.js` and the
two only make sense read together — see `src/community/README.md`.

### `firebase/` — not JavaScript, but load-bearing
`firestore.rules` is the entire backend: it enforces the charset caps, the
one-vote-per-uid arithmetic, and the publish rate limit (a card can only be
created in a batch that also stamps the writer's `rate/` document).
`firestore.indexes.json` lists the composite indexes the gallery queries need.
`SETUP.md` is the console walkthrough.

## Shared mutable state

ES modules forbid assigning to an imported binding. Where two modules need to
share a changing value, the owner exports the `let` **and** a setter:

| Value | Owner | Setter |
|---|---|---|
| `RANKINGS`, `RANKS_BY_KEY`, `RANKED_FIGHTERS` | `data/store.js` | `setRankings`, `setRanksByKey`, `setRankedFighters` |
| `LAST_CORNER` | `features/rankings-browser.js` | `setLastCorner` |
| `PA`, `PB` | `app/router.js` | `setPickers` |
| `CARD_STEP`, `CARD_OPEN` | `cardbuilder/state.js` | `setCardStep`, `setCardOpen` |

The community modules keep their state module-private instead (`SORT`, `ME`)
and expose `communityOpen()` / `publishOpen()` rather than the flag, because
the only outside reader is the Escape-key handler in `cardbuilder/index.js`.

Readers import the binding directly — it is live and always current.

`DB`, `CARD`, `SETUP`, `SEL`, `RANK_UI` and `RP` are `const` objects mutated in
place, so they need no setter.

## Import cycles

A few exist by design (`view.js` ↔ the step modules; `search.js` ↔
`easter-egg.js`; `cardbuilder/view.js` → `step-poster.js` →
`features/community-publish.js` → `features/community-gallery.js` →
`cardbuilder/view.js`). They are safe because every cross-module reference is
inside a function body, and function declarations hoist. **Do not** add a cycle where a
module reads an imported value at evaluation time — that is a temporal dead zone
error, and it will only show up at runtime.

## Deliberate omissions

- **No framework.** The DOM is small and the render path is one function.
- **No bundler.** ~45 module requests on first load, HTTP/2 multiplexed, all
  cached after. Not worth a build step.
- **No dependencies.** Fonts come from Google Fonts; everything else is written
  here. The Firebase SDK is the one exception, and it is `import()`ed from
  gstatic at runtime on first gallery open — never installed, never in the
  initial page load, and never loaded at all for someone who only compares two
  fighters.
