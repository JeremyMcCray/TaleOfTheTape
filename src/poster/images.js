/* ---- image loading ---------------------------------------------------------
   A canvas that has drawn a cross-origin image without CORS permission can't be
   exported at all — toBlob() throws — so every photo must arrive through
   crossOrigin="anonymous". ufc.com does NOT send Access-Control-Allow-Origin,
   so a direct anonymous load fails and the photo has to come via a proxy that
   does. One probe per host picks the route, then every photo from that host
   uses it. Set PHOTO_PROXIES=[] to turn proxying off: the export still works,
   it just falls back to initials tiles. */
export const PHOTO_PROXIES = [
  u => "https://images.weserv.nl/?url="+encodeURIComponent(u.replace(/^https?:\/\//,""))+"&w=760",
  u => "https://api.allorigins.win/raw?url="+encodeURIComponent(u)
];
export const PHOTO_ROUTE = new Map();   // host -> 0 = direct, 1..n = PHOTO_PROXIES[n-1]

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
/* probe one photo per host to find a route that CORS lets us read back.
   Only successful routes are cached, so a proxy blip doesn't stick. */
export async function resolvePhotoRoute(host, sample){
  if(PHOTO_ROUTE.has(host)) return PHOTO_ROUTE.get(host);
  for(let r=0; r<=PHOTO_PROXIES.length; r++){
    if(await rawImg(routeUrl(sample,r), 9000)){ PHOTO_ROUTE.set(host,r); return r; }
  }
  return -1;
}
export async function loadPhotos(fighters){
  const hosts=new Map();
  fighters.forEach(f=>{ if(f.img){ const h=photoHost(f.img); if(!hosts.has(h)) hosts.set(h,f.img); } });
  await Promise.all([...hosts].map(([h,sample])=>resolvePhotoRoute(h,sample)));
  return Promise.all(fighters.map(f=>{
    if(!f.img) return null;
    const r=PHOTO_ROUTE.has(photoHost(f.img)) ? PHOTO_ROUTE.get(photoHost(f.img)) : -1;
    return r<0 ? null : rawImg(routeUrl(f.img,r));
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
