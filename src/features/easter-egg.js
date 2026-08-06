import { renderAll } from "../app/render.js";
import { wikiPhoto } from "../data/photos.js";
import { SEL } from "./search.js";
import { $, esc } from "../lib/dom.js";
import { fightSeconds, methodClass } from "../lib/fight.js";
import { parseDate } from "../lib/format.js";
import { norm } from "../lib/text.js";

/* ============================================================
   EASTER EGG — Dana White
   Hidden "fighter" who never appears in DB.list (so he can't be
   drawn by Random Matchup, the dream-card shuffle or the default
   dropdown). He only surfaces when you actually type his name into
   a corner search box. Picking him plays a cameo, then loads him
   into the corner with a full joke tale of the tape.
   ============================================================ */
export const DANA_KEY = "danawhite";
export const DANA_QUOTES = [
  "Do you wanna be a f***ing fighter?!",
  "This is the biggest fight in the history of our sport.",
  "I'm the guy who says yes. Everybody else says no.",
  "Nobody wants to see that fight. Next question.",
  "That fight makes sense. Let's make it. Done.",
  "Best card we've ever put together. And I mean that.",
  "I've been doing this a long time and I've never seen anything like it.",
  "We'll do it in a backyard. I don't care.",
  "Real recognize real."
];
/* fallback if Wikipedia's API is unreachable (offline / blocked).
   Special:FilePath redirects to the current upload, so it survives re-uploads. */
export const DANA_IMG_FALLBACK =
  "https://commons.wikimedia.org/wiki/Special:FilePath/Dana%20White%20-%202015%20(cropped).jpg?width=480";

export function danaFight(o){
  return Object.assign({
    oppKey: norm(o.opp), loc:"Las Vegas, Nevada, USA",
    weightclass:"Catchweight", title:false, detail:"", url:"",
    secs: fightSeconds(o.round, o.time)
  }, o, { mclass: methodClass(o.method), date: parseDate(o.date) });
}

/* built once, lazily — parseDate/methodClass must already be defined */
export let DANA = null;
export function buildDana(){
  if(DANA) return DANA;
  const f = {
    key: DANA_KEY,
    name: "Dana White",
    nickname: "The Baldfather",
    img: "",
    division: "Front Office",
    status: "President",
    height: 68, weight: 195, reach: 70, legReach: null,
    stance: "Orthodox (Cageside)",
    dob: "Jul 28, 1969",
    age: ageFrom("Jul 28, 1969"),
    born: "Manchester, Connecticut, USA",
    style: "Boxing / Matchmaking",
    debut: "Jan. 11, 2001",
    rank: "",
    pro: null,
    _egg: true,
    fights: [
      { opp:"Power Slap Critics",     res:"W", method:"KO/TKO",        round:"1", time:"0:09",
        event:"Power Slap 1",              date:"Jan 18, 2023" },
      { opp:"WME-IMG's Checkbook",    res:"W", method:"Decision - Unanimous", round:"3", time:"5:00",
        event:"The $4 Billion Sale",       date:"Jul 11, 2016", title:true },
      { opp:"Ariel Helwani",          res:"W", method:"Submission",    round:"1", time:"0:04",
        event:"UFC 199: Credential Revocation", date:"Jun 5, 2016" },
      { opp:"The Blackjack Table",    res:"W", method:"Submission",    round:"1", time:"4:44",
        event:"The Palms · Banned For Life", date:"Feb 8, 2014" },
      { opp:"Tito Ortiz",             res:"N", method:"Could Not Continue", round:"1", time:"0:00",
        event:"The Boxing Match That Never Happened", date:"Aug 2, 2008" },
      { opp:"Fighter Pay Questions",  res:"W", method:"Decision - Split", round:"3", time:"5:00",
        event:"Every Post-Fight Presser",  date:"Nov 12, 2005" },
      { opp:"The Fertittas' $2M",     res:"W", method:"KO/TKO",        round:"1", time:"1:11",
        event:"Zuffa LLC Formation",       date:"Jan 11, 2001", title:true }
    ].map(danaFight)
  };
  f.rec = tally(f.fights);
  f.searchable = norm(f.name) + " " + norm(f.nickname) + " uncledana president baldfather";
  f.sortName = "white";
  DANA = f;
  DB.byKey.set(DANA_KEY, f);      /* reachable by #red=danawhite / findpic, but NOT in DB.list */
  loadDanaPhoto();
  return f;
}

/* pull his photo off Wikipedia with the same CORS-friendly call the
   "Find photo" button uses; fall back to a Commons FilePath redirect */
export let danaPhotoTried = false;
export async function loadDanaPhoto(){
  if(danaPhotoTried) return;
  danaPhotoTried = true;
  let url = null;
  try{
    const api = "https://en.wikipedia.org/w/api.php?";
    const q = new URLSearchParams({
      action:"query", format:"json", origin:"*", titles:"Dana White",
      prop:"pageimages", piprop:"original|thumbnail", pithumbsize:"480"
    });
    const r = await fetch(api + q.toString());
    if(r.ok){
      const j = await r.json();
      const p = j && j.query && j.query.pages ? Object.values(j.query.pages)[0] : null;
      if(p) url = (p.thumbnail && p.thumbnail.source) || (p.original && p.original.source) || null;
    }
  }catch(e){ console.warn("dana photo lookup failed:", e); }
  if(!url){ try{ url = await wikiPhoto("Dana White"); }catch(e){ /* offline */ } }
  if(!url) url = DANA_IMG_FALLBACK;
  if(DANA) DANA.img = url;
  const pic = $("#danaPic");
  if(pic && !pic.querySelector("img")){
    pic.innerHTML = '<img src="'+esc(url)+'" alt="Dana White" '+
      'onerror="this.parentElement.textContent=\'DW\'">';
  }
  if(typeof SEL!=="undefined" && (SEL.a===DANA || SEL.b===DANA)) renderAll();
}

/* does this search query summon him? */
export function danaMatch(nq){
  if(!nq || nq.length < 4) return false;
  if("danawhite".indexOf(nq) === 0) return true;                 // dana, danaw, danawhite…
  return /^(baldfather|uncledana|thebaldfather|danafuckingwhite)/.test(nq);
}

export let danaOpenedAt = 0;
export function showDanaCameo(){
  const box = $("#dana");
  if(!box) return;
  $("#danaQuote").textContent = DANA_QUOTES[Math.floor(Math.random()*DANA_QUOTES.length)];
  box.classList.add("open");
  danaOpenedAt = Date.now();
  if(window.posthog) posthog.capture('easter_egg', { egg:'dana_white' });
}
export function hideDanaCameo(){
  const box = $("#dana");
  if(box) box.classList.remove("open");
}
document.addEventListener("click", e=>{
  const box = $("#dana");
  if(!box || !box.classList.contains("open")) return;
  /* the result row is picked on mousedown, so the click that selected him
     still bubbles up here — ignore it or the cameo closes instantly */
  if(Date.now() - danaOpenedAt < 350) return;
  if(e.target.closest("#danaClose") || !e.target.closest(".dbox")) hideDanaCameo();
});
document.addEventListener("keydown", e=>{
  if(e.key === "Escape") hideDanaCameo();
});

/* ============================ search UI ============================ */
