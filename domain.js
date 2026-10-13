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
 for(const e of events)if(e.type==='Inseminação'&&e.outcome==='Não confirmada'){
  // Não voltar a mostrar uma previsão de tentativa anterior do mesmo animal.
  if(!ended.has(e.animal)||e.date>ended.get(e.animal))ended.set(e.animal,e.date);
 }
 const latest = new Map();
 for(const e of events){
  if(!e.expected||e.outcome==='Não confirmada'||!['Inseminação','Cobertura','Diagnóstico de gestação'].includes(e.type))continue;
  if(ended.has(e.animal)&&e.date<=ended.get(e.animal))continue;
  if(!latest.has(e.animal)||e.date>=latest.get(e.animal).date)latest.set(e.animal,e);
 }
 return [...latest.values()].sort((a,b)=>a.expected.localeCompare(b.expected));
}
export function ageMonths(birth,base=today()){
 const b=new Date(birth+'T12:00:00Z'),d=new Date(base+'T12:00:00Z');
 if(!Number.isFinite(+b)||birth>base)return null;
 return (d.getUTCFullYear()-b.getUTCFullYear())*12+d.getUTCMonth()-b.getUTCMonth()-(d.getUTCDate()<b.getUTCDate()?1:0);
}
export function ageLabel(birth,base=today()){
 const total=ageMonths(birth,base);if(total===null)return 'Idade não informada';
 if(total===0){const days=daysUntil(base,birth);return days===0?'Recém-nascido':`${days} ${days===1?'dia':'dias'}`;}
 const years=Math.floor(total/12),months=total%12;
 return [years?`${years} ${years===1?'ano':'anos'}`:'',months?`${months} ${months===1?'mês':'meses'}`:''].filter(Boolean).join(' e ');
}
export function ageBand(birth,base=today()){
 const months=ageMonths(birth,base);return months===null?'unknown':months<12?'young':months<24?'yearling':'adult';
}
export function oldestFirst(animals){return [...animals].sort((a,b)=>(a.birth||'9999-12-31').localeCompare(b.birth||'9999-12-31')||a.tag.localeCompare(b.tag,'pt-BR',{numeric:true}));}
function monthDate(date,offset,anchorDay){
 const d=new Date(date+'T12:00:00Z');
 d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+offset);
 const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();
 d.setUTCDate(Math.min(anchorDay,last));return d.toISOString().slice(0,10);
}
export function nextVaccination(plan,completedOn){
 if(!Number.isInteger(plan.interval)||plan.interval<1||!['days','months'].includes(plan.unit))throw new Error('Intervalo inválido.');
 if(plan.unit==='days')return addDays(plan.next,plan.interval*Math.max(1,Math.floor(daysUntil(completedOn,plan.next)/plan.interval)+1));
 const due=new Date(plan.next+'T12:00:00Z'),done=new Date(completedOn+'T12:00:00Z');
 const difference=(done.getUTCFullYear()-due.getUTCFullYear())*12+done.getUTCMonth()-due.getUTCMonth();
 let offset=plan.interval*Math.max(1,Math.floor(difference/plan.interval));
 const day=Number(plan.start.slice(8,10));let next=monthDate(plan.next,offset,day);
 if(next<=completedOn)next=monthDate(plan.next,offset+plan.interval,day);
 return next;
}
export function completeVaccination(farm,planId,ids,date,responsible,makeId,base=today()){
 const plan=farm.vaccinePlans.find(p=>p.id===planId);
 if(!plan||!plan.active||!ids.length||date>base||date<plan.next||!responsible.trim())throw new Error('Confirme os animais, a data e o responsável. A aplicação deve estar entre a data programada e hoje.');
 const pending=plan.animalIds.filter(id=>!plan.doneIds.includes(id));
 if(new Set(ids).size!==ids.length||ids.some(id=>!pending.includes(id)))throw new Error('Animal já confirmado ou fora deste lote programado.');
 if(plan.previousCycleLastDate&&date<plan.previousCycleLastDate)throw new Error('A data não pode ser anterior à última aplicação do ciclo anterior.');
 const cycleDate=plan.next,lastDate=[plan.lastAppliedOn||date,date].sort().at(-1);
 const next=nextVaccination(plan,lastDate);
 for(const animal of ids)farm.vaccines.push({id:makeId(),animal,name:plan.name,purpose:plan.purpose,date,next,vet:responsible.trim(),schedule:plan.id,plannedFor:cycleDate});
 plan.doneIds.push(...ids);plan.lastAppliedOn=lastDate;
 const finished=plan.doneIds.length===plan.animalIds.length;
 if(finished){
  for(const v of farm.vaccines)if(v.schedule===plan.id&&v.plannedFor===cycleDate)v.next=next;
  plan.previousCycleLastDate=lastDate;plan.lastAppliedOn=null;plan.next=next;plan.doneIds=[];
 }
 return {finished,next:plan.next,pending:plan.animalIds.length-plan.doneIds.length};
}
