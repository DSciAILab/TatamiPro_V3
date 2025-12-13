-- Backfill app_id for existing athletes who might have been created directly in Supabase
-- This ensures they are visible within the app, as RLS policies depend on this ID.

UPDATE public.athletes
SET app_id = '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid
WHERE app_id IS NULL;