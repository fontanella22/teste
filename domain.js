export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function addDays(date,days){const d=new Date(date+'T12:00:00');d.setDate(d.getDate()+Number(days));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function daysUntil(date,base=today()){return Math.round((new Date(date+'T12:00:00Z')-new Date(base+'T12:00:00Z'))/86400000);}
export function withdrawalEnd(treatment,kind){return addDays(treatment.end, treatment[kind]);}
export function restricted(treatment,kind,base=today()){return treatment.start<=base && base<=withdrawalEnd(treatment,kind);}
