import { saveDraft } from "./draft.js";
import { shuffleEmpty } from "./shuffle.js";
import { CARD, SEC_DEFS, SETUP, blankBout, setCardStep } from "./state.js";
import { renderCardView } from "./view.js";
import { $, el, esc } from "../lib/dom.js";

export function renderSetup(host){
  const box=el("div","setupbox");
  box.innerHTML =
    '<h2>Build Your <em>Dream</em> Card</h2>'+
    '<p class="sub">Set how many fights you want, then make the matchups.<br>'+
    'When you\'re done you get the whole card laid out — tap any fighter to open the tale of the tape.</p>'+
    '<input class="evname" id="setupName" maxlength="44" placeholder="Event name (optional)" value="'+esc(CARD.name)+'">';
  for(const d of SEC_DEFS){
    const row=el("div","szrow");
    let opts='';
    if(d.allowZero) opts+='<button class="szopt zero'+(SETUP[d.id]===0?" on":"")+'" data-sec="'+d.id+'" data-n="0">None</button>';
    for(let n=d.min;n<=d.max;n++) opts+='<button class="szopt'+(SETUP[d.id]===n?" on":"")+'" data-sec="'+d.id+'" data-n="'+n+'">'+n+'</button>';
    row.innerHTML='<div class="szlbl">'+d.label+'<span>'+d.note+'</span></div><div class="szopts">'+opts+'</div>';
    box.appendChild(row);
  }
  const bar=el("div","gobar");
  bar.innerHTML='<button class="big" id="setupGo">Make the Matchups →</button>'+
                '<button class="big ghost" id="setupRandom">Surprise Me — Random Card</button>';
  $("#cvacts").appendChild(bar);
  host.appendChild(box);

  box.querySelectorAll(".szopt").forEach(b=>{
    b.onclick=()=>{
      SETUP[b.dataset.sec]=+b.dataset.n;
      box.querySelectorAll('.szopt[data-sec="'+b.dataset.sec+'"]').forEach(x=>x.classList.remove("on"));
      b.classList.add("on");
      saveDraft();   /* the setup step never repaints, so it saves for itself */
    };
  });
  $("#setupName").oninput=e=>{ CARD.name=e.target.value; saveDraft(); };
  $("#setupGo").onclick=()=>{ applySetup(); setCardStep("build"); renderCardView(); window.scrollTo(0,0); };
  $("#setupRandom").onclick=()=>{ applySetup(); shuffleEmpty(true); setCardStep("poster"); renderCardView(); window.scrollTo(0,0); };
}
export function applySetup(){
  const old=new Map(CARD.sections.map(s=>[s.id,s.bouts]));
  CARD.sections = SEC_DEFS.filter(d=>SETUP[d.id]>0).map(d=>{
    const keep=old.get(d.id)||[];
    const bouts=[];
    for(let i=0;i<SETUP[d.id];i++) bouts.push(keep[i]||blankBout());
    return { id:d.id, label:d.label, bouts };
  });
}

/* ---------- step 2: build ---------- */
