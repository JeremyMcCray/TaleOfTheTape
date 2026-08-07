import { encodeCard } from "./share.js";
import { CARD, allBouts, boutLabel, boutWeight, setCardStep } from "./state.js";
import { openTape } from "./tape-modal.js";
import { closeCardView, renderCardView } from "./view.js";
import { primaryRank, ranksFor } from "../data/rankings.js";
import { recStr } from "../data/store.js";
import { openPublish } from "../features/community-publish.js";
import { initials } from "../features/tape.js";
import { $, el, esc } from "../lib/dom.js";
import { downloadPosterPNG } from "../poster/export.js";

export function posterSideHTML(f, side){
  if(!f){
    return '<div class="pside '+side+'"><span class="pface">?</span>'+
           '<span class="pinfo"><span class="pnm" style="color:#3a404c">TBD</span></span></div>';
  }
  const img = f.img
    ? '<img src="'+esc(f.img)+'" alt="'+esc(f.name)+'" loading="lazy" onerror="this.parentElement.textContent=&quot;'+esc(initials(f.name))+'&quot;">'
    : esc(initials(f.name));
  const pr=primaryRank(f), rk=ranksFor(f);
  let tag="";
  if(pr) tag='<span class="prk'+(pr.champ?" champ":"")+'">'+(pr.champ?"CHAMPION":"#"+pr.rank)+'</span>';
  else if(rk&&(rk.p4pMen||rk.p4pWomen)) tag='<span class="prk">P4P #'+(rk.p4pMen||rk.p4pWomen)+'</span>';
  const rec = recStr(f);
  return '<div class="pside '+side+'">'+
    '<span class="pface">'+img+'</span>'+
    '<span class="pinfo">'+
      '<span class="pnm">'+esc(f.name)+'</span>'+
      (f.nickname?'<span class="pnk">"'+esc(f.nickname)+'"</span>':'')+
      '<span class="prc">'+esc(rec)+'</span>'+
      (tag?'<br>'+tag:'')+
    '</span></div>';
}
export function renderPoster(host){
  const bouts=allBouts();
  const filled=bouts.filter(x=>x.bout.a&&x.bout.b);
  const me=CARD.sections.find(s=>s.id==="main");
  const meBout=me&&me.bouts[0];
  const poster=el("div","poster");

  const head=el("div","pbanner");
  head.innerHTML='<div class="plabel">Fantasy Fight Card</div>'+
    '<h2>'+esc(CARD.name || (meBout&&meBout.a&&meBout.b ? meBout.a.name.split(" ").slice(-1)[0]+" vs "+meBout.b.name.split(" ").slice(-1)[0] : "Your Dream Card"))+'</h2>'+
    '<div class="pmeta">'+bouts.length+' Bouts · '+CARD.sections.map(s=>esc(s.label)).join(" · ")+'</div>';
  poster.appendChild(head);

  CARD.sections.forEach(sec=>{
    const block=el("div","psec");
    block.appendChild(el("div","psechdr","<span>"+esc(sec.label)+"</span>"));
    sec.bouts.forEach((b,i)=>{
      const ready=!!(b.a&&b.b);
      const row=el("div","pbout"+(sec.id==="main"&&i===0?" mainev":"")+(ready?"":" tbd"));
      const lbl=boutLabel(sec,i), wc=boutWeight(b);
      const tagbits=[];
      if(lbl) tagbits.push('<i>'+esc(lbl)+'</i>');
      if(wc) tagbits.push(esc(wc));
      if(b.title) tagbits.push('<b>Title Fight</b>');
      row.innerHTML =
        (tagbits.length?'<div class="pbtag">'+tagbits.join(" · ")+'</div>':'<div class="pbtag">&nbsp;</div>')+
        '<div class="pbrow">'+posterSideHTML(b.a,"a")+'<div class="pvs">VS</div>'+posterSideHTML(b.b,"b")+'</div>';
      if(ready) row.onclick=()=> openTape(b);
      block.appendChild(row);
    });
    poster.appendChild(block);
  });
  poster.appendChild(el("div","pfoot", filled.length? "Tap any matchup for the tale of the tape" : "Fill in some matchups to see the tape"));
  /* mirrors the PNG's signature line, so what you see here is what downloads */
  const credit=(CARD.credit||"").trim();
  if(credit) poster.appendChild(el("div","pcredit","Built by "+esc(credit)));
  host.appendChild(poster);

  const bar=el("div","gobar");
  bar.innerHTML='<button class="big" id="postPng">⬇ Download PNG</button>'+
                '<button class="big gold" id="postPublish">Publish to Community</button>'+
                '<button class="big ghost" id="postEdit">◀ Edit Matchups</button>'+
                '<button class="big ghost" id="postLink">Copy Card Link</button>'+
                '<button class="big ghost" id="postClose">Back to Comparison</button>';
  $("#cvacts").appendChild(bar);
  const pnote=$("#pngnote");
  $("#postPng").disabled = filled.length===0 && !bouts.some(x=>x.bout.a||x.bout.b);
  $("#postPng").onclick=()=> downloadPosterPNG($("#postPng"), pnote);
  /* a card with one filled bout is not worth a gallery slot; openPublish()
     enforces the real floor and explains itself in #pngnote */
  $("#postPublish").disabled = filled.length===0;
  $("#postPublish").onclick=()=>{ pnote.classList.remove("warn"); openPublish(); };
  $("#postEdit").onclick=()=>{ setCardStep("build"); renderCardView(); window.scrollTo(0,0); };
  $("#postClose").onclick=closeCardView;
  $("#postLink").onclick=async()=>{
    const url=location.origin+location.pathname+location.search+"#"+encodeCard();
    try{ await navigator.clipboard.writeText(url); $("#postLink").textContent="Copied!"; }
    catch(e){ $("#postLink").textContent="Copy failed"; }
    setTimeout(()=>$("#postLink").textContent="Copy Card Link",1500);
  };
  history.replaceState(null,"","#"+encodeCard());
}

/* ======================= poster PNG export =======================
   Renders the finished card to a canvas in the traditional fight-poster
   layout — headline bout large, undercard in rows, a band between each
   section — and hands it back as a PNG download.

   Photos are fetched with crossOrigin="anonymous" so the canvas can never
   be tainted and toBlob() can't throw. Any photo whose host refuses CORS
   falls back to an initials tile, so the export always produces a file. */
