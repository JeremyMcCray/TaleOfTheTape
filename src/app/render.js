import { renderRankList } from "../features/rankings-browser.js";
import { SEL } from "../features/search.js";
import { HIST_STEP, cardHTML, renderBreakdown, renderH2H, renderHistory, renderMatchNote, renderStats, shown } from "../features/tape.js";
import { $ } from "../lib/dom.js";

export function renderAll(){
  const a=SEL.a, b=SEL.b;
  $("#card-a").innerHTML = cardHTML(a,"a");
  $("#card-b").innerHTML = cardHTML(b,"b");
  renderStats(a,b);
  shown.a = Math.max(shown.a, HIST_STEP); shown.b = Math.max(shown.b, HIST_STEP);
  renderHistory("a", a, b);
  renderHistory("b", b, a);
  renderBreakdown("a", a);
  renderBreakdown("b", b);
  renderH2H(a,b);
  renderMatchNote(a,b);
  renderRankList();
  document.title = (a&&b) ? a.name+" vs "+b.name+" — Tale of the Tape" : "Tale of the Tape — UFC Fighter Comparison";
}

/* ============================ wiring ============================ */
