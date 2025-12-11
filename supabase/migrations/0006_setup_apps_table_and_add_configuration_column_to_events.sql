-- 1. Create apps table
CREATE TABLE IF NOT EXISTS public.apps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Insert your specific App ID (from your schema context)
INSERT INTO public.apps (id, name)
VALUES ('3051c619-0e6d-4dcb-8874-8a4ef30bbbf6', 'SJJP Competitions V1')
ON CONFLICT (id) DO NOTHING;

-- 3. Enable Security
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read apps" ON public.apps;
CREATE POLICY "Public read apps" ON public.apps FOR SELECT USING (true);

-- 4. Add column to store Check-in Configuration in the Database
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS check_in_config JSONB DEFAULT '{}'::jsonb;