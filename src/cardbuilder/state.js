import { primaryRank, ranksFor } from "../data/rankings.js";
import { norm } from "../lib/text.js";

export const SEC_DEFS = [
  { id:"main",   label:"Main Card",     note:"3–8 bouts · 5 is standard", min:3, max:8, allowZero:false, def:5 },
  { id:"prelim", label:"Prelims",       note:"3–8 bouts",                 min:3, max:8, allowZero:true,  def:5 },
  { id:"early",  label:"Early Prelims", note:"optional · 2–4 bouts",      min:2, max:4, allowZero:true,  def:0 }
];
export const SETUP = { main:5, prelim:5, early:0 };
export const CARD  = { name:"", sections:[] };   // sections: {id,label,bouts:[{a,b,title,titleTouched}]}
export let CARD_STEP = "setup";
export let CARD_OPEN = false;

export const secDef = id => SEC_DEFS.find(s=>s.id===id);
export const blankBout = () => ({ a:null, b:null, title:false, titleTouched:false });

export function allBouts(){
  const out=[];
  CARD.sections.forEach(sec=> sec.bouts.forEach((b,i)=> out.push({sec, bout:b, i})));
  return out;
}
export function boutLabel(sec, i){
  if(sec.id==="main"){
    if(i===0) return "Main Event";
    if(i===1) return "Co-Main Event";
  }
  if(sec.id==="prelim" && i===0) return "Prelim Headliner";
  return "";
}
export function boutWeight(b){
  if(!b.a || !b.b) return "";
  const da=b.a.division||"", db=b.b.division||"";
  if(da && db && norm(da)===norm(db)) return da;
  if(da && db) return da+" / "+db+" catchweight";
  return da||db||"";
}
/* auto-flag a title fight when a reigning champ meets someone from their own division */
export function autoTitle(b){
  if(b.titleTouched || !b.a || !b.b) return;
  const ra=primaryRank(b.a), rb=primaryRank(b.b);
  const champ = (ra&&ra.champ) ? ra : (rb&&rb.champ) ? rb : null;
  if(!champ) { b.title=false; return; }
  const other = (ra&&ra.champ) ? b.b : b.a;
  const oe = ranksFor(other);
  b.title = !!(oe && oe.divisions.some(d=> norm(d.name)===norm(champ.name)));
}
export function usedKeys(exceptBout){
  const s=new Map();
  for(const {bout} of allBouts()){
    if(bout===exceptBout) continue;
    if(bout.a) s.set(bout.a.key,(s.get(bout.a.key)||0)+1);
    if(bout.b) s.set(bout.b.key,(s.get(bout.b.key)||0)+1);
  }
  return s;
}

/* ---------- shared fighter search ---------- */
export function setCardStep(v){ CARD_STEP = v; }
export function setCardOpen(v){ CARD_OPEN = v; }
