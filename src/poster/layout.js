import { CARD, boutLabel } from "../cardbuilder/state.js";
import { PTIER } from "./theme.js";

export function balancedChunk(list, per){
  if(!list.length) return [];
  const rows=Math.ceil(list.length/per), out=[];
  let i=0;
  for(let r=0;r<rows;r++){
    const n=Math.ceil((list.length-i)/(rows-r));
    out.push(list.slice(i,i+n)); i+=n;
  }
  return out;
}
export function posterRows(){
  const rows=[];
  CARD.sections.forEach(sec=>{
    const live=sec.bouts.map((b,i)=>({b, tag:boutLabel(sec,i)})).filter(x=>x.b.a||x.b.b);
    if(!live.length) return;
    rows.push({kind:"band", label:sec.label});
    if(sec.id==="main"){
      rows.push({kind:"row", items:live.slice(0,2), tier:"hd"});   /* main + co-main share the top row */
      balancedChunk(live.slice(2), PTIER.md.per).forEach(g=>rows.push({kind:"row", items:g, tier:"md"}));
    }else{
      balancedChunk(live, PTIER.sm.per).forEach(g=>rows.push({kind:"row", items:g, tier:"sm"}));
    }
  });
  return rows;
}
export function rowHeight(t){ return (t.tag? t.tag+11 : 0) + t.ph + 15 + t.name + 9 + t.sub + t.pad; }

/* ---- drawing ---- */
