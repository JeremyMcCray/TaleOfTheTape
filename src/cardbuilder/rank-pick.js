import { usedKeys } from "./state.js";
import { renderCardView } from "./view.js";
import { divisionLabel, isP4P, rankRows } from "../data/rankings.js";
import { RANKINGS, findByName, recStr, resolveFighter } from "../data/store.js";
import { initials } from "../features/tape.js";
import { $, el, esc } from "../lib/dom.js";
import { norm } from "../lib/text.js";

export const RP={ bout:null, side:null, active:null };
export let RP_USED=false;   // once they've found the button, stop nudging
export function ranksReady(){ return !!(RANKINGS && RANKINGS.length); }
export function openRankPick(bout, side){
  if(!ranksReady()) return;   // rankings feed unavailable — search box still works
  RP_USED=true;
  if(window.posthog) posthog.capture('button_clicked', { button:'slot_rankings_picker', corner:side });
  RP.bout=bout; RP.side=side; RP.active=RP.active||RANKINGS[0].id;
  $("#rpsub").textContent = (side==="a"?"Red corner":"Blue corner");
  const pills=$("#rpdivpills"); pills.innerHTML="";
  RANKINGS.forEach(cat=>{
    const b=el("button","divpill"+(isP4P(cat)?" p4p":"")+(cat.id===RP.active?" on":""), esc(divisionLabel(cat)));
    b.onclick=()=>{ RP.active=cat.id; openRankPick(RP.bout,RP.side); };
    pills.appendChild(b);
  });
  const host=$("#rplist"); host.innerHTML="";
  const cat=RANKINGS.find(c=>c.id===RP.active)||RANKINGS[0];
  const rows=rankRows(cat);
  const taken=usedKeys(null);
  rows.forEach(r=>{
    const f=findByName(r.name), key=f?f.key:norm(r.name);
    const img = f&&f.img
      ? '<img src="'+esc(f.img)+'" alt="" loading="lazy" onerror="this.parentElement.textContent=&quot;'+esc(initials(r.name))+'&quot;">'
      : esc(initials(r.name));
    const meta = (f? esc(f.division||cat.categoryName)+' · '+recStr(f) : esc(cat.categoryName))
      + (taken.get(key)?' · <span class="dupwarn">on this card</span>':'');
    const row=el("div","rkrow");
    row.innerHTML=
      '<span class="rkpos'+(r.champ?" champ":"")+'">'+esc(r.pos)+'</span>'+
      '<span class="rkimg">'+img+'</span>'+
      '<span><span class="rkname">'+esc(r.name)+(f&&f.nickname?'<span class="rknick">"'+esc(f.nickname)+'"</span>':'')+'</span>'+
      '<span class="rkmeta">'+meta+'</span></span><span></span>';
    row.onclick=()=>{
      RP.bout[RP.side]=resolveFighter(r.name);
      closeRankPick(); renderCardView();
    };
    host.appendChild(row);
  });
  $("#rankpick").classList.add("open");
}
export function closeRankPick(){ $("#rankpick").classList.remove("open"); }

/* ---------- shuffle / random fill ---------- */
