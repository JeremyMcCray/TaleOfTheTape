# Data sources

Everything is fetched at runtime, in the browser, from public endpoints. There
is no API key, no server, and nothing cached beyond the browser's HTTP cache.
All of it is configured in `src/config.js`.

## The five feeds

| Feed | Host | What it gives |
|---|---|---|
| `ufc_fighter_tott.csv` | `cdn.jsdelivr.net` (Greco1899/scrape_ufc_stats) | height, weight, reach, stance, DOB — every fighter who ever appeared on a UFC card |
| `ufc_fight_results.csv` | same | every bout: outcome, method, round, time, weight class |
| `ufc_event_details.csv` | same | event dates and locations, joined to results by event name |
| `/fighters` | `api.octagon-api.com` | active roster: photos, nicknames, bios, full pro records |
| `/rankings` | same | top 15 + champion per division, plus both P4P lists |

The CSVs are the historical spine; the JSON feeds are the current-roster gloss.
The CSVs cover retired fighters the roster feed has dropped — which is why
`src/data/photo-map.js` carries hand-harvested photo paths for legends.

## Failure behaviour

- **A CSV fails** → `boot()` rejects, the loading overlay explains it, the app
  stops. Nothing works without the fight history.
- **A JSON feed fails** → caught and warned. The app runs on CSV data alone:
  no photos, no nicknames, no rankings, UFC-only records. This is the degraded
  mode you get behind a strict network.

## The `Fighter` object

Built up across `boot()`; not every field is always present.

```js
{
  key,                       // norm(name) — the primary key everywhere
  name, nickname,
  height, weight, reach,     // inches / lbs, numbers
  stance, dob, age,
  fights: [ {               // newest first
    opp, oppKey, res,        // res: "W" | "L" | "D" | "N"
    event, date, loc,
    method, mclass, round, time, secs,
    weightclass, title, detail, url
  } ],
  rec:  { w, l, d, ... },    // UFC only, from tally()
  pro:  { w, l, d },         // full pro, from the roster feed (may be absent)
  img, division, status, born, style, debut, legReach,
  searchable, sortName
}
```

## Keys and name variants

`key` is `norm(name)`: lowercased, accents stripped, everything non-alphanumeric
removed. `"José Aldo"` → `"josealdo"`.

The feeds do not agree on names. Three mechanisms bridge them, and a new
mismatch should be fixed in one of these rather than special-cased:

1. `altNormKey()` in `store.js` — handles reversed given/family name order
   (common for Chinese and Korean fighters between the two feeds).
2. The alias block at the bottom of `photo-map.js` — former names and ring
   names (`michellewaterson` → `michellewatersongomez`).
3. The suffix/particle handling in `photoPath()` — `Jr.`, `Sr.`, `da`, `dos`.

## Refreshing the baked-in photo map

`photo-map.js` has a `PHOTOS-BEGIN` / `PHOTOS-END` marked block that can be
regenerated from the roster feed. The hand-added legends sit **outside** those
markers on purpose, so regenerating does not wipe them. Keep it that way.

## Rate limits and etiquette

Both hosts are free and unaffiliated. Requests use `cache: "no-cache"`, which
still uses the disk cache but revalidates — an upstream update lands on the next
page load rather than never. Do not add polling, and do not fetch these feeds in
a loop while developing; use `test/harness.html` instead.
