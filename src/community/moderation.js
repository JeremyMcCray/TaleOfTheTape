/* ============================================================
   Text cleaning and filtering for anything a stranger can type.

   Two free-text fields reach the database — a card name and an optional
   handle — and they end up rendered in the gallery, so they get treated
   like the hostile input they are. Three layers, in order:

     1. CLEAN.   Unicode-normalise, strip the invisible and the decorative,
                 collapse runs. This is not a security check; it is so that
                 what gets stored is what a human meant to type.
     2. REJECT.  Empty, too long, wrong script, contains a URL. These are
                 shown to the user as an inline error — they are mistakes,
                 not attacks, and the user can fix them.
     3. HOLD.    Matches the blocklist. The caller publishes anyway with
                 status:"held" and reports success. The poster sees their
                 card; nobody else does; it lands in the owner's review
                 queue. Deliberately silent — telling someone their word
                 was blocked just teaches them which spelling to try next.

   The same charset is enforced again in firebase/firestore.rules, more
   coarsely, because everything here runs on the attacker's machine.

   Nothing in this file writes to the DOM or to Firestore. It is pure
   string in, verdict out, so it can be reasoned about (and tested) alone.
   ============================================================ */
import { EXTRA, STEMS, WHOLE_WORD } from "./wordlist.js";

export const MAX = { NAME: 60, HANDLE: 24 };

/* ---------- 1. clean ------------------------------------------------------ */

/* Typographic characters people paste in from Word, iOS and elsewhere. Mapped
   rather than rejected — a curly apostrophe is not an attack, it just is not
   in the charset the rules allow. */
const TYPO = [
  [/[‘’‚‛′]/g, "'"],                       /* curly singles, prime   */
  [/[“”„‟″]/g, '"'],                       /* curly doubles          */
  [/[‐-―−]/g, "-"],                                  /* en dash, em dash, minus */
  [/…/g, "..."],                                               /* ellipsis               */
  [/[   -   　]/g, " "]           /* the exotic spaces      */
];

export function cleanText(raw){
  let s = String(raw == null ? "" : raw);

  /* NFKC folds the lookalike alphabets — fullwidth ｆｕｃｋ, math-bold 𝐟𝐮𝐜𝐤,
     circled letters — down to plain ASCII, which is what makes the blocklist
     below worth anything. */
  try { s = s.normalize("NFKC"); } catch { /* ancient engine; carry on */ }

  for(const [re, to] of TYPO) s = s.replace(re, to);

  /* Invisible and unassigned: control chars, zero-width joiners, RTL
     overrides, private-use, lone surrogates, line/paragraph separators. */
  s = s.replace(/[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Zl}\p{Zp}]/gu, "");

  /* Zalgo. One combining mark per base character is a legitimate accent;
     the fourteenth is someone stress-testing your line height. */
  s = s.replace(/(\p{M})\p{M}+/gu, "$1");

  /* "AAAAAAAAA" -> "AAA". Shouting is allowed; a wall is not. */
  s = s.replace(/(.)\1{3,}/gu, "$1$1$1");

  return s.replace(/\s+/g, " ").trim();
}

/* ---------- 2. reject ----------------------------------------------------- */

/* Latin script only, plus digits, spaces and a short punctuation set. Narrower
   than the rules' \p{L}\p{N} on purpose: mixing scripts inside one name is
   almost always a homoglyph trick, and this app's audience writes in Latin. */
const NAME_OK   = /^[\p{Script=Latin}\p{N}\p{M} ,.!?'"&:;#/()+-]+$/u;
const HANDLE_OK = /^[\p{Script=Latin}\p{N}\p{M} ._-]+$/u;

const URLISH = /(https?:|www\.|\b\w+\.(com|net|org|io|gg|xyz|ru|co|me|tv|link)\b)/i;

/* ---------- 3. hold ------------------------------------------------------- */

const LEET = { "0":"o", "1":"i", "3":"e", "4":"a", "5":"s", "7":"t", "8":"b",
               "9":"g", "@":"a", "$":"s", "!":"i", "|":"l", "+":"t", "(":"c" };

/* Strip a string down to the letters someone was actually trying to type:
   accents off, leet substitutions undone, everything else discarded. */
function flatten(s){
  return String(s).toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[013456789@$!|+(]/g, c => LEET[c] || c)
    .replace(/[^a-z0-9]/g, "");
}
function tokens(s){
  return String(s).toLowerCase()
    .normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/[013456789@$!|+(]/g, c => LEET[c] || c)
    .split(/[^a-z0-9]+/).filter(Boolean);
}
/* "fuuuuckkk" -> "fuck". Also "coon" -> "con", which is why stems that
   collapse below MIN_COLLAPSED are only checked in their uncollapsed form —
   short collapsed stems live inside far too many ordinary words. */
const collapse = s => s.replace(/(.)\1+/g, "$1");
const MIN_COLLAPSED = 4;

const ALL_STEMS = STEMS.concat(EXTRA);
const COLLAPSED_STEMS = [...new Set(ALL_STEMS.map(collapse))].filter(s => s.length >= MIN_COLLAPSED);

/* True when the text trips the blocklist. Never surfaced to the person who
   typed it — the caller turns this into a held publish, not an error. */
export function isFlagged(s){
  const flat = flatten(s);
  if(!flat) return false;
  for(const stem of ALL_STEMS)       if(flat.includes(stem)) return true;
  const squashed = collapse(flat);
  for(const stem of COLLAPSED_STEMS) if(squashed.includes(stem)) return true;
  for(const t of tokens(s)){
    const c = collapse(t);
    for(const w of WHOLE_WORD) if(t === w || c === w) return true;
  }
  return false;
}

/* ---------- the two entry points ----------------------------------------- */

/* Both return the same shape:
     { ok:false, error }                    caller shows `error`, does not publish
     { ok:true,  value, hold }              caller publishes `value`;
                                            hold:true => status "held"           */

export function checkName(raw){
  const value = cleanText(raw);
  if(!value)                 return { ok:false, error:"Give the card a name." };
  if(value.length > MAX.NAME) return { ok:false, error:`Card names cap at ${MAX.NAME} characters.` };
  if(URLISH.test(value))     return { ok:false, error:"Card names can't contain links." };
  if(!NAME_OK.test(value))   return { ok:false, error:"Letters, numbers and basic punctuation only — no emoji or symbols." };
  if(!/[\p{Script=Latin}\p{N}]/u.test(value))
                             return { ok:false, error:"That name needs at least one letter or number." };
  return { ok:true, value, hold: isFlagged(value) };
}

export function checkHandle(raw){
  const value = cleanText(raw);
  if(!value)                   return { ok:true, value:"", hold:false };   /* optional */
  if(value.length > MAX.HANDLE) return { ok:false, error:`Names cap at ${MAX.HANDLE} characters.` };
  if(URLISH.test(value))       return { ok:false, error:"No links in the name field." };
  if(!HANDLE_OK.test(value))   return { ok:false, error:"Letters, numbers, spaces, dots, dashes and underscores." };
  return { ok:true, value, hold: isFlagged(value) };
}

/* Belt and braces for anything read back out of the database and written into
   innerHTML. `esc()` already makes it inert; this makes it *plain*, so a row
   written before a rules change can't render as something unexpected. */
export function displaySafe(s, max){
  const out = cleanText(s).replace(/[^\p{Script=Latin}\p{N}\p{M} ,.!?'"&:;#/()+_-]/gu, "");
  return out.length > max ? out.slice(0, max) : out;
}
