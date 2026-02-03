-- Add auto-approve registrations setting to events
ALTER TABLE public.sjjp_events 
ADD COLUMN IF NOT EXISTS is_auto_approve_registrations_enabled boolean DEFAULT false;
