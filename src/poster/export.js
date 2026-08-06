import { CARD } from "../cardbuilder/state.js";
import { drawBoutCell, drawPosterBand, drawPosterBg, drawPosterFoot, drawPosterHead } from "./draw.js";
import { PHOTO_ROUTE, ensurePosterFonts, loadPhotos, photoHost } from "./images.js";
import { posterRows, rowHeight } from "./layout.js";
import { PBAND_H, PFOOT_H, PTIER, PX } from "./theme.js";

export let POSTER_BUSY=false;
export async function buildPosterCanvas(onStep){
  await ensurePosterFonts();
  const rows=posterRows();
  if(!rows.length) return null;

  /* one load per unique fighter, shared across the card */
  const people=new Map();
  rows.forEach(r=>{ if(r.kind!=="row") return;
    r.items.forEach(it=>["a","b"].forEach(s=>{ const f=it.b[s]; if(f&&!people.has(f.key)) people.set(f.key,f); })); });
  const entries=[...people.values()];
  if(onStep) onStep("Fetching photos…");
  const loaded=await loadPhotos(entries);
  if(onStep) onStep("Rendering…");
  const imgs=new Map(); let missing=0, proxied=false;
  entries.forEach((f,i)=>{
    imgs.set(f.key,loaded[i]);
    if(f.img && !loaded[i]) missing++;
    if(f.img && loaded[i] && PHOTO_ROUTE.get(photoHost(f.img))>0) proxied=true;
  });

  const W=PX.W, CONTENT=W-PX.PAD*2;
  const nBouts=rows.reduce((n,r)=>n+(r.kind==="row"?r.items.length:0),0);

  /* measure: header height needs a scratch context */
  const scratch=document.createElement("canvas").getContext("2d");
  const headH=drawPosterHead(scratch,0,W,nBouts);
  let H=headH;
  rows.forEach(r=>{ H += r.kind==="band" ? PBAND_H : rowHeight(PTIER[r.tier]); });
  H+=PFOOT_H;

  const cv=document.createElement("canvas");
  cv.width=Math.round(W*PX.SS); cv.height=Math.round(H*PX.SS);
  const c=cv.getContext("2d");
  c.scale(PX.SS,PX.SS);
  c.textRendering="geometricPrecision";
  drawPosterBg(c,W,H);
  let y=drawPosterHead(c,0,W,nBouts);
  rows.forEach(r=>{
    if(r.kind==="band"){ y=drawPosterBand(c,y,W,r.label); return; }
    const t=PTIER[r.tier];
    const cellW=(CONTENT-t.cellGap*(t.per-1))/t.per;
    const used=cellW*r.items.length+t.cellGap*(r.items.length-1);
    let x=(W-used)/2;
    r.items.forEach(it=>{ drawBoutCell(c,it,x,y,cellW,t,imgs); x+=cellW+t.cellGap; });
    y+=rowHeight(t);
  });
  drawPosterFoot(c,y,W);

  /* supersampled -> exact output width, which is what makes the text crisp */
  const out=document.createElement("canvas");
  out.width=Math.round(W); out.height=Math.round(H);
  const oc=out.getContext("2d");
  oc.imageSmoothingEnabled=true; oc.imageSmoothingQuality="high";
  oc.drawImage(cv,0,0,out.width,out.height);
  return { canvas:out, missing, proxied, total:entries.length, bouts:nBouts };
}
export function posterFileName(){
  const base=(CARD.name||"dream-card").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return (base||"dream-card")+".png";
}
export async function downloadPosterPNG(btn,note){
  if(POSTER_BUSY) return;
  POSTER_BUSY=true;
  const label=btn.textContent;
  btn.disabled=true; btn.textContent="Rendering…";
  if(note) note.textContent="";
  try{
    const res=await buildPosterCanvas(msg=>{ btn.textContent=msg; });
    if(!res){ if(note) note.textContent="Add at least one matchup first."; return; }
    const blob=await new Promise(r=>res.canvas.toBlob(r,"image/png"));
    if(!blob) throw new Error("toBlob returned null");
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=posterFileName();
    if(typeof a.download==="undefined") window.open(url,"_blank");
    else{ document.body.appendChild(a); a.click(); a.remove(); }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    btn.textContent="Saved ✓";
    if(note) note.textContent = res.missing
      ? res.missing+" of "+res.total+" photos couldn't be fetched — the photo host blocks cross-origin reads and the image proxy didn't answer. Initials used instead."
      : "";
    if(window.posthog) posthog.capture('button_clicked',
      { button:'download_card_png', bouts:res.bouts, photos_missing:res.missing, photos_proxied:res.proxied });
  }catch(err){
    console.warn("poster export failed:", err);
    btn.textContent="Export failed";
    if(note) note.textContent="Couldn't build the image on this browser. Try Chrome, or take a screenshot.";
  }finally{
    POSTER_BUSY=false;
    setTimeout(()=>{ btn.disabled=false; btn.textContent=label; }, 1600);
  }
}

/* ---------- tale of the tape modal ---------- */
