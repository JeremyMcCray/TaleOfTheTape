/* ============================================================
   Community backend configuration.

   This is the ONLY file you edit to turn the community gallery on. Fill in
   FIREBASE from the Firebase console and the app switches from the
   localStorage stand-in to the real shared gallery on next load. Leave it
   blank and everything still works — cards just never leave the browser,
   and the UI says so.

   Full console walkthrough: firebase/SETUP.md

   None of these values are secrets. A Firebase web config is public by
   design; what stops abuse is firebase/firestore.rules plus App Check, not
   hiding the project id. Committing this file is fine and expected.
   ============================================================ */

/* Firebase console → Project settings → General → Your apps → Web app → Config */
export const FIREBASE = {
  apiKey: "AIzaSyDGjSLOUCpdMYQowNNSo9m7KPl2dHK9bYk",
  authDomain: "tale-of-the-tape-26de9.firebaseapp.com",
  projectId: "tale-of-the-tape-26de9",
  storageBucket: "tale-of-the-tape-26de9.firebasestorage.app",
  messagingSenderId: "414815683374",
  appId: "1:414815683374:web:b95cd40e273d90e229b0bf"
};

/* reCAPTCHA v3 site key from Firebase console → App Check → Apps → Register.
   Blank = App Check off. Everything still works without it; App Check is
   what stops someone scripting the REST API from outside a browser, so it
   is worth doing before you share the link widely. */
export const APPCHECK_SITE_KEY = "6LcmingtAAAAAIfcjsMsJgwGahFQpCa8OkMP2y3Y";

/* Your own anonymous uid. The community panel prints it in its footer once
   you have opened the gallery — copy it here AND into ownerUid() in
   firebase/firestore.rules, then redeploy the rules. This is what unlocks
   the "Review" tab where held cards wait. */
export const OWNER_UID = "CCO1su3wTAhyfpruCyrO92xvnSn1";

/* Pinned so a future SDK release cannot change behaviour under you.
   Bump deliberately, then re-run the offline harness. */
export const SDK = "https://www.gstatic.com/firebasejs/12.17.1/";

export const LIMITS = {
  PAGE:           24,        /* cards fetched per gallery tab        */
  MIN_BOUTS:       2,        /* refuse to publish a near-empty card  */
  PAYLOAD_MAX:  4000,        /* bytes; mirrored in firestore.rules   */
  /* These two are enforced by the rules, not here. They are repeated so the
     UI can explain the wait instead of showing a raw permission error. */
  COOLDOWN_MS: 10 * 60 * 1000,
  PER_DAY:        20
};

export const firebaseConfigured = () => !!(FIREBASE.apiKey && FIREBASE.projectId);
