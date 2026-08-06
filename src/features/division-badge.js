import { renderAll } from "../app/render.js";
import { CARD_OPEN } from "../cardbuilder/state.js";
import { closeTape, renderTape } from "../cardbuilder/tape-modal.js";
import { closeCardView, renderCardView } from "../cardbuilder/view.js";
import { wikiPhoto } from "../data/photos.js";
import { DB } from "../data/store.js";
import { openDivision } from "./rankings-browser.js";
import { $ } from "../lib/dom.js";

document.addEventListener("click", e=>{
  const link = e.target.closest(".divlink");
  if(!link) return;
  e.preventDefault(); e.stopPropagation();
  // the same card markup is reused inside the dream-card tape modal — step out
  // of those first so the rankings aren't opened behind an overlay
  if($("#tapemodal") && $("#tapemodal").classList.contains("open")) closeTape();
  if(CARD_OPEN) closeCardView();
  openDivision(link.dataset.div);
  if(window.posthog) posthog.capture('button_clicked', { button:'division_badge', division:link.dataset.div });
});

document.addEventListener("click", async e=>{
  const btn = e.target.closest(".findpic");
  if(!btn) return;
  e.stopPropagation();
  const f = DB.byKey.get(btn.dataset.key);
  if(!f) return;
  btn.disabled = true;
  btn.textContent = "Searching…";
  try{
    const url = await wikiPhoto(f.name);
    if(url){
      f.img = url;
      renderAll();
      if($("#tapemodal").classList.contains("open")) renderTape();
      if(CARD_OPEN) renderCardView();
    } else {
      btn.classList.add("miss");
      btn.textContent = "No photo found";
    }
  }catch(err){
    console.warn("wikipedia lookup failed:", err);
    btn.classList.add("miss");
    btn.textContent = "Lookup failed";
  }
});

/* ============================================================
   DREAM CARD BUILDER
   ============================================================ */
