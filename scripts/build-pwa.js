import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['index.html','style.css','app.js','auth.js','cloud.js','config.js','data-model.js','domain.js','icons.js','supabase.js','pwa.js','manifest.webmanifest','offline.html','app-icon-192.png','app-icon-512.png','app-icon-maskable-512.png','apple-touch-icon.png'];
const template=await readFile(new URL('./service-worker.template.js',import.meta.url),'utf8');
const hash=createHash('sha256').update(template);
for(const file of files)hash.update(file).update(await readFile(new URL('../public/'+file,import.meta.url)));
const revision=hash.digest('hex').slice(0,16);
// O nome incorpora o escopo em execução para compatibilidade com /teste/ e /teste/public/.
const name="'tres-irmaos-shell-' + encodeURIComponent(new URL('./', self.location.href).pathname) + '-"+revision+"'";
const output=template.replace("'__CACHE_NAME__'",name).replace('__FILES__',JSON.stringify(files));
await writeFile(new URL('../public/sw.js',import.meta.url),output);
console.log('PWA: cache de arquivos públicos gerado, versão '+revision);
