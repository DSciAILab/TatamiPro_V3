-- Create clubs table
CREATE TABLE public.clubs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

-- Policies for clubs
CREATE POLICY "Public can view clubs" ON public.clubs
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert clubs" ON public.clubs
FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage clubs" ON public.clubs
FOR ALL USING (EXISTS (
  SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));