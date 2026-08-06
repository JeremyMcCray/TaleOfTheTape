import { renderAll } from "../app/render.js";
import { syncHash } from "../app/router.js";
import { defaultPicks } from "../data/default-picks.js";
import { DB, recStr } from "../data/store.js";
import { buildDana, danaMatch, showDanaCameo } from "./easter-egg.js";
import { setLastCorner } from "./rankings-browser.js";
import { $, el, esc } from "../lib/dom.js";
import { norm } from "../lib/text.js";

export const SEL = { a:null, b:null };

export function makePicker(side){
  const input = $("#in-"+side), box = $("#res-"+side);
  let items=[], idx=-1;

  function search(q){
    const nq=norm(q);
    if(!nq) return defaultPicks(40);   /* P4P → champions → ranked → veterans */
    const starts=[], contains=[];
    if(danaMatch(nq)) starts.push(buildDana());   /* easter egg — only ever by name */
    for(const f of DB.list){
      const p = f.searchable.indexOf(nq);
      if(p===0 || norm(f.name.split(/\s+/).slice(-1)[0]).indexOf(nq)===0) starts.push(f);
      else if(p>0) contains.push(f);
      if(starts.length>60) break;
    }
    return starts.concat(contains).slice(0,60);
  }
  function render(list){
    items=list; idx=-1;
    box.innerHTML="";
    if(!list.length){ box.appendChild(el("div","empty","No fighter found.")); box.classList.add("open"); return; }
    list.forEach((f,i)=>{
      const r=el("div","row");
      r.innerHTML =
        '<span class="dot'+(f.img?"":" off")+'"></span>'+
        '<span class="nm">'+esc(f.name)+'</span>'+
        (f.nickname?'<span class="nk">"'+esc(f.nickname)+'"</span>':'')+
        '<span class="meta">'+esc(f.division||"—")+' · '+recStr(f)+'</span>';
      r.addEventListener("mousedown", ev=>{ ev.preventDefault(); choose(f); });
      box.appendChild(r);
    });
    box.classList.add("open");
  }
  function choose(f){
    SEL[side]=f; setLastCorner(side); input.value=f.name; box.classList.remove("open"); input.blur();
    renderAll(); syncHash();
    if(f && f._egg) showDanaCameo();
    // Track fighter selection
    if(window.posthog) posthog.capture('fighter_selected', {
      fighter_name: f.name,
      corner: side === 'a' ? 'red' : 'blue'
    });
  }
  input.addEventListener("focus", ()=> render(search(input.value)));
  input.addEventListener("input", ()=> render(search(input.value)));
  input.addEventListener("blur", ()=> setTimeout(()=>box.classList.remove("open"), 120));
  input.addEventListener("keydown", e=>{
    if(!box.classList.contains("open")) return;
    const rows=[...box.querySelectorAll(".row")];
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){
      e.preventDefault();
      idx += e.key==="ArrowDown"?1:-1;
      if(idx<0) idx=rows.length-1; if(idx>=rows.length) idx=0;
      rows.forEach(r=>r.classList.remove("active"));
      if(rows[idx]){ rows[idx].classList.add("active"); rows[idx].scrollIntoView({block:"nearest"}); }
    } else if(e.key==="Enter"){
      e.preventDefault();
      if(items[idx>=0?idx:0]) choose(items[idx>=0?idx:0]);
    } else if(e.key==="Escape"){ box.classList.remove("open"); }
  });
  return { set:f=>{ SEL[side]=f; input.value=f?f.name:""; if(f) setLastCorner(side); } };
}

/* ============================ rendering ============================ */
