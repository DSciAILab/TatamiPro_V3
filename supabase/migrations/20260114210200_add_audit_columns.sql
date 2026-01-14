-- Migration: 20260114210200_add_audit_columns.sql
-- Description: Adiciona colunas de auditoria (updated_at) para rastreabilidade

BEGIN;

-- 1. Adicionar updated_at nas tabelas principais
ALTER TABLE public.sjjp_events 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.sjjp_athletes 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.sjjp_divisions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.sjjp_profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Criar função para atualização automática
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Criar triggers para atualização automática
DROP TRIGGER IF EXISTS on_sjjp_events_update ON public.sjjp_events;
CREATE TRIGGER on_sjjp_events_update
  BEFORE UPDATE ON public.sjjp_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_athletes_update ON public.sjjp_athletes;
CREATE TRIGGER on_sjjp_athletes_update
  BEFORE UPDATE ON public.sjjp_athletes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_divisions_update ON public.sjjp_divisions;
CREATE TRIGGER on_sjjp_divisions_update
  BEFORE UPDATE ON public.sjjp_divisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_profiles_update ON public.sjjp_profiles;
CREATE TRIGGER on_sjjp_profiles_update
  BEFORE UPDATE ON public.sjjp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
