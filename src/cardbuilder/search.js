import { defaultPicks } from "../data/default-picks.js";
import { DB, recStr } from "../data/store.js";
import { buildDana, danaMatch } from "../features/easter-egg.js";
import { esc } from "../lib/dom.js";
import { norm } from "../lib/text.js";

export function fsearch(q){
  const nq=norm(q);
  if(!nq) return defaultPicks(40);   /* P4P → champions → ranked → veterans */
  const starts=[], contains=[];
  if(danaMatch(nq)) starts.push(buildDana());   /* he can headline a fantasy card too */
  for(const f of DB.list){
    const p=f.searchable.indexOf(nq);
    if(p===0 || norm(f.name.split(/\s+/).slice(-1)[0]).indexOf(nq)===0) starts.push(f);
    else if(p>0) contains.push(f);
    if(starts.length>60) break;
  }
  return starts.concat(contains).slice(0,50);
}
export function resultRowHTML(f){
  return '<span class="dot'+(f.img?"":" off")+'"></span>'+
    '<span class="nm">'+esc(f.name)+'</span>'+
    (f.nickname?'<span class="nk">"'+esc(f.nickname)+'"</span>':'')+
    '<span class="meta">'+esc(f.division||"—")+' · '+recStr(f)+'</span>';
}

/* ---------- open / close ---------- */
