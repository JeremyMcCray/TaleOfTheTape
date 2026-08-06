/* ============================================================
   Firestore adapter — the real, shared gallery.

   Implements the same contract as adapters/local.js against Cloud Firestore.
   The security rules in firebase/firestore.rules are the other half of this
   file; neither makes sense alone. Read them together.

   Three things worth knowing before changing anything here:

   * **The SDK loads on demand.** `import()` inside connect(), not a top-level
     import, so the ~120 KB of Firebase never touches the initial page load.
     Someone who only compares two fighters never pays for the gallery.

   * **The payload is stored as a JSON *string*, not a map.** That is what
     lets the rules put a hard size and charset limit on it — you cannot
     bound a nested map in rules, but you can bound a string. The card name
     is blanked inside that string and stored as its own field so it can be
     filtered separately. reinflate() puts it back.

   * **Voting runs in a transaction, not with increment().** A transaction
     reads the score and writes an absolute value, which makes the rule
     `score == old + delta` trivially true or trivially false. It also means
     the rule does not depend on whether Firestore surfaces field transforms
     to `request.resource` — a detail that is easy to get wrong and painful
     to debug from a `permission-denied` with no further explanation.
   ============================================================ */
import { APPCHECK_SITE_KEY, FIREBASE, LIMITS, OWNER_UID, SDK } from "../config.js";
import { payloadFingerprint } from "../payload.js";

/* Your own votes, mirrored locally so rendering a page of cards costs one
   query instead of one query plus N vote reads. This is not a cache of
   server state that could go stale behind your back: a uid is per-browser,
   so the browser that cast the vote is the only one that ever displays it. */
const VKEY = "tott.community.votes";
const readVotes  = () => { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch { return {}; } };
const writeVotes = v => { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch {} };

let conn = null;     /* the resolved connection */
let connecting = null;

async function connect(){
  if(conn) return conn;
  if(connecting) return connecting;

  connecting = (async () => {
    const [appMod, authMod, fsMod, checkMod] = await Promise.all([
      import(SDK + "firebase-app.js"),
      import(SDK + "firebase-auth.js"),
      import(SDK + "firebase-firestore.js"),
      APPCHECK_SITE_KEY ? import(SDK + "firebase-app-check.js") : Promise.resolve(null)
    ]);

    const app = appMod.initializeApp(FIREBASE);

    /* App Check proves the request came from your actual site in a real
       browser. Without it the rules still hold, but someone can hammer the
       REST API directly from a script and burn your free quota. */
    if(checkMod && APPCHECK_SITE_KEY){
      checkMod.initializeAppCheck(app, {
        provider: new checkMod.ReCaptchaV3Provider(APPCHECK_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    }

    /* Wait for the SDK to restore a persisted session before asking for a
       new one — signInAnonymously() on a cold start would otherwise mint a
       second account and orphan the first one's votes. */
    const auth = authMod.getAuth(app);
    const existing = await new Promise(res => {
      const off = authMod.onAuthStateChanged(auth, u => { off(); res(u); });
    });
    const user = existing || (await authMod.signInAnonymously(auth)).user;

    conn = { fs: fsMod, db: fsMod.getFirestore(app), uid: user.uid };
    return conn;
  })();

  try { return await connecting; }
  finally { connecting = null; }
}

/* ---------- shaping ------------------------------------------------------- */

/* Firestore row -> the Entry shape the UI reads. */
function entry(id, d, uid, votes){
  let payload = null;
  try { payload = JSON.parse(d.payload); } catch { payload = null; }
  if(payload) payload.name = d.name || "";           /* re-inflate the blanked name */
  return {
    id,
    name:      d.name || "",
    author:    d.author || "",
    payload,
    score:     typeof d.score === "number" ? d.score : 0,
    myVote:    (votes || readVotes())[id] || 0,
    status:    d.status || "public",
    mine:      d.uid === uid,
    createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : 0
  };
}

/* Firestore errors are terse and their `code` is the only stable part. Turn
   the ones a user can actually cause into something worth reading. */
function fail(e, fallback){
  const code = (e && e.code) || "";
  /* publish() handles permission-denied itself — it can re-read the rate
     document and say something specific. Everywhere else it means the rules
     genuinely refused, and there is nothing useful to add. */
  if(code === "permission-denied")
    return { ok:false, error:"Firestore turned that down." };
  if(code === "unavailable" || code === "failed-precondition")
    return { ok:false, error:"Can't reach the community server right now." };
  if(code === "resource-exhausted")
    return { ok:false, error:"The community backend is over quota for today." };
  if(/index/i.test(String(e && e.message)))
    return { ok:false, error:"That view needs a Firestore index — check the console for the one-click link." };
  return { ok:false, error: fallback || "Something went wrong." };
}

/* ---------- the adapter --------------------------------------------------- */

export const firebaseAdapter = {
  name: "firebase",
  localOnly: false,

  async init(){
    try {
      const c = await connect();
      return { ok:true, uid:c.uid, owner: !!OWNER_UID && c.uid === OWNER_UID };
    } catch(e){
      return fail(e, "Couldn't connect to the community backend.");
    }
  },

  /* payload: the object from cardToPayload(). name/author: already cleaned by
     moderation.js. hold: true when the blocklist matched — publishes as
     "held" so the poster sees success and nobody else sees the card. */
  async publish({ payload, name, author = "", hold = false }){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db, uid } = c;

    const bouts = (payload.sections || []).reduce((n, s) => n + (s.bouts || []).length, 0);
    if(bouts < 1 || bouts > 24) return { ok:false, error:"That card has an implausible number of bouts." };

    /* Name lives in its own field so it can be length-capped and filtered;
       blanking it here keeps the payload string inside the tight charset the
       rules enforce. */
    const wire = JSON.stringify({ ...payload, name: "" });
    if(wire.length > LIMITS.PAYLOAD_MAX) return { ok:false, error:"That card is too big to publish." };

    const fingerprint = payloadFingerprint(payload);

    try {
      /* Same matchups already up? Point at that instead of adding a tenth
         copy of the obvious main event. Only public cards are checked —
         a held duplicate must not leak its existence. */
      const dupe = await fs.getDocs(fs.query(
        fs.collection(db, "cards"),
        fs.where("status", "==", "public"),
        fs.where("fingerprint", "==", fingerprint),
        fs.limit(1)
      ));
      if(!dupe.empty) return { ok:true, id: dupe.docs[0].id, duplicate:true };
    } catch { /* index missing or offline — publishing matters more than dedupe */ }

    /* The card's id has to exist before the rate stamp, because the stamp
       names the card it authorises — that is what stops one stamp waving
       through a batch full of creates. */
    const ref = fs.doc(fs.collection(db, "cards"));

    /* The rate document. Rules enforce the cooldown and the daily cap; this
       read is so the UI can say "4 minutes" instead of "permission denied". */
    const rateRef = fs.doc(db, "rate", uid);
    let rateWrite;
    try {
      const snap = await fs.getDoc(rateRef);
      const now = Date.now();
      if(!snap.exists()){
        rateWrite = { last: fs.serverTimestamp(), dayStart: fs.serverTimestamp(), dayCount: 1, card: ref.id };
      } else {
        const d = snap.data();
        const lastMs  = d.last     && d.last.toMillis     ? d.last.toMillis()     : 0;
        const startMs = d.dayStart && d.dayStart.toMillis ? d.dayStart.toMillis() : 0;
        const wait = LIMITS.COOLDOWN_MS - (now - lastMs);
        if(wait > 0){
          const mins = Math.ceil(wait / 60000);
          return { ok:false, error:`One card every ${LIMITS.COOLDOWN_MS / 60000} minutes — try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
        }
        if(now - startMs >= 24 * 3600 * 1000){
          rateWrite = { last: fs.serverTimestamp(), dayStart: fs.serverTimestamp(), dayCount: 1, card: ref.id };
        } else {
          if((d.dayCount || 0) >= LIMITS.PER_DAY)
            return { ok:false, error:`That's ${LIMITS.PER_DAY} cards in 24 hours — the gallery needs a breather.` };
          rateWrite = { last: fs.serverTimestamp(), dayStart: d.dayStart, dayCount: (d.dayCount || 0) + 1, card: ref.id };
        }
      }

      const batch = fs.writeBatch(db);
      batch.set(ref, {
        name, author,
        payload: wire,
        fingerprint,
        bouts,
        uid,
        score: 0,
        status: hold ? "held" : "public",
        createdAt: fs.serverTimestamp()
      });
      batch.set(rateRef, rateWrite);          /* rules require both, same commit */
      await batch.commit();

      return { ok:true, id: ref.id, held: hold };
    } catch(e){
      /* The pre-flight above uses Date.now(); the rules use the server clock.
         A skewed client can pick the wrong rate-limit branch and get denied
         with no idea why, so re-read the stamp and answer from the server's
         numbers rather than repeating the guess that just failed. */
      if(e && e.code === "permission-denied"){
        try {
          const snap = await fs.getDoc(rateRef);
          if(snap.exists()){
            const d = snap.data();
            const lastMs = d.last && d.last.toMillis ? d.last.toMillis() : 0;
            const wait = LIMITS.COOLDOWN_MS - (Date.now() - lastMs);
            if(wait > 0){
              const mins = Math.ceil(wait / 60000);
              return { ok:false, error:`One card every ${LIMITS.COOLDOWN_MS / 60000} minutes — try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
            }
            if((d.dayCount || 0) >= LIMITS.PER_DAY)
              return { ok:false, error:`That's ${LIMITS.PER_DAY} cards in 24 hours — the gallery needs a breather.` };
          }
        } catch { /* fall through to the generic message */ }
        return { ok:false, error:"Firestore turned that card down. If the name is unusual, try a plainer one." };
      }
      return fail(e, "Couldn't publish that card.");
    }
  },

  /* sort: "top" | "new" | "mine" | "held" ("held" is the owner review queue) */
  async list({ sort = "top", limit = LIMITS.PAGE } = {}){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db, uid } = c;

    const col = fs.collection(db, "cards");
    let q;
    if(sort === "mine")      q = fs.query(col, fs.where("uid", "==", uid), fs.orderBy("createdAt", "desc"), fs.limit(limit));
    else if(sort === "held") q = fs.query(col, fs.where("status", "==", "held"), fs.orderBy("createdAt", "desc"), fs.limit(limit));
    else if(sort === "new")  q = fs.query(col, fs.where("status", "==", "public"), fs.orderBy("createdAt", "desc"), fs.limit(limit));
    else                     q = fs.query(col, fs.where("status", "==", "public"), fs.orderBy("score", "desc"), fs.orderBy("createdAt", "desc"), fs.limit(limit));

    try {
      const snap = await fs.getDocs(q);
      const votes = readVotes();
      return { ok:true, cards: snap.docs.map(d => entry(d.id, d.data(), uid, votes)) };
    } catch(e){
      return fail(e, "Couldn't load the gallery.");
    }
  },

  async get(id){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db, uid } = c;
    try {
      const snap = await fs.getDoc(fs.doc(db, "cards", id));
      if(!snap.exists()) return { ok:false, error:"That card is gone." };
      return { ok:true, card: entry(snap.id, snap.data(), uid) };
    } catch(e){
      return fail(e, "Couldn't load that card.");
    }
  },

  /* dir: 1 up, -1 down. Voting the same way twice clears the vote.
     Card score and vote document move together or not at all. */
  async vote(id, dir){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db, uid } = c;

    const cardRef = fs.doc(db, "cards", id);
    const voteRef = fs.doc(db, "cards", id, "votes", uid);

    try {
      const out = await fs.runTransaction(db, async tx => {
        const cardSnap = await tx.get(cardRef);
        if(!cardSnap.exists()) throw new Error("gone");
        const voteSnap = await tx.get(voteRef);

        /* The toggle is decided from the server's record, not the local
           mirror. They only disagree when site data was cleared or a write
           failed halfway — and in both of those cases the mirror is the
           wrong one. Deciding here also means the no-op case (mirror says
           you voted, server says you didn't) writes nothing at all rather
           than attempting a delete the rules would refuse. */
        const onServer = voteSnap.exists() ? (voteSnap.data().dir || 0) : 0;
        const next  = onServer === dir ? 0 : dir;
        const score = cardSnap.data().score || 0;
        if(next === onServer) return { score, myVote: onServer };

        const value = score + (next - onServer);
        tx.update(cardRef, { score: value });
        if(next === 0) tx.delete(voteRef);
        /* `card` pins this vote to this instance of the card — see the note
           on wellFormed() in firestore.rules. */
        else           tx.set(voteRef, { dir: next, at: fs.serverTimestamp(), card: cardSnap.data().createdAt });
        return { score: value, myVote: next };
      });

      const mirror = readVotes();
      if(out.myVote) mirror[id] = out.myVote; else delete mirror[id];
      writeVotes(mirror);
      return { ok:true, score: out.score, myVote: out.myVote };
    } catch(e){
      if(String(e && e.message) === "gone") return { ok:false, error:"That card is gone." };
      return fail(e, "Couldn't record that vote.");
    }
  },

  async myVotes(){ return { ok:true, votes: readVotes() }; },

  /* Owner only — release a held card into the gallery, or pull one back. */
  async setStatus(id, status){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db } = c;
    try {
      await fs.updateDoc(fs.doc(db, "cards", id), { status });
      return { ok:true };
    } catch(e){
      return fail(e, "Couldn't change that card's status.");
    }
  },

  /* Owner, or the person who published it. */
  async remove(id){
    let c;
    try { c = await connect(); } catch(e){ return fail(e, "Couldn't connect."); }
    const { fs, db } = c;
    try {
      await fs.deleteDoc(fs.doc(db, "cards", id));
      const mirror = readVotes(); delete mirror[id]; writeVotes(mirror);
      return { ok:true };
    } catch(e){
      return fail(e, "Couldn't delete that card.");
    }
  }
};
