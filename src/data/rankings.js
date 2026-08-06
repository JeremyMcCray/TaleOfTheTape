import { RANKINGS, RANKS_BY_KEY, altNormKey } from "./store.js";
import { norm } from "../lib/text.js";

export function isP4P(cat){ return /pound-for-pound/i.test(cat.id||""); }
export function divisionLabel(cat){ return isP4P(cat) ? (/women/i.test(cat.categoryName)?"Women's P4P":"Men's P4P") : cat.categoryName; }

/* Ordered, de-duplicated rows for one ranking category.
   The feed lists the top fighter twice in the pound-for-pound categories —
   once as `champion` and again as `fighters[0]` — which used to put the same
   name in both the #1 and #2 slots. Keeping the first occurrence of each name
   collapses that, and everyone below shifts up to their real position.
   `rank` is the absolute row index; `pos` is what's printed ("C" for a
   divisional champion, otherwise the number). */
export function rankRows(cat){
  if(!cat) return [];
  const p4p=isP4P(cat), out=[], seen=new Set();
  let n=0;
  const add=(name, champ)=>{
    const key=norm(name); if(!key || seen.has(key)) return;
    seen.add(key);
    out.push({ name, champ, rank:out.length+1, pos: champ ? "C" : String(++n) });
  };
  if(cat.champion && cat.champion.championName) add(cat.champion.championName, !p4p);
  for(const f of (cat.fighters||[])) add(f.name, false);
  return out;
}

/* build key -> {divisions:[{name,rank,champ}], p4pMen, p4pWomen} from the rankings feed */
export function buildRanks(json){
  const map=new Map();
  for(const cat of json){
    const p4p=isP4P(cat);
    for(const o of rankRows(cat)){
      const key=norm(o.name); if(!key) continue;
      if(!map.has(key)) map.set(key, {divisions:[], p4pMen:null, p4pWomen:null});
      const entry=map.get(key);
      if(p4p){
        if(/women/i.test(cat.categoryName)) entry.p4pWomen=o.rank; else entry.p4pMen=o.rank;
      } else {
        entry.divisions.push({name:cat.categoryName, rank:o.rank, champ:o.champ});
      }
    }
  }
  return map;
}
export function ranksFor(f){
  if(!f) return null;
  let e=RANKS_BY_KEY.get(f.key);
  if(!e){ const ak=altNormKey(f.name); if(ak) e=RANKS_BY_KEY.get(ak); }
  return e||null;
}
/* pick the ranking entry matching the fighter's current division, else the first available */
export function primaryRank(f){
  const e=ranksFor(f); if(!e||!e.divisions.length) return null;
  if(f.division){
    const nd=norm(f.division);
    const m=e.divisions.find(d=> nd.includes(norm(d.name)) || norm(d.name).includes(nd));
    if(m) return m;
  }
  return e.divisions[0];
}

/* canonical division key — gender-aware and exact, so "Heavyweight" can't be
   mistaken for "Light Heavyweight" or "Bantamweight" for "Women's Bantamweight" */
export function divCanon(name){
  const raw=String(name||""); if(!raw) return null;
  const fem=/women/i.test(raw);
  const d=norm(raw).replace(/^ufc/,"").replace(/^womens?/,"").replace(/division$/,"").replace(/title$/,"");
  return d ? (fem?"w:":"m:")+d : null;
}
/* the ranking category for a division name, or null if it isn't a ranked division */
export function divCategory(name){
  if(!RANKINGS || !RANKINGS.length) return null;
  const key=divCanon(name); if(!key) return null;
  return RANKINGS.find(c=>!isP4P(c) && divCanon(c.categoryName)===key) || null;
}
/* jump the rankings browser to a given division (by category name) */
