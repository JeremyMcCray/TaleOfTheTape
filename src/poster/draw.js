import { CARD } from "../cardbuilder/state.js";
import { initials } from "../features/tape.js";
import { drawCoverTop, drawTracked, fitSize, rr, trackedWidth } from "./canvas.js";
import { drawFlag, flagKeyFor } from "./flags.js";
import { F_OSW, PBAND_H, PHEAD_PAD, PX, posterSubOptions, surnameOf } from "./theme.js";

export function drawPosterBg(c,W,H){
  c.fillStyle=PX.bg; c.fillRect(0,0,W,H);
  let g=c.createLinearGradient(0,0,0,400);
  g.addColorStop(0,"rgba(210,10,10,.20)"); g.addColorStop(1,"rgba(210,10,10,0)");
  c.fillStyle=g; c.fillRect(0,0,W,400);
  g=c.createRadialGradient(W/2,-120,0,W/2,-120,W*.95);
  g.addColorStop(0,"rgba(120,132,160,.14)"); g.addColorStop(1,"rgba(120,132,160,0)");
  c.fillStyle=g; c.fillRect(0,0,W,600);
  /* faint chevrons, the texture the real posters use */
  c.save(); c.globalAlpha=.03; c.strokeStyle="#aeb6c6"; c.lineWidth=1.5;
  for(let i=-H;i<W+H;i+=38){
    c.beginPath(); c.moveTo(i,0); c.lineTo(i+H,H); c.stroke();
  }
  c.restore();
  g=c.createLinearGradient(0,H-260,0,H);
  g.addColorStop(0,"rgba(0,0,0,0)"); g.addColorStop(1,"rgba(0,0,0,.55)");
  c.fillStyle=g; c.fillRect(0,H-260,W,260);
  c.strokeStyle="#2a2e37"; c.lineWidth=2; c.strokeRect(1,1,W-2,H-2);
}
export function drawPosterHead(c,y,W,nBouts){
  const cx=W/2;
  c.textBaseline="alphabetic"; c.textAlign="left";
  y+=PHEAD_PAD+18;
  c.fillStyle=PX.redHot; c.font="500 17px "+F_OSW;
  drawTracked(c,"FANTASY FIGHT CARD",cx,y,7,"center");
  y+=18;

  const me=CARD.sections.find(s=>s.id==="main"), mb=me&&me.bouts[0];
  const title=(CARD.name||"").trim() ||
    (mb&&mb.a&&mb.b ? surnameOf(mb.a.name)+" VS "+surnameOf(mb.b.name) : "YOUR DREAM CARD");
  const up=title.toUpperCase();
  const size=fitSize(c,up,W-PX.PAD*2-20,"700",F_OSW,88,28,.04);
  y+=size;
  c.fillStyle=PX.text; drawTracked(c,up,cx,y,size*.04,"center");
  y+=20;

  c.fillStyle=PX.gold; c.fillRect(cx-58,y,116,2);
  y+=27;
  const meta=nBouts+" BOUT"+(nBouts===1?"":"S");
  c.fillStyle=PX.muted; c.font="400 17px "+F_OSW;
  drawTracked(c,meta,cx,y,3.8,"center");
  return y+PHEAD_PAD;
}
export function drawPosterBand(c,y,W,label){
  const h=PBAND_H, cx=W/2;
  c.fillStyle="rgba(255,255,255,.045)"; c.fillRect(0,y+10,W,h-20);
  c.fillStyle=PX.gold; c.fillRect(0,y+10,W,1.5); c.fillRect(0,y+h-11.5,W,1.5);
  c.font="600 24px "+F_OSW; c.textBaseline="middle"; c.textAlign="left";
  c.fillStyle=PX.text;
  const tw=trackedWidth(c,label.toUpperCase(),8.5);
  drawTracked(c,label.toUpperCase(),cx,y+h/2+1,8.5,"center");
  c.fillStyle=PX.gold;
  [-1,1].forEach(s=>{ const dx=cx+s*(tw/2+26);
    c.beginPath(); c.moveTo(dx,y+h/2-6); c.lineTo(dx+6,y+h/2); c.lineTo(dx,y+h/2+6); c.lineTo(dx-6,y+h/2); c.closePath(); c.fill(); });
  c.textBaseline="alphabetic";
  return y+h;
}
export function drawFighterPhoto(c,f,img,x,y,w,h,side){
  rr(c,x,y,w,h,3); c.save(); c.clip();
  c.fillStyle="#0e1116"; c.fillRect(x,y,w,h);
  if(img) drawCoverTop(c,img,x,y,w,h);
  else{
    const g=c.createLinearGradient(x,y,x,y+h);
    g.addColorStop(0,"#171b22"); g.addColorStop(1,"#0c0e13");
    c.fillStyle=g; c.fillRect(x,y,w,h);
    c.fillStyle="#3a414e"; c.textAlign="center"; c.textBaseline="middle";
    c.font="600 "+Math.round(h*.24)+"px "+F_OSW;
    c.fillText(f?initials(f.name):"?", x+w/2, y+h/2);
    c.textBaseline="alphabetic";
  }
  const g2=c.createLinearGradient(x,y+h*.55,x,y+h);
  g2.addColorStop(0,"rgba(8,9,11,0)"); g2.addColorStop(1,"rgba(8,9,11,.85)");
  c.fillStyle=g2; c.fillRect(x,y+h*.55,w,h*.45);
  c.restore();
  c.strokeStyle="#2b303a"; c.lineWidth=1; rr(c,x+.5,y+.5,w-1,h-1,3); c.stroke();
  c.fillStyle = side==="a" ? PX.red : PX.blue;
  c.fillRect(x, y+h-3, w, 3);
  const fk=flagKeyFor(f);
  if(fk){
    const fw=Math.max(20,Math.round(w*.2)), fh=Math.round(fw*.66), pad=Math.max(5,Math.round(w*.045));
    drawFlag(c,fk,x+pad,y+h-fh-pad-3,fw,fh);
  }
}
export function drawBoutCell(c,item,x,y,w,t,imgs){
  const b=item.b, cx=x+w/2;
  let cy=y;
  c.textAlign="left"; c.textBaseline="alphabetic";
  if(t.tag && item.tag){
    c.font="500 "+t.tag+"px "+F_OSW; c.fillStyle=PX.redHot;
    cy+=t.tag;
    drawTracked(c,item.tag.toUpperCase(),cx,cy,t.tag*.24,"center");
    cy+=11;
  }else if(t.tag){ cy+=t.tag+11; }

  const blockW=t.pw*2+t.inner, px0=cx-blockW/2;
  drawFighterPhoto(c,b.a,imgs.get(b.a&&b.a.key)||null,px0,cy,t.pw,t.ph,"a");
  drawFighterPhoto(c,b.b,imgs.get(b.b&&b.b.key)||null,px0+t.pw+t.inner,cy,t.pw,t.ph,"b");
  cy+=t.ph+15;

  /* "MAKHACHEV vs GARRY" — surnames big, vs small and gold */
  const na=b.a?surnameOf(b.a.name):"TBD", nb=b.b?surnameOf(b.b.name):"TBD";
  const maxW=w-(t.per>1?24:16);   /* keep a gutter so neighbouring cells never touch */
  let ns=t.name, sp, vsS, wa, wv, wb;
  for(;;){
    c.font="600 "+ns+"px "+F_OSW; sp=ns*.035;
    wa=trackedWidth(c,na,sp); wb=trackedWidth(c,nb,sp);
    vsS=Math.max(9,Math.round(ns*.56));
    c.font="400 "+vsS+"px "+F_OSW; wv=c.measureText(" vs ").width+ns*.3;
    if(wa+wv+wb<=maxW || ns<=Math.round(t.name*.55)) break;
    ns--;
  }
  cy+=ns;
  let tx=cx-(wa+wv+wb)/2;
  c.font="600 "+ns+"px "+F_OSW; c.fillStyle=PX.text;
  drawTracked(c,na,tx,cy,sp,"left"); tx+=wa;
  c.font="400 "+vsS+"px "+F_OSW; c.fillStyle=PX.gold;
  c.fillText(" vs ",tx+ns*.15,cy); tx+=wv;
  c.font="600 "+ns+"px "+F_OSW; c.fillStyle=PX.text;
  drawTracked(c,nb,tx,cy,sp,"left");
  cy+=9;

  const opts=posterSubOptions(b), subMax=maxW;
  let sub="", ss=t.sub;
  for(let i=0;i<opts.length;i++){
    ss=fitSize(c,opts[i],subMax,"400",F_OSW,t.sub,Math.max(7,t.sub-3),.2);
    sub=opts[i];
    if(trackedWidth(c,sub,ss*.2)<=subMax) break;    /* else try the shorter wording */
  }
  if(sub){
    if(trackedWidth(c,sub,ss*.2)>subMax){           /* last resort: clip it */
      while(sub.length>4 && trackedWidth(c,sub+"…",ss*.2)>subMax) sub=sub.slice(0,-1);
      sub+="…";
    }
    cy+=ss;
    c.fillStyle = b.title ? PX.gold : PX.dim;
    drawTracked(c,sub,cx,cy,ss*.2,"center");
  }
}
export function drawPosterFoot(c,y,W){
  const cx=W/2;
  c.fillStyle="#242832"; c.fillRect(PX.PAD,y+14,W-PX.PAD*2,1);
  c.textAlign="left"; c.textBaseline="alphabetic";
  c.font="600 22px "+F_OSW; c.fillStyle=PX.gold;
  drawTracked(c,"TALE OF THE TAPE",cx,y+58,7.5,"center");
  c.font="400 16px "+F_OSW; c.fillStyle=PX.dim;
  let host="";
  try{ host = location.protocol==="file:" ? "" : location.host.replace(/^www\./,""); }catch(e){}
  drawTracked(c,(host||"Fantasy matchmaker")+"  ·  Built by you",cx,y+82,3,"center");
}

/* ---- orchestration ---- */
