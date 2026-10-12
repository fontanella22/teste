export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addDays(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+Number(days));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function daysUntil(date,base=today()){return Math.round((new Date(date+'T12:00:00Z')-new Date(base+'T12:00:00Z'))/86400000);}
export function withdrawalEnd(treatment,kind){return addDays(treatment.end, treatment[kind]);}
export function restricted(treatment,kind,base=today()){return treatment.start<=base && base<=withdrawalEnd(treatment,kind);}
export function pendingBirths(events){
 const ended = new Map();
 for(const e of events)if(['Parto','Perda gestacional'].includes(e.type)){
  if(!ended.has(e.animal)||e.date>ended.get(e.animal))ended.set(e.animal,e.date);
 }
 const latest = new Map();
 for(const e of events){
  if(!e.expected||!['Inseminação','Cobertura','Diagnóstico de gestação'].includes(e.type))continue;
  if(ended.has(e.animal)&&e.date<=ended.get(e.animal))continue;
  if(!latest.has(e.animal)||e.date>=latest.get(e.animal).date)latest.set(e.animal,e);
 }
 return [...latest.values()].sort((a,b)=>a.expected.localeCompare(b.expected));
}
