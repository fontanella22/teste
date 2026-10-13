export function emptyFarm(){return {property:{owner:'',contact:'',name:'Sítio Três Irmãos',city:'',area:0,notes:''},animals:[],vaccines:[],treatments:[],production:[],reproduction:[]};}
export function validateFarm(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||!data.property||typeof data.property!=='object')throw new Error('Arquivo de dados inválido.');
 for(const name of ['owner','contact','name','city','notes'])if(typeof data.property[name]!=='string')throw new Error('Dados da propriedade inválidos.');
 if(!Number.isFinite(data.property.area)||data.property.area<0)throw new Error('Área inválida.');
 for(const name of ['animals','vaccines','treatments','production','reproduction'])if(!Array.isArray(data[name]))throw new Error('Arquivo incompleto.');
 if(data.property.paddocks!==undefined&&(!Array.isArray(data.property.paddocks)||data.property.paddocks.some(p=>typeof p!=='string'||!p.trim())))throw new Error('Lista de piquetes inválida.');
 const ids=new Set(),tags=new Set();
 for(const a of data.animals){
  if(!a||!['id','tag','name','breed','sex','birth','category','location'].every(k=>typeof a[k]==='string'&&a[k].trim()))throw new Error('Cadastro de animal incompleto.');
  if(ids.has(a.id)||tags.has(a.tag.trim().toLowerCase()))throw new Error('Animal ou brinco duplicado.');
  ids.add(a.id);tags.add(a.tag.trim().toLowerCase());
  for(const k of ['paddock','lot'])if(a[k]!==undefined&&typeof a[k]!=='string')throw new Error('Piquete ou lote inválido.');
 }
 for(const collection of ['vaccines','treatments','production','reproduction']){
  const recordIds=new Set();
  for(const r of data[collection]){
   if(!r||typeof r.id!=='string'||!ids.has(r.animal)||recordIds.has(r.id))throw new Error('Registro com animal inválido ou ID duplicado.');
   recordIds.add(r.id);
   const textFields={vaccines:['name','date','next','vet'],treatments:['type','medicine','start','end','vet'],production:['date'],reproduction:['type','date']}[collection];
   if(!textFields.every(k=>typeof r[k]==='string'&&r[k].trim()))throw new Error('Registro incompleto.');
   if(collection==='treatments'&&(!Number.isInteger(r.meat)||r.meat<0||r.end<r.start))throw new Error('Tratamento inválido.');
   if(collection==='vaccines'&&r.next<r.date)throw new Error('Calendário de vacina inválido.');
   if(collection==='production'&&(!Number.isFinite(r.liters)||r.liters<=0))throw new Error('Produção inválida.');
   if(collection==='reproduction'&&r.outcome!==undefined&&!['Aguardando resultado','Confirmada','Não confirmada'].includes(r.outcome))throw new Error('Resultado de inseminação inválido.');
  }
 }
 if(data.vaccinePlans!==undefined){
  if(!Array.isArray(data.vaccinePlans))throw new Error('Agenda inválida.');
  const planIds=new Set();
  for(const p of data.vaccinePlans){
   if(!p||!['id','name','purpose','lot','start','next'].every(k=>typeof p[k]==='string'&&p[k].trim())||planIds.has(p.id))throw new Error('Programação incompleta ou duplicada.');
   planIds.add(p.id);
   if(!Number.isInteger(p.interval)||p.interval<1||p.interval>3650||!['days','months'].includes(p.unit)||typeof p.active!=='boolean')throw new Error('Recorrência inválida.');
   if(!Array.isArray(p.animalIds)||!p.animalIds.length||p.animalIds.some(id=>!ids.has(id))||new Set(p.animalIds).size!==p.animalIds.length)throw new Error('Animais programados inválidos.');
   if(!Array.isArray(p.doneIds)||p.doneIds.some(id=>!p.animalIds.includes(id))||new Set(p.doneIds).size!==p.doneIds.length)throw new Error('Confirmações inválidas.');
  }
 }
 return data;
}
