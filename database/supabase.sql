-- Execute no SQL Editor do seu projeto Supabase. Não contém senhas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE TABLE IF NOT EXISTS public.site_members (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK(role IN ('admin','editor','viewer')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.farm_state (
 id integer PRIMARY KEY CHECK(id=1),
 data jsonb,
 version integer NOT NULL DEFAULT 0 CHECK(version>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
INSERT INTO public.farm_state(id) VALUES(1) ON CONFLICT(id) DO NOTHING;

ALTER TABLE public.site_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.site_members, public.farm_state FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.site_members, public.farm_state TO authenticated;

CREATE OR REPLACE FUNCTION private.member_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT role FROM public.site_members WHERE user_id=auth.uid();
$$;
REVOKE ALL ON FUNCTION private.member_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.member_role() TO authenticated;

DROP POLICY IF EXISTS members_read ON public.site_members;
CREATE POLICY members_read ON public.site_members FOR SELECT TO authenticated
 USING(user_id=auth.uid() OR private.member_role()='admin');
DROP POLICY IF EXISTS farm_read ON public.farm_state;
CREATE POLICY farm_read ON public.farm_state FOR SELECT TO authenticated
 USING(private.member_role() IN ('admin','editor','viewer'));

CREATE OR REPLACE FUNCTION public.save_farm(p_data jsonb, p_expected_version integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE next_version integer;
BEGIN
 IF auth.uid() IS NULL OR COALESCE(private.member_role(),'') NOT IN ('admin','editor') THEN
  RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
 END IF;
 IF p_data IS NULL OR jsonb_typeof(p_data)<>'object'
 OR jsonb_typeof(p_data->'property') IS DISTINCT FROM 'object'
 OR jsonb_typeof(p_data->'animals') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_data->'vaccines') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_data->'treatments') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_data->'production') IS DISTINCT FROM 'array'
 OR jsonb_typeof(p_data->'reproduction') IS DISTINCT FROM 'array'
 OR octet_length(p_data::text)>5000000 THEN
  RAISE EXCEPTION 'INVALID_DATA' USING ERRCODE='22023';
 END IF;
 UPDATE public.farm_state SET data=p_data,version=version+1,updated_at=now(),updated_by=auth.uid()
 WHERE id=1 AND version=p_expected_version RETURNING version INTO next_version;
 IF NOT FOUND THEN RAISE EXCEPTION 'CONFLICT' USING ERRCODE='40001'; END IF;
 RETURN jsonb_build_object('version',next_version);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_site_members()
RETURNS TABLE(user_id uuid,email text,role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF COALESCE(private.member_role(),'')<>'admin' THEN
  RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT u.id,u.email::text,m.role FROM auth.users u
 LEFT JOIN public.site_members m ON m.user_id=u.id ORDER BY u.email;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_role(p_user_id uuid,p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 -- Serialize alterações de equipe, inclusive remoção do último administrador.
 PERFORM pg_advisory_xact_lock(730031);
 IF COALESCE(private.member_role(),'')<>'admin' THEN
  RAISE EXCEPTION 'ACCESS_DENIED' USING ERRCODE='42501';
 END IF;
 IF p_role IS NOT NULL AND p_role NOT IN ('admin','editor','viewer') THEN
  RAISE EXCEPTION 'INVALID_ROLE' USING ERRCODE='22023';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN
  RAISE EXCEPTION 'UNKNOWN_USER' USING ERRCODE='22023';
 END IF;
 IF COALESCE(p_role,'')<>'admin'
 AND EXISTS(SELECT 1 FROM public.site_members WHERE user_id=p_user_id AND role='admin')
 AND (SELECT count(*) FROM public.site_members WHERE role='admin')<=1 THEN
  RAISE EXCEPTION 'LAST_ADMIN' USING ERRCODE='22023';
 END IF;
 IF p_role IS NULL THEN DELETE FROM public.site_members WHERE user_id=p_user_id;
 ELSE INSERT INTO public.site_members(user_id,role) VALUES(p_user_id,p_role)
 ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role;
 END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.save_farm(jsonb,integer), public.list_site_members(), public.set_member_role(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_farm(jsonb,integer), public.list_site_members(), public.set_member_role(uuid,text) TO authenticated;
COMMIT;
