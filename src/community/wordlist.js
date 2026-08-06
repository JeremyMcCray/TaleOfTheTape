/* ============================================================
   The blocklist.

   Kept in its own file for two reasons: it is the one thing here you will
   actually want to edit, and it is the one thing here nobody wants to read
   while looking for a bug in the filter.

   Entries are lowercase *stems*, matched as substrings against a
   deobfuscated form of the text (see moderation.js — leetspeak, repeated
   letters and separators are collapsed before matching). So "fuk" catches
   "f u u k k", "f.u.k" and "phuck" is a separate entry because the
   deobfuscator does not guess at phonetics.

   Matching a stem does NOT reject the card. It publishes with
   status:"held" — the poster sees a normal success and their own card in
   the gallery, everyone else sees nothing, and it lands in your review
   queue. That is the whole point: an actual troll gets no feedback loop to
   tune against.

   ## Extending it

   Append to EXTRA. It is a plain array of lowercase strings; nothing else
   in the app needs to change. If you want real coverage, paste in a
   maintained list rather than growing this by hand — LDNOOBW
   ("List of Dirty, Naughty, Obscene and Otherwise Bad Words") on GitHub is
   the usual starting point and is public domain, one word per line across
   about thirty languages.

   ## What NOT to put in here

   Short stems that live inside ordinary words. "ass" matches "Cassidy" and
   "assault"; "cum" matches "circumstance". The deobfuscator makes false
   positives worse, not better, because it strips the letters that would
   have kept those words distinct. Stems below are chosen to be long enough
   to be unambiguous, and anything under four characters is checked as a
   whole word only (see WHOLE_WORD).
   ============================================================ */

/* Substring stems — matched anywhere in the deobfuscated text. */
export const STEMS = [
  /* slurs and hate terms — these are also mirrored, in a coarser form, into
     the severeFree() regex in firebase/firestore.rules, so a client that
     bypasses this file still cannot publish them as public */
  "nigg", "nigr", "negro", "faggot", "fagot", "kike", "tranny", "trannie",
  "chink", "gook", "wetback", "beaner", "towelhead", "raghead", "sandnigg",
  "coonass", "shitskin", "whitepower", "heilhitler", "gasthejews", "1488",
  "kkk", "whitepride",

  /* sexual / graphic */
  "porn", "hentai", "blowjob", "handjob", "rimjob", "creampie", "bukkake",
  "dildo", "fleshlight", "masturbat", "molest", "pedo", "paedo", "incest",
  "bestiality", "gangbang", "cumshot", "titties", "boobies", "hardcore",

  /* violence directed at people */
  "killyourself", "killurself", "kysurself", "hangyourself", "shootup",
  "schoolshoot", "bombthe", "iwillkill", "gonnakill", "deaththreat",

  /* general profanity — held rather than rejected, so a card called
     "Fuck It Let's Fight" gets reviewed instead of silently lost */
  "fuck", "fuk", "phuck", "shit", "bullshit", "bitch", "bastard", "cunt",
  "whore", "slut", "wanker", "bollock", "arsehole", "asshole", "dickhead",
  "motherfuck", "jackoff", "jerkoff", "retard", "spastic",

  /* spam shapes — a card name is not an advertisement */
  "onlyfans", "telegram", "whatsapp", "bitcoin", "crypto", "casino",
  "freemoney", "clickhere", "buynow", "promocode", "discountcode"
];

/* Too short to be safe as substrings — matched as standalone words only. */
export const WHOLE_WORD = [
  "ass", "cum", "tit", "fag", "spic", "coon", "jap", "wop", "dyke", "hoe",
  "twat", "piss", "damn", "crap", "rape", "nazi", "hitler", "isis"
];

/* Yours. Append freely; same rules as STEMS. */
export const EXTRA = [];
