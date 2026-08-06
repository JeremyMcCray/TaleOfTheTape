import { CARD_OPEN } from "../cardbuilder/state.js";
import { DB } from "../data/store.js";
import { DANA_KEY, buildDana } from "../features/easter-egg.js";
import { SEL } from "../features/search.js";

export let PA, PB;
export function syncHash(){
  if(typeof CARD_OPEN!=="undefined" && CARD_OPEN) return;   // dream card owns the hash while open
  const p=new URLSearchParams();
  if(SEL.a) p.set("red", SEL.a.key);
  if(SEL.b) p.set("blue", SEL.b.key);
  history.replaceState(null,"", p.toString()? "#"+p.toString() : "#");
}
export function fromHash(){
  const p=new URLSearchParams(location.hash.replace(/^#/,""));
  const ra=p.get("red"), rb=p.get("blue");
  if(ra===DANA_KEY || rb===DANA_KEY) buildDana();   /* shared easter-egg links still resolve */
  if(ra && DB.byKey.has(ra)) PA.set(DB.byKey.get(ra));
  if(rb && DB.byKey.has(rb)) PB.set(DB.byKey.get(rb));
}

/* ===================== random matchup matchmaking =====================
   Picks two fighters that would plausibly share a cage: same gender,
   same weight class (or one class away), and — where possible — fighters
   who actually have a photo on file.                                    */
export function setPickers(a, b){ PA = a; PB = b; }
