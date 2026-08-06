import { allBouts, boutLabel, boutWeight } from "./state.js";
import { cardHTML, fightHTML, matchupBlurb, statRows } from "../features/tape.js";
import { $, el, esc } from "../lib/dom.js";
import { fmtDateFull } from "../lib/format.js";

export let TAPE_LIST=[], TAPE_IDX=-1;
export function openTape(bout){
  TAPE_LIST = allBouts().filter(x=>x.bout.a&&x.bout.b).map(x=>x);
  TAPE_IDX  = TAPE_LIST.findIndex(x=>x.bout===bout);
  if(TAPE_IDX<0) return;
  renderTape();
  $("#tapemodal").classList.add("open");
}
export function closeTape(){ $("#tapemodal").classList.remove("open"); }
export function stepTape(d){
  if(!TAPE_LIST.length) return;
  TAPE_IDX=(TAPE_IDX+d+TAPE_LIST.length)%TAPE_LIST.length;
  renderTape();
  $("#tapemodal").scrollTop=0;
}
export function renderTape(){
  const item=TAPE_LIST[TAPE_IDX]; if(!item) return;
  const b=item.bout, a=b.a, c=b.b;
  const lbl=boutLabel(item.sec,item.i), wc=boutWeight(b);
  const bits=[item.sec.label];
  if(lbl) bits.push(lbl);
  if(wc) bits.push(wc);
  if(b.title) bits.push("Title Fight");
  $("#tmlbl").textContent = bits.join(" · ");
  $("#tmPrev").disabled = TAPE_LIST.length<2;
  $("#tmNext").disabled = TAPE_LIST.length<2;
  $("#tmNext").textContent = TAPE_LIST.length>1 ? "Next ▶ ("+(TAPE_IDX+1)+"/"+TAPE_LIST.length+")" : "Next ▶";

  $("#tm-card-a").innerHTML = cardHTML(a,"a");
  $("#tm-card-b").innerHTML = cardHTML(c,"b");
  $("#tmnote").innerHTML = matchupBlurb(a,c);

  const st=$("#tmstats"); st.innerHTML="";
  for(const r of statRows(a,c)){
    const row=el("div","srow");
    row.innerHTML='<div class="sval l '+(r.win==="a"?"win":r.win==="b"?"lose":"tie")+'">'+r.ha+'</div>'+
      '<div class="slabel">'+esc(r.label)+'</div>'+
      '<div class="sval r '+(r.win==="b"?"win":r.win==="a"?"lose":"tie")+'">'+r.hb+'</div>';
    st.appendChild(row);
  }

  /* head to head + recent form */
  const sub=$("#tmsub"); sub.innerHTML="";
  const direct=a.fights.filter(f=>f.oppKey===c.key);
  const h=el("div","tmh2h"+(direct.length?"":" none"));
  if(direct.length){
    h.innerHTML='<b style="color:var(--gold);font-family:Oswald,sans-serif;letter-spacing:.1em">THEY HAVE MET '+direct.length+' TIME'+(direct.length>1?'S':'')+'</b>'+
      direct.map(f=>'<div style="margin-top:8px">'+
        '<b style="color:'+(f.res==="W"?"#4fd672":f.res==="L"?"#ff6b6b":"#d4af37")+'">'+
        (f.res==="W"?esc(a.name):f.res==="L"?esc(c.name):"Draw")+'</b>'+
        (f.res==="W"||f.res==="L"?" def. ":" — ")+
        (f.res==="W"?esc(c.name):f.res==="L"?esc(a.name):"")+
        ' <span style="color:var(--muted)">· '+esc(f.method)+' · R'+esc(f.round)+' '+esc(f.time)+' · '+esc(f.event)+' ('+fmtDateFull(f.date)+')</span></div>').join("");
  } else {
    const mapB=new Set(c.fights.map(f=>f.oppKey));
    const common=[...new Set(a.fights.filter(f=>mapB.has(f.oppKey)).map(f=>f.opp))];
    h.innerHTML='These two have never fought. '+
      (common.length? 'They share <b style="color:#fff">'+common.length+'</b> common opponent'+(common.length>1?'s':'')+': '+esc(common.slice(0,6).join(", "))+(common.length>6?'…':'')
                    : 'No common opponents in the UFC.');
  }
  sub.appendChild(h);

  const last=el("div");
  last.innerHTML='<h4>Recent Form</h4>';
  const grid=el("div","tmlast");
  [[a,"red"],[c,"blue"]].forEach(([f,cls])=>{
    const col=el("div","col");
    col.innerHTML='<h5 style="color:'+(cls==="red"?"#ff6a6a":"#6aaaff")+'">'+esc(f.name)+'</h5>'+
      (f.fights.length? f.fights.slice(0,5).map(x=>fightHTML(x,null)).join("")
                      : '<div class="nodata">No UFC bouts on record.</div>');
    grid.appendChild(col);
  });
  last.appendChild(grid);
  sub.appendChild(last);
}

/* ---------- share link ---------- */
