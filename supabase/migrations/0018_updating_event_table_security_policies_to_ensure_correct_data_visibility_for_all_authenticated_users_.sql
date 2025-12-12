-- Removendo políticas antigas e potencialmente conflitantes para uma configuração limpa.
DROP POLICY IF EXISTS "Isolar dados por app e usuário" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can view their own or unassigned app data" ON public.events;
DROP POLICY IF EXISTS "Staff can view assigned events" ON public.events;

-- Nova política de LEITURA: Permite que QUALQUER usuário logado veja TODOS os eventos do aplicativo.
-- Esta é a correção principal para o seu problema.
CREATE POLICY "Authenticated users can view all app events"
ON public.events
FOR SELECT
TO authenticated
USING (app_id = '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid);

-- Nova política de ESCRITA: Permite que usuários criem, atualizem e apaguem APENAS os seus próprios eventos.
-- Isso mantém a segurança dos dados.
CREATE POLICY "Users can manage their own events"
ON public.events
FOR ALL
TO authenticated
USING (auth.uid() = user_id AND app_id = '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid)
WITH CHECK (auth.uid() = user_id AND app_id = '3051c619-0e6d-4dcb-8874-8a4ef30bbbf6'::uuid);