import { divCategory, primaryRank, ranksFor } from "../data/rankings.js";
import { $, el, esc } from "../lib/dom.js";
import { fmtMMSS } from "../lib/fight.js";
import { fmtDate, fmtDateFull, inchesToFt } from "../lib/format.js";
import { norm } from "../lib/text.js";

export const HIST_STEP = 8;
export const shown = { a:HIST_STEP, b:HIST_STEP };

export function initials(name){
  return name.split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();
}

export function cardHTML(f, side){
  if(!f){
    return '<div class="corner">'+(side==="a"?"Red":"Blue")+' Corner</div>'+
           '<div class="fname" style="color:#31363f">Select a fighter</div>'+
           '<div class="fnick"></div>'+
           '<div class="photo"><div class="silh">?</div></div>';
  }
  const r=f.rec;
  const rec = r.w+"-"+r.l+(r.d?"-"+r.d:"")+(r.n?" ("+r.n+" NC)":"");
  const pro = f.pro ? (f.pro.w+"-"+f.pro.l+(f.pro.d?"-"+f.pro.d:"")) : null;
  const badges=[];
  const pr=primaryRank(f), rk=ranksFor(f);
  if(pr) badges.push('<span class="badge '+(pr.champ?"champ":"rank")+'">'+(pr.champ?"Champion":"#"+pr.rank+" Ranked")+'</span>');
  if(f.division) badges.push(
    divCategory(f.division)
      ? '<button class="badge divlink" data-div="'+esc(f.division)+'" title="See the '+esc(f.division)+' rankings">'+esc(f.division)+'</button>'
      : '<span class="badge">'+esc(f.division)+'</span>');
  if(rk && (rk.p4pMen||rk.p4pWomen)) badges.push('<span class="badge rank">P4P #'+(rk.p4pMen||rk.p4pWomen)+'</span>');
  if(r.titleW>0) badges.push('<span class="badge champ">'+r.titleW+'× Title Win'+(r.titleW>1?'s':'')+'</span>');
  if(f.status && f.status!=="Active") badges.push('<span class="badge">'+esc(f.status)+'</span>');
  if(!f.status && f.fights.length) {
    const last=f.fights[0].date;
    if(last && (Date.now()-last.getTime()) > 1000*60*60*24*365*2.5)
      badges.push('<span class="badge">Inactive</span>');
  }
  if(r.streak>=2) badges.push('<span class="badge">'+r.streak+' Fight '+(r.streakKind==="W"?"Win":"Loss")+' Streak</span>');

  const photo = f.img
    ? '<img src="'+esc(f.img)+'" alt="'+esc(f.name)+'" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;silh&quot;>'+esc(initials(f.name))+'</div>\'">'
    : '<div class="silh">'+esc(initials(f.name))+
      '<button class="findpic" data-key="'+esc(f.key)+'" title="Search Wikipedia for a photo of '+esc(f.name)+'">Find photo</button></div>';

  return '<div class="corner">'+(side==="a"?"Red":"Blue")+' Corner</div>'+
    '<div class="fname">'+esc(f.name)+'</div>'+
    '<div class="fnick">'+(f.nickname?'“'+esc(f.nickname)+'”':'')+'</div>'+
    '<div class="frec">'+esc(pro||rec)+'<small>'+(pro?'Pro Record':'UFC Record')+'</small></div>'+
    '<div class="badges">'+badges.join("")+'</div>'+
    '<div class="photo">'+photo+'</div>';
}

/* stat row spec: [label, valueFn, betterFn]  better: 1 = higher wins, -1 = lower wins, 0 = no contest */
export function statRows(a,b){
  const R=[];
  const push=(label, va, vb, cmp)=> R.push({label, va, vb, cmp});
  const rec=f=>{const r=f.rec;return r.w+"-"+r.l+(r.d?"-"+r.d:"");};

  push("Age", a?.age, b?.age, "low");
  push("Height", a?.height, b?.height, "high");
  push("Weight", a?.weight, b?.weight, "none");
  push("Reach", a?.reach, b?.reach, "high");
  if((a&&a.legReach)||(b&&b.legReach)) push("Leg Reach", a?.legReach, b?.legReach, "high");
  push("Stance", a?.stance, b?.stance, "none");
  push("Division", a?.division, b?.division, "none");
  if((a&&a.style)||(b&&b.style)) push("Fighting Style", a?.style, b?.style, "none");
  if((a&&a.born)||(b&&b.born)) push("Born", a?.born, b?.born, "none");
  push("UFC Record", a?a.rec.w:null, b?b.rec.w:null, "high");
  push("UFC Fights", a?a.rec.total:null, b?b.rec.total:null, "high");
  push("Wins by KO/TKO", a?a.rec.ko:null, b?b.rec.ko:null, "high");
  push("Wins by Submission", a?a.rec.sub:null, b?b.rec.sub:null, "high");
  push("Wins by Decision", a?a.rec.dec:null, b?b.rec.dec:null, "high");
  push("Finish Rate", a?a.rec.finishRate:null, b?b.rec.finishRate:null, "high");
  push("Avg. Fight Time", a?a.rec.avgSecs:null, b?b.rec.avgSecs:null, "none");
  push("Title Fights", a?a.rec.titleF:null, b?b.rec.titleF:null, "high");
  push("Current Streak", a?a.rec:null, b?b.rec:null, "none");
  push("Octagon Debut", a?.debut || (a&&a.fights.length?fmtDateFull(a.fights[a.fights.length-1].date):null),
                        b?.debut || (b&&b.fights.length?fmtDateFull(b.fights[b.fights.length-1].date):null), "none");
  push("Last Fight", a&&a.fights.length?a.fights[0]:null, b&&b.fights.length?b.fights[0]:null, "none");

  // formatting
  const fmt=(label,v,f)=>{
    if(v==null||v==="") return "—";
    switch(label){
      case "Height": return inchesToFt(v)+' <span style="color:#6e7484;font-size:.75em">('+Math.round(v)+'")</span>';
      case "Reach": case "Leg Reach": return Math.round(v)+'"';
      case "Weight": return Math.round(v)+" lbs";
      case "UFC Record": return f.rec.w+"-"+f.rec.l+(f.rec.d?"-"+f.rec.d:"");
      case "Finish Rate": return Math.round(v*100)+"%";
      case "Avg. Fight Time": return fmtMMSS(v);
      case "Current Streak": return v.streak>0 ? v.streak+" "+(v.streakKind==="W"?(v.streak>1?"WINS":"WIN"):(v.streak>1?"LOSSES":"LOSS")) : "—";
      case "Last Fight": return (v.res==="W"?"W":v.res==="L"?"L":v.res==="D"?"D":"NC")+" vs "+esc(v.opp)+
        ' <span style="color:#6e7484;font-size:.8em">'+fmtDate(v.date)+'</span>';
      default: return esc(v);
    }
  };
  const num=(label,v)=>{
    if(v==null) return null;
    if(label==="Current Streak") return null;
    if(label==="UFC Record") return v;
    return typeof v==="number" ? v : null;
  };

  return R.map(r=>{
    const na=num(r.label,r.va), nb=num(r.label,r.vb);
    let win="";
    if(r.cmp!=="none" && na!=null && nb!=null && na!==nb){
      const aWins = r.cmp==="high" ? na>nb : na<nb;
      win = aWins ? "a" : "b";
    }
    return {
      label:r.label,
      ha: r.va==null? "—" : fmt(r.label, r.va, a),
      hb: r.vb==null? "—" : fmt(r.label, r.vb, b),
      win
    };
  });
}

export function renderStats(a,b){
  const host=$("#stats"); host.innerHTML="";
  if(!a && !b){
    host.innerHTML='<div class="nodata" style="text-align:center;padding:28px">Pick a fighter for each corner to build the tape.</div>';
    return;
  }
  for(const r of statRows(a,b)){
    const row=el("div","srow");
    row.innerHTML =
      '<div class="sval l '+(r.win==="a"?"win":r.win==="b"?"lose":"tie")+'">'+r.ha+'</div>'+
      '<div class="slabel">'+esc(r.label)+'</div>'+
      '<div class="sval r '+(r.win==="b"?"win":r.win==="a"?"lose":"tie")+'">'+r.hb+'</div>';
    host.appendChild(row);
  }
}

export function fightHTML(f, oppHighlightKey){
  const hl = oppHighlightKey && f.oppKey===oppHighlightKey;
  return '<div class="fight"'+(hl?' style="background:rgba(212,175,55,.07)"':'')+'>'+
    '<div class="res '+f.res+'">'+f.res+'</div>'+
    '<div><div class="opp">'+esc(f.opp)+(f.title?' <span class="title-tag">TITLE</span>':'')+'</div>'+
    '<div class="sub">'+esc(f.method)+(f.round?' · R'+esc(f.round)+' '+esc(f.time):'')+'</div></div>'+
    '<div class="when">'+fmtDate(f.date)+'<br><span style="font-size:11px;color:#565c68">'+esc((f.event||"").replace(/^UFC Fight Night:\s*/,"UFC FN: ").slice(0,26))+'</span></div>'+
  '</div>';
}

export function renderHistory(side, f, other){
  const host=$("#h-"+side);
  host.innerHTML="";
  if(!f){ host.innerHTML='<div class="nodata">No fighter selected.</div>'; return; }
  host.appendChild(el("h3",null, esc(f.name)+" — "+f.fights.length+" UFC fight"+(f.fights.length===1?"":"s")));
  if(!f.fights.length){ host.appendChild(el("div","nodata","No UFC bouts on record.")); return; }
  const n=Math.min(shown[side], f.fights.length);
  const box=el("div");
  box.innerHTML = f.fights.slice(0,n).map(x=>fightHTML(x, other?other.key:null)).join("");
  host.appendChild(box);
  if(n < f.fights.length){
    const btn=el("button","tool showmore","Show "+Math.min(HIST_STEP, f.fights.length-n)+" more");
    btn.onclick=()=>{ shown[side]+=HIST_STEP; renderHistory(side,f,other); };
    host.appendChild(btn);
  }
}

export function renderBreakdown(side, f){
  const host=$("#bd-"+side); host.innerHTML="";
  if(!f){ host.innerHTML='<div class="nodata">No fighter selected.</div>'; return; }
  const r=f.rec;
  host.appendChild(el("h3",null,esc(f.name)));
  const rows=[
    ["Wins by KO/TKO", r.ko, r.w],
    ["Wins by Submission", r.sub, r.w],
    ["Wins by Decision", r.dec, r.w],
    ["Losses by KO/TKO", r.koL, r.l],
    ["Losses by Submission", r.subL, r.l],
    ["Losses by Decision", r.decL, r.l]
  ];
  for(const [lbl,v,den] of rows){
    const pct = den? Math.round(v/den*100) : 0;
    const d=el("div","bdrow");
    d.innerHTML='<div class="lbl"><span>'+lbl+'</span><b>'+v+(den?' <span style="color:#6e7484">('+pct+'%)</span>':'')+'</b></div>'+
      '<div class="track"><i style="width:'+pct+'%"></i></div>';
    host.appendChild(d);
  }
  const extra=el("div");
  extra.style.cssText="margin-top:16px;border-top:1px solid var(--line-soft);padding-top:12px";
  const bits=[
    ["Finish rate", r.w? Math.round(r.finishes/r.w*100)+"% of wins" : "—"],
    ["Avg. fight time", fmtMMSS(r.avgSecs)],
    ["Title fights", r.titleF+" ("+r.titleW+" won)"],
    ["Went to decision", r.total? Math.round((r.dec+r.decL)/r.total*100)+"% of bouts" : "—"],
    ["First UFC bout", f.fights.length? fmtDateFull(f.fights[f.fights.length-1].date) : "—"],
    ["Most recent", f.fights.length? fmtDateFull(f.fights[0].date) : "—"]
  ];
  extra.innerHTML = bits.map(([k,v])=>
    '<div style="display:flex;justify-content:space-between;padding:5px 0;font-size:15px">'+
    '<span style="color:var(--muted)">'+k+'</span><span>'+esc(v)+'</span></div>').join("");
  host.appendChild(extra);
}

export function renderH2H(a,b){
  const host=$("#h2h"); host.innerHTML="";
  if(!a||!b){ host.innerHTML='<div class="nodata">Pick both fighters to see shared history.</div>'; return; }

  const direct = a.fights.filter(f=>f.oppKey===b.key);
  if(direct.length){
    const box=el("div","h2h-banner");
    let inner='<h3>They have met '+direct.length+' time'+(direct.length>1?'s':'')+'</h3>';
    inner+=direct.map(f=>
      '<div style="margin-top:10px;font-size:16px">'+
      '<b style="color:'+(f.res==="W"?"#4fd672":f.res==="L"?"#ff6b6b":"#d4af37")+'">'+
      (f.res==="W"?esc(a.name):f.res==="L"?esc(b.name):"Draw")+'</b>'+
      (f.res==="W"||f.res==="L"?" def. ":" — ")+
      (f.res==="W"?esc(b.name):f.res==="L"?esc(a.name):"")+
      ' <span style="color:var(--muted)">· '+esc(f.method)+' · R'+esc(f.round)+' '+esc(f.time)+
      ' · '+esc(f.event)+' ('+fmtDateFull(f.date)+')</span></div>').join("");
    box.innerHTML=inner;
    host.appendChild(box);
  } else {
    const box=el("div","h2h-banner");
    box.style.borderColor="var(--line)"; box.style.background="var(--panel)";
    box.innerHTML='<h3 style="color:var(--muted)">These two have never fought in the UFC</h3>';
    host.appendChild(box);
  }

  // common opponents
  const mapB=new Map();
  for(const f of b.fights){ if(!mapB.has(f.oppKey)) mapB.set(f.oppKey,[]); mapB.get(f.oppKey).push(f); }
  const common=[];
  for(const f of a.fights){
    if(f.oppKey===b.key) continue;
    if(mapB.has(f.oppKey)) common.push({key:f.oppKey, name:f.opp, af:f, bfs:mapB.get(f.oppKey)});
  }
  const seen=new Set(); const uniq=common.filter(c=> seen.has(c.key)?false:(seen.add(c.key),true));

  const h=el("h3");
  h.style.cssText="font-size:15px;letter-spacing:.14em;margin:22px 0 6px;color:var(--muted)";
  h.textContent="Common Opponents ("+uniq.length+")";
  host.appendChild(h);

  if(!uniq.length){ host.appendChild(el("div","nodata","No shared opponents in the UFC.")); return; }

  const head=el("div","co");
  head.style.cssText="border-bottom:1px solid var(--line);color:var(--muted);font-family:'Oswald',sans-serif;font-size:11px;letter-spacing:.16em;text-transform:uppercase";
  head.innerHTML='<div class="side l">'+esc(a.name)+'</div><div class="mid">Opponent</div><div class="side">'+esc(b.name)+'</div>';
  host.appendChild(head);

  for(const c of uniq){
    const af=c.af, bf=c.bfs[0];
    const row=el("div","co");
    row.innerHTML =
      '<div class="side l"><span class="tag '+af.res+'">'+af.res+'</span> <span style="color:var(--muted);font-size:13.5px">'+esc(af.method)+' · '+fmtDate(af.date)+'</span></div>'+
      '<div class="mid">'+esc(c.name)+'</div>'+
      '<div class="side"><span class="tag '+bf.res+'">'+bf.res+'</span> <span style="color:var(--muted);font-size:13.5px">'+esc(bf.method)+' · '+fmtDate(bf.date)+'</span></div>';
    host.appendChild(row);
  }
}

/* one-line storyline: rank matchup, cross-division flag, physical edges, stance clash */
export function matchupBlurb(a,b){
  if(!a||!b) return "";
  const bits=[];
  const ra=primaryRank(a), rb=primaryRank(b);
  const sameDiv = a.division && b.division && norm(a.division)===norm(b.division);
  if(ra && rb){
    bits.push("<b>"+(ra.champ?"Champion":"#"+ra.rank)+"</b> vs <b>"+(rb.champ?"Champion":"#"+rb.rank)+"</b>"+
      (sameDiv ? " in the "+esc(a.division)+" division." : ", a cross-division matchup."));
  } else if(a.division && b.division && !sameDiv){
    bits.push("Cross-division matchup — "+esc(a.name)+" fights at <b>"+esc(a.division)+"</b>, "+esc(b.name)+" at <b>"+esc(b.division)+"</b>.");
  }
  const edges=[];
  if(a.reach!=null && b.reach!=null && a.reach!==b.reach){
    const d=Math.round(Math.abs(a.reach-b.reach));
    edges.push("<b>"+esc(a.reach>b.reach?a.name:b.name)+"</b> has a "+d+'" reach edge');
  }
  if(a.height!=null && b.height!=null && a.height!==b.height){
    const d=Math.round(Math.abs(a.height-b.height));
    edges.push("<b>"+esc(a.height>b.height?a.name:b.name)+"</b> is "+d+'" taller');
  }
  if(edges.length) bits.push(edges.join(" · ")+".");
  if(a.stance && b.stance){
    bits.push(a.stance===b.stance ? "Both fight "+esc(a.stance)+"." : "Style clash: "+esc(a.stance)+" vs "+esc(b.stance)+".");
  }
  return bits.join(" ");
}
export function renderMatchNote(a,b){
  const host=$("#matchnote"); if(!host) return;
  const txt = (a&&b) ? matchupBlurb(a,b) : "";
  host.innerHTML = txt;
  host.style.display = txt ? "block" : "none";
}

/* ============================ rankings browser ============================ */
