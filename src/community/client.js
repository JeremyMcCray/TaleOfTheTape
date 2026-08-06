/* ============================================================
   Community client — the ONLY module the UI talks to.

   The community feature (share your card, browse other people's, vote)
   needs a server; this file is the seam between the app and whatever that
   server turns out to be. Today that is Firestore. Swap the adapter and
   nothing in src/cardbuilder/ or src/features/ has to change.

   Every method returns a Promise and never throws for expected conditions —
   callers get `{ ok:false, error }` instead, so the UI can render a message
   without try/catch at every call site.
   ============================================================ */
import { firebaseAdapter } from "./adapters/firebase.js";
import { localAdapter } from "./adapters/local.js";
import { firebaseConfigured } from "./config.js";

/* ---- adapter contract ------------------------------------------------------
   init()                                      -> { ok, uid?, owner?, error? }
   publish({ payload, name, author, hold })    -> { ok, id?, duplicate?, held?, error? }
   list({ sort, limit })                       -> { ok, cards:[Entry], error? }
   get(id)                                     -> { ok, card?:Entry, error? }
   vote(id, dir)                               -> { ok, score?, myVote?, error? }   dir: 1 | -1
   myVotes()                                   -> { ok, votes:{ [id]: 1|-1 } }
   setStatus(id, status)                       -> { ok, error? }   owner only
   remove(id)                                  -> { ok, error? }   owner or author

   Entry = { id, name, author, payload, score, myVote, status, mine, createdAt }
   `sort` is "top" | "new" | "mine" | "held".
   `status` is "public" | "held" — held cards are visible only to the person
   who published them and to the owner. See src/community/moderation.js.
   --------------------------------------------------------------------------- */

/* Filling in src/community/config.js is the whole switch. Until then the
   localStorage stand-in runs, which is also what the offline test harness
   exercises — so the gallery is testable without a network or a project. */
let adapter = firebaseConfigured() ? firebaseAdapter : localAdapter;

/* Escape hatch for a different backend entirely. Call once, early. */
export function setCommunityAdapter(a){ adapter = a; }
export function communityAdapterName(){ return adapter.name || "unknown"; }

/* True when cards are only stored in this browser — the UI should say so
   rather than implying other people can see them. */
export function isLocalOnly(){ return !!adapter.localOnly; }

export const community = {
  init:      (...a) => adapter.init(...a),
  publish:   (...a) => adapter.publish(...a),
  list:      (...a) => adapter.list(...a),
  get:       (...a) => adapter.get(...a),
  vote:      (...a) => adapter.vote(...a),
  myVotes:   (...a) => adapter.myVotes(...a),
  setStatus: (...a) => adapter.setStatus(...a),
  remove:    (...a) => adapter.remove(...a)
};
