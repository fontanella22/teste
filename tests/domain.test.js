import test from 'node:test';
import assert from 'node:assert/strict';
import {addDays,daysUntil,restricted,withdrawalEnd} from '../public/domain.js';
test('calendário atravessa meses e ano bissexto',()=>{
 assert.equal(addDays('2024-02-28',2),'2024-03-01');
 assert.equal(addDays('2025-12-31',1),'2026-01-01');
 assert.equal(daysUntil('2026-10-09','2026-10-12'),-3);
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
