import { boutWeight } from "../cardbuilder/state.js";

export const PX = {
  W:1500, SS:2, PAD:60,          // SS = supersample factor, downscaled on export
  bg:"#08090b", line:"#23262e", text:"#f2f3f5", muted:"#8d94a3", dim:"#5f6675",
  gold:"#d4af37", goldSoft:"#f4e3ad", red:"#d20a0a", redHot:"#ff6a6a",
  blue:"#1567d3", blueHot:"#6aaaff"
};
export const F_OSW = "Oswald, 'Barlow Condensed', Impact, sans-serif";
export const F_BAR = "'Barlow Condensed', Oswald, sans-serif";

/* photo sizes per tier. `per` is the canonical bouts-per-row: short rows are
   centred rather than stretched, so every photo in a tier is the same size. */
export const PTIER = {
  hd:{per:2, cellGap:34, inner:20, pw:300, ph:376, name:44, sub:18, tag:14, pad:34},
  md:{per:3, cellGap:26, inner:14, pw:205, ph:256, name:30, sub:14, tag:12, pad:28},
  sm:{per:4, cellGap:22, inner:11, pw:152, ph:190, name:23, sub:12, tag:10, pad:24}
};
export const PBAND_H = 64, PHEAD_PAD = 34, PFOOT_H = 100;

/* ---- name helpers: posters use surnames ---- */
export const NM_SUFFIX  =/^(jr|jr\.|sr|sr\.|ii|iii|iv)$/i;
export const NM_PARTICLE=/^(da|das|de|del|della|do|dos|van|von|la|le|di|st|st\.|ten|ter)$/i;
export function surnameOf(name){
  const p=String(name||"").trim().split(/\s+/).filter(Boolean);
  if(!p.length) return "";
  let i=p.length-1;
  while(i>0 && NM_SUFFIX.test(p[i])) i--;
  let s=i;
  if(s>0 && NM_PARTICLE.test(p[s-1])) s--;
  return p.slice(s,i+1).join(" ").toUpperCase();
}
/* "WORLD LIGHTWEIGHT CHAMPIONSHIP" / "MIDDLEWEIGHT BOUT", as a real card reads.
   Returns longest-to-shortest so a narrow cell can step down instead of
   bleeding into its neighbour. */
export function posterSubOptions(b){
  const wc=(boutWeight(b)||"").toUpperCase();
  if(b.title) return wc ? ["WORLD "+wc+" CHAMPIONSHIP", wc+" TITLE", "TITLE FIGHT"] : ["TITLE FIGHT"];
  if(/CATCHWEIGHT/.test(wc)) return [wc+" BOUT","CATCHWEIGHT BOUT","CATCHWEIGHT"];
  return wc ? [wc+" BOUT", wc] : [];
}

/* ---- canvas primitives ---- */
