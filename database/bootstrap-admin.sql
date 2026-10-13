-- Execute DEPOIS de criar/convidar sua conta em Authentication > Users.
-- Substitua SEU_EMAIL pelo e-mail da sua conta. Execute SOMENTE no SQL Editor.
DO $$
DECLARE target uuid;
BEGIN
 SELECT id INTO target FROM auth.users WHERE lower(email)=lower('SEU_EMAIL');
 IF target IS NULL THEN RAISE EXCEPTION 'Crie ou convide essa conta em Authentication > Users primeiro.'; END IF;
 INSERT INTO public.site_members(user_id,role) VALUES(target,'admin')
 ON CONFLICT(user_id) DO UPDATE SET role='admin';
END;
$$;
