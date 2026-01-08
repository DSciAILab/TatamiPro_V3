-- Add division_id to athletes table
ALTER TABLE public.athletes
ADD COLUMN division_id UUID REFERENCES public.divisions(id) ON DELETE SET NULL;