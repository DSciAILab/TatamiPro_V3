-- Drop existing tables that might conflict to ensure a clean slate
DROP TABLE IF EXISTS public.athletes CASCADE;
DROP TABLE IF EXISTS public.divisions CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.clubs CASCADE;

-- Create clubs table
CREATE TABLE public.clubs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read clubs" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add clubs" ON public.clubs FOR INSERT TO authenticated WITH CHECK (true);

-- Create events table
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'Aberto',
  event_date date NOT NULL,
  is_active boolean DEFAULT true,
  champion_points integer DEFAULT 9,
  runner_up_points integer DEFAULT 3,
  third_place_points integer DEFAULT 1,
  count_single_club_categories boolean DEFAULT true,
  count_walkover_single_fight_categories boolean DEFAULT true,
  mat_assignments jsonb DEFAULT '{}'::jsonb,
  brackets jsonb DEFAULT '{}'::jsonb,
  mat_fight_order jsonb DEFAULT '{}'::jsonb,
  is_belt_grouping_enabled boolean DEFAULT true,
  is_overweight_auto_move_enabled boolean DEFAULT false,
  include_third_place boolean DEFAULT false,
  is_attendance_mandatory_before_check_in boolean DEFAULT false,
  is_weight_check_enabled boolean DEFAULT true,
  check_in_scan_mode text DEFAULT 'qr',
  num_fight_areas integer DEFAULT 1,
  age_division_settings jsonb DEFAULT '[]'::jsonb,
  check_in_start_time timestamp with time zone,
  check_in_end_time timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read events" ON public.events FOR SELECT USING (is_active = true);
CREATE POLICY "Users can manage their own events" ON public.events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create divisions table
CREATE TABLE public.divisions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  min_age integer NOT NULL,
  max_age integer NOT NULL,
  max_weight numeric NOT NULL,
  gender text NOT NULL,
  belt text NOT NULL,
  age_category_name text NOT NULL,
  is_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read divisions" ON public.divisions FOR SELECT USING (true);
CREATE POLICY "Event owners can manage divisions" ON public.divisions FOR ALL USING ((SELECT user_id FROM public.events WHERE id = event_id) = auth.uid());

-- Create athletes table
CREATE TABLE public.athletes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registration_qr_code_id text UNIQUE,
  photo_url text,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date NOT NULL,
  age integer NOT NULL,
  club text NOT NULL,
  gender text NOT NULL,
  belt text NOT NULL,
  weight numeric NOT NULL,
  nationality text NOT NULL,
  age_division text NOT NULL,
  weight_division text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  emirates_id text,
  school_id text,
  emirates_id_front_url text,
  emirates_id_back_url text,
  signature_url text,
  consent_accepted boolean NOT NULL,
  consent_date timestamp with time zone NOT NULL,
  consent_version text NOT NULL,
  payment_proof_url text,
  registration_status text NOT NULL,
  check_in_status text NOT NULL,
  registered_weight numeric,
  weight_attempts jsonb DEFAULT '[]'::jsonb,
  attendance_status text NOT NULL,
  moved_to_division_id uuid,
  move_reason text,
  seed integer,
  created_at timestamp with time zone DEFAULT now()
);
ALTER TABLE public.athletes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read athletes" ON public.athletes FOR SELECT USING (true);
CREATE POLICY "Event owners can manage athletes" ON public.athletes FOR ALL USING ((SELECT user_id FROM public.events WHERE id = event_id) = auth.uid());
CREATE POLICY "Coaches can manage their club's athletes" ON public.athletes FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'coach' AND (SELECT club FROM public.profiles WHERE id = auth.uid()) = club);