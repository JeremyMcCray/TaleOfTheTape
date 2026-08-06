import { renderAll } from "./render.js";
import { PA, PB, fromHash, setPickers, syncHash } from "./router.js";
import { initCardBuilder } from "../cardbuilder/index.js";
import { DB } from "../data/store.js";
import { initCommunity } from "../features/community-gallery.js";
import { initPublish } from "../features/community-publish.js";
import { randomMatchup } from "../features/random-matchup.js";
import { initRankings, setRankingsOpen } from "../features/rankings-browser.js";
import { SEL, makePicker } from "../features/search.js";
import { HIST_STEP, shown } from "../features/tape.js";
import { $ } from "../lib/dom.js";

export function initUI(){
  const INITIAL_HASH = location.hash;
  setPickers(makePicker("a"), makePicker("b"));


  document.querySelectorAll(".tab").forEach(t=>{
    t.onclick=()=>{
      const tabs=$("#tabs"); if(tabs) tabs.classList.remove("nudge");  // stop the attention pulse for good
      document.querySelectorAll(".tab").forEach(x=>x.classList.remove("on"));
      document.querySelectorAll(".panel").forEach(x=>x.classList.remove("on"));
      t.classList.add("on"); $("#"+t.dataset.p).classList.add("on");
      if(window.posthog) posthog.capture('tab_clicked', { tab: t.textContent.trim() });
    };
  });

  $("#btnRandom").onclick=()=>{
    const [x,y] = randomMatchup();
    if(!x || !y) return;
    PA.set(x); PB.set(y);
    shown.a=HIST_STEP; shown.b=HIST_STEP;
    renderAll(); syncHash();
    if(window.posthog) posthog.capture('button_clicked', { button: 'random_matchup' });
  };
  $("#btnRankings").onclick=()=>{
    setRankingsOpen(true);
    $("#rankwrap").scrollIntoView({behavior:"smooth", block:"start"});
  };

  initRankings();

  fromHash();
  if(!SEL.a && !SEL.b){
    // a marquee default if present
    const dA = DB.byKey.get("ilaitopuria") || DB.byKey.get("iliatopuria");
    const dB = DB.byKey.get("islammakhachev");
    if(dA) PA.set(dA);
    if(dB) PB.set(dB);
  }
  renderAll();
  syncHash();
  initCardBuilder(INITIAL_HASH);
  initPublish();
  initCommunity(INITIAL_HASH);
}
