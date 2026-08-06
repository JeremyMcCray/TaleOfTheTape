/* ============================================================
   localStorage-backed community.

   Cards live in this browser only. Same contract as the Firestore adapter,
   so the gallery UI runs unchanged against it — which is what makes the
   offline test harness able to exercise the whole feature with no network,
   no Firebase project and no config.

   It is also the fallback when src/community/config.js is still blank, so a
   fresh clone of the repo has a working (if solitary) gallery on first run.
   The UI checks isLocalOnly() and says so, rather than implying anyone else
   can see these.

   Moderation is *simulated* here, not enforced: whatever `hold` the caller
   passes is honoured, so held-card behaviour and the review queue can be
   exercised offline. The real enforcement is firebase/firestore.rules.
   ============================================================ */
import { LIMITS } from "../config.js";
import { payloadFingerprint } from "../payload.js";

const KEY  = "tott.community.cards";
const VKEY = "tott.community.votes";
const RKEY = "tott.community.rate";
const UKEY = "tott.community.localuid";

const read  = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const nextId = () => "c" + Math.random().toString(36).slice(2, 10);

/* A stand-in for the Firebase uid so "mine" and ownership behave the same. */
function localUid(){
  let u = read(UKEY, null);
  if(!u){ u = "local-" + Math.random().toString(36).slice(2, 12); write(UKEY, u); }
  return u;
}

const shape = (c, votes, uid) => ({
  id: c.id,
  name: c.name,
  author: c.author || "",
  payload: c.payload,
  score: c.score || 0,
  myVote: votes[c.id] || 0,
  status: c.status || "public",
  mine: c.uid === uid,
  createdAt: c.createdAt
});

export const localAdapter = {
  name: "local",
  localOnly: true,

  async init(){ return { ok:true, uid: localUid(), owner:true }; },

  async publish({ payload, name, author = "", hold = false }){
    const uid = localUid();
    const bouts = (payload.sections || []).reduce((n, s) => n + (s.bouts || []).length, 0);
    if(bouts < 1) return { ok:false, error:"That card is empty." };

    /* Mirror the real rate limit so the UI copy can be checked offline. */
    const rate = read(RKEY, null);
    const now = Date.now();
    if(rate){
      const wait = LIMITS.COOLDOWN_MS - (now - rate.last);
      if(wait > 0){
        const mins = Math.ceil(wait / 60000);
        return { ok:false, error:`One card every ${LIMITS.COOLDOWN_MS / 60000} minutes — try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
      }
      if(now - rate.dayStart < 24 * 3600 * 1000 && rate.dayCount >= LIMITS.PER_DAY)
        return { ok:false, error:`That's ${LIMITS.PER_DAY} cards in 24 hours — the gallery needs a breather.` };
    }

    const fingerprint = payloadFingerprint(payload);
    const cards = read(KEY, []);
    const dupe = cards.find(c => c.status === "public" && c.fingerprint && c.fingerprint === fingerprint);
    if(dupe) return { ok:true, id: dupe.id, duplicate:true };

    const entry = {
      id: nextId(),
      name: name || "Untitled Card",
      author,
      payload, fingerprint, bouts, uid,
      score: 0,
      status: hold ? "held" : "public",
      createdAt: new Date().toISOString()
    };
    cards.unshift(entry);
    write(KEY, cards);
    write(RKEY, (!rate || now - rate.dayStart >= 24 * 3600 * 1000)
      ? { last: now, dayStart: now, dayCount: 1 }
      : { last: now, dayStart: rate.dayStart, dayCount: rate.dayCount + 1 });

    return { ok:true, id: entry.id, held: hold };
  },

  async list({ sort = "top", limit = LIMITS.PAGE } = {}){
    const uid = localUid();
    const votes = read(VKEY, {});
    let cards = read(KEY, []).slice();

    if(sort === "mine")      cards = cards.filter(c => c.uid === uid);
    else if(sort === "held") cards = cards.filter(c => (c.status || "public") === "held");
    else                     cards = cards.filter(c => (c.status || "public") === "public");

    const byNew = (a, b) => String(b.createdAt).localeCompare(String(a.createdAt));
    cards.sort(sort === "top" ? ((a, b) => (b.score || 0) - (a.score || 0) || byNew(a, b)) : byNew);

    return { ok:true, cards: cards.slice(0, limit).map(c => shape(c, votes, uid)) };
  },

  async get(id){
    const c = read(KEY, []).find(x => x.id === id);
    if(!c) return { ok:false, error:"That card is gone." };
    return { ok:true, card: shape(c, read(VKEY, {}), localUid()) };
  },

  /* dir: 1 up, -1 down. Voting the same way twice clears it. */
  async vote(id, dir){
    const cards = read(KEY, []);
    const c = cards.find(x => x.id === id);
    if(!c) return { ok:false, error:"That card is gone." };
    const votes = read(VKEY, {});
    const prev = votes[id] || 0;
    const next = prev === dir ? 0 : dir;
    c.score = (c.score || 0) + (next - prev);
    if(next) votes[id] = next; else delete votes[id];
    write(KEY, cards); write(VKEY, votes);
    return { ok:true, score: c.score, myVote: next };
  },

  async myVotes(){ return { ok:true, votes: read(VKEY, {}) }; },

  async setStatus(id, status){
    const cards = read(KEY, []);
    const c = cards.find(x => x.id === id);
    if(!c) return { ok:false, error:"That card is gone." };
    c.status = status;
    write(KEY, cards);
    return { ok:true };
  },

  async remove(id){
    write(KEY, read(KEY, []).filter(c => c.id !== id));
    const votes = read(VKEY, {}); delete votes[id]; write(VKEY, votes);
    return { ok:true };
  }
};
