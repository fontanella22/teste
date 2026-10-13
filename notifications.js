import {client,permission} from './cloud.js';
const supported=()=>window.isSecureContext&&'Notification' in window&&'PushManager' in window&&'serviceWorker' in navigator;
const $=s=>document.querySelector(s);
let actor=null;
function bytes(value){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
function feedback(text){if($('#push-status'))$('#push-status').textContent=text;}
export function setPushUser(user){actor=user;const controls=$('#push-controls');controls.hidden=!user;if(!user){$('#push-secret-values').replaceChildren();$('#push-setup-dialog').close();return;}$('#push-setup').hidden=permission!=='admin';refreshPush().catch(()=>feedback('Conecte à internet para conferir este aparelho.'));}
async function refreshPush(){
 if(!supported()){feedback('Este navegador não oferece notificações. No iPhone, instale na Tela de Início (iOS 16.4 ou superior).');$('#enable-push').disabled=true;return;}
 const reg=await navigator.serviceWorker.ready,sub=await reg.pushManager.getSubscription();
 $('#enable-push').disabled=Notification.permission==='denied';
 if(Notification.permission==='denied'){feedback('Notificações bloqueadas. Libere a permissão nas configurações do navegador ou celular.');return;}
 if(sub){const {data,error}=await client.from('push_subscriptions').select('id').eq('endpoint',sub.endpoint).eq('active',true).maybeSingle();feedback(!error&&data?'Notificações registradas neste aparelho. O envio depende da agenda ativa no servidor.':'Toque em Ativar notificações para registrar este aparelho.');}
 else feedback('Ative neste aparelho para receber o resumo da equipe às 7h (Brasília).');
}
$('#enable-push').onclick=async()=>{
 if(!actor||!supported())return;const button=$('#enable-push');button.disabled=true;
 try{
  const allowed=await Notification.requestPermission();if(allowed!=='granted'){feedback('É necessário permitir as notificações neste aparelho.');return;}
  const {data,error}=await client.functions.invoke('daily-digest',{body:{action:'config'}});
  if(error||!data?.publicKey)throw new Error('CONFIG');
  const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(data.publicKey)});
  let result=await client.rpc('register_push',{p_subscription:sub.toJSON()});
  if(result.error?.message==='DEVICE_IN_USE'){
   await sub.unsubscribe();sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes(data.publicKey)});
   result=await client.rpc('register_push',{p_subscription:sub.toJSON()});
  }
  if(result.error)throw result.error;
  feedback('Aparelho registrado! Quando o envio estiver ativo, receberá o resumo diário da equipe.');
 }catch(error){feedback(error.message==='CONFIG'?'O envio ainda precisa ser configurado no Supabase. O administrador pode abrir Preparar envio.':'Não foi possível registrar. Confira a conexão, a instalação do PWA e as permissões do aparelho.');}
 finally{button.disabled=Notification.permission==='denied';}
};
export async function detachPush(){
 if(!supported())return;
 try{const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager.getSubscription();if(sub){await client.rpc('remove_push',{p_endpoint:sub.endpoint});await sub.unsubscribe();}}catch{/* Logout prossegue; mensagens push são genéricas, sem dados dos registros. */}
}
function b64(data){return btoa(String.fromCharCode(...new Uint8Array(data))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
$('#push-setup').onclick=()=>{
 if(permission!=='admin')return;
 const dialog=$('#push-setup-dialog');dialog.showModal();
};
$('#close-push-setup').onclick=()=>{$('#push-secret-values').replaceChildren();$('#push-setup-dialog').close();};
$('#generate-push-keys').onclick=async()=>{
 if(permission!=='admin')return;
 const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const raw=await crypto.subtle.exportKey('raw',pair.publicKey),jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
 const values={VAPID_PUBLIC_KEY:b64(raw),VAPID_PRIVATE_KEY:jwk.d,PUSH_JOB_SECRET:b64(crypto.getRandomValues(new Uint8Array(32)))};
 const container=$('#push-secret-values');container.replaceChildren();
 for(const [name,value] of Object.entries(values)){
  const label=document.createElement('label');label.textContent=name;
  const input=document.createElement('input');input.readOnly=true;input.type=name==='VAPID_PUBLIC_KEY'?'text':'password';input.value=value;
  const copy=document.createElement('button');copy.type='button';copy.textContent='Copiar';copy.onclick=async()=>{try{await navigator.clipboard.writeText(value);copy.textContent='Copiado';}catch{input.type='text';input.select();}};
  label.append(input,copy);container.append(label);
 }
};
navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type!=='OPEN_DAILY_SUMMARY')return;if(document.querySelector('dialog[open]')){feedback('Conclua ou cancele o formulário e abra Resumo diário.');return;}location.hash='resumo';window.dispatchEvent(new Event('refresh-daily-summary'));});
