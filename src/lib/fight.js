export function methodShort(m){
  const s=String(m||"").trim();
  if(/^KO/i.test(s)) return "KO/TKO";
  if(/Submission/i.test(s)) return "Submission";
  if(/Decision - Unanimous/i.test(s)) return "Decision (U)";
  if(/Decision - Split/i.test(s)) return "Decision (S)";
  if(/Decision - Majority/i.test(s)) return "Decision (M)";
  if(/Decision/i.test(s)) return "Decision";
  if(/DQ/i.test(s)) return "DQ";
  if(/Overturned/i.test(s)) return "Overturned";
  if(/Could Not Continue/i.test(s)) return "No Contest";
  if(/TKO/i.test(s)) return "KO/TKO";
  return s || "—";
}
export function methodClass(m){
  const s=methodShort(m);
  if(s==="KO/TKO") return "ko";
  if(s==="Submission") return "sub";
  if(/Decision/.test(s)) return "dec";
  return "other";
}
export function fightSeconds(round, time){
  const r=parseInt(round,10);
  const m=String(time||"").match(/(\d+):(\d+)/);
  if(!isFinite(r)) return null;
  const t = m ? (+m[1])*60 + (+m[2]) : 0;
  return (r-1)*300 + t;
}
export function fmtMMSS(s){
  if(s==null||!isFinite(s)) return "—";
  const m=Math.floor(s/60), ss=Math.round(s%60);
  return m+":"+String(ss).padStart(2,"0");
}

/* ============================ load ============================ */
