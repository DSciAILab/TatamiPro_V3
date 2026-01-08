-- Quick diagnostic query to check if data exists and RLS is working

-- Check if sjjp_events table has data
SELECT COUNT(*) as event_count FROM public.sjjp_events;

-- Check active events
SELECT COUNT(*) as active_events FROM public.sjjp_events WHERE is_active = true;

-- Check all events details
SELECT id, name, is_active, user_id FROM public.sjjp_events LIMIT 5;

-- Check RLS policies on sjjp_events
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'sjjp_events';

-- Check RLS policies on sjjp_profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'sjjp_profiles';
