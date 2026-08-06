import { DB, RANKED_FIGHTERS } from "../data/store.js";
import { norm } from "../lib/text.js";

export const DIV_LADDER = ["strawweight","flyweight","bantamweight","featherweight","lightweight","welterweight","middleweight","lightheavyweight","heavyweight"];

export function divInfo(f){
  if(!f) return {tier:null, fem:false};
  if(f._div !== undefined) return f._div;
  let raw = String(f.division||"");
  if(!raw){
    const last = (f.fights||[]).find(x=>x.weightclass);
    raw = last ? last.weightclass : "";
  }
  let fem = /women/i.test(raw);
  if(!fem && (f.fights||[]).some(x=>/women/i.test(x.weightclass||""))) fem = true;
  let d = norm(raw).replace(/^ufc/,"").replace(/^womens?/,"").replace(/division$/,"");
  let tier = DIV_LADDER.indexOf(d);
  if(tier < 0) tier = null;
  // fall back to listed walk-around weight when the division string is unusable
  if(tier === null && f.weight){
    const w = f.weight;
    const caps = fem ? [115,125,135,145,155,170,185,205,265] : [125,135,145,155,170,185,205,265];
    const off  = fem ? 0 : 1;
    for(let i=0;i<caps.length;i++){ if(w <= caps[i]+6){ tier = i+off; break; } }
    if(tier === null) tier = DIV_LADDER.length-1;
  }
  return (f._div = {tier, fem});
}
const hasPhoto = f => !!(f && f.img);

export function randomMatchup(){
  const rnd = arr => arr[Math.floor(Math.random()*arr.length)];
  // favor currently-ranked fighters most of the time for more realistic dream matchups
  const useRanked = RANKED_FIGHTERS.length>4 && Math.random()<0.65;
  let pool = (useRanked ? RANKED_FIGHTERS : DB.list.filter(f=>f.fights.length>=5)).filter(Boolean);
  if(pool.length < 2) pool = DB.list.filter(Boolean);
  if(pool.length < 2) return [null,null];

  // side A: strongly prefer someone with a picture
  const shot = pool.filter(hasPhoto);
  const a = rnd(shot.length >= 4 ? shot : pool);
  const A = divInfo(a);

  // rank every other fighter in the pool as an opponent for A
  const exact = [], near = [], sameSex = [];
  for(const f of pool){
    if(!f || f === a || f.key === a.key) continue;
    const F = divInfo(f);
    if(F.fem !== A.fem) continue;              // never cross genders
    sameSex.push(f);
    if(A.tier === null || F.tier === null) continue;
    const gap = Math.abs(F.tier - A.tier);
    if(gap === 0) exact.push(f);
    else if(gap === 1) near.push(f);
  }
  // prefer a true divisional matchup, but allow the odd one-class-up superfight
  let tiers;
  if(exact.length && (!near.length || Math.random() < 0.75)) tiers = [exact, near, sameSex, pool];
  else if(near.length) tiers = [near, exact, sameSex, pool];
  else tiers = [sameSex, pool];

  for(const list of tiers){
    if(!list.length) continue;
    const withPic = list.filter(hasPhoto);
    const b = (withPic.length ? rnd(withPic) : rnd(list));
    if(b && b !== a && b.key !== a.key) return [a, b];
  }
  return [a, rnd(pool.filter(f=>f!==a)) || null];
}
