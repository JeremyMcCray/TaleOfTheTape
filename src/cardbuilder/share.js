import { CARD, SEC_DEFS, SETUP, blankBout, secDef } from "./state.js";
import { DB } from "../data/store.js";

export function encodeCard(){
  const parts=CARD.sections.map(s=> s.id+":"+s.bouts.map(b=>
    (b.title?"*":"")+(b.a?b.a.key:"")+"-"+(b.b?b.b.key:"")).join(","));
  return "card="+encodeURIComponent(CARD.name||"")+"|"+parts.join("|");
}
export function decodeCard(hash){
  if(!/^#?card=/.test(hash)) return false;
  const body=hash.replace(/^#?card=/,"");
  const segs=body.split("|");
  CARD.name=decodeURIComponent(segs.shift()||"");
  const secs=[];
  for(const seg of segs){
    const m=seg.match(/^([a-z]+):(.*)$/); if(!m) continue;
    const d=secDef(m[1]); if(!d) continue;
    const bouts=(m[2]?m[2].split(","):[]).map(pair=>{
      const title=/^\*/.test(pair);
      const [ka,kb]=pair.replace(/^\*/,"").split("-");
      const b=blankBout();
      b.title=title; b.titleTouched=true;
      if(ka&&DB.byKey.has(ka)) b.a=DB.byKey.get(ka);
      if(kb&&DB.byKey.has(kb)) b.b=DB.byKey.get(kb);
      return b;
    });
    if(bouts.length){ secs.push({id:d.id,label:d.label,bouts}); SETUP[d.id]=bouts.length; }
  }
  SEC_DEFS.forEach(d=>{ if(!secs.some(s=>s.id===d.id)) SETUP[d.id]=0; });
  if(!secs.length) return false;
  CARD.sections=secs;
  return true;
}

/* ---------- wiring ---------- */
