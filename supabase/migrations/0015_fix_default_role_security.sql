-- Atualiza a função handle_new_user para forçar o papel 'athlete' por padrão
-- Isso impede que usuários se cadastrem como admin via frontend

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_role text;
  is_approved_status boolean;
  developer_email text := 'fernandocaravana@gmail.com'; -- Substitua pelo seu e-mail se necessário
BEGIN
  -- Lógica de Segurança Estrita:
  -- Apenas o e-mail do desenvolvedor ganha admin automaticamente.
  -- Todos os outros se tornam 'athlete' independentemente do que o frontend enviar.
  
  IF new.email = developer_email THEN
    user_role := 'admin';
    is_approved_status := true;
  ELSE
    user_role := 'athlete'; 
    is_approved_status := true; -- Atletas são aprovados para acessar o sistema básico, mas sem poderes de admin
  END IF;

  INSERT INTO public.profiles (
    id, 
    first_name, 
    last_name, 
    role, 
    club, 
    app_id, 
    is_approved,
    email -- Adicionando email para facilitar buscas se a coluna existir na sua versão
  )
  VALUES (
    new.id, 
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    user_role, -- Usa a variável segura calculada acima
    new.raw_user_meta_data ->> 'club',
    '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid,
    is_approved_status,
    new.email
  );
  RETURN new;
END;
$$;