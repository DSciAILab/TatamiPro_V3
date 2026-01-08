-- Garantir que eventos e divisões sejam legíveis publicamente para que o formulário carregue
DROP POLICY IF EXISTS "Public read access for events" ON public.events;
CREATE POLICY "Public read access for events" ON public.events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access for divisions" ON public.divisions;
CREATE POLICY "Public read access for divisions" ON public.divisions FOR SELECT USING (true);