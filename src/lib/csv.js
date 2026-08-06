/* minimal RFC4180 CSV parser */
export function parseCSV(text){
  const rows=[]; let row=[], field="", q=false, i=0;
  if(text.charCodeAt(0)===0xFEFF) i=1;
  for(; i<text.length; i++){
    const c=text[i];
    if(q){
      if(c==='"'){ if(text[i+1]==='"'){field+='"';i++;} else q=false; }
      else field+=c;
    } else {
      if(c==='"') q=true;
      else if(c===','){ row.push(field); field=""; }
      else if(c==='\n'){ row.push(field); rows.push(row); row=[]; field=""; }
      else if(c==='\r'){ /* skip */ }
      else field+=c;
    }
  }
  if(field.length||row.length){ row.push(field); rows.push(row); }
  const head=rows.shift().map(h=>h.trim());
  return rows.filter(r=>r.length>1).map(r=>{
    const o={}; head.forEach((h,j)=> o[h]=(r[j]==null?"":r[j]).trim()); return o;
  });
}
