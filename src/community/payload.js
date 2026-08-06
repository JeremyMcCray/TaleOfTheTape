/* ============================================================
   Canonical card payload.

   One representation of "a fight card" that is safe to send over the wire,
   store in a database, and read back years from now. Everything the community
   feature persists goes through here — never `CARD` itself, which holds live
   fighter objects with parsed dates and photo URLs.

   A payload references fighters by their DB key (a normalised name, e.g.
   "islammakhachev"). Keys survive a data refresh; array indexes and photo
   URLs do not.
   ============================================================ */
import { CARD, SEC_DEFS, SETUP, blankBout, secDef } from "../cardbuilder/state.js";
import { DB } from "../data/store.js";

export const PAYLOAD_VERSION = 1;

/* CARD (live objects) -> plain JSON. */
export function cardToPayload(){
  return {
    v: PAYLOAD_VERSION,
    name: CARD.name || "",
    sections: CARD.sections.map(s => ({
      id: s.id,
      bouts: s.bouts.map(b => ({
        a: b.a ? b.a.key : null,
        b: b.b ? b.b.key : null,
        title: !!b.title
      }))
    }))
  };
}

/* plain JSON -> CARD (live objects). Returns false if nothing usable was in it.
   Unknown fighter keys become empty corners rather than failing the whole card,
   so an old payload still opens after the roster feed changes. */
export function payloadToCard(p){
  if(!p || !Array.isArray(p.sections)) return false;
  const secs = [];
  for(const s of p.sections){
    const d = secDef(s.id); if(!d) continue;
    const bouts = (s.bouts || []).map(o => {
      const b = blankBout();
      b.title = !!o.title;
      b.titleTouched = true;
      if(o.a && DB.byKey.has(o.a)) b.a = DB.byKey.get(o.a);
      if(o.b && DB.byKey.has(o.b)) b.b = DB.byKey.get(o.b);
      return b;
    });
    if(bouts.length){ secs.push({ id:d.id, label:d.label, bouts }); SETUP[d.id] = bouts.length; }
  }
  SEC_DEFS.forEach(d => { if(!secs.some(s => s.id === d.id)) SETUP[d.id] = 0; });
  if(!secs.length) return false;
  CARD.name = String(p.name || "");
  CARD.sections = secs;
  return true;
}

/* How many corners are actually filled — used to reject empty submissions. */
export function payloadFilledCount(p){
  if(!p || !Array.isArray(p.sections)) return 0;
  let n = 0;
  for(const s of p.sections) for(const b of (s.bouts || [])) { if(b.a) n++; if(b.b) n++; }
  return n;
}

/* Stable fingerprint of a card's matchups, ignoring name and ordering within a
   bout. Lets the backend collapse duplicate submissions of the same card. */
export function payloadFingerprint(p){
  const bouts = [];
  for(const s of (p.sections || []))
    for(const b of (s.bouts || []))
      if(b.a || b.b) bouts.push([b.a || "", b.b || ""].sort().join("~"));
  return bouts.sort().join("|");
}
