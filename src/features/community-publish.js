/* ============================================================
   The publish dialog — the only way a card leaves this browser.

   Opened from the poster step. Two text fields, both filtered before they
   go anywhere, and a hard floor on how empty a card is allowed to be.

   The one thing to be careful about when editing this: a held card and a
   published card must produce **identical** feedback. Same wording, same
   timing, same follow-up. Everything in the shadow-hold design falls apart
   the moment the dialog tells someone their card was held — at that point
   it is just a slow rejection, and they will retry with a different
   spelling until they find the gap.
   ============================================================ */
import { CARD, allBouts } from "../cardbuilder/state.js";
import { community, isLocalOnly } from "../community/client.js";
import { LIMITS } from "../community/config.js";
import { getHandle, setHandle } from "../community/identity.js";
import { checkName } from "../community/moderation.js";
import { cardToPayload } from "../community/payload.js";
import { $ } from "../lib/dom.js";
import { openCommunity } from "./community-gallery.js";

let busy = false;

export function initPublish(){
  $("#pubClose").onclick  = closePublish;
  $("#pubCancel").onclick = closePublish;
  $("#pubGo").onclick     = submit;
  $("#pubmodal").addEventListener("click", e => { if(e.target.id === "pubmodal") closePublish(); });
  $("#pubName").addEventListener("keydown", e => { if(e.key === "Enter") submit(); });
  $("#pubWho").addEventListener("keydown",  e => { if(e.key === "Enter") submit(); });
}

export function publishOpen(){ return $("#pubmodal").classList.contains("open"); }

export function closePublish(){
  $("#pubmodal").classList.remove("open");
}

export function openPublish(){
  const complete = allBouts().filter(x => x.bout.a && x.bout.b).length;
  if(complete < LIMITS.MIN_BOUTS){
    note(`Fill in at least ${LIMITS.MIN_BOUTS} complete matchups before publishing.`, true);
    return;
  }
  $("#pubName").value = CARD.name || "";
  $("#pubWho").value  = CARD.credit || getHandle();
  $("#puberr").textContent = "";
  $("#pubfine").textContent = isLocalOnly()
    ? "No backend is configured, so this card stays in your browser — nobody else will see it."
    : `${complete} matchup${complete === 1 ? "" : "s"} · anyone can vote on it · you can delete it later from the Mine tab.`;
  $("#pubGo").disabled = false;
  $("#pubGo").textContent = "Publish";
  $("#pubmodal").classList.add("open");
  setTimeout(() => $("#pubName").focus(), 30);
}

/* The line under the poster's action bar, reused so publishing does not need
   its own status area competing with the PNG export's. */
function note(msg, warn){
  const n = $("#pngnote");
  if(!n) return;
  n.textContent = msg;
  n.classList.toggle("warn", !!warn);
}

async function submit(){
  if(busy) return;

  const name = checkName($("#pubName").value);
  if(!name.ok){ $("#puberr").textContent = name.error; return; }

  const who = setHandle($("#pubWho").value);
  if(!who.ok){ $("#puberr").textContent = who.error; return; }

  /* A held handle should not drag the card down with it — drop the handle,
     keep the card. Still silent either way. */
  const author = who.hold ? "" : who.value;
  const hold   = name.hold || who.hold;

  busy = true;
  $("#puberr").textContent = "";
  $("#pubGo").disabled = true;
  $("#pubGo").textContent = "Publishing…";

  CARD.name = name.value;
  /* Keep the poster's "Built by" line and the gallery's attribution the same
     name — publishing under a different one and leaving the PNG signed with
     the old is just a bug you only notice after you have shared both. */
  CARD.credit = who.value;
  const res = await community.publish({ payload: cardToPayload(), name: name.value, author, hold });

  busy = false;
  $("#pubGo").disabled = false;
  $("#pubGo").textContent = "Publish";

  if(!res.ok){
    $("#puberr").textContent = res.error || "Couldn't publish that card.";
    return;
  }

  if(window.posthog) posthog.capture("community_publish", {
    held: !!res.held, duplicate: !!res.duplicate, name: name.value
  });

  closePublish();

  /* Identical for held and public. On purpose. */
  note(res.duplicate
    ? "That exact card is already in the gallery — opening it there."
    : "Published. Find it in the community gallery.");

  setTimeout(() => openCommunity(res.duplicate ? "top" : "mine"), 400);
}
