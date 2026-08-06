/* ============================================================
   The community gallery — a full-screen overlay, same shape as the dream
   card builder, so it inherits that CSS and that muscle memory.

   Why an overlay and not a second HTML page: rendering a card means turning
   fighter keys back into fighters, which needs the roster that boot()
   already loaded. A separate page would re-fetch ~40 MB of CSVs before it
   could draw a single tile.

   Four tabs. Top and Newest are public. Mine is your own cards, which is
   the only place a card of yours that got held will show up — to you it
   looks published, because from your side it is. Review only appears for
   the owner uid and is where held cards actually wait.
   ============================================================ */
import { openCardView } from "../cardbuilder/view.js";
import { community, communityAdapterName, isLocalOnly } from "../community/client.js";
import { ANON } from "../community/identity.js";
import { MAX, displaySafe } from "../community/moderation.js";
import { payloadToCard } from "../community/payload.js";
import { DB } from "../data/store.js";
import { $, el, esc } from "../lib/dom.js";

let SORT   = "top";
let ME     = { uid: "", owner: false };
let loaded = false;          /* has init() run against the adapter yet */
let seq    = 0;              /* guards against a slow tab landing after a fast one */

export function communityOpen(){ return $("#community").classList.contains("open"); }

/* ---------- wiring -------------------------------------------------------- */

export function initCommunity(initialHash){
  $("#btnCommunity").onclick = () => {
    openCommunity("top");
    if(window.posthog) posthog.capture("button_clicked", { button: "community" });
  };
  $("#comClose").onclick   = closeCommunity;
  $("#comRefresh").onclick = () => load();

  $("#comtabs").addEventListener("click", e => {
    const t = e.target.closest(".comtab");
    if(!t) return;
    SORT = t.dataset.sort;
    document.querySelectorAll(".comtab").forEach(x => x.classList.toggle("on", x === t));
    load();
  });

  /* One delegated handler for every tile action — tiles are rebuilt on each
     load, so per-tile listeners would just leak. */
  $("#combody").addEventListener("click", onTileClick);

  if(/^#?community$/.test(initialHash || "")) openCommunity("top");
}

export async function openCommunity(sort){
  if(sort) SORT = sort;
  document.querySelectorAll(".comtab").forEach(x => x.classList.toggle("on", x.dataset.sort === SORT));
  $("#community").classList.add("open");
  document.body.classList.add("locked");
  window.scrollTo(0, 0);

  if(!loaded){
    $("#combody").innerHTML = '<div class="comnote pad">Connecting…</div>';
    const r = await community.init();
    loaded = true;
    ME = { uid: r.uid || "", owner: !!r.owner };
    if(!r.ok) $("#comnote").textContent = r.error || "";
  }
  $('.comtab[data-sort="held"]').style.display = ME.owner ? "" : "none";
  banner();
  load();
}

export function closeCommunity(){
  $("#community").classList.remove("open");
  /* the gallery can be opened from on top of the card view (that is what
     happens right after publishing), so only give scrolling back if there
     is nothing left covering the page */
  if(!$("#cardview").classList.contains("open")) document.body.classList.remove("locked");
}

/* ---------- the standing message above the list --------------------------- */

function banner(){
  const n = $("#comnote");
  n.classList.toggle("warn", isLocalOnly());
  n.textContent = isLocalOnly()
    ? "No backend configured — these cards live in this browser only. Nobody else can see them. See src/community/config.js."
    : "";
  $("#comfoot").innerHTML =
    '<span class="comid">backend: ' + esc(communityAdapterName()) +
    (ME.uid ? ' · your id: <code>' + esc(ME.uid) + '</code>' : '') + '</span>' +
    (isLocalOnly() ? '<button class="mini" id="comReset">Reset local gallery</button>' : '');
  const reset = $("#comReset");
  if(reset) reset.onclick = () => {
    ["cards", "votes", "rate"].forEach(k => { try { localStorage.removeItem("tott.community." + k); } catch {} });
    load();
  };
}

/* ---------- loading ------------------------------------------------------- */

async function load(){
  const host = $("#combody");
  const mine = ++seq;
  host.innerHTML = '<div class="comnote pad">Loading…</div>';

  const res = await community.list({ sort: SORT });
  if(mine !== seq) return;                       /* a newer tab click won */

  if(!res.ok){
    host.innerHTML = '<div class="comnote pad warn">' + esc(res.error || "Couldn't load the gallery.") + '</div>';
    return;
  }
  if(!res.cards.length){
    host.innerHTML = '<div class="comnote pad">' + esc(emptyCopy()) + '</div>';
    return;
  }

  const grid = el("div", "cgrid");
  res.cards.forEach(c => grid.appendChild(tile(c)));
  host.innerHTML = "";
  host.appendChild(grid);
}

function emptyCopy(){
  if(SORT === "held") return "Nothing waiting. Cards that trip the filter land here.";
  if(SORT === "mine") return "You haven't published a card yet. Build one, then hit Publish on the poster.";
  return "No cards yet. Build a dream card and publish it — you can be first.";
}

/* ---------- a tile -------------------------------------------------------- */

const fighterName = key => {
  const f = key && DB.byKey.get(key);
  return f ? f.name : "TBD";
};

/* The headline bout: the first fully-filled matchup, main card first. */
function headline(payload){
  for(const s of (payload && payload.sections) || [])
    for(const b of s.bouts || [])
      if(b.a && b.b) return b;
  return null;
}
function countBouts(payload){
  return ((payload && payload.sections) || []).reduce((n, s) => n + (s.bouts || []).length, 0);
}

function tile(c){
  const n = el("article", "ccard" + (c.status === "held" ? " held" : ""));
  n.dataset.id = c.id;

  const head  = headline(c.payload);
  const total = countBouts(c.payload);
  const who   = displaySafe(c.author, MAX.HANDLE) || ANON;

  const meta = [
    total + " bout" + (total === 1 ? "" : "s"),
    ((c.payload && c.payload.sections) || []).map(s => s.id === "main" ? "Main Card" : s.id === "prelim" ? "Prelims" : "Early Prelims").join(" · ")
  ].filter(Boolean).join(" · ");

  const acts = [];
  acts.push('<button class="mini act" data-act="open">Open Card</button>');
  if(SORT === "held")            acts.push('<button class="mini act ok" data-act="release">Approve</button>');
  if(c.mine || ME.owner)         acts.push('<button class="mini act warn" data-act="del">Delete</button>');
  if(SORT !== "held" && ME.owner && c.status === "public")
                                 acts.push('<button class="mini act" data-act="hold">Hold</button>');

  /* Only public cards are votable — the rules refuse a score change on a
     held one, so showing the arrows there would only ever produce an error.
     The score still shows, so a released card does not appear to reset. */
  const votebox = c.status === "public"
    ? '<div class="ccvote">' +
        '<button class="ccv up' + (c.myVote === 1 ? " on" : "") + '" data-act="up" aria-label="Upvote" title="Upvote">▲</button>' +
        '<span class="ccscore">' + (c.score > 0 ? "+" : "") + c.score + '</span>' +
        '<button class="ccv down' + (c.myVote === -1 ? " on" : "") + '" data-act="down" aria-label="Downvote" title="Downvote">▼</button>' +
      '</div>'
    : '<div class="ccvote quiet"><span class="ccscore">' + (c.score > 0 ? "+" : "") + c.score + '</span></div>';

  n.innerHTML =
    votebox +
    '<div class="ccmain">' +
      '<h3 class="ccname">' + esc(displaySafe(c.name, MAX.NAME) || "Untitled Card") + '</h3>' +
      '<div class="ccmeta">' + esc(meta) + ' · by ' + esc(who) + (c.status === "held" ? ' <b class="cchold">under review</b>' : '') + '</div>' +
      (head
        ? '<div class="ccbout"><span>' + esc(fighterName(head.a)) + '</span><i>vs</i><span>' + esc(fighterName(head.b)) + '</span></div>'
        : '<div class="ccbout empty">No complete matchups</div>') +
      (total > 1 ? '<div class="ccsub">+ ' + (total - 1) + ' more on the card</div>' : '') +
    '</div>' +
    '<div class="ccacts">' + acts.join("") + '</div>';

  n._entry = c;
  return n;
}

/* ---------- tile actions -------------------------------------------------- */

async function onTileClick(e){
  const btn = e.target.closest("[data-act]");
  if(!btn) return;
  const card = btn.closest(".ccard");
  if(!card) return;
  const id = card.dataset.id;
  const act = btn.dataset.act;

  if(act === "up" || act === "down") return doVote(card, btn, id, act === "up" ? 1 : -1);
  if(act === "open")                 return doOpen(card);

  /* Anything destructive asks once, inline. No window.confirm — a native
     dialog blocks the page and the test harness dead-stops on it. */
  if(act === "del" && btn.dataset.armed !== "1"){
    btn.dataset.armed = "1";
    btn.textContent = "Sure?";
    setTimeout(() => { btn.dataset.armed = ""; btn.textContent = "Delete"; }, 4000);
    return;
  }

  btn.disabled = true;
  const res = act === "del"     ? await community.remove(id)
            : act === "release" ? await community.setStatus(id, "public")
            :                     await community.setStatus(id, "held");
  btn.disabled = false;
  if(!res.ok){ $("#comnote").textContent = res.error; $("#comnote").classList.add("warn"); return; }
  load();
}

async function doVote(card, btn, id, dir){
  card.querySelectorAll(".ccv").forEach(b => b.disabled = true);
  const res = await community.vote(id, dir);
  card.querySelectorAll(".ccv").forEach(b => b.disabled = false);
  if(!res.ok){ $("#comnote").textContent = res.error; $("#comnote").classList.add("warn"); return; }

  card.querySelector(".ccscore").textContent = (res.score > 0 ? "+" : "") + res.score;
  card.querySelector(".ccv.up").classList.toggle("on", res.myVote === 1);
  card.querySelector(".ccv.down").classList.toggle("on", res.myVote === -1);
  if(window.posthog) posthog.capture("community_vote", { dir, cleared: res.myVote === 0 });
}

/* Loading someone else's card replaces whatever is in the builder. That is
   the same thing a #card= share link does, so it is not a surprise — but it
   does mean going back to your own work means re-opening your own card. */
function doOpen(card){
  const c = card._entry;
  if(!c || !c.payload) return;
  if(!payloadToCard(c.payload)){
    $("#comnote").textContent = "That card didn't survive a roster update — the fighters in it are gone.";
    $("#comnote").classList.add("warn");
    return;
  }
  closeCommunity();
  openCardView("poster");
  if(window.posthog) posthog.capture("community_card_opened", { id: c.id });
}
