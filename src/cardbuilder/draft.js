/* ---------------------------------------------------------------------------
   The card survives a refresh.

   Only the poster step ever put anything in the URL (step-poster.js writes
   #card=… as it renders), so reloading halfway through the build — or letting
   a phone evict the tab — threw the whole card away. This mirrors the builder
   into localStorage on every render and reads it back at boot.

   The card itself reuses the share encoding, so a card has exactly one
   serialiser in this codebase. The two things that encoding cannot carry ride
   alongside it: the section sizes while they are still unapplied (the setup
   step has no sections yet) and which title toggles the user has touched
   (decodeCard has to assume all of them, or a shared link would re-auto-title
   a bout its author deliberately un-titled).
--------------------------------------------------------------------------- */
import { decodeCard, encodeCard } from "./share.js";
import { CARD, CARD_OPEN, CARD_STEP, SEC_DEFS, SETUP, setCardStep } from "./state.js";

const KEY     = "tott.card.draft";
const VER     = 1;
const MAX_AGE = 14 * 24 * 60 * 60 * 1000;   /* a fortnight; older is not "progress" */
const STEPS   = ["setup", "build", "poster"];

export function saveDraft(){
  const d = {
    v:    VER,
    t:    Date.now(),
    open: CARD_OPEN,
    step: CARD_STEP,
    name: CARD.name || "",
    credit: CARD.credit || "",
    setup: SEC_DEFS.reduce((o, s) => (o[s.id] = SETUP[s.id] || 0, o), {}),
    card:  CARD.sections.length ? encodeCard() : "",
    touched: CARD.sections.map(s => s.bouts.map(b => b.titleTouched ? 1 : 0).join(""))
  };
  try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {}
}

export function clearDraft(){
  try { localStorage.removeItem(KEY); } catch {}
}

/* Rehydrates CARD / SETUP / CARD_STEP in place and reports what was last on
   screen. Returns null when there is nothing worth restoring. */
export function restoreDraft(){
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if(!d || d.v !== VER || typeof d.t !== "number") return null;
  if(Date.now() - d.t > MAX_AGE){ clearDraft(); return null; }

  /* decodeCard rewrites SETUP from the sections it finds, so the saved sizes
     go on after it — mid-setup they are the newer of the two, and everywhere
     else the two already agree. */
  const gotCard = d.card ? decodeCard(d.card) : false;
  if(d.setup) SEC_DEFS.forEach(s => {
    const n = d.setup[s.id];
    if(typeof n === "number" && n >= 0 && n <= s.max) SETUP[s.id] = n;
  });
  CARD.name   = typeof d.name   === "string" ? d.name   : "";
  /* not part of the dirty test below — the handle is remembered separately by
     identity.js, so a name on its own is not progress on a card */
  CARD.credit = typeof d.credit === "string" ? d.credit : "";

  if(gotCard && Array.isArray(d.touched)){
    CARD.sections.forEach((sec, si) => {
      const flags = d.touched[si] || "";
      sec.bouts.forEach((b, bi) => { b.titleTouched = flags[bi] === "1"; });
    });
  }

  /* build and poster have nothing to show without sections */
  const step = STEPS.includes(d.step) && (gotCard || d.step === "setup") ? d.step : "setup";
  setCardStep(step);

  const dirty = gotCard || !!CARD.name || SEC_DEFS.some(s => SETUP[s.id] !== s.def);
  return dirty ? { step, open: !!d.open } : null;
}
