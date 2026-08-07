/* ---- image loading ---------------------------------------------------------
   A canvas that has drawn a cross-origin image without CORS permission can't be
   exported at all — toBlob() throws — so every photo must arrive through
   crossOrigin="anonymous". ufc.com does NOT send Access-Control-Allow-Origin,
   so a direct anonymous load fails and the photo has to come via a proxy that
   does. A probe per host picks the route, then every photo from that host uses
   it. Set PHOTO_PROXIES=[] to turn proxying off: the export still works, it
   just falls back to initials tiles. */

/* Some ufc.com paths carry a literal "%252F" — a double-encoded slash Drupal
   baked into the filename — and the origin serves the file at that exact
   spelling and no other: ask for "%2F" or a real "/" and it answers 403.
   weserv URL-decodes its ?url= parameter one extra time before it makes the
   upstream request, so a plainly-encoded URL arrives at ufc.com as "%2F" and
   403s. Pre-escaping the percent signs cancels that extra decode out. This is
   what blanked Makhachev, Iaquinta, Cerrone, Condit, Gadelha, Hall and every
   other "%252F" photo; it is a no-op for the majority of URLs, which have no
   "%" in them at all. allorigins passes its parameter through untouched and
   must NOT get the same treatment. */
const weservSafe = u => String(u).replace(/%/g, "%2525");

export const PHOTO_PROXIES = [
  u => "https://images.weserv.nl/?url="+encodeURIComponent(weservSafe(u).replace(/^https?:\/\//,""))+"&w=760",
  u => "https://api.allorigins.win/raw?url="+encodeURIComponent(u)
];
export const PHOTO_ROUTE = new Map();   // host -> 0 = direct, 1..n = PHOTO_PROXIES[n-1]
const DEAD_ROUTE = new Set();           // "host|route" — answered nothing for any sample

export function rawImg(url, ms){
  return new Promise(res=>{
    if(!url) return res(null);
    let done=false;
    const im=new Image();
    im.crossOrigin="anonymous";
    im.onload =()=>{ if(!done){ done=true; res(im.naturalWidth?im:null); } };
    im.onerror=()=>{ if(!done){ done=true; res(null); } };
    setTimeout(()=>{ if(!done){ done=true; res(null); } }, ms||12000);
    im.src=url;
  });
}
export function photoHost(u){ try{ return new URL(u, location.href).host || "local"; }catch(e){ return "local"; } }
export function routeUrl(url, r){ return r===0 ? url : PHOTO_PROXIES[r-1](url); }
const PROBE_SAMPLES = 3;
/* Resolves as soon as any one of the loads succeeds — Promise.all would hold a
   proven-good route hostage to the slowest sample, and a sample that 403s can
   take the proxy seconds to give up on. */
function anyLoads(loads){
  return new Promise(res=>{
    let left=loads.length;
    if(!left) return res(false);
    loads.forEach(p=>p.then(im=>{ if(im) res(true); else if(!--left) res(false); }));
  });
}
/* Probe a host to find a route that CORS lets us read back. Several samples,
   not one: ufc.com 403s individual paths, and with a single sample one
   unfetchable fighter condemned every photo on the card to an initials tile.
   Samples for a route go out together, so the offline case still costs one
   timeout per route rather than one per sample. Only successful routes are
   cached, so a proxy blip doesn't stick. */
export async function resolvePhotoRoute(host, samples){
  if(PHOTO_ROUTE.has(host)) return PHOTO_ROUTE.get(host);
  const list=(Array.isArray(samples)?samples:[samples]).filter(Boolean).slice(0,PROBE_SAMPLES);
  for(let r=0; r<=PHOTO_PROXIES.length; r++){
    if(await anyLoads(list.map(s=>rawImg(routeUrl(s,r), 9000)))){ PHOTO_ROUTE.set(host,r); return r; }
    DEAD_ROUTE.add(host+"|"+r);          /* failed every sample, not just one */
  }
  return -1;
}
/* The host's route is the fast path, but a route that serves most of a host can
   still 403 one particular path — so a photo the route misses retries on the
   others. Routes the probe already proved dead for this host are skipped, which
   is what keeps an offline page (every route dead) from paying for the retry. */
async function loadOne(url, host, preferred){
  if(preferred>=0){
    const im=await rawImg(routeUrl(url,preferred));
    if(im) return im;
  }
  for(let r=0; r<=PHOTO_PROXIES.length; r++){
    if(r===preferred || DEAD_ROUTE.has(host+"|"+r)) continue;
    const im=await rawImg(routeUrl(url,r), 8000);
    if(im) return im;
  }
  return null;
}
export async function loadPhotos(fighters){
  const hosts=new Map();
  fighters.forEach(f=>{ if(!f.img) return;
    const h=photoHost(f.img);
    if(!hosts.has(h)) hosts.set(h,[]);
    const s=hosts.get(h); if(s.length<PROBE_SAMPLES) s.push(f.img); });
  await Promise.all([...hosts].map(([h,samples])=>resolvePhotoRoute(h,samples)));
  return Promise.all(fighters.map(f=>{
    if(!f.img) return null;
    const h=photoHost(f.img);
    return loadOne(f.img, h, PHOTO_ROUTE.has(h)?PHOTO_ROUTE.get(h):-1);
  }));
}
export async function ensurePosterFonts(){
  if(!document.fonts||!document.fonts.load) return;
  try{
    await Promise.all([
      document.fonts.load("700 60px Oswald"), document.fonts.load("600 30px Oswald"),
      document.fonts.load("500 20px Oswald"), document.fonts.load("400 20px Oswald"),
      document.fonts.load("500 22px 'Barlow Condensed'")
    ]);
    await document.fonts.ready;
  }catch(e){}
}

/* ---- layout: rows of bouts, short rows centred ---- */
