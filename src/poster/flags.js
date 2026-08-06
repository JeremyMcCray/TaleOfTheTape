export function fB(c,x,y,w,h,cols,vert){
  const n=cols.length;
  for(let i=0;i<n;i++){
    if(vert) c.fillStyle=cols[i], c.fillRect(x+Math.round(w*i/n),y,Math.ceil(w/n)+1,h);
    else     c.fillStyle=cols[i], c.fillRect(x,y+Math.round(h*i/n),w,Math.ceil(h/n)+1);
  }
}
const H=(...c0)=>(c,x,y,w,h)=>fB(c,x,y,w,h,c0,false);
const V=(...c0)=>(c,x,y,w,h)=>fB(c,x,y,w,h,c0,true);
const N=(field,cross,inner)=>(c,x,y,w,h)=>{             /* nordic cross */
  c.fillStyle=field; c.fillRect(x,y,w,h);
  const t=Math.max(2,Math.round(h*.2)), cx=x+Math.round(w*.36), cy=y+h/2;
  if(inner){ const t2=t+Math.max(2,Math.round(h*.16));
    c.fillStyle=inner; c.fillRect(x,cy-t2/2,w,t2); c.fillRect(cx-t2/2,y,t2,h); }
  c.fillStyle=cross; c.fillRect(x,cy-t/2,w,t); c.fillRect(cx-t/2,y,t,h);
};
export function disc(c,cx,cy,r,col){ c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fillStyle=col; c.fill(); }
export function star(c,cx,cy,r,col){
  c.beginPath();
  for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, rr2=i%2?r*.42:r;
    c[i?"lineTo":"moveTo"](cx+Math.cos(a)*rr2, cy+Math.sin(a)*rr2); }
  c.closePath(); c.fillStyle=col; c.fill();
}
export const FLAGS = {
  /* ---- custom ---- */
  usa:(c,x,y,w,h)=>{ c.fillStyle="#b22234"; c.fillRect(x,y,w,h);
    c.fillStyle="#fff"; for(let i=1;i<13;i+=2) c.fillRect(x,y+h*i/13,w,h/13);
    c.fillStyle="#3c3b6e"; c.fillRect(x,y,w*.42,h*7/13); },
  uk:(c,x,y,w,h)=>{ c.fillStyle="#012169"; c.fillRect(x,y,w,h);
    c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
    c.strokeStyle="#fff"; c.lineWidth=h*.24;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w,y+h); c.moveTo(x+w,y); c.lineTo(x,y+h); c.stroke();
    c.strokeStyle="#C8102E"; c.lineWidth=h*.12; c.stroke();
    c.strokeStyle="#fff"; c.lineWidth=h*.34;
    c.beginPath(); c.moveTo(x,y+h/2); c.lineTo(x+w,y+h/2); c.moveTo(x+w/2,y); c.lineTo(x+w/2,y+h); c.stroke();
    c.strokeStyle="#C8102E"; c.lineWidth=h*.2; c.stroke(); c.restore(); },
  england:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h);
    c.strokeStyle="#C8102E"; c.lineWidth=h*.22;
    c.beginPath(); c.moveTo(x,y+h/2); c.lineTo(x+w,y+h/2); c.moveTo(x+w/2,y); c.lineTo(x+w/2,y+h); c.stroke(); },
  scotland:(c,x,y,w,h)=>{ c.fillStyle="#005EB8"; c.fillRect(x,y,w,h);
    c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip();
    c.strokeStyle="#fff"; c.lineWidth=h*.22;
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w,y+h); c.moveTo(x+w,y); c.lineTo(x,y+h); c.stroke(); c.restore(); },
  wales:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h/2);
    c.fillStyle="#00AD43"; c.fillRect(x,y+h/2,w,h/2);
    c.fillStyle="#C8102E"; c.fillRect(x+w*.3,y+h*.34,w*.42,h*.3); },
  brazil:(c,x,y,w,h)=>{ c.fillStyle="#009B3A"; c.fillRect(x,y,w,h);
    c.beginPath(); c.moveTo(x+w/2,y+h*.1); c.lineTo(x+w*.92,y+h/2);
    c.lineTo(x+w/2,y+h*.9); c.lineTo(x+w*.08,y+h/2); c.closePath();
    c.fillStyle="#FEDF00"; c.fill(); disc(c,x+w/2,y+h/2,h*.2,"#002776"); },
  canada:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h);
    c.fillStyle="#D80621"; c.fillRect(x,y,w*.26,h); c.fillRect(x+w*.74,y,w*.26,h);
    c.fillRect(x+w*.44,y+h*.2,w*.12,h*.6);
    c.beginPath(); c.moveTo(x+w/2,y+h*.14); c.lineTo(x+w*.63,y+h*.55);
    c.lineTo(x+w*.37,y+h*.55); c.closePath(); c.fill(); },
  japan:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h); disc(c,x+w/2,y+h/2,h*.3,"#BC002D"); },
  southkorea:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h);
    disc(c,x+w/2,y+h/2,h*.26,"#CD2E3A");
    c.save(); c.beginPath(); c.arc(x+w/2,y+h/2,h*.26,Math.PI*.75,Math.PI*1.75); c.closePath(); c.clip();
    c.fillStyle="#0047A0"; c.fillRect(x,y,w,h); c.restore(); },
  china:(c,x,y,w,h)=>{ c.fillStyle="#DE2910"; c.fillRect(x,y,w,h);
    star(c,x+w*.18,y+h*.3,h*.18,"#FFDE00");
    [[.34,.14],[.42,.28],[.42,.48],[.34,.62]].forEach(p=>star(c,x+w*p[0],y+h*p[1],h*.07,"#FFDE00")); },
  australia:(c,x,y,w,h)=>{ c.fillStyle="#00008B"; c.fillRect(x,y,w,h);
    FLAGS.uk(c,x,y,w*.5,h*.5); star(c,x+w*.25,y+h*.76,h*.13,"#fff");
    [[.66,.28],[.78,.5],[.7,.74],[.86,.66],[.74,.44]].forEach(p=>star(c,x+w*p[0],y+h*p[1],h*.09,"#fff")); },
  newzealand:(c,x,y,w,h)=>{ c.fillStyle="#00247D"; c.fillRect(x,y,w,h);
    FLAGS.uk(c,x,y,w*.5,h*.5);
    [[.68,.3],[.8,.52],[.7,.74],[.86,.66]].forEach(p=>star(c,x+w*p[0],y+h*p[1],h*.1,"#C8102E")); },
  switzerland:(c,x,y,w,h)=>{ c.fillStyle="#DA291C"; c.fillRect(x,y,w,h);
    c.fillStyle="#fff"; c.fillRect(x+w*.42,y+h*.2,w*.16,h*.6); c.fillRect(x+w*.28,y+h*.4,w*.44,h*.2); },
  georgia:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h);
    c.fillStyle="#FF0000"; c.fillRect(x+w*.42,y,w*.16,h); c.fillRect(x,y+h*.4,w,h*.2);
    [[.2,.2],[.78,.2],[.2,.78],[.78,.78]].forEach(p=>{
      c.fillRect(x+w*p[0]-w*.05,y+h*p[1]-h*.03,w*.1,h*.06);
      c.fillRect(x+w*p[0]-w*.02,y+h*p[1]-h*.1,w*.04,h*.2); }); },
  greece:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#0D5EAF","#fff","#0D5EAF","#fff","#0D5EAF","#fff","#0D5EAF","#fff","#0D5EAF"],false);
    c.fillStyle="#0D5EAF"; c.fillRect(x,y,w*.36,h*5/9);
    c.fillStyle="#fff"; c.fillRect(x+w*.14,y,w*.08,h*5/9); c.fillRect(x,y+h*.2,w*.36,h*.09); },
  portugal:(c,x,y,w,h)=>{ c.fillStyle="#046A38"; c.fillRect(x,y,w*.4,h);
    c.fillStyle="#DA291C"; c.fillRect(x+w*.4,y,w*.6,h); disc(c,x+w*.4,y+h/2,h*.24,"#FFE900");
    disc(c,x+w*.4,y+h/2,h*.14,"#DA291C"); },
  spain:(c,x,y,w,h)=>{ c.fillStyle="#AA151B"; c.fillRect(x,y,w,h);
    c.fillStyle="#F1BF00"; c.fillRect(x,y+h*.25,w,h*.5);
    c.fillStyle="#AA151B"; c.fillRect(x+w*.2,y+h*.36,w*.14,h*.28); },
  southafrica:(c,x,y,w,h)=>{ c.fillStyle="#DE3831"; c.fillRect(x,y,w,h*.5);
    c.fillStyle="#002395"; c.fillRect(x,y+h*.5,w,h*.5);
    /* the horizontal green Y, white-fimbriated, with the black/gold hoist wedge */
    c.strokeStyle="#fff"; c.lineWidth=h*.30;
    c.beginPath(); c.moveTo(x+w*.26,y+h/2); c.lineTo(x+w,y+h/2); c.stroke();
    c.beginPath(); c.moveTo(x-w*.06,y-h*.06); c.lineTo(x+w*.4,y+h/2); c.lineTo(x-w*.06,y+h*1.06); c.stroke();
    c.strokeStyle="#007A4D"; c.lineWidth=h*.18;
    c.beginPath(); c.moveTo(x+w*.26,y+h/2); c.lineTo(x+w,y+h/2); c.stroke();
    c.beginPath(); c.moveTo(x-w*.06,y+h*.02); c.lineTo(x+w*.34,y+h/2); c.lineTo(x-w*.06,y+h*.98); c.stroke();
    c.save(); c.beginPath(); c.moveTo(x,y+h*.14); c.lineTo(x+w*.2,y+h/2); c.lineTo(x,y+h*.86); c.closePath();
    c.fillStyle="#000"; c.fill(); c.restore(); },
  cuba:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#002A8F","#fff","#002A8F","#fff","#002A8F"],false);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w*.4,y+h/2); c.lineTo(x,y+h); c.closePath();
    c.fillStyle="#CF142B"; c.fill(); star(c,x+w*.14,y+h/2,h*.16,"#fff"); },
  puertorico:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#EF3340","#fff","#EF3340","#fff","#EF3340"],false);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w*.4,y+h/2); c.lineTo(x,y+h); c.closePath();
    c.fillStyle="#0050F0"; c.fill(); star(c,x+w*.14,y+h/2,h*.16,"#fff"); },
  chile:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h*.5);
    c.fillStyle="#D52B1E"; c.fillRect(x,y+h*.5,w,h*.5);
    c.fillStyle="#0039A6"; c.fillRect(x,y,w*.33,h*.5); star(c,x+w*.165,y+h*.25,h*.16,"#fff"); },
  philippines:(c,x,y,w,h)=>{ c.fillStyle="#0038A8"; c.fillRect(x,y,w,h*.5);
    c.fillStyle="#CE1126"; c.fillRect(x,y+h*.5,w,h*.5);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w*.42,y+h/2); c.lineTo(x,y+h); c.closePath();
    c.fillStyle="#fff"; c.fill(); disc(c,x+w*.13,y+h/2,h*.13,"#FCD116"); },
  turkey:(c,x,y,w,h)=>{ c.fillStyle="#E30A17"; c.fillRect(x,y,w,h);
    disc(c,x+w*.36,y+h/2,h*.24,"#fff"); disc(c,x+w*.42,y+h/2,h*.19,"#E30A17");
    star(c,x+w*.6,y+h/2,h*.14,"#fff"); },
  israel:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h);
    c.fillStyle="#0038B8"; c.fillRect(x,y+h*.12,w,h*.12); c.fillRect(x,y+h*.76,w,h*.12);
    c.strokeStyle="#0038B8"; c.lineWidth=Math.max(1,h*.05);
    const r=h*.22, cx=x+w/2, cy=y+h/2;
    c.beginPath(); c.moveTo(cx,cy-r); c.lineTo(cx+r*.87,cy+r*.5); c.lineTo(cx-r*.87,cy+r*.5); c.closePath();
    c.moveTo(cx,cy+r); c.lineTo(cx+r*.87,cy-r*.5); c.lineTo(cx-r*.87,cy-r*.5); c.closePath(); c.stroke(); },
  vietnam:(c,x,y,w,h)=>{ c.fillStyle="#DA251D"; c.fillRect(x,y,w,h); star(c,x+w/2,y+h/2,h*.3,"#FFFF00"); },
  morocco:(c,x,y,w,h)=>{ c.fillStyle="#C1272D"; c.fillRect(x,y,w,h);
    c.strokeStyle="#006233"; c.lineWidth=Math.max(1,h*.06);
    const r=h*.26, cx=x+w/2, cy=y+h/2; c.beginPath();
    for(let i=0;i<5;i++){ const a=-Math.PI/2+i*2*Math.PI*2/5;
      c[i?"lineTo":"moveTo"](cx+Math.cos(a)*r, cy+Math.sin(a)*r); }
    c.closePath(); c.stroke(); },
  mexico:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#006847","#fff","#CE1126"],true);
    disc(c,x+w/2,y+h/2,h*.16,"#8B5A2B"); },
  jamaica:(c,x,y,w,h)=>{ c.fillStyle="#009B3A"; c.fillRect(x,y,w,h);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w/2,y+h/2); c.lineTo(x,y+h); c.closePath();
    c.moveTo(x+w,y); c.lineTo(x+w/2,y+h/2); c.lineTo(x+w,y+h); c.closePath();
    c.fillStyle="#000"; c.fill();
    c.strokeStyle="#FED100"; c.lineWidth=Math.max(2,h*.14);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w,y+h); c.moveTo(x+w,y); c.lineTo(x,y+h); c.stroke(); },
  kazakhstan:(c,x,y,w,h)=>{ c.fillStyle="#00AFCA"; c.fillRect(x,y,w,h);
    disc(c,x+w*.54,y+h*.42,h*.17,"#FEC50C"); c.fillStyle="#FEC50C"; c.fillRect(x+w*.04,y,w*.05,h); },
  kyrgyzstan:(c,x,y,w,h)=>{ c.fillStyle="#E8112D"; c.fillRect(x,y,w,h);
    disc(c,x+w/2,y+h/2,h*.24,"#FFEF00"); disc(c,x+w/2,y+h/2,h*.15,"#E8112D");
    disc(c,x+w/2,y+h/2,h*.11,"#FFEF00"); },
  argentina:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#74ACDF","#fff","#74ACDF"],false);
    disc(c,x+w/2,y+h/2,h*.13,"#F6B40E"); },
  india:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#FF9933","#fff","#138808"],false);
    c.strokeStyle="#000088"; c.lineWidth=Math.max(1,h*.04);
    c.beginPath(); c.arc(x+w/2,y+h/2,h*.13,0,Math.PI*2); c.stroke(); },
  iran:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#239F40","#fff","#DA0000"],false);
    c.fillStyle="#DA0000"; c.fillRect(x+w*.42,y+h*.4,w*.16,h*.2); },
  uzbekistan:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#0099B5","#fff","#1EB53A"],false);
    disc(c,x+w*.2,y+h*.17,h*.1,"#fff"); disc(c,x+w*.24,y+h*.17,h*.09,"#0099B5"); },
  azerbaijan:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#00B5E2","#EF3340","#509E2F"],false);
    disc(c,x+w*.46,y+h/2,h*.13,"#fff"); disc(c,x+w*.5,y+h/2,h*.11,"#EF3340"); },
  mongolia:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#C4272F","#015197","#C4272F"],true);
    c.fillStyle="#F9CF02"; c.fillRect(x+w*.12,y+h*.28,w*.04,h*.44); },
  thailand:(c,x,y,w,h)=>fB(c,x,y,w,h,["#A51931","#F4F5F8","#2D2A4A","#2D2A4A","#F4F5F8","#A51931"],false),
  suriname:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#377E3F","#fff","#B40A2D","#fff","#377E3F"],false);
    star(c,x+w/2,y+h/2,h*.16,"#ECC81D"); },
  cameroon:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#007A5E","#CE1126","#FCD116"],true);
    star(c,x+w/2,y+h/2,h*.16,"#FCD116"); },
  nigeria:V("#008751","#fff","#008751"),
  ghana:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#CE1126","#FCD116","#006B3F"],false);
    star(c,x+w/2,y+h/2,h*.14,"#000"); },
  kenya:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#000","#fff","#BB0000","#fff","#006600"],false);
    c.fillStyle="#fff"; c.fillRect(x+w*.46,y+h*.2,w*.08,h*.6); },
  congo:(c,x,y,w,h)=>{ c.fillStyle="#007FFF"; c.fillRect(x,y,w,h);
    c.strokeStyle="#F7D618"; c.lineWidth=Math.max(2,h*.16);
    c.beginPath(); c.moveTo(x,y+h); c.lineTo(x+w,y); c.stroke(); star(c,x+w*.16,y+h*.28,h*.14,"#F7D618"); },
  angola:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#CE1126","#000"],false); disc(c,x+w/2,y+h/2,h*.14,"#FFCB00"); },
  egypt:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#CE1126","#fff","#000"],false);
    c.fillStyle="#C09300"; c.fillRect(x+w*.44,y+h*.4,w*.12,h*.2); },
  tunisia:(c,x,y,w,h)=>{ c.fillStyle="#E70013"; c.fillRect(x,y,w,h);
    disc(c,x+w/2,y+h/2,h*.28,"#fff"); disc(c,x+w/2,y+h/2,h*.19,"#E70013");
    disc(c,x+w*.56,y+h/2,h*.15,"#fff"); },
  algeria:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#006233","#fff"],true);
    disc(c,x+w*.5,y+h/2,h*.2,"#D21034"); disc(c,x+w*.56,y+h/2,h*.16,"#fff"); },
  moldova:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#0046AE","#FFD200","#CC092F"],true);
    disc(c,x+w/2,y+h/2,h*.13,"#A4713B"); },
  belarus:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#C8313E","#4AA657"],false);
    c.fillStyle="#fff"; c.fillRect(x,y,w*.16,h);
    c.fillStyle="#C8313E"; for(let i=0;i<4;i++) c.fillRect(x+w*.04,y+h*(i*.26+.04),w*.08,h*.09); },
  latvia:H("#9E3039","#fff","#9E3039"),
  malaysia:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#CC0001","#fff","#CC0001","#fff","#CC0001","#fff","#CC0001"],false);
    c.fillStyle="#010066"; c.fillRect(x,y,w*.5,h*4/7); disc(c,x+w*.2,y+h*.28,h*.11,"#FFCC00");
    disc(c,x+w*.24,y+h*.28,h*.09,"#010066"); },
  uae:(c,x,y,w,h)=>{ fB(c,x,y,w,h,["#00732F","#fff","#000"],false);
    c.fillStyle="#FF0000"; c.fillRect(x,y,w*.26,h); },
  saudiarabia:(c,x,y,w,h)=>{ c.fillStyle="#006C35"; c.fillRect(x,y,w,h);
    c.fillStyle="#fff"; c.fillRect(x+w*.16,y+h*.34,w*.68,h*.09); c.fillRect(x+w*.2,y+h*.58,w*.5,h*.07); },
  qatar:(c,x,y,w,h)=>{ c.fillStyle="#8A1538"; c.fillRect(x,y,w,h);
    c.fillStyle="#fff"; c.fillRect(x,y,w*.32,h);
    for(let i=0;i<9;i++){ c.beginPath(); c.moveTo(x+w*.32,y+h*i/9);
      c.lineTo(x+w*.42,y+h*(i+.5)/9); c.lineTo(x+w*.32,y+h*(i+1)/9); c.closePath(); c.fillStyle="#fff"; c.fill(); } },
  /* ---- primitive-built ---- */
  russia:H("#fff","#0039A6","#D52B1E"), netherlands:H("#AE1C28","#fff","#1E4785"),
  germany:H("#000","#DD0000","#FFCE00"), austria:H("#ED2939","#fff","#ED2939"),
  hungary:H("#CD2A3E","#fff","#436F4D"), bulgaria:H("#fff","#00966E","#D62612"),
  armenia:H("#D90012","#0033A0","#F2A800"), lithuania:H("#FDB913","#006A44","#C1272D"),
  estonia:H("#0072CE","#000","#fff"), ukraine:H("#0057B7","#FFD700"),
  poland:H("#fff","#DC143C"), indonesia:H("#CE1126","#fff"), singapore:H("#ED2939","#fff"),
  serbia:H("#C6363C","#0C4076","#fff"), slovakia:H("#fff","#0B4EA2","#EE1C25"),
  slovenia:H("#fff","#0B4EA2","#EE1C25"), croatia:H("#FF0000","#fff","#171796"),
  bosnia:H("#002F6C","#FFCE00"),
  czechia:(c,x,y,w,h)=>{ c.fillStyle="#fff"; c.fillRect(x,y,w,h/2);
    c.fillStyle="#D7141A"; c.fillRect(x,y+h/2,w,h/2);
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+w*.45,y+h/2); c.lineTo(x,y+h); c.closePath();
    c.fillStyle="#11457E"; c.fill(); },
  colombia:H("#FCD116","#FCD116","#003893","#CE1126"),
  ecuador:H("#FCD116","#FCD116","#0072CE","#EF3340"),
  venezuela:H("#FCD116","#0033A0","#CE1126"), bolivia:H("#D52B1E","#F9E300","#007934"),
  iraq:H("#CE1126","#fff","#000"), syria:H("#CE1126","#fff","#000"),
  yemen:H("#CE1126","#fff","#000"), sudan:H("#CE1126","#fff","#000"),
  gabon:H("#009E60","#FCD116","#3A75C4"), lithuania2:H("#FDB913","#006A44","#C1272D"),
  ireland:V("#169B62","#fff","#FF883E"), france:V("#002395","#fff","#ED2939"),
  italy:V("#008C45","#F4F5F0","#CD212A"), peru:V("#D91023","#fff","#D91023"),
  belgium:V("#000","#FDDA24","#EF3340"), romania:V("#002B7F","#FCD116","#CE1126"),
  chad:V("#002664","#FECB00","#C60C30"), guinea:V("#CE1126","#FCD116","#009460"),
  ivorycoast:V("#F77F00","#fff","#009E60"), mali:V("#14B53A","#FCD116","#CE1126"),
  sweden:N("#006AA7","#FECC00"), norway:N("#BA0C2F","#00205B","#fff"),
  denmark:N("#C8102E","#fff"), finland:N("#fff","#003580"), iceland:N("#02529C","#DC1E35","#fff")
};
/* birthplace strings often stop at the state/province */
export const US_STATE=new Set(("alabama alaska arizona arkansas california colorado connecticut delaware florida georgia "+
  "hawaii idaho illinois indiana iowa kansas kentucky louisiana maine maryland massachusetts michigan minnesota "+
  "mississippi missouri montana nebraska nevada newhampshire newjersey newmexico newyork northcarolina northdakota "+
  "ohio oklahoma oregon pennsylvania rhodeisland southcarolina southdakota tennessee texas utah vermont virginia "+
  "washington westvirginia wisconsin wyoming districtofcolumbia").split(" "));
export const CA_PROV=new Set(("ontario quebec britishcolumbia alberta manitoba saskatchewan novascotia newbrunswick "+
  "newfoundland princeedwardisland").split(" "));
export const COUNTRY_ALIAS={
  unitedstates:"usa", unitedstatesofamerica:"usa", us:"usa", america:"usa", usofa:"usa",
  unitedkingdom:"uk", greatbritain:"uk", northernireland:"uk", britain:"uk",
  republicofireland:"ireland", russianfederation:"russia", dagestan:"russia", chechnya:"russia",
  republicofkorea:"southkorea", korea:"southkorea", southkorea:"southkorea",
  czechrepublic:"czechia", holland:"netherlands", thenetherlands:"netherlands",
  unitedarabemirates:"uae", abudhabi:"uae", dubai:"uae",
  democraticrepublicofthecongo:"congo", drcongo:"congo", republicofthecongo:"congo",
  cotedivoire:"ivorycoast", newzealandaotearoa:"newzealand", kyrgyzrepublic:"kyrgyzstan",
  bosniaandherzegovina:"bosnia", trinidadandtobago:"trinidad", southafricanrepublic:"southafrica",
  england:"england", scotland:"scotland", wales:"wales"
};
export function flagKeyFor(f){
  const raw=String(f&&f.born||"").trim();
  if(!raw) return null;
  const segs=raw.split(",").map(s=>s.trim().toLowerCase().replace(/[^a-z]/g,"")).filter(Boolean);
  for(let i=segs.length-1;i>=0 && i>=segs.length-2;i--){   /* country, else the state before it */
    const s=segs[i];
    if(US_STATE.has(s)) return "usa";
    if(CA_PROV.has(s))  return "canada";
    const k=COUNTRY_ALIAS[s]||s;
    if(FLAGS[k]) return k;
  }
  return null;
}
export function drawFlag(c,key,x,y,w,h){
  const fn=FLAGS[key]; if(!fn) return;
  c.save(); c.beginPath(); c.rect(x,y,w,h); c.clip(); fn(c,x,y,w,h); c.restore();
  c.strokeStyle="rgba(0,0,0,.6)"; c.lineWidth=1; c.strokeRect(x+.5,y+.5,w-1,h-1);
}
