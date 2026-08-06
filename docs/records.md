# Two records, one fighter

The single most confusing thing in this codebase. Read this before changing
anything that touches wins and losses.

## Where each comes from

| Field | Source | Counts |
|---|---|---|
| `f.rec` | computed by `tally()` from the UFCStats fight CSVs | UFC/octagon bouts only |
| `f.pro` | `wins`/`losses`/`draws` on the octagon-api roster feed | the fighter's full professional career |

`recOf(f)` returns `pro` when it exists and falls back to `rec`. Rows labelled
"UFC" in the UI mean `rec` specifically.

## Why they disagree

Three different reasons, and telling them apart is the whole problem:

1. **Legitimately** — `pro` includes fights outside the UFC. A fighter can be
   26-1 as a pro and 8-0 in the octagon. This is normal and needs no fixing.
2. **Feed lag** — the roster feed is updated by hand and can sit a card or two
   behind. Right after an event, `rec` knows about a fight `pro` does not, and
   the full record shown is one win short.
3. **Bad data** — an overturned result, a name collision, a fight recorded
   against the wrong fighter. These look like lag but never resolve.

## What `reconcile.js` does

Two passes:

**Pass 1 — find the cutoff.** For each fighter, work out the oldest fight the
roster feed appears not to know about. That date is the boundary between "the
feed is current" and "the feed is stale".

**Pass 2 — top up.** Add the results after that cutoff into `pro`, so a fighter
who just won is not shown a fight short.

## The two guard rails

```js
const MAX_PEEL      = 6;    // more missing fights than this = bad data, not lag
const MAX_STALE_DAYS = 180; // a cutoff older than this is a bug, not a stale feed
```

Both exist to stop reason 3 being treated as reason 2. A feed that is genuinely
behind is behind by a card or two and a few weeks — not by nine fights and two
years. When either limit trips, reconciliation backs off and leaves `pro` alone.

There is also a floor: **a pro record can never be smaller than the UFC-only
record.** If it still is after both passes, the pro record is discarded rather
than shown, because a fighter cannot have fewer professional wins than octagon
wins.

## If you change this

- Anything that widens the guard rails will silently corrupt records for
  fighters with data problems. That is the failure mode to worry about, not
  being a fight behind.
- `test/fixtures/` gives every fighter a consistent `pro`, so the fixtures do
  **not** exercise the interesting paths here. Add a deliberately inconsistent
  fixture fighter if you are working on this.
- Check a fighter with a long non-UFC career (Charles Oliveira) and one who is
  UFC-only, in both the comparison view and the card builder.
