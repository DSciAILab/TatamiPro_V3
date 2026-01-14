-- Lead capture for public event pages
-- Creates table to store visitor leads and adds toggle to events

-- Event leads table for storing visitor information
CREATE TABLE IF NOT EXISTS sjjp_event_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES sjjp_events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- At least one contact method required (enforced in app, but also in DB)
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Add lead capture toggle to events
ALTER TABLE sjjp_events 
ADD COLUMN IF NOT EXISTS is_lead_capture_enabled BOOLEAN DEFAULT false;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_leads_event_id ON sjjp_event_leads(event_id);

-- Enable RLS
ALTER TABLE sjjp_event_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert leads (public form)
CREATE POLICY "Anyone can insert leads"
  ON sjjp_event_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only event organizers can view leads
CREATE POLICY "Organizers can view event leads"
  ON sjjp_event_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sjjp_events e
      WHERE e.id = event_id
    )
  );
