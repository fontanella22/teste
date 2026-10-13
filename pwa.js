const installButton=document.querySelector('#install-app');
const helpButton=document.querySelector('#install-help');
const updateButton=document.querySelector('#update-app');
const status=document.querySelector('#connection-status');
const dialog=document.querySelector('#pwa-dialog');
const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
let deferredInstall=null,registration=null,reloadForUpdate=false;
function refreshUI(){
 const installed=isStandalone();installButton.hidden=installed||!deferredInstall;helpButton.hidden=installed;
 status.hidden=navigator.onLine;status.textContent='Sem conexão. Conecte para acessar e salvar os registros.';
 document.querySelector('#pwa-controls').hidden=installed&&navigator.onLine&&updateButton.hidden;
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstall=event;refreshUI();});
window.addEventListener('appinstalled',()=>{deferredInstall=null;installButton.hidden=true;helpButton.hidden=true;refreshUI();});
installButton.onclick=async()=>{if(!deferredInstall)return;const prompt=deferredInstall;deferredInstall=null;await prompt.prompt();await prompt.userChoice;refreshUI();};
helpButton.onclick=()=>dialog.showModal();document.querySelector('#close-pwa').onclick=()=>dialog.close();
function showUpdate(){if(registration?.waiting){updateButton.hidden=false;refreshUI();}}
updateButton.onclick=()=>{
 if(document.querySelector('dialog[open]')||document.body.dataset.saving==='true'){
  document.querySelector('#pwa-notice').textContent='Conclua ou cancele o formulário antes de atualizar.';return;
 }
 if(registration?.waiting){reloadForUpdate=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
};
window.addEventListener('online',refreshUI);window.addEventListener('offline',refreshUI);
matchMedia('(display-mode: standalone)').addEventListener('change',refreshUI);
if('serviceWorker' in navigator&&window.isSecureContext){
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloadForUpdate)location.reload();});
 navigator.serviceWorker.register(new URL('./sw.js',import.meta.url),{scope:'./',updateViaCache:'none'}).then(reg=>{
  registration=reg;showUpdate();reg.addEventListener('updatefound',()=>{
   const worker=reg.installing;worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate();});
  });
 }).catch(()=>{document.querySelector('#pwa-notice').textContent='A instalação ainda não está disponível. Conecte e recarregue a página.';});
 window.addEventListener('focus',()=>{if(navigator.onLine)registration?.update().catch(()=>{});});
}
refreshUI();
