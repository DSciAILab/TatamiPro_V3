-- Migration: 20260114190000_auditoria_security_fixes.sql
-- Description: Hotfix de segurança para RLS e exposição de dados (P0)

BEGIN;

-- 1. [SECURITY] SEC-005: Corrigindo RLS de Leads (sjjp_event_leads)
-- A política anterior permitia que qualquer usuário autenticado visse os leads de qualquer evento.
DROP POLICY IF EXISTS "Organizers can view event leads" ON public.sjjp_event_leads;

CREATE POLICY "Organizers can view event leads" ON public.sjjp_event_leads
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.id = sjjp_event_leads.event_id AND e.user_id = auth.uid()
  )
);

-- 2. [SECURITY] SEC-001: Protegendo dados sensíveis de atletas (sjjp_athletes)
-- A política anterior permitia SELECT irrestrito para o público.
-- Vamos restringir a leitura pública apenas para o necessário (ex: listagem de inscritos)
-- e apenas para atletas aprovados.

DROP POLICY IF EXISTS "Public can read athletes" ON public.sjjp_athletes;

-- Policy para STAFF/Organizador (Dono do evento vê tudo)
CREATE POLICY "Organizers can manage athletes" ON public.sjjp_athletes 
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.id = sjjp_athletes.event_id AND e.user_id = auth.uid()
  )
);

-- Policy para Público (Restrita)
-- Nota: Como o Postgres não tem column-level RLS para SELECT nativo simples,
-- idealmente campos sensíveis (email, phone, emirates_id) seriam movidos para outra tabela 
-- ou acessados via VIEW segura. Por hora, restringimos a quem é 'approved'.
CREATE POLICY "Public can read approved athletes" ON public.sjjp_athletes 
FOR SELECT 
USING (registration_status = 'approved');

-- 3. [PERFORMANCE] TK-007: Adicionando índices críticos ausentes
CREATE INDEX IF NOT EXISTS idx_sjjp_athletes_event_id ON public.sjjp_athletes(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_divisions_event_id ON public.sjjp_divisions(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_athletes_registration_status ON public.sjjp_athletes(registration_status);

COMMIT;
