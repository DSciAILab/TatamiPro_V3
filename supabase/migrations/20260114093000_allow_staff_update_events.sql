-- Allow staff members to update events they are assigned to
-- This is necessary for staff to save bracket results, update settings, etc.

CREATE POLICY "Staff can update events" ON public.sjjp_events
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_event_staff
    WHERE event_id = id
    AND user_id = auth.uid()
  )
);
