/* ============================================================
   Who the voter is, as far as this app is concerned.

   Two separate things, deliberately kept apart:

   * The **uid** — a Firebase Anonymous Auth account, created silently on
     first use and persisted by the SDK in IndexedDB. It is the thing rules
     key on: one vote per uid per card, one rate-limit bucket per uid. The
     adapter owns it; this module never sees it.

   * The **handle** — a display name the poster types, stored in
     localStorage, attached to cards they publish. Cosmetic. It proves
     nothing and is not unique.

   Why anonymous rather than a login: the ask was "no forced sign-in, but
   some protection". An anonymous uid is weak — clear site data and you are
   a new person — but it turns voting from "anyone can click forever" into
   "one vote unless you go out of your way", which is the honest ceiling for
   a pet project. If this ever needs to be real, swap in a Google provider:
   the uid keeps its meaning and nothing else in the app changes.
   ============================================================ */
import { checkHandle } from "./moderation.js";

const HANDLE_KEY = "tott.community.handle";

export function getHandle(){
  try { return localStorage.getItem(HANDLE_KEY) || ""; } catch { return ""; }
}

/* Stores the cleaned form, or clears it when given nothing. Returns the same
   verdict shape as the moderation helpers so a caller can show the error. */
export function setHandle(raw){
  const v = checkHandle(raw);
  if(!v.ok) return v;
  try {
    if(v.value) localStorage.setItem(HANDLE_KEY, v.value);
    else        localStorage.removeItem(HANDLE_KEY);
  } catch { /* private mode; the handle is cosmetic, carry on */ }
  return v;
}

/* What to show when a card has no handle on it. */
export const ANON = "anonymous";
