-- 1. Add flag to profiles to force password change
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 2. Create event_staff table to link users to specific events
CREATE TABLE IF NOT EXISTS public.event_staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- e.g., 'referee', 'staff', 'scorekeeper'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Ensure a user is only assigned once per event
  UNIQUE(event_id, user_id)
);

-- 3. Enable RLS
ALTER TABLE public.event_staff ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Admins (Global) can manage everything
CREATE POLICY "Admins can manage event staff" ON public.event_staff
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Staff can view their own assignments (to know which events they can access)
CREATE POLICY "Users can view their own staff assignments" ON public.event_staff
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 5. Update Events RLS to allow Staff access
-- Allow users listed in event_staff to VIEW the event
CREATE POLICY "Staff can view assigned events" ON public.events
FOR SELECT
TO authenticated
USING (
  id IN (SELECT event_id FROM public.event_staff WHERE user_id = auth.uid())
);