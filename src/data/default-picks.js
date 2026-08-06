import { ranksFor } from "./rankings.js";
import { DB, RANKED_FIGHTERS } from "./store.js";

export let DEFAULT_PICKS = [];
export function buildDefaultPicks(){
  const seen = new Set(), out = [];
  const push = f => { if(f && f.key && !seen.has(f.key)){ seen.add(f.key); out.push(f); } };

  /* tier 0/1 = pound-for-pound (men, then women), 2 = division champs,
     3 = everyone else with a divisional ranking */
  const tierOf = f => {
    const e = ranksFor(f);
    if(!e) return null;
    if(e.p4pMen   != null) return {tier:0, n:e.p4pMen};
    if(e.p4pWomen != null) return {tier:1, n:e.p4pWomen};
    if(e.divisions.some(d=>d.champ)) return {tier:2, n:0};
    if(e.divisions.length) return {tier:3, n:Math.min(...e.divisions.map(d=>d.rank))};
    return null;
  };

  const ranked = [];
  for(const f of RANKED_FIGHTERS){
    const t = tierOf(f);
    if(t) ranked.push({f, tier:t.tier, n:t.n});
  }
  ranked.sort((a,b)=> a.tier-b.tier || a.n-b.n || a.f.name.localeCompare(b.f.name));
  for(const x of ranked) push(x.f);

  for(const f of DB.list) push(f);   /* legends and veterans fill the tail */
  DEFAULT_PICKS = out;
}
export function defaultPicks(n){
  return (DEFAULT_PICKS.length ? DEFAULT_PICKS : DB.list).slice(0, n);
}
