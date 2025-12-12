-- Adicionar a coluna para rastrear o status de aprovação
ALTER TABLE public.profiles
ADD COLUMN is_approved BOOLEAN DEFAULT false;

-- Atualizar a função para lidar com a aprovação
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  user_role text;
  is_approved_status boolean;
BEGIN
  -- Atribui a função 'admin' e aprova automaticamente se o e-mail for o do desenvolvedor
  IF new.email = 'fernandocaravana@gmail.com' THEN
    user_role := 'admin';
    is_approved_status := true;
  ELSE
    user_role := COALESCE(new.raw_user_meta_data ->> 'role', 'athlete');
    is_approved_status := false; -- Novos usuários precisam de aprovação
  END IF;

  INSERT INTO public.profiles (id, first_name, last_name, role, club, app_id, is_approved)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    user_role,
    new.raw_user_meta_data ->> 'club',
    '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid,
    is_approved_status
  );
  RETURN new;
END;
$function$;