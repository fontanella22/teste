// Cache exclusivo de arquivos públicos. Nunca interceptar ou armazenar a API Supabase.
const CACHE_NAME = 'tres-irmaos-shell-' + encodeURIComponent(new URL('./', self.location.href).pathname) + '-29b033fdae05dbfc';
const CACHE_PREFIX = 'tres-irmaos-shell-';
const FILES = ["index.html","style.css","app.js","auth.js","cloud.js","config.js","data-model.js","domain.js","icons.js","supabase.js","pwa.js","notifications.js","daily-summary.js","manifest.webmanifest","offline.html","app-icon-192.png","app-icon-512.png","app-icon-maskable-512.png","apple-touch-icon.png"];
const BASE = new URL('./', self.location.href);
const urls = FILES.map(file => new URL(file, BASE).href);
const staticURLs = new Set(urls);

self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urls)));
 // Atualizações aguardam autorização ou fechamento das janelas existentes.
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const keys = await caches.keys();
  // Limitar limpeza ao escopo deste aplicativo; não tocar em caches de outros sites.
  const scopePrefix = CACHE_PREFIX + encodeURIComponent(BASE.pathname) + '-';
  await Promise.all(keys.filter(key => key.startsWith(scopePrefix) && key !== CACHE_NAME).map(key => caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('message', event => {
 if(event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('push', event => {
 let data;try{data=event.data?.json();}catch{return;}
 if(data?.type!=='daily-summary'||!/^\d{4}-\d{2}-\d{2}$/.test(data.day))return;
 event.waitUntil(self.registration.showNotification('Resumo do Sítio Três Irmãos',{
  body:'Seu resumo diário está disponível. Entre no aplicativo para conferir os lembretes.',
  icon:new URL('app-icon-192.png',BASE).href,badge:new URL('app-icon-192.png',BASE).href,
  tag:'sitio-resumo-'+data.day,renotify:false,data:{type:'daily-summary'}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();if(event.notification.data?.type!=='daily-summary')return;
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const existing=windows.find(client=>{const url=new URL(client.url);return url.origin===BASE.origin&&url.pathname.startsWith(BASE.pathname);});
  if(existing){await existing.focus();existing.postMessage({type:'OPEN_DAILY_SUMMARY'});}
  else await self.clients.openWindow(new URL('index.html#resumo',BASE).href);
 })());
});
self.addEventListener('fetch', event => {
 const request = event.request;
 const url = new URL(request.url);
 if(request.method !== 'GET' || url.origin !== BASE.origin) return;
 // Links de convite/recuperação e qualquer URL com parâmetros passam somente pela rede.
 if(url.search) return;
 const isHome = request.mode === 'navigate' && (url.pathname === BASE.pathname || url.pathname === new URL('index.html', BASE).pathname);
 if(!isHome && !staticURLs.has(url.href)) return;
 const key = isHome ? new URL('index.html', BASE).href : url.href;
 event.respondWith((async () => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(key);
  if(cached) return cached;
  try {return await fetch(request);} catch(error) {
   if(request.mode === 'navigate') return (await cache.match(new URL('offline.html', BASE).href)) || Response.error();
   return Response.error();
  }
 })());
});
