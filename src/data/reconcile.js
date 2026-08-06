import { DB } from "./store.js";

/* ==================== pro record reconciliation ====================
   Two sources disagree about a fighter's record:
     f.rec — UFC-only, tallied from the UFCStats CSVs, always current
     f.pro — full pro record from the roster feed, which lags by weeks
   The roster feed is the only place pre-UFC fights live, so we can't just throw
   it away when it's stale (that turns Ilia Topuria into 9-1 instead of 17-1).
   Instead, work out which recent UFC cards the feed hasn't ingested yet and add
   those results on top of the pro totals.

   The leverage: every bout has a loser, so any card the feed is missing surfaces
   as at least one fighter whose pro losses trail their UFC losses. That pins the
   feed's cutoff date for the whole roster — including the winners on those
   cards, whose staleness would otherwise be invisible in the totals. */
export const MAX_PEEL = 6;         /* more missing fights than this = bad data, not lag */
export const MAX_STALE_DAYS = 180; /* a cutoff older than this is a bug, not a stale feed */

export function reconcileProRecords(){
  let newest = 0;
  for(const f of DB.byKey.values())
    for(const g of f.fights)
      if(g.date && g.date.getTime() > newest) newest = g.date.getTime();

  /* --- pass 1: find the oldest fight the feed appears not to know about --- */
  let cutoff = null;
  for(const f of DB.byKey.values()){
    if(!f.pro || !f.fights.length) continue;
    let w = f.rec.w, l = f.rec.l, peeled = [];
    for(const g of f.fights){                  /* already sorted newest-first */
      if(f.pro.w >= w && f.pro.l >= l) break;  /* totals are plausible again */
      if(peeled.length >= MAX_PEEL){ peeled = null; break; }
      if(g.res === "W") w--; else if(g.res === "L") l--;
      peeled.push(g);
    }
    if(!peeled) continue;
    for(const g of peeled){
      if(!g.date) continue;
      const t = g.date.getTime();
      /* A record that's been inconsistent for years (an overturned result the
         feed and UFCStats score differently) is a data quirk, not lag — ignore
         it so one bad fighter can't drag the cutoff back and over-merge
         everybody else. */
      if(newest && (newest - t) > MAX_STALE_DAYS*864e5) continue;
      if(cutoff === null || t < cutoff) cutoff = t;
    }
  }
  if(cutoff !== null)
    console.info("roster feed is missing UFC results from " +
                 new Date(cutoff).toDateString() + " onward — merging them in");

  /* --- pass 2: top each pro record up with the results the feed is missing --- */
  for(const f of DB.byKey.values()){
    if(!f.pro) continue;
    if(cutoff !== null){
      let w=0, l=0, d=0;
      for(const g of f.fights){
        if(!g.date || g.date.getTime() < cutoff) continue;
        if(g.res === "W") w++; else if(g.res === "L") l++; else if(g.res === "D") d++;
      }
      /* If this fighter has a loss after the cutoff and the feed's loss count
         already covers our tally, the feed is current for them — adding again
         would invent a phantom loss. */
      const alreadyCurrent = l > 0 && f.pro.l >= f.rec.l;
      if((w||l||d) && !alreadyCurrent)
        f.pro = {w:f.pro.w+w, l:f.pro.l+l, d:f.pro.d+d, merged:true};
    }
    /* A pro record can never be smaller than the UFC-only one. If it still is,
       the feed is wrong in a way we can't repair — fall back to f.rec. */
    if(f.pro.w < f.rec.w || f.pro.l < f.rec.l){
      console.warn("unreconcilable roster record for " + f.name + ": " +
                   f.pro.w + "-" + f.pro.l + " vs UFC-only " +
                   f.rec.w + "-" + f.rec.l + " — using UFC record");
      f.pro = null;
    }
  }
}
