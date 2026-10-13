import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const assets = {'/':['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/style.css':['style.css','text/css'], '/domain.js':['domain.js','text/javascript'], '/auth.js':['auth.js','text/javascript'], '/cloud.js':['cloud.js','text/javascript'], '/config.js':['config.js','text/javascript'], '/data-model.js':['data-model.js','text/javascript'], '/supabase.js':['supabase.js','text/javascript']};
const server = http.createServer(async (req,res)=>{
  const asset=assets[new URL(req.url,'http://localhost').pathname];
  if(!asset){res.writeHead(404);res.end('Não encontrado');return;}
  try {const body=await readFile(fileURLToPath(new URL(`./public/${asset[0]}`,import.meta.url)));res.writeHead(200,{'Content-Type':asset[1]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(body);}catch {res.writeHead(500);res.end('Falha ao carregar arquivo');}
});
server.listen(Number(process.env.PORT||3000),'0.0.0.0',()=>console.log('Sítio Três Irmãos: porta '+(process.env.PORT||3000)));
