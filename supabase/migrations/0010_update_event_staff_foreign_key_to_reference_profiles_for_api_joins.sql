-- Drop the existing foreign key constraint that references auth.users
ALTER TABLE public.event_staff DROP CONSTRAINT IF EXISTS event_staff_user_id_fkey;

-- Add a new foreign key constraint that references public.profiles
-- This enables PostgREST to detect the relationship for joins like .select('..., profile:profiles(...)')
ALTER TABLE public.event_staff
ADD CONSTRAINT event_staff_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;