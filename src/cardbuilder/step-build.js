import { RP_USED, openRankPick, ranksReady } from "./rank-pick.js";
import { fsearch, resultRowHTML } from "./search.js";
import { CARD, SETUP, allBouts, autoTitle, blankBout, boutLabel, secDef, setCardStep, usedKeys } from "./state.js";
import { renderCardView } from "./view.js";
import { primaryRank } from "../data/rankings.js";
import { DB, recStr } from "../data/store.js";
import { showDanaCameo } from "../features/easter-egg.js";
import { initials } from "../features/tape.js";
import { $, el, esc } from "../lib/dom.js";

export function renderBuild(host){
  const dups=usedKeys(null);
  if(ranksReady()){
    const hint=el("div","buildhint");
    hint.innerHTML='<span>Type a fighter\'s name to search — or hit</span>'+
      '<span class="kbd"><span aria-hidden="true">★</span> RANKINGS</span>'+
      '<span>to pick straight from the official top 15.</span>';
    host.appendChild(hint);
  }
  CARD.sections.forEach(sec=>{
    const def=secDef(sec.id);
    const block=el("div","secblock");
    const hdr=el("div","sechdr");
    hdr.innerHTML='<h3>'+esc(sec.label)+'</h3><span class="cnt">'+sec.bouts.length+' bout'+(sec.bouts.length===1?'':'s')+'</span>';
    const add=el("button","mini","+ Add Bout");
    add.disabled = sec.bouts.length>=def.max;
    if(add.disabled) add.style.opacity=".35";
    add.onclick=()=>{ if(sec.bouts.length<def.max){ sec.bouts.push(blankBout()); SETUP[sec.id]=sec.bouts.length; renderCardView(); } };
    hdr.appendChild(add);
    block.appendChild(hdr);

    sec.bouts.forEach((b,i)=>{
      autoTitle(b);
      const lbl=boutLabel(sec,i);
      const row=el("div","slot"+(sec.id==="main"&&i===0?" mainev":""));
      row.appendChild(el("div","slotno", String(i+1)+(lbl?'<b>'+esc(lbl.replace(" Event","").replace(" Headliner",""))+'</b>':'')));
      row.appendChild(fighterSlot(b,"a"));
      row.appendChild(el("div","slotvs","VS"));
      row.appendChild(fighterSlot(b,"b"));

      const acts=el("div","slotacts");
      const tg=el("button","slotdel tglt"+(b.title?" on":""),"◎");
      tg.title="Mark as a title fight";
      tg.onclick=()=>{ b.title=!b.title; b.titleTouched=true; renderCardView(); };
      const del=el("button","slotdel","✕");
      del.title="Remove this bout";
      del.onclick=()=>{
        if(sec.bouts.length<=1){ sec.bouts[0]=blankBout(); }
        else sec.bouts.splice(i,1);
        SETUP[sec.id]=sec.bouts.length;
        renderCardView();
      };
      acts.appendChild(tg); acts.appendChild(del);
      row.appendChild(acts);
      block.appendChild(row);
    });
    host.appendChild(block);
  });

  const dupNames=[...dups.entries()].filter(([k,n])=>n>1)
    .map(([k])=> (DB.byKey.get(k)||{}).name || k);
  const bar=el("div","gobar");
  const filled=allBouts().filter(x=>x.bout.a&&x.bout.b).length;
  bar.innerHTML =
    (dupNames.length?'<div style="width:100%;text-align:center;margin-bottom:6px" class="dupwarn">Booked twice on this card: '+esc(dupNames.join(", "))+'</div>':'')+
    '<button class="big" id="buildGo">See the Card →</button>'+
    '<button class="big ghost" id="buildBack">◀ Change Card Size</button>';
  $("#cvacts").appendChild(bar);
  $("#buildGo").disabled = filled===0;
  $("#buildGo").onclick=()=>{ setCardStep("poster"); renderCardView(); window.scrollTo(0,0); };
  $("#buildBack").onclick=()=>{ setCardStep("setup"); renderCardView(); window.scrollTo(0,0); };
}

/* one corner of one bout: avatar + search input + rankings shortcut */
export function fighterSlot(bout, side){
  const wrap=el("div","fslot "+(side==="a"?"red":"blue"));
  const f=bout[side];
  const av = f && f.img
    ? '<img src="'+esc(f.img)+'" alt="" loading="lazy" onerror="this.parentElement.textContent=&quot;'+esc(f?initials(f.name):"")+'&quot;">'
    : (f?esc(initials(f.name)):'<span style="color:#333a45">?</span>');
  wrap.innerHTML =
    '<div class="fsin">'+
      '<span class="fsav">'+av+'</span>'+
      '<input type="text" placeholder="'+(side==="a"?"Red corner…":"Blue corner…")+'" autocomplete="off" spellcheck="false" value="'+esc(f?f.name:"")+'">'+
      (f
        ? '<button type="button" class="fsbtn" title="Clear this corner" aria-label="Clear this corner">✕</button>'
        : (ranksReady()
            ? '<button type="button" class="fsbtn rk'+(RP_USED?"":" nudge")+'" '+
              'title="Pick from the official UFC rankings" aria-label="Pick from the official UFC rankings">'+
              '<span class="rkstar" aria-hidden="true">★</span>RANKINGS</button>'
            : ''))+
    '</div>'+
    '<div class="fsmeta"></div>'+
    '<div class="slotres"></div>';

  const input=wrap.querySelector("input");
  const box=wrap.querySelector(".slotres");
  const meta=wrap.querySelector(".fsmeta");

  if(f){
    const pr=primaryRank(f);
    const bits=[];
    if(pr) bits.push(pr.champ?"Champion":"#"+pr.rank);
    if(f.division) bits.push(f.division);
    bits.push(recStr(f));
    const dup=usedKeys(bout).get(f.key);
    meta.innerHTML = esc(bits.join(" · ")) + (dup?' <span class="dupwarn">· also booked elsewhere</span>':'');
  }

  function render(list){
    box.innerHTML="";
    if(!list.length){ box.innerHTML='<div class="empty">No fighter found.</div>'; box.classList.add("open"); return; }
    list.forEach(fx=>{
      const r=el("div","row"); r.innerHTML=resultRowHTML(fx);
      r.addEventListener("mousedown", ev=>{ ev.preventDefault(); pick(fx); });
      box.appendChild(r);
    });
    box.classList.add("open");
  }
  function pick(fx){
    bout[side]=fx; bout.titleTouched=bout.titleTouched||false; renderCardView();
    if(fx && fx._egg) showDanaCameo();
  }

  input.addEventListener("focus", ()=> render(fsearch(input.value)));
  input.addEventListener("input", ()=> render(fsearch(input.value)));
  input.addEventListener("blur", ()=> setTimeout(()=>box.classList.remove("open"),140));
  input.addEventListener("keydown", e=>{
    if(e.key==="Enter"){ e.preventDefault(); const l=fsearch(input.value); if(l.length) pick(l[0]); }
    if(e.key==="Escape") box.classList.remove("open");
  });
  const btn=wrap.querySelector(".fsbtn");
  if(btn) btn.onclick=()=>{
    if(f){ bout[side]=null; renderCardView(); }
    else openRankPick(bout, side);
  };
  return wrap;
}

/* ---------- rankings picker modal ---------- */
