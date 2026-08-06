export const MONTHS={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
export function parseDate(s){
  if(!s) return null;
  const m=String(s).match(/([A-Za-z]{3})[a-z.]*\s+(\d{1,2}),\s*(\d{4})/);
  if(!m) return null;
  const mo=MONTHS[m[1].toLowerCase()];
  if(mo==null) return null;
  return new Date(Date.UTC(+m[3], mo, +m[2]));
}
export const MON3=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export function fmtDate(d){ return d ? MON3[d.getUTCMonth()]+" "+d.getUTCFullYear() : "—"; }
export function fmtDateFull(d){ return d ? MON3[d.getUTCMonth()]+" "+d.getUTCDate()+", "+d.getUTCFullYear() : "—"; }

export function heightToInches(s){
  if(!s) return null;
  const m=String(s).match(/(\d+)'\s*(\d+)?/);
  if(m) return (+m[1])*12 + (+(m[2]||0));
  const n=parseFloat(s);
  return (isFinite(n) && n>40 && n<95) ? n : null;
}
export function inchesToFt(n){ if(n==null) return null; return Math.floor(n/12)+"' "+Math.round(n%12)+'"'; }
export function numOf(s){ const n=parseFloat(String(s||"").replace(/[^0-9.]/g,"")); return isFinite(n)?n:null; }
export function ageFrom(dob){
  const d=parseDate(dob); if(!d) return null;
  const now=new Date(); let a=now.getUTCFullYear()-d.getUTCFullYear();
  const m=now.getUTCMonth()-d.getUTCMonth();
  if(m<0 || (m===0 && now.getUTCDate()<d.getUTCDate())) a--;
  return (a>0 && a<80) ? a : null;
}

/* ============================ data model ============================ */
