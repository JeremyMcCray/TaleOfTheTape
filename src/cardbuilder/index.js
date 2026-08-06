import { closeRankPick } from "./rank-pick.js";
import { decodeCard } from "./share.js";
import { shuffleEmpty } from "./shuffle.js";
import { CARD, CARD_OPEN, CARD_STEP, setCardStep } from "./state.js";
import { applySetup } from "./step-setup.js";
import { closeTape, stepTape } from "./tape-modal.js";
import { closeCardView, openCardView, renderCardView } from "./view.js";
import { closeCommunity, communityOpen } from "../features/community-gallery.js";
import { closePublish, publishOpen } from "../features/community-publish.js";
import { $ } from "../lib/dom.js";

export function initCardBuilder(initialHash){
  $("#btnDreamCard").onclick=()=>{
    if(!CARD.sections.length){ applySetup(); }
    openCardView(CARD.sections.some(s=>s.bouts.some(b=>b.a||b.b)) ? CARD_STEP : "setup");
    if(window.posthog) posthog.capture('button_clicked', { button: 'dream_card' });
  };
  $("#cvClose").onclick=closeCardView;
  $("#cvEdit").onclick=()=>{ setCardStep("build"); renderCardView(); window.scrollTo(0,0); };
  $("#cvShuffle").onclick=()=>{ shuffleEmpty(false); renderCardView(); };
  $("#cvRestart").onclick=()=>{
    CARD.sections.forEach(s=>s.bouts.forEach(b=>{ b.a=null;b.b=null;b.title=false;b.titleTouched=false; }));
    setCardStep("setup"); renderCardView(); window.scrollTo(0,0);
  };
  $("#rpclose").onclick=closeRankPick;
  $("#rankpick").addEventListener("click", e=>{ if(e.target.id==="rankpick") closeRankPick(); });
  $("#tmClose").onclick=closeTape;
  $("#tmPrev").onclick=()=>stepTape(-1);
  $("#tmNext").onclick=()=>stepTape(1);
  $("#tapemodal").addEventListener("click", e=>{ if(e.target.id==="tapemodal") closeTape(); });
  document.addEventListener("keydown", e=>{
    if(e.key==="Escape"){
      /* innermost first: modal, then picker, then whichever full-screen
         overlay is up. The gallery is checked before the builder because
         opening a community card closes the gallery on its way in, so the
         two are never both open. */
      if(publishOpen())                              return closePublish();
      if($("#tapemodal").classList.contains("open")) return closeTape();
      if($("#rankpick").classList.contains("open"))  return closeRankPick();
      if(communityOpen())                            return closeCommunity();
      if(CARD_OPEN) return closeCardView();
    }
    if($("#tapemodal").classList.contains("open")){
      if(e.key==="ArrowRight") stepTape(1);
      if(e.key==="ArrowLeft")  stepTape(-1);
    }
  });
  if(decodeCard(initialHash||"")) openCardView("poster");
}
