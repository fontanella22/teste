import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {emptyFarm} from '../public/data-model.js';

test('PostgreSQL: acesso negado fora da equipe, permissões e conflitos',async t=>{
 const db=new PGlite();
 const ids=['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004'];
 await db.exec(`CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY,email text);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`);
 for(let i=0;i<ids.length;i++)await db.query('INSERT INTO auth.users VALUES($1,$2)',[ids[i],`user${i}@example.test`]);
 const sql=await readFile(new URL('../database/supabase.sql',import.meta.url),'utf8');
 await db.exec(sql);await db.exec(sql); // Reexecução não apaga registros.
 await db.query("INSERT INTO public.site_members(user_id,role) VALUES($1,'admin'),($2,'editor'),($3,'viewer')",ids.slice(0,3));
 const login=async index=>{await db.exec('RESET ROLE');await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[index===null?'':ids[index]]);await db.exec(index===null?'SET ROLE anon':'SET ROLE authenticated');};
 await t.test('visitante não lê nem escreve nem gerencia acessos',async()=>{
  await login(null);
  await assert.rejects(db.query('SELECT * FROM public.farm_state'),/permission denied/);
  await assert.rejects(db.query('SELECT public.save_farm($1,0)',[emptyFarm()]),/permission denied/);
  await assert.rejects(db.query('SELECT * FROM public.list_site_members()'),/permission denied/);
 });
 await t.test('conta autenticada sem convite não acessa dados nem se autoriza',async()=>{
  await login(3);assert.equal((await db.query('SELECT * FROM public.farm_state')).rows.length,0);
  await assert.rejects(db.query('SELECT public.save_farm($1,0)',[emptyFarm()]),/ACCESS_DENIED/);
  await assert.rejects(db.query("SELECT public.set_member_role($1,'admin')",[ids[3]]),/ACCESS_DENIED/);
 });
 await t.test('consulta lê sem editar, nem com API direta',async()=>{
  await login(2);assert.equal((await db.query('SELECT * FROM public.farm_state')).rows.length,1);
  await assert.rejects(db.query('SELECT public.save_farm($1,0)',[emptyFarm()]),/ACCESS_DENIED/);
  await assert.rejects(db.query('UPDATE public.farm_state SET data=$1',[emptyFarm()]),/permission denied/);
 });
 await t.test('editor salva e versão antiga não sobrescreve outra alteração',async()=>{
  await login(1);assert.equal((await db.query('SELECT public.save_farm($1,0) AS result',[emptyFarm()])).rows[0].result.version,1);
  await assert.rejects(db.query('SELECT public.save_farm($1,0)',[emptyFarm()]),/CONFLICT/);
  await assert.rejects(db.query('SELECT public.save_farm($1,1)',[{}]),/INVALID_DATA/);
  await assert.rejects(db.query("SELECT public.set_member_role($1,'admin')",[ids[1]]),/ACCESS_DENIED/);
 });
 await t.test('administrador concede/revoga acesso e não remove último admin',async()=>{
  await login(0);assert.equal((await db.query('SELECT * FROM public.list_site_members()')).rows.length,4);
  await db.query("SELECT public.set_member_role($1,'viewer')",[ids[3]]);
  await assert.rejects(db.query('SELECT public.set_member_role($1,NULL)',[ids[0]]),/LAST_ADMIN/);
  await db.query('SELECT public.set_member_role($1,NULL)',[ids[1]]);
  await login(1);assert.equal((await db.query('SELECT * FROM public.farm_state')).rows.length,0);
  await assert.rejects(db.query('SELECT public.save_farm($1,1)',[emptyFarm()]),/ACCESS_DENIED/);
 });
 await db.close();
});
