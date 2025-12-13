CREATE POLICY "Public can read active events" ON public.events FOR SELECT USING (is_active = true);

CREATE POLICY "Public can read athletes of active events" ON public.athletes FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE events.id = athletes.event_id AND events.is_active = true));

CREATE POLICY "Public can read divisions of active events" ON public.divisions FOR SELECT USING (EXISTS (SELECT 1 FROM events WHERE events.id = divisions.event_id AND events.is_active = true));