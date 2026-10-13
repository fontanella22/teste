-- Execute uma vez no SQL Editor DEPOIS do esquema supabase.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 endpoint text NOT NULL UNIQUE,p256dh text NOT NULL,auth text NOT NULL,active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.push_deliveries (
 day date NOT NULL,subscription_id uuid NOT NULL REFERENCES public.push_subscriptions(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts integer NOT NULL DEFAULT 0,claimed_at timestamptz,delivered_at timestamptz,
 PRIMARY KEY(day,subscription_id)
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.push_subscriptions,public.push_deliveries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions,public.push_deliveries TO service_role;
DROP POLICY IF EXISTS own_push ON public.push_subscriptions;
CREATE POLICY own_push ON public.push_subscriptions FOR SELECT TO authenticated
 USING(user_id=auth.uid() AND private.member_role() IN ('admin','editor','viewer'));

CREATE OR REPLACE FUNCTION public.register_push(p_subscription jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid; v_endpoint text:=p_subscription->>'endpoint';
BEGIN
 IF COALESCE(private.member_role(),'') NOT IN ('admin','editor','viewer') THEN RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501'; END IF;
 IF v_endpoint IS NULL OR length(v_endpoint)>2048 OR v_endpoint !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|[a-zA-Z0-9-]+\.notify\.windows\.com)/'
 OR COALESCE(p_subscription->'keys'->>'p256dh','') !~ '^[A-Za-z0-9_-]{80,90}={0,2}$'
 OR COALESCE(p_subscription->'keys'->>'auth','') !~ '^[A-Za-z0-9_-]{20,24}={0,2}$'
 THEN RAISE EXCEPTION 'INVALID_SUBSCRIPTION' USING ERRCODE='22023'; END IF;
 INSERT INTO public.push_subscriptions(user_id,endpoint,p256dh,auth) VALUES(auth.uid(),v_endpoint,p_subscription->'keys'->>'p256dh',p_subscription->'keys'->>'auth')
 ON CONFLICT(endpoint) DO UPDATE SET active=true,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,updated_at=now()
 WHERE public.push_subscriptions.user_id=auth.uid() RETURNING id INTO result;
 IF result IS NULL THEN RAISE EXCEPTION 'DEVICE_IN_USE' USING ERRCODE='42501'; END IF;
 RETURN result;
END;
$$;
CREATE OR REPLACE FUNCTION public.remove_push(p_endpoint text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 DELETE FROM public.push_subscriptions WHERE endpoint=p_endpoint AND user_id=auth.uid();
$$;
CREATE OR REPLACE FUNCTION public.claim_daily_push(p_day date)
RETURNS TABLE(delivery_id uuid,user_id uuid,endpoint text,p256dh text,auth text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_day<>(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'INVALID_DAY'; END IF;
 INSERT INTO public.push_deliveries(day,subscription_id)
 SELECT p_day,s.id FROM public.push_subscriptions s JOIN public.site_members m ON m.user_id=s.user_id WHERE s.active
 ON CONFLICT DO NOTHING;
 RETURN QUERY WITH candidates AS (
  SELECT d.subscription_id FROM public.push_deliveries d JOIN public.push_subscriptions s ON s.id=d.subscription_id JOIN public.site_members m ON m.user_id=s.user_id
  WHERE d.day=p_day AND s.active AND d.attempts<3 AND (d.status IN ('pending','failed') OR (d.status='sending' AND d.claimed_at<now()-interval '10 minutes'))
  ORDER BY s.id LIMIT 100 FOR UPDATE OF d SKIP LOCKED
 ),claimed AS (
  UPDATE public.push_deliveries d SET status='sending',attempts=attempts+1,claimed_at=now()
  FROM candidates c WHERE d.day=p_day AND d.subscription_id=c.subscription_id RETURNING d.subscription_id
 ) SELECT s.id,s.user_id,s.endpoint,s.p256dh,s.auth FROM claimed c JOIN public.push_subscriptions s ON s.id=c.subscription_id;
END;
$$;
REVOKE ALL ON FUNCTION public.register_push(jsonb),public.remove_push(text),public.claim_daily_push(date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.register_push(jsonb),public.remove_push(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_push(date) TO service_role;
COMMIT;
