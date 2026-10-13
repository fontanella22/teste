import {cattleIcon} from './icons.js';
import {client,loadFarm,clearAccess,message,passwordLink} from './cloud.js';
const screen=document.querySelector('#auth-screen');
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let hooks,epoch=0,passwordMode=passwordLink,activeUserId=null;
function lock(){epoch++;clearAccess();hooks?.clear();document.body.classList.add('auth-locked');document.querySelector('#modal')?.close();}
function shell(body){screen.innerHTML=`<div class="auth-card"><div class="auth-brand">${cattleIcon()}</div><p class="eyebrow">SÍTIO TRÊS IRMÃOS</p>${body}<p class="auth-foot">Acesso exclusivo para a equipe autorizada.<br>Em aparelhos compartilhados, saia ao terminar.</p></div>`;}
function feedback(text){const el=screen.querySelector('[role=status]');if(el)el.textContent=text;}
function busy(form,value){form.querySelectorAll('button,input').forEach(el=>el.disabled=value);}
function login(note=''){
 shell(`<h1>Entrar no sítio</h1><p>Use sua conta para acessar o rebanho.</p><form id="login-form"><label>E-mail<input name="email" type="email" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><p role="status">${esc(note)}</p><button type="submit">Entrar</button><button type="button" class="secondary" id="reset-password">Esqueci minha senha</button></form>`);
 const form=screen.querySelector('form');form.onsubmit=async e=>{e.preventDefault();const values=new FormData(form);busy(form,true);feedback('Conferindo acesso…');try{const {data,error}=await client.auth.signInWithPassword({email:values.get('email').trim(),password:values.get('password')});if(error)throw error;await enter(data.session);}catch(error){feedback(message(error));}finally{if(form.isConnected)busy(form,false);}};
 screen.querySelector('#reset-password').onclick=async()=>{const input=form.elements.email;if(!input.reportValidity())return;busy(form,true);try{const {error}=await client.auth.resetPasswordForEmail(input.value.trim(),{redirectTo:new URL('./index.html',location.href).href.split('#')[0]});if(error)throw error;feedback('Se houver uma conta com esse e-mail, você receberá instruções para recuperar a senha.');}catch(error){feedback(message(error));}finally{busy(form,false);}};
}
function passwordForm(){
 passwordMode=true;lock();shell('<h1>Definir sua senha</h1><p>Escolha uma senha exclusiva para sua conta.</p><form id="new-password"><label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="12" required></label><label>Confirme a senha<input name="confirm" type="password" autocomplete="new-password" minlength="12" required></label><p role="status">Use pelo menos 12 caracteres.</p><button type="submit">Salvar senha</button><button type="button" class="secondary" id="cancel-password">Sair</button></form>');
 const form=screen.querySelector('form');form.onsubmit=async e=>{e.preventDefault();if(form.elements.password.value!==form.elements.confirm.value){feedback('As senhas não coincidem.');return;}busy(form,true);try{const {error}=await client.auth.updateUser({password:form.elements.password.value});if(error)throw error;passwordMode=false;history.replaceState(null,'',location.pathname);const {data}=await client.auth.getSession();await enter(data.session);}catch(error){feedback(message(error));busy(form,false);}};
 screen.querySelector('#cancel-password').onclick=logout;
}
async function enter(session){
 activeUserId=session?.user?.id||null;
 if(passwordMode&&session){passwordForm();return;}
 lock();const request=epoch;
 if(!session){login();return;}
 shell('<h1>Conferindo acesso…</h1><p role="status">Carregando os registros protegidos.</p>');
 try{const result=await loadFarm();if(request!==epoch)return;await hooks.ready(result);if(request!==epoch)return;document.body.classList.remove('auth-locked');screen.innerHTML='';}
 catch(error){if(request!==epoch)return;clearAccess();hooks.clear();shell(`<h1>Acesso indisponível</h1><p role="status">${esc(message(error))}</p><p>Entrar com uma conta não libera o acesso automaticamente. O administrador precisa autorizar sua conta.</p><button id="retry-access">Tentar novamente</button><button class="secondary" id="leave-access">Sair</button>`);screen.querySelector('#retry-access').onclick=async()=>{const {data}=await client.auth.getSession();await enter(data.session);};screen.querySelector('#leave-access').onclick=logout;}
}
export async function logout(){lock();passwordMode=false;login('Saindo…');const {error}=await client.auth.signOut({scope:'local'});login(error?'Não foi possível encerrar a sessão. Tente sair novamente.':'Você saiu da sua conta.');}
export async function refreshAccess(){const {data}=await client.auth.getSession();await enter(data.session);}
export async function startAuth(callbacks){
 hooks=callbacks;login('Conferindo sessão…');
 client.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){passwordMode=true;setTimeout(passwordForm,0);}
  if(event==='SIGNED_OUT'){activeUserId=null;lock();login();}
  if(event==='SIGNED_IN'&&activeUserId&&session?.user?.id!==activeUserId){lock();setTimeout(()=>enter(session),0);}
  // Não realizar chamadas Supabase dentro do callback de autenticação.
 });
 window.addEventListener('online',()=>{if(document.body.classList.contains('auth-locked')&&!passwordMode)refreshAccess();});
 if(!navigator.onLine){lock();login('Sem conexão. Conecte para entrar e acessar os registros protegidos.');return;}
 try{const {data,error}=await client.auth.getSession();if(error)throw error;await enter(data.session);}catch(error){lock();login(message(error));}
}
