import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,daysUntil,restricted,withdrawalEnd,pendingBirths} from '../public/domain.js';
test('calendário atravessa meses e ano bissexto',()=>{
 assert.equal(addDays('2024-02-28',2),'2024-03-01');
 assert.equal(addDays('2025-12-31',1),'2026-01-01');
 assert.equal(daysUntil('2026-10-09','2026-10-12'),-3);
});
test('parto encerra previsão antiga e preserva novo ciclo e outras matrizes',()=>{
 const events=[
  {animal:'a',type:'Inseminação',date:'2025-01-01',expected:'2025-10-10'},
  {animal:'a',type:'Parto',date:'2025-10-11'},
  {animal:'b',type:'Cobertura',date:'2025-06-01',expected:'2026-03-10'},
  {animal:'a',type:'Inseminação',date:'2026-01-01',expected:'2026-10-10'},
  {animal:'a',type:'Diagnóstico de gestação',date:'2026-02-01',expected:'2026-10-12'}
 ];
 assert.deepEqual(pendingBirths(events).map(e=>e.expected),['2026-03-10','2026-10-12']);
 events.push({animal:'a',type:'Perda gestacional',date:'2026-02-05'});
 assert.deepEqual(pendingBirths(events).map(e=>e.animal),['b']);
});
test('carência começa na primeira aplicação e libera após o último dia',()=>{
 const t={start:'2026-10-01',end:'2026-10-04',milk:3,meat:10};
 assert.equal(withdrawalEnd(t,'milk'),'2026-10-07');
 assert.equal(restricted(t,'milk','2026-09-30'),false);
 assert.equal(restricted(t,'milk','2026-10-02'),true);
 assert.equal(restricted(t,'milk','2026-10-07'),true);
 assert.equal(restricted(t,'milk','2026-10-08'),false);
 assert.equal(restricted(t,'meat','2026-10-08'),true);
});
