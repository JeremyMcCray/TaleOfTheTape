import { syncHash } from "../app/router.js";
import { saveDraft } from "./draft.js";
import { CARD, CARD_STEP, setCardOpen, setCardStep } from "./state.js";
import { renderBuild } from "./step-build.js";
import { renderPoster } from "./step-poster.js";
import { renderSetup } from "./step-setup.js";
import { $, esc } from "../lib/dom.js";

export function openCardView(step){
  setCardOpen(true);
  if(step) setCardStep(step);
  $("#cardview").classList.add("open");
  document.body.classList.add("locked");
  renderCardView();
  window.scrollTo(0,0);
}
export function closeCardView(){
  setCardOpen(false);
  $("#cardview").classList.remove("open");
  document.body.classList.remove("locked");
  saveDraft();          // keep the card, but do not reopen the overlay on reload
  syncHash();
}

export function renderCardView(){
  const host=$("#cvbody");
  $("#cvEdit").style.display   = CARD_STEP==="poster" ? "" : "none";
  $("#cvShuffle").style.display= CARD_STEP==="build"  ? "" : "none";
  $("#cvttl").innerHTML = CARD_STEP==="poster"
    ? esc(CARD.name || "Your Dream Card")+"<small>Tap a fighter for the tape</small>"
    : "Build Your Dream Card<small>"+(CARD_STEP==="build"?"Make the matchups":"Set the card")+"</small>";
  host.innerHTML="";
  $("#cvacts").innerHTML=""; $("#pngnote").textContent="";
  if(CARD_STEP==="setup")  renderSetup(host);
  if(CARD_STEP==="build")  renderBuild(host);
  if(CARD_STEP==="poster") renderPoster(host);
  /* every mutation in the builder ends in a repaint, so this one call is the
     whole save path for the build and poster steps */
  saveDraft();
}

/* ---------- step 1: setup ---------- */
