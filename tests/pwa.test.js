import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('manifesto e ícones funcionam nos dois caminhos de publicação',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
 assert.equal(manifest.display,'standalone');
 for(const root of ['https://fontanella22.github.io/teste/','https://fontanella22.github.io/teste/public/']){
  assert.equal(new URL(manifest.start_url,root).href,root+'index.html#inicio');
  assert.equal(new URL(manifest.scope,root).href,root);
 }
 for(const icon of manifest.icons){
  const png=await readFile(new URL('../public/'+icon.src,import.meta.url));
  assert.equal(png.readUInt32BE(16),Number(icon.sizes.split('x')[0]));
  assert.equal(png.readUInt32BE(20),Number(icon.sizes.split('x')[1]));
 }
});
test('service worker limita o cache a arquivos públicos e preserva caches de outros apps',async()=>{
 const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
 for(const root of ['https://fontanella22.github.io/teste/','https://fontanella22.github.io/teste/public/']){
  const handlers={},deleted=[],cached=[],calls=[];let installed=[];
  const otherCache='tres-irmaos-shell-%2Foutra-propriedade%2F-old';
  const oldCache='tres-irmaos-shell-'+encodeURIComponent(new URL(root).pathname)+'-old';
  const cache={addAll:async urls=>{installed=urls;},match:async url=>{cached.push(url);return {public:true};}};
  const notifications=[];
  const context={URL,Set,Response,fetch:async req=>{calls.push(req);return {network:true};},caches:{open:async()=>cache,keys:async()=>[oldCache,otherCache,'unrelated-cache'],delete:async key=>{deleted.push(key);}},self:{location:{href:root+'sw.js'},registration:{showNotification:async(title,options)=>notifications.push({title,options})},clients:{claim:async()=>{}},skipWaiting:()=>{},addEventListener:(name,handler)=>{handlers[name]=handler;}}};
  vm.runInNewContext(source,context);
  let waiting;handlers.install({waitUntil:p=>waiting=p});await waiting;
  assert(installed.includes(root+'index.html'));assert(installed.every(url=>url.startsWith(root)));
  assert(!installed.some(url=>url.includes('supabase.co')));
  handlers.activate({waitUntil:p=>waiting=p});await waiting;
  assert.deepEqual(deleted,[oldCache]);
  const request=(url,method='GET',mode='cors')=>{let response;handlers.fetch({request:{url,method,mode},respondWith:p=>response=p});return response;};
  for(const url of ['https://ffzvurispepejyhcmztk.supabase.co/rest/v1/farm_state',root+'index.html?code=secret',root+'private-data.json'])assert.equal(request(url),undefined);
  assert.equal(request(root+'app.js','POST'),undefined);
  assert.equal((await request(root+'index.html','GET','navigate')).public,true);
  assert.equal((await request(root+'app.js')).public,true);
  assert.deepEqual(cached,[root+'index.html',root+'app.js']);
  handlers.push({data:{json:()=>({type:'daily-summary',day:'2026-10-13',body:'Flor está doente',url:'https://evil.example'})},waitUntil:p=>waiting=p});await waiting;
  assert.equal(notifications.length,1);assert(!JSON.stringify(notifications).includes('Flor'));assert(!JSON.stringify(notifications).includes('evil.example'));
  assert.equal(notifications[0].options.tag,'sitio-resumo-2026-10-13');assert.equal(notifications[0].options.renotify,false);
 }
});
