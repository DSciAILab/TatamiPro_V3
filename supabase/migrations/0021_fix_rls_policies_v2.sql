-- Fix RLS Policies for SJJP Refactor
-- The previous renaming preserved policies, but the policies themselves referenced legacy tables.
-- We must Drop them and Recreate them pointing to the correct 'sjjp_' tables.

-- 1. SJJP_EVENTS
ALTER TABLE public.sjjp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own events" ON public.sjjp_events;
CREATE POLICY "Users can manage their own events" ON public.sjjp_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RESTORE PUBLIC ACCESS
DROP POLICY IF EXISTS "Public can read events" ON public.sjjp_events;
CREATE POLICY "Public can read events" ON public.sjjp_events FOR SELECT USING (is_active = true);


-- 2. SJJP_DIVISIONS
ALTER TABLE public.sjjp_divisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Event owners can manage divisions" ON public.sjjp_divisions;
CREATE POLICY "Event owners can manage divisions" ON public.sjjp_divisions FOR ALL USING (
  (SELECT user_id FROM public.sjjp_events WHERE id = event_id) = auth.uid()
);

-- RESTORE PUBLIC ACCESS
DROP POLICY IF EXISTS "Public can read divisions" ON public.sjjp_divisions;
CREATE POLICY "Public can read divisions" ON public.sjjp_divisions FOR SELECT USING (true);


-- 3. SJJP_ATHLETES
ALTER TABLE public.sjjp_athletes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Event owners can manage athletes" ON public.sjjp_athletes;
DROP POLICY IF EXISTS "Coaches can manage their club's athletes" ON public.sjjp_athletes;

CREATE POLICY "Event owners can manage athletes" ON public.sjjp_athletes FOR ALL USING (
  (SELECT user_id FROM public.sjjp_events WHERE id = event_id) = auth.uid()
);

CREATE POLICY "Coaches can manage their club's athletes" ON public.sjjp_athletes FOR ALL USING (
  (SELECT role FROM public.sjjp_profiles WHERE id = auth.uid()) = 'coach' 
  AND 
  (SELECT club FROM public.sjjp_profiles WHERE id = auth.uid()) = club
);

-- RESTORE PUBLIC ACCESS (If needed for athletes list?)
-- Reviewing 0005, there was: CREATE POLICY "Public can read athletes" ON public.athletes FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public can read athletes" ON public.sjjp_athletes;
CREATE POLICY "Public can read athletes" ON public.sjjp_athletes FOR SELECT USING (true);
