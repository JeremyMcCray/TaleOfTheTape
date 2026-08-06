import { UFC_IMG } from "../config.js";
import { PHOTOS } from "./photo-map.js";
import { norm } from "../lib/text.js";

export function photoPath(name){
  const toks = String(name||"").trim().split(/\s+/).filter(Boolean);
  if(!toks.length) return null;
  const tries = [norm(name)];
  if(toks.length===2) tries.push(norm(toks[1]+toks[0]));
  const last = toks[toks.length-1];
  if(/^(jr|sr)\.?$/i.test(last)) tries.push(norm(toks.slice(0,-1).join(" ")));
  else tries.push(norm(name+" jr"));
  if(last.indexOf("-")>0){
    const [a,b] = last.split("-");
    tries.push(norm(toks.slice(0,-1).concat(a).join(" ")));
    tries.push(norm(toks.slice(0,-1).concat(b).join(" ")));
  }
  if(toks.length>2) tries.push(norm(toks[0]+" "+last));
  for(const t of tries){
    const p = t && PHOTOS[t];
    if(p) return /^https?:\/\//.test(p) ? p : UFC_IMG + p;   /* absolute entries pass through */
  }
  return null;
}

/* ============================================================
   WIKIPEDIA PHOTO FALLBACK
   Wikimedia's API sends CORS headers, so the page can query it
   directly — no proxy, no scraping.
   ============================================================ */
export async function wikiPhoto(name){
  const api = "https://en.wikipedia.org/w/api.php?";
  const q = new URLSearchParams({
    action:"query", format:"json", origin:"*",
    prop:"pageimages|description", piprop:"original|thumbnail", pithumbsize:"640",
    generator:"search", gsrsearch:name+" mixed martial artist UFC", gsrlimit:"5"
  });
  const r = await fetch(api+q.toString());
  if(!r.ok) throw new Error("wikipedia HTTP "+r.status);
  const j = await r.json();
  const pages = j && j.query && j.query.pages ? Object.values(j.query.pages) : [];
  if(!pages.length) return null;

  const want = norm(name);
  const last = norm(name.split(/\s+/).slice(-1)[0]);
  const scored = pages.map(p=>{
    const t = norm(p.title||"");
    const d = String(p.description||"").toLowerCase();
    let s = 0;
    if(t===want) s += 100;
    else if(t.startsWith(want) || want.startsWith(t)) s += 60;
    else if(last && t.includes(last)) s += 25;
    if(/martial|fighter|ufc|mma|wrestl|boxer/.test(d)) s += 30;
    if(p.original || p.thumbnail) s += 10;
    return {p, s};
  }).filter(x=> x.s >= 35 && (x.p.original || x.p.thumbnail))
    .sort((a,b)=> b.s - a.s);

  if(!scored.length) return null;
  const hit = scored[0].p;
  return (hit.thumbnail && hit.thumbnail.source) || (hit.original && hit.original.source) || null;
}

/* division badge on a fighter card → open that division in the rankings browser */
