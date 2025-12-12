-- Habilita a inserção pública na tabela de atletas,
-- garantindo que todas as novas inscrições sejam marcadas como 'under_approval'.
-- Isso é necessário para a página de inscrição pública funcionar.
CREATE POLICY "Allow public athlete registration"
ON public.athletes
FOR INSERT
WITH CHECK (registration_status = 'under_approval');