CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, role, club)
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    COALESCE(new.raw_user_meta_data ->> 'role', 'athlete'), -- Usa o papel fornecido ou 'athlete'
    new.raw_user_meta_data ->> 'club' -- Adiciona o clube se fornecido
  );
  RETURN new;
END;
$$;