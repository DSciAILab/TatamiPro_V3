-- Check if your user profile exists in sjjp_profiles
SELECT * FROM auth.users WHERE email = 'fernandocaravana@gmail.com';

-- Check if profile exists in sjjp_profiles table
SELECT * FROM public.sjjp_profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'fernandocaravana@gmail.com'
);

-- Check if any events exist
SELECT id, name, is_active, user_id FROM public.sjjp_events LIMIT 5;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('sjjp_events', 'sjjp_profiles', 'sjjp_clubs')
ORDER BY tablename, policyname;
