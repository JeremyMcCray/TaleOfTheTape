import { allBouts, autoTitle } from "./state.js";
import { DB, RANKED_FIGHTERS } from "../data/store.js";
import { norm } from "../lib/text.js";

export function shuffleEmpty(all){
  const pool = (RANKED_FIGHTERS && RANKED_FIGHTERS.length>10)
    ? RANKED_FIGHTERS : DB.list.filter(f=>f.fights.length>=5);
  if(!pool.length) return;
  const byDiv=new Map();
  for(const f of pool){
    const d=norm(f.division||"");
    if(!d) continue;
    if(!byDiv.has(d)) byDiv.set(d,[]);
    byDiv.get(d).push(f);
  }
  const used=new Set();
  for(const {bout} of allBouts()){
    if(all){ bout.a=null; bout.b=null; bout.title=false; bout.titleTouched=false; }
    if(bout.a) used.add(bout.a.key);
    if(bout.b) used.add(bout.b.key);
  }
  const rnd=arr=>arr[Math.floor(Math.random()*arr.length)];
  const take=(list)=>{
    const avail=list.filter(f=>f && !used.has(f.key));
    if(!avail.length) return null;
    const f=rnd(avail); used.add(f.key); return f;
  };
  for(const {bout} of allBouts()){
    if(!bout.a) bout.a = take(pool) || take(DB.list);
    if(!bout.b){
      const d=bout.a?norm(bout.a.division||""):"";
      const list=(d && byDiv.get(d) && byDiv.get(d).length>2) ? byDiv.get(d) : pool;
      bout.b = take(list) || take(pool) || take(DB.list);
    }
    bout.titleTouched=false; autoTitle(bout);
  }
}

/* ---------- step 3: the poster ---------- */
