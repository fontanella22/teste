import test from 'node:test';
import assert from 'node:assert/strict';
import {ageLabel,ageBand,oldestFirst,nextVaccination,completeVaccination,pendingBirths} from '../public/domain.js';
import {emptyFarm,validateFarm} from '../public/data-model.js';
test('idades e faixas mudam na data do aniversário, ordenação não altera registros',()=>{
 assert.equal(ageLabel('2025-10-20','2026-10-19'),'11 meses');
 assert.equal(ageLabel('2025-10-20','2026-10-20'),'1 ano');
 assert.equal(ageBand('2024-10-20','2026-10-19'),'yearling');
 assert.equal(ageBand('2024-10-20','2026-10-20'),'adult');
 assert.equal(ageLabel('2026-10-19','2026-10-20'),'1 dia');
 const animals=[{birth:'2026-01-01',tag:'2'},{birth:'2020-01-01',tag:'1'}];
 assert.equal(oldestFirst(animals)[0].tag,'1');assert.equal(animals[0].tag,'2');
});
test('recorrência mensal mantém o dia e pula atrasos sem inventar aplicações',()=>{
 assert.equal(nextVaccination({start:'2026-01-20',next:'2026-01-20',interval:3,unit:'months'},'2026-01-22'),'2026-04-20');
 assert.equal(nextVaccination({start:'2026-01-20',next:'2026-01-20',interval:3,unit:'months'},'2026-08-01'),'2026-10-20');
 assert.equal(nextVaccination({start:'2026-01-31',next:'2026-01-31',interval:1,unit:'months'},'2026-01-31'),'2026-02-28');
 assert.equal(nextVaccination({start:'2026-01-31',next:'2026-02-28',interval:1,unit:'months'},'2026-02-28'),'2026-03-31');
 assert.equal(nextVaccination({start:'2026-01-01',next:'2026-01-01',interval:10,unit:'days'},'2026-01-22'),'2026-01-31');
});
test('confirmação parcial mantém pendências e completa histórico por animal',()=>{
 const farm={...emptyFarm(),vaccinePlans:[]};
 for(const id of ['a','b'])farm.animals.push({id,tag:id,name:id,breed:'Nelore',sex:'Fêmea',birth:'2020-01-01',category:'Matriz',location:'Pasto',lot:'A'});
 farm.vaccinePlans.push({id:'p',name:'Vacina prescrita',purpose:'Outra',lot:'A',start:'2026-01-20',next:'2026-01-20',interval:3,unit:'months',animalIds:['a','b'],doneIds:[],active:true});
 let i=0;const makeId=()=>String(++i);
 const first=completeVaccination(farm,'p',['a'],'2026-01-20','Pessoa',makeId,'2026-01-22');
 assert.equal(first.finished,false);assert.equal(farm.vaccinePlans[0].next,'2026-01-20');assert.equal(farm.vaccines.length,1);
 assert.throws(()=>completeVaccination(farm,'p',['a'],'2026-01-21','Pessoa',makeId,'2026-01-22'),/já confirmado/);
 assert.throws(()=>completeVaccination(farm,'p',['b'],'2026-01-19','Pessoa',makeId,'2026-01-22'),/programada/);
 const last=completeVaccination(farm,'p',['b'],'2026-01-22','Pessoa',makeId,'2026-01-22');
 assert.equal(last.finished,true);assert.equal(last.next,'2026-04-20');assert.equal(farm.vaccines.length,2);
 assert.deepEqual(farm.vaccinePlans[0].doneIds,[]);assert.equal(validateFarm(farm),farm);
});
test('resultado negativo encerra previsão anterior, novo ciclo continua possível',()=>{
 const events=[{animal:'a',type:'Inseminação',date:'2026-01-01',expected:'2026-10-01'},
 {animal:'a',type:'Inseminação',date:'2026-02-01',expected:'2026-11-01',outcome:'Não confirmada'}];
 assert.equal(pendingBirths(events).length,0);
 events.push({animal:'a',type:'Inseminação',date:'2026-03-01',expected:'2026-12-01'});
 assert.equal(pendingBirths(events)[0].date,'2026-03-01');
});
