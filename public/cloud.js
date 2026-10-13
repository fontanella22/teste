import {createClient} from './supabase.js';
import {supabaseUrl,supabaseKey} from './config.js';
import {validateFarm} from './data-model.js';
export const passwordLink=/(?:type=invite|type=recovery)/.test(location.hash);
export const client=createClient(supabaseUrl,supabaseKey,{auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}});
export let permission=null;
export let version=0;
export function clearAccess(){permission=null;version=0;}
export function message(error){
 if(error?.message==='CONFLICT')return 'Outra pessoa alterou os registros. Clique em Atualizar dados antes de tentar novamente.';
 if(['PGRST205','42P01','PGRST202'].includes(error?.code))return 'O banco ainda precisa ser configurado. Execute o script de instalação no SQL Editor do Supabase.';
 if(error?.code==='42501'||error?.message==='ACCESS_DENIED')return 'Sua conta não tem permissão para esta operação. Fale com o administrador.';
 if(error?.message==='Invalid login credentials')return 'E-mail ou senha inválidos.';
 if(error?.message==='Failed to fetch'||error?.name==='TypeError')return 'Não foi possível conectar. Confira sua conexão e tente novamente.';
 return 'Não foi possível concluir a operação. Tente novamente ou fale com o administrador.';
}
export async function loadFarm(){
 const {data:{user},error:userError}=await client.auth.getUser();
 if(userError||!user)throw userError||new Error('ACCESS_DENIED');
 const {data:membership,error}=await client.from('site_members').select('role').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 if(!membership)throw new Error('ACCESS_DENIED');
 permission=membership.role;
 const {data:row,error:readError}=await client.from('farm_state').select('data,version').eq('id',1).single();
 if(readError)throw readError;
 version=row.version;
 return {user,role:permission,data:row.data?validateFarm(row.data):null};
}
export async function storeFarm(data){
 validateFarm(data);
 const {data:row,error}=await client.rpc('save_farm',{p_data:data,p_expected_version:version});
 if(error)throw error;
 version=row.version;
}
export async function getMembers(){
 const {data,error}=await client.rpc('list_site_members');if(error)throw error;return data;
}
export async function changeMember(userId,role){
 const {error}=await client.rpc('set_member_role',{p_user_id:userId,p_role:role});if(error)throw error;
}
