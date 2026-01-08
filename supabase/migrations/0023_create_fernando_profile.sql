-- Create profile for Fernando if it doesn't exist
-- User ID from console logs: ecd437a4-8627-40b5-8ae7-0faad7357ba7

INSERT INTO public.sjjp_profiles (
  id, 
  first_name, 
  last_name, 
  role, 
  club,
  username
)
VALUES (
  'ecd437a4-8627-40b5-8ae7-0faad7357ba7',
  'Fernando',
  'Caravana',
  'admin',
  NULL,
  'fernando'
)
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  role = EXCLUDED.role,
  username = EXCLUDED.username;
