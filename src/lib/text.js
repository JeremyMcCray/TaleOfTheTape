export function norm(s){
  return String(s||"")
    .normalize("NFD").replace(/[̀-ͯ]/g,"")
    .toLowerCase().replace(/[^a-z0-9]/g,"");
}
export function titleCase(s){ return String(s||"").toLowerCase().replace(/\b[a-z]/g,c=>c.toUpperCase()); }
