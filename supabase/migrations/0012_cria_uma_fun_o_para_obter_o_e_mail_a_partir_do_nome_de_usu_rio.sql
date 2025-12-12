CREATE OR REPLACE FUNCTION public.get_email_from_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
BEGIN
  SELECT p.id INTO v_user_id
  FROM public.profiles p
  WHERE p.username = p_username;

  IF v_user_id IS NOT NULL THEN
    SELECT u.email INTO v_email
    FROM auth.users u
    WHERE u.id = v_user_id;
  END IF;

  RETURN v_email;
END;
$$;