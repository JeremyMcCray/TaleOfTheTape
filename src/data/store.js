import { photoPath } from "./photos.js";
import { norm } from "../lib/text.js";

export const DB = { byKey:new Map(), list:[] };
export let RANKINGS = null;
export let RANKS_BY_KEY = new Map();
export let RANKED_FIGHTERS = [];

/* handles Chinese/Korean-order name variants between the rankings feed and
   the historical CSVs, e.g. "Zhang Weili" vs "Weili Zhang" */
export function altNormKey(name){
  const parts=String(name||"").trim().split(/\s+/);
  if(parts.length!==2) return null;
  return norm(parts[1]+" "+parts[0]);
}
/* baked-in UFC photo lookup — tries the spelling variants the historical CSVs
   and the UFC roster disagree on (name order, Jr/Sr, double surnames) */
export function findByName(name){
  const k=norm(name);
  if(DB.byKey.has(k)) return DB.byKey.get(k);
  const ak=altNormKey(name);
  if(ak && DB.byKey.has(ak)) return DB.byKey.get(ak);
  return null;
}
/* looks a fighter up in DB by name, or mints a lightweight stand-in entry
   so any ranked fighter can still be loaded into a corner even if they're
   missing from the historical fight-results sample */
export function resolveFighter(name){
  let f=findByName(name);
  if(f) return f;
  f=getF(norm(name));
  f.name=String(name||"").trim() || f.key;
  if(!f.img) f.img = photoPath(f.name) || "";
  if(!f.rec) f.rec=tally(f.fights||[]);
  f.searchable=norm(f.name)+" "+norm(f.nickname||"");
  f.sortName=f.name.split(/\s+/).slice(-1)[0].toLowerCase();
  if(!DB.list.includes(f)) DB.list.push(f);
  return f;
}
export function getF(key){
  if(!DB.byKey.has(key)){
    DB.byKey.set(key, {
      key, name:"", nickname:"", img:"", division:"", status:"",
      height:null, weight:null, reach:null, legReach:null, stance:"",
      dob:"", age:null, born:"", style:"", debut:"", rank:"",
      pro:null, fights:[]
    });
  }
  return DB.byKey.get(key);
}

export function tally(fights){
  let w=0,l=0,d=0,n=0, ko=0, sub=0, dec=0, koL=0, subL=0, decL=0, titleW=0, titleF=0, secs=0, timed=0;
  for(const f of fights){
    if(f.title) titleF++;
    if(f.res==="W"){ w++; if(f.title) titleW++;
      if(f.mclass==="ko")ko++; else if(f.mclass==="sub")sub++; else if(f.mclass==="dec")dec++; }
    else if(f.res==="L"){ l++;
      if(f.mclass==="ko")koL++; else if(f.mclass==="sub")subL++; else if(f.mclass==="dec")decL++; }
    else if(f.res==="D") d++; else n++;
    if(f.secs!=null){ secs+=f.secs; timed++; }
  }
  // current streak
  let streak=0, sk="";
  for(const f of fights){
    if(f.res!=="W" && f.res!=="L"){ if(streak===0) continue; else break; }
    if(!sk) sk=f.res;
    if(f.res===sk) streak++; else break;
  }
  const finishes=ko+sub;
  return { w,l,d,n, ko,sub,dec, koL,subL,decL, titleW, titleF,
           finishes, finishRate: w? finishes/w : 0,
           avgSecs: timed? secs/timed : null,
           streak, streakKind:sk, total:fights.length };
}

/* The record every part of the UI should show: the full pro record when the
   roster feed gives us one (reconciled against UFCStats at load), otherwise the
   UFC-only tally. One helper so the search rows, ranking rows and the tale of
   the tape can never disagree with each other. */
/* What the pickers show before you type anything.

   DB.list is sorted by career UFC fight count, which is the right order for
   "who has the most data" but a poor opening screen — it leads with journeymen
   who racked up 25 prelim bouts. Lead with pound-for-pound instead, then
   champions, then the rest of the ranked pool, and let the octagon veterans
   fill the tail. */
export function recOf(f){ return f ? (f.pro || f.rec || null) : null; }
export function recStr(f){
  const r = recOf(f);
  return r ? r.w+"-"+r.l+(r.d?"-"+r.d:"") : "—";
}

/* ---- mutation entry points ------------------------------------------------
   RANKINGS / RANKS_BY_KEY / RANKED_FIGHTERS are exported as live bindings, so
   any module that imports them always reads the current value. ES modules
   forbid assigning to an imported binding, so the loader mutates them through
   these setters instead of writing to the variable directly.               */
export function setRankings(v){ RANKINGS = v; }
export function setRanksByKey(v){ RANKS_BY_KEY = v; }
export function setRankedFighters(v){ RANKED_FIGHTERS = v; }
