-- Somente DEPOIS de instalar notifications.sql, publicar a Edge Function e configurar os segredos.
-- 7h de Brasília = 10h UTC. Tentativas às 7h15 e 7h30 apenas para entregas ainda não aceitas.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM vault.decrypted_secrets WHERE name='push_daily_job_secret') THEN
  RAISE EXCEPTION 'Crie o segredo push_daily_job_secret no Vault primeiro.';
 END IF;
END $$;
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname='sitio-daily-digest';
SELECT cron.schedule('sitio-daily-digest','0,15,30 10 * * *',$job$
 SELECT net.http_post(
  url:='https://ffzvurispepejyhcmztk.supabase.co/functions/v1/daily-digest',
  headers:=jsonb_build_object('Content-Type','application/json','x-job-secret',
   (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='push_daily_job_secret' LIMIT 1)),
  body:='{"action":"dispatch"}'::jsonb,timeout_milliseconds:=60000
 );
$job$);
