CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  user_role text;
BEGIN
  -- Atribui a função 'admin' se o e-mail for o do desenvolvedor
  IF new.email = 'fernandocaravana@gmail.com' THEN
    user_role := 'admin';
  ELSE
    user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'athlete');
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, club, app_id)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    user_role,
    new.raw_user_meta_data ->> 'club',
    '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid
  );
  RETURN new;
END;
$function$