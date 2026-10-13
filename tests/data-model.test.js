import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyFarm,validateFarm} from '../public/data-model.js';
test('importação mantém dados antigos e rejeita referências e brincos inválidos',()=>{
 const farm=emptyFarm();
 const a={id:'a',tag:'001',name:'Animal real',breed:'Nelore',sex:'Fêmea',birth:'2020-01-01',category:'Matriz',location:'Pasto'};
 farm.animals.push(a);assert.equal(validateFarm(farm),farm);
 farm.animals.push({...a,id:'b'});assert.throws(()=>validateFarm(farm),/duplicado/);
 farm.animals.pop();farm.vaccines.push({id:'v',animal:'missing',name:'Vacina',date:'2026-01-01',next:'2026-02-01',vet:'Responsável'});
 assert.throws(()=>validateFarm(farm),/animal inválido/);
});
