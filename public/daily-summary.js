import {daysUntil,pendingBirths,withdrawalEnd} from './domain.js';
export function digestDate(now=new Date()){return new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function dailySummary(farm,day=digestDate()){
 const items=[],names=new Map(farm.animals.map(a=>[a.id,`${a.name} · ${a.tag}`]));
 const add=(id,kind,title,date)=>{if(!date)return;const distance=daysUntil(date,day);if(distance<=7)items.push({id,kind,title,date,distance});};
 // Histórico antigo não gera novos lembretes quando há aplicação individual mais recente.
 const vaccines=new Map();
 for(const v of farm.vaccines){if(v.schedule)continue;const key=v.animal+'\0'+v.name;const previous=vaccines.get(key);if(!previous||v.date>=previous.date)vaccines.set(key,v);}
 for(const v of vaccines.values())add('v-'+v.id,'Vacina',`${v.name} · ${names.get(v.animal)||'Animal'}`,v.next);
 for(const p of farm.vaccinePlans||[])if(p.active)add('p-'+p.id,'Vacina por lote',`${p.name} · ${p.lot} · ${p.animalIds.length-p.doneIds.length} pendentes`,p.next);
 for(const r of pendingBirths(farm.reproduction))add('r-'+r.id,'Parto previsto',`${names.get(r.animal)||'Matriz'} · previsão, a confirmar`,r.expected);
 for(const t of farm.treatments){
  if(t.start>day)add('t-'+t.id,'Tratamento previsto',`${t.medicine} · ${names.get(t.animal)||'Animal'}`,t.start);
  const end=withdrawalEnd(t,'meat');if(t.start<=day&&end>=day)add('c-'+t.id,'Fim da carência para abate',`${names.get(t.animal)||'Animal'} · restrição até esta data inclusive`,end);
 }
 return items.sort((a,b)=>a.date.localeCompare(b.date)||a.title.localeCompare(b.title,'pt-BR'));
}
