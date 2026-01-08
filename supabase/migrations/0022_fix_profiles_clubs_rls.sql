-- Fix RLS for sjjp_profiles and sjjp_clubs (Post-Renaming)

-- 1. SJJP_PROFILES
ALTER TABLE public.sjjp_profiles ENABLE ROW LEVEL SECURITY;

-- Drop potentially conflicting old policies (names might vary, using common ones)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.sjjp_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.sjjp_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.sjjp_profiles;
DROP POLICY IF EXISTS "Users can see own profile" ON public.sjjp_profiles;
DROP POLICY IF EXISTS "Authenticated users can see all profiles" ON public.sjjp_profiles;

-- Enable self-management (Read, Update, Delete?)
CREATE POLICY "Users can manage own profile" ON public.sjjp_profiles FOR ALL USING (auth.uid() = id);

-- Enable reading all profiles for authenticated users (required for team lists, brackets, etc.)
CREATE POLICY "Authenticated users can view all profiles" ON public.sjjp_profiles FOR SELECT TO authenticated USING (true);


-- 2. SJJP_CLUBS
ALTER TABLE public.sjjp_clubs ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Public can read clubs" ON public.sjjp_clubs;
DROP POLICY IF EXISTS "Authenticated users can add clubs" ON public.sjjp_clubs;

-- Restore Public Read
CREATE POLICY "Public can read clubs" ON public.sjjp_clubs FOR SELECT USING (true);

-- Restore Insert (if needed)
CREATE POLICY "Authenticated users can add clubs" ON public.sjjp_clubs FOR INSERT TO authenticated WITH CHECK (true);
