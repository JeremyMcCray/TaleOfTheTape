# Community feature — share & vote

Built. Publish a dream card to a shared gallery, browse other people's, vote
them up or down.

**Console setup you still have to do: [`firebase/SETUP.md`](../../firebase/SETUP.md).**
Until `config.js` is filled in the whole feature runs against localStorage,
which is why the offline test harness can exercise it end to end.

## The files

| File | Role |
|---|---|
| `config.js` | The only file you edit to switch backends on. Firebase keys, App Check key, owner uid, limits. |
| `client.js` | The only module the UI imports. Delegates to a swappable adapter. |
| `payload.js` | The canonical, wire-safe representation of a fight card. |
| `moderation.js` | Clean → reject → hold. Every free-text field goes through here. |
| `wordlist.js` | The blocklist. This is the file you will actually want to edit. |
| `identity.js` | The display handle. The uid belongs to the adapter. |
| `adapters/firebase.js` | Firestore. Lazy-loads the SDK on first gallery open. |
| `adapters/local.js` | localStorage. The fallback, and what the harness tests against. |

The UI lives outside this folder, in `src/features/community-gallery.js` and
`src/features/community-publish.js`, plus `css/community.css` and the two
markup blocks in `index.html`.

`src/cardbuilder/share.js` — the `#card=` URL hash — is unrelated and still
works. It is zero-infrastructure and works offline; the gallery is the
*additive* public half.

## How the three decisions came out

**Identity — anonymous, not a login.** Firebase Anonymous Auth mints a uid
on first use and persists it in IndexedDB. No sign-in screen, no friction.
It is weak on purpose: clearing site data makes you a new person. What it
buys is that a vote count means something and that flooding the gallery
costs real effort rather than a for-loop. Swapping in Google sign-in later
changes nothing outside `adapters/firebase.js`.

**Moderation — plain text, then a shadow hold.** Three layers, in
`moderation.js`:

1. *Clean.* NFKC (which folds ｆｕｌｌｗｉｄｔｈ and 𝐦𝐚𝐭𝐡-𝐛𝐨𝐥𝐝 lookalikes back to
   ASCII), strip control/zero-width/RTL-override characters, cap Zalgo at
   one combining mark, collapse `AAAAAAA`.
2. *Reject.* Empty, over length, non-Latin script, contains a URL. Shown
   inline as an error — these are mistakes, and the person can fix them.
3. *Hold.* Matches the blocklist → publishes with `status:"held"`. The
   poster sees a normal success and their own card under **Mine**; nobody
   else sees it; it waits in the owner's **Review** tab.

The hold is silent by design. An explicit "that word is blocked" hands a
troll a feedback loop to tune against; a card that looks published and
simply gets no votes does not.

The same charset is enforced a second time, more coarsely, in
`firebase/firestore.rules` — everything in `moderation.js` runs on the
attacker's machine. The rules also carry a small regex of the worst terms
that rejects them outright, which only ever fires for a client that bypassed
the JS.

**Duplicates.** `payloadFingerprint()` is checked at publish time against
public cards. A duplicate returns the existing card's id instead of adding a
tenth copy of the obvious main event.

## Rate limiting

1 publish per 10 minutes, 20 per rolling 24 hours, per uid. Enforced in the
rules, not the UI: creating a card is only allowed if the same batch also
stamps `rate/{uid}`, and that document's own rules police the cooldown. A
client cannot skip the stamp. The adapter reads the document first purely so
the dialog can say *"try again in 4 minutes"* instead of showing a raw
permission error.

Voting is capped structurally — one vote document per (card, uid), and the
card's `score` can only move by the delta that document implies.

## Payload storage

A card is stored as a JSON **string**, not a nested map, with its name
blanked out and kept in its own field. Rules cannot bound a nested map, but
they can bound a string: 4 KB, and a charset of exactly
`{}[]",:a-z0-9` — which is the complete set of characters a legitimate
payload can contain, because fighter keys are `norm()`'d to lowercase
alphanumerics and `JSON.stringify` emits no spaces.

The rendered PNG is never stored. It is regenerated from the payload.

## Contract rule

The UI imports `community` and the payload helpers. It must never import an
adapter directly — that is what keeps the backend swappable.
