import { SRC } from "../config.js";
import { buildDefaultPicks } from "./default-picks.js";
import { photoPath } from "./photos.js";
import { buildRanks } from "./rankings.js";
import { reconcileProRecords } from "./reconcile.js";
import { DB, RANKINGS, getF, resolveFighter, setRankedFighters, setRankings, setRanksByKey, tally } from "./store.js";
import { parseCSV } from "../lib/csv.js";
import { $, esc } from "../lib/dom.js";
import { fightSeconds, methodClass, methodShort } from "../lib/fight.js";
import { ageFrom, heightToInches, numOf, parseDate } from "../lib/format.js";
import { norm } from "../lib/text.js";

export let LOADED=0;
export const STEPS=4;
export function step(msg){
  LOADED++;
  $("#loadbar").style.width = Math.min(100, Math.round(LOADED/STEPS*100)) + "%";
  if(msg) $("#loadmsg").textContent = msg;
}

export async function getText(url){
  /* "no-cache" still uses the disk cache, but revalidates with the server first,
     so an upstream CSV update lands on the next page load instead of never. */
  const r = await fetch(url, {cache:"no-cache"});
  if(!r.ok) throw new Error(url + " → HTTP " + r.status);
  return r.text();
}

export async function boot(){
  try{
    $("#loadmsg").textContent = "Pulling fighter records…";
    const [tottT, evT, resT] = await Promise.all([
      getText(SRC.tott).then(t=>{ step("Pulling fight history…"); return t; }),
      getText(SRC.events).then(t=>{ step(); return t; }),
      getText(SRC.results).then(t=>{ step("Crunching careers…"); return t; })
    ]);

    /* --- physicals: every fighter who ever appeared on a UFC card --- */
    for(const r of parseCSV(tottT)){
      const nm=r.FIGHTER; if(!nm) continue;
      const k=norm(nm); if(!k) continue;
      const f=getF(k);
      f.name = f.name || nm;
      f.height   = heightToInches(r.HEIGHT);
      f.weight   = numOf(r.WEIGHT);
      f.reach    = numOf(r.REACH);
      f.stance   = r.STANCE || "";
      f.dob      = r.DOB && r.DOB !== "--" ? r.DOB : "";
      f.age      = ageFrom(f.dob);
    }

    /* --- event dates --- */
    const evDate=new Map();
    for(const e of parseCSV(evT)){
      if(!e.EVENT) continue;
      evDate.set(String(e.EVENT).trim(), { date:parseDate(e.DATE), loc:e.LOCATION||"" });
    }

    /* --- fights --- */
    for(const r of parseCSV(resT)){
      const bout=String(r.BOUT||""); const parts=bout.split(/\s+vs\.\s+/i);
      if(parts.length!==2) continue;
      const a=parts[0].trim(), b=parts[1].trim();
      if(!a||!b) continue;
      const ev=(r.EVENT||"").trim();
      const info=evDate.get(ev)||{};
      const oc=(r.OUTCOME||"").toUpperCase();
      let ra="N", rb="N";
      if(oc==="W/L"){ra="W";rb="L";}
      else if(oc==="L/W"){ra="L";rb="W";}
      else if(oc==="D/D"){ra="D";rb="D";}
      const wc=(r.WEIGHTCLASS||"").replace(/\s*Bout\s*$/i,"").trim();
      const isTitle=/title/i.test(r.WEIGHTCLASS||"");
      const base={
        event:ev, date:info.date||null, loc:info.loc||"",
        method:methodShort(r.METHOD), mclass:methodClass(r.METHOD),
        round:r.ROUND||"", time:r.TIME||"", secs:fightSeconds(r.ROUND,r.TIME),
        weightclass:wc, title:isTitle, detail:(r.DETAILS||"").trim(), url:r.URL||""
      };
      const fa=getF(norm(a)); if(!fa.name) fa.name=a;
      const fb=getF(norm(b)); if(!fb.name) fb.name=b;
      fa.fights.push(Object.assign({opp:b, oppKey:norm(b), res:ra}, base));
      fb.fights.push(Object.assign({opp:a, oppKey:norm(a), res:rb}, base));
    }

    /* --- official roster: photos, nicknames, bios (active athletes) --- */
    /* --- official rankings: top 15 + champion per division --- */
    const [rr, rkr] = await Promise.all([
      fetch(SRC.roster, {cache:"no-cache"}).catch(e=>{ console.warn("roster fetch failed:", e); return null; }),
      fetch(SRC.rankings, {cache:"no-cache"}).catch(e=>{ console.warn("rankings fetch failed:", e); return null; })
    ]);
    try{
      if(rr && rr.ok){
        const roster = await rr.json();
        for(const id in roster){
          const o=roster[id]; if(!o||!o.name) continue;
          const f=getF(norm(o.name));
          f.name     = String(o.name).trim();
          f.nickname = o.nickname || f.nickname;
          f.img      = o.imgUrl || "";
          f.division = (o.category||"").replace(/\s*Division\s*$/i,"");
          f.status   = o.status || "";
          f.born     = o.placeOfBirth && o.placeOfBirth!=="null" ? o.placeOfBirth : "";
          f.style    = o.fightingStyle && o.fightingStyle!=="null" ? o.fightingStyle : "";
          f.debut    = o.octagonDebut || "";
          f.legReach = numOf(o.legReach) || null;
          if(numOf(o.height))  f.height = numOf(o.height);
          if(numOf(o.reach))   f.reach  = numOf(o.reach);
          if(numOf(o.weight))  f.weight = numOf(o.weight);
          if(o.age && numOf(o.age)) f.age = numOf(o.age);
          const w=parseInt(o.wins,10), l=parseInt(o.losses,10), d=parseInt(o.draws,10);
          if(isFinite(w)&&isFinite(l)) f.pro = {w, l, d:isFinite(d)?d:0};
        }
      }
    }catch(e){ console.warn("roster (photos) unavailable:", e); }
    try{
      if(rkr && rkr.ok){
        setRankings(await rkr.json());
        setRanksByKey(buildRanks(RANKINGS));
      }
    }catch(e){ console.warn("rankings unavailable:", e); }
    step("Ready");

    /* --- finalize --- */
    for(const f of DB.byKey.values()){
      f.fights.sort((x,y)=>{
        const dx=x.date?x.date.getTime():0, dy=y.date?y.date.getTime():0;
        return dy-dx;
      });
      f.name = String(f.name||"").replace(/\s+/g," ").trim();
      f.nickname = String(f.nickname||"").replace(/\s+/g," ").trim();
      /* baked-in UFC photos for fighters the rankings feed doesn't carry */
      if(!f.img) f.img = photoPath(f.name) || "";
      f.rec = tally(f.fights);
      if(!f.division){
        const last=f.fights.find(x=>x.weightclass);
        f.division = last ? last.weightclass.replace(/^UFC\s+/,"") : "";
      }
      if(!f.name) f.name = f.key;
      f.searchable = norm(f.name) + " " + norm(f.nickname);
      f.sortName = f.name.split(/\s+/).slice(-1)[0].toLowerCase();
    }
    reconcileProRecords();
    DB.list = [...DB.byKey.values()]
      .filter(f => f.fights.length > 0 || f.img)
      .sort((a,b)=> b.fights.length - a.fights.length);

    if(RANKINGS){
      const names=new Set();
      for(const cat of RANKINGS){
        if(cat.champion && cat.champion.championName) names.add(cat.champion.championName);
        for(const fi of (cat.fighters||[])) names.add(fi.name);
      }
      setRankedFighters([...names].map(resolveFighter));
    }
    buildDefaultPicks();

    $("#loader").style.opacity="0";
    setTimeout(()=>$("#loader").remove(), 400);

    return true;
  }catch(err){
    console.error(err);
    const L=$("#loader"); L.classList.add("err");
    $("#loadmsg").textContent="Couldn't load fighter data";
    $("#errbox").innerHTML =
      "The page pulls live data from <b>cdn.jsdelivr.net</b> and <b>api.octagon-api.com</b>.<br><br>" +
      "If you opened this file directly from disk, your browser may be blocking those requests. " +
      "Serving the folder over a local web server fixes it — e.g. run <code style='color:#ddd'>python3 -m http.server</code> " +
      "in this folder and open <code style='color:#ddd'>http://localhost:8000</code>.<br><br>" +
      "<span style='color:#666'>"+esc(err.message)+"</span>";
    return false;
  }
}
