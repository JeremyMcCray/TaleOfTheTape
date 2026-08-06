export function rr(c,x,y,w,h,r){
  if(c.roundRect){ c.beginPath(); c.roundRect(x,y,w,h,r); return; }
  c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r);
  c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath();
}
export function drawCoverTop(c,img,x,y,w,h){
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
  if(!iw||!ih) return;
  const ir=iw/ih, dr=w/h;
  let sw,sh,sx;
  if(ir>dr){ sh=ih; sw=sh*dr; sx=(iw-sw)/2; }   /* crop the sides */
  else     { sw=iw; sh=sw/dr; sx=0; }           /* crop the bottom, keep the head */
  c.drawImage(img,sx,0,sw,sh,x,y,w,h);
}
/* manual letter-spacing — ctx.letterSpacing is too new to rely on */
export function trackedWidth(c,t,sp){
  const ch=[...t]; let w=0;
  for(const x of ch) w+=c.measureText(x).width+sp;
  return ch.length? w-sp : 0;
}
export function drawTracked(c,t,x,y,sp,align){
  const ch=[...t], total=trackedWidth(c,t,sp);
  let cx = align==="center" ? x-total/2 : align==="right" ? x-total : x;
  for(const g of ch){ c.fillText(g,cx,y); cx+=c.measureText(g).width+sp; }
  return total;
}
/* shrink until it fits, never below min */
export function fitSize(c,text,maxW,weight,fam,start,min,sp){
  let s=start;
  for(; s>min; s--){
    c.font=weight+" "+s+"px "+fam;
    const w = sp ? trackedWidth(c,text,sp*s) : c.measureText(text).width;
    if(w<=maxW) break;
  }
  c.font=weight+" "+s+"px "+fam;
  return s;
}

/* ---- flags, drawn as rectangles: emoji flags don't render on Windows ---- */
