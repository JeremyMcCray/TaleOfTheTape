import { renderAll } from "../app/render.js";
import { PA, PB, syncHash } from "../app/router.js";
import { divCategory, divisionLabel, isP4P, rankRows } from "../data/rankings.js";
import { RANKINGS, findByName, recStr, resolveFighter } from "../data/store.js";
import { SEL } from "./search.js";
import { HIST_STEP, initials, shown } from "./tape.js";
import { $, el, esc } from "../lib/dom.js";
import { norm } from "../lib/text.js";

export const RANK_UI = { active:null };
/* the corner filled most recently — tapping a ranking row swaps out the OTHER
   corner, so repeated taps leave your last pick standing instead of clobbering it */
export let LAST_CORNER = null;
export function nextCorner(){
  if(!SEL.a) return "a";
  if(!SEL.b) return "b";
  return LAST_CORNER==="a" ? "b" : "a";
}
export function openDivision(divName, scroll){
  const cat = divCategory(divName);
  if(!cat) return false;
  RANK_UI.active = cat.id;
  renderDivPills(); renderRankList();
  setRankingsOpen(true);
  if(scroll!==false) $("#rankwrap").scrollIntoView({behavior:"smooth", block:"start"});
  return true;
}

export function setRankingsOpen(open){
  const wrap=$("#rankwrap"), btn=$("#rankToggle");
  wrap.classList.toggle("open", open);
  btn.setAttribute("aria-expanded", open ? "true" : "false");
}
export function initRankings(){
  const wrap=$("#rankwrap");
  if(!RANKINGS || !RANKINGS.length){ wrap.style.display="none"; return; }
  wrap.style.display="";
  $("#rankToggle").onclick=()=> setRankingsOpen(!wrap.classList.contains("open"));
  const pillHost=$("#divpills"); pillHost.innerHTML="";
  RANKINGS.forEach(cat=>{
    const btn=el("button","divpill"+(isP4P(cat)?" p4p":""), esc(divisionLabel(cat)));
    btn.dataset.id=cat.id;
    btn.onclick=()=>{ RANK_UI.active=cat.id; renderDivPills(); renderRankList(); };
    pillHost.appendChild(btn);
  });
  RANK_UI.active = RANKINGS[0].id;
  renderDivPills();
  renderRankList();
  setRankingsOpen(true);   // rankings start expanded
}
export function renderDivPills(){
  $("#divpills").querySelectorAll(".divpill").forEach(b=> b.classList.toggle("on", b.dataset.id===RANK_UI.active));
}
export function renderRankList(){
  const host=$("#ranklist"); if(!host) return;
  host.innerHTML="";
  if(!RANKINGS) return;
  const cat=RANKINGS.find(c=>c.id===RANK_UI.active);
  if(!cat){ host.innerHTML='<div class="nodata">No ranking data.</div>'; return; }
  const rows=rankRows(cat);

  rows.forEach(r=>{
    const f=findByName(r.name);
    const key=f?f.key:norm(r.name);
    const isA = !!(SEL.a && SEL.a.key===key), isB = !!(SEL.b && SEL.b.key===key);
    const img = f && f.img
      ? '<img src="'+esc(f.img)+'" alt="" loading="lazy" onerror="this.parentElement.textContent=&quot;'+esc(initials(r.name))+'&quot;">'
      : esc(initials(r.name));
    const meta = f
      ? esc(f.division||cat.categoryName)+' · '+recStr(f)
      : esc(cat.categoryName);
    const nick = f && f.nickname ? '<span class="rknick">"'+esc(f.nickname)+'"</span>' : '';
    const row=el("div","rkrow"+(isA?" sel-a":"")+(isB?" sel-b":""));
    row.innerHTML =
      '<span class="rkpos'+(r.champ?" champ":"")+'">'+esc(r.pos)+'</span>'+
      '<span class="rkimg">'+img+'</span>'+
      '<span><span class="rkname">'+esc(r.name)+nick+'</span><span class="rkmeta">'+meta+'</span></span>'+
      '<span class="rkbtns">'+
        '<button class="rkbtn red'+(isA?" active":"")+'" data-side="a" title="Add to Red corner">R</button>'+
        '<button class="rkbtn blue'+(isB?" active":"")+'" data-side="b" title="Add to Blue corner">B</button>'+
      '</span>';
    row.querySelectorAll(".rkbtn").forEach(btn=>{
      btn.addEventListener("click", ev=>{
        ev.stopPropagation();
        const fx=resolveFighter(r.name);
        const side=btn.dataset.side;
        (side==="a" ? PA : PB).set(fx);
        shown.a=HIST_STEP; shown.b=HIST_STEP;
        renderAll(); syncHash();
      });
    });
    row.addEventListener("click", ()=>{
      const fx=resolveFighter(r.name);
      // already on the tape — nothing to do (R/B still work for deliberate moves)
      if((SEL.a && SEL.a.key===fx.key) || (SEL.b && SEL.b.key===fx.key)) return;
      const side=nextCorner();
      (side==="a" ? PA : PB).set(fx);
      shown.a=HIST_STEP; shown.b=HIST_STEP;
      renderAll(); syncHash();
      if(window.posthog) posthog.capture('fighter_selected', {
        fighter_name: fx.name, corner: side==='a'?'red':'blue', source:'rankings_row'
      });
    });
    host.appendChild(row);
  });
}

export function setLastCorner(side){ LAST_CORNER = side; }
