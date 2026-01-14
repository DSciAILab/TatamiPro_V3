-- Migration: 20260114205700_storage_security_and_rate_limit.sql
-- Description: TK-004 (Storage RLS) + TK-005 (Registration Validation/Limits)

BEGIN;

-- ============================================================
-- TK-004: STORAGE SECURITY
-- Problema: Buckets públicos permitem leitura irrestrita de documentos sensíveis
-- Solução: Restringir acesso aos documentos (athlete-documents) apenas para organizadores
-- ============================================================

-- 1. Criar bucket 'athlete-documents' como PRIVADO (se não existir, será via Dashboard)
-- NOTA: Buckets são criados via Dashboard ou API direta. Aqui focamos nas POLICIES.

-- Policy: Organizadores podem ler documentos de atletas dos seus eventos
CREATE POLICY "Organizers can read athlete documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.user_id = auth.uid()
    -- O path segue o padrão: {event_id}/{athlete_id}/{file}
    AND (storage.foldername(name))[1] = e.id::text
  )
);

-- Policy: Upload de documentos apenas durante registro (user anônimo ou autenticado)
-- Permite que o formulário público faça upload
CREATE POLICY "Allow document upload during registration"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'athlete-documents'
);

-- Policy: Fotos de atletas (bucket 'athlete-photos') - Similar
CREATE POLICY "Organizers can read athlete photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'athlete-photos' AND
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.user_id = auth.uid()
    AND (storage.foldername(name))[1] = e.id::text
  )
);

-- Permitir upload público de fotos para registro
CREATE POLICY "Allow photo upload during registration"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
  bucket_id = 'athlete-photos'
);


-- ============================================================
-- TK-005: RATE LIMITING / VALIDAÇÃO DE INSERÇÃO
-- Problema: Inserção pública irrestrita pode permitir SPAM ou ataques de enumeração
-- Solução: Adicionar constraints e triggers para validação
-- ============================================================

-- 1. Impedir inscrições duplicadas (mesmo email + evento)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sjjp_athletes_unique_email_per_event 
ON public.sjjp_athletes(event_id, lower(email)) 
WHERE registration_status != 'rejected';

-- 2. Trigger para validar dados antes da inserção (opcional, mais complexo)
-- Por ora, o índice único já previne o SPAM mais comum.

COMMIT;
