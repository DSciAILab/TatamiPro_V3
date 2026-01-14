-- Migration: 20260114210700_create_brackets_tables.sql
-- Description: Cria tabelas relacionais para brackets e matches
-- NOTA: A coluna JSONB 'brackets' em sjjp_events é MANTIDA para rollback seguro

BEGIN;

-- ============================================================
-- TABELA: sjjp_brackets
-- Um registro por bracket (geralmente 1 por divisão, ou múltiplos se split)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sjjp_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.sjjp_events(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.sjjp_divisions(id) ON DELETE CASCADE,
  bracket_size INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  runner_up_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  third_place_winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  group_name TEXT, -- e.g. "Group A", "Group B" for split brackets
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_bracket_per_division_group UNIQUE (event_id, division_id, group_name)
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_sjjp_brackets_event_id ON public.sjjp_brackets(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_brackets_division_id ON public.sjjp_brackets(division_id);


-- ============================================================
-- TABELA: sjjp_matches
-- Um registro por luta dentro de um bracket
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sjjp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.sjjp_brackets(id) ON DELETE CASCADE,
  
  -- Posição no bracket
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  mat_fight_number INTEGER,
  
  -- Participantes (pode ser NULL para BYE ou match futuro)
  fighter1_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  fighter2_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  fighter1_is_bye BOOLEAN DEFAULT false,
  fighter2_is_bye BOOLEAN DEFAULT false,
  
  -- Resultado
  winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  result_type TEXT CHECK (result_type IN ('submission', 'points', 'decision', 'disqualification', 'walkover')),
  result_details TEXT,
  
  -- Navegação do bracket
  next_match_id UUID REFERENCES public.sjjp_matches(id) ON DELETE SET NULL,
  prev_match1_id UUID, -- Referência lógica (não FK para evitar ciclos)
  prev_match2_id UUID,
  
  -- Terceiro lugar
  is_third_place_match BOOLEAN DEFAULT false,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT unique_match_position UNIQUE (bracket_id, round, match_number)
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_sjjp_matches_bracket_id ON public.sjjp_matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_matches_fighter1 ON public.sjjp_matches(fighter1_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_matches_fighter2 ON public.sjjp_matches(fighter2_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_matches_winner ON public.sjjp_matches(winner_id);


-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.sjjp_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sjjp_matches ENABLE ROW LEVEL SECURITY;

-- Brackets: Público pode ler, organizadores podem gerenciar
CREATE POLICY "Public can read brackets" ON public.sjjp_brackets
FOR SELECT USING (true);

CREATE POLICY "Organizers can manage brackets" ON public.sjjp_brackets
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.id = sjjp_brackets.event_id AND e.user_id = auth.uid()
  )
);

-- Matches: Público pode ler, organizadores podem gerenciar
CREATE POLICY "Public can read matches" ON public.sjjp_matches
FOR SELECT USING (true);

CREATE POLICY "Organizers can manage matches" ON public.sjjp_matches
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_brackets b
    JOIN public.sjjp_events e ON b.event_id = e.id
    WHERE b.id = sjjp_matches.bracket_id AND e.user_id = auth.uid()
  )
);


-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================
DROP TRIGGER IF EXISTS on_sjjp_brackets_update ON public.sjjp_brackets;
CREATE TRIGGER on_sjjp_brackets_update
  BEFORE UPDATE ON public.sjjp_brackets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_matches_update ON public.sjjp_matches;
CREATE TRIGGER on_sjjp_matches_update
  BEFORE UPDATE ON public.sjjp_matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;
