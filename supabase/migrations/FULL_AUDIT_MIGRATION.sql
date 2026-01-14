-- ============================================================
-- AUDITORIA COMPLETA: Script Unificado de Migrations
-- Execute este arquivo inteiro no Supabase SQL Editor
-- ============================================================

-- ============================================================
-- PARTE 1: SEGURANÇA (RLS Fixes + Índices)
-- ============================================================

BEGIN;

-- SEC-001: Protegendo dados de atletas
DROP POLICY IF EXISTS "Public can read athletes" ON public.sjjp_athletes;
DROP POLICY IF EXISTS "Public can read approved athletes" ON public.sjjp_athletes;
DROP POLICY IF EXISTS "Organizers can manage athletes" ON public.sjjp_athletes;

CREATE POLICY "Organizers can manage athletes" ON public.sjjp_athletes 
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.id = sjjp_athletes.event_id AND e.user_id = auth.uid()
  )
);

CREATE POLICY "Public can read approved athletes" ON public.sjjp_athletes 
FOR SELECT USING (registration_status = 'approved');

-- SEC-005: Corrigindo RLS de Leads
DROP POLICY IF EXISTS "Organizers can view event leads" ON public.sjjp_event_leads;
CREATE POLICY "Organizers can view event leads" ON public.sjjp_event_leads
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.id = sjjp_event_leads.event_id AND e.user_id = auth.uid()
  )
);


-- Índices
CREATE INDEX IF NOT EXISTS idx_sjjp_athletes_event_id ON public.sjjp_athletes(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_divisions_event_id ON public.sjjp_divisions(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_athletes_registration_status ON public.sjjp_athletes(registration_status);

COMMIT;

-- ============================================================
-- PARTE 2: STORAGE SECURITY
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS "Organizers can read athlete documents" ON storage.objects;
CREATE POLICY "Organizers can read athlete documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'athlete-documents' AND
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.user_id = auth.uid()
    AND (storage.foldername(name))[1] = e.id::text
  )
);

DROP POLICY IF EXISTS "Allow document upload during registration" ON storage.objects;
CREATE POLICY "Allow document upload during registration"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'athlete-documents');

DROP POLICY IF EXISTS "Organizers can read athlete photos" ON storage.objects;
CREATE POLICY "Organizers can read athlete photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'athlete-photos' AND
  EXISTS (
    SELECT 1 FROM public.sjjp_events e
    WHERE e.user_id = auth.uid()
    AND (storage.foldername(name))[1] = e.id::text
  )
);

DROP POLICY IF EXISTS "Allow photo upload during registration" ON storage.objects;
CREATE POLICY "Allow photo upload during registration"
ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'athlete-photos');

-- Nota: Índice de unicidade por email removido pois professores podem inscrever múltiplos alunos com mesmo email

COMMIT;

-- ============================================================
-- PARTE 3: COLUNAS DE AUDITORIA
-- ============================================================

BEGIN;

ALTER TABLE public.sjjp_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sjjp_athletes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sjjp_divisions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.sjjp_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_sjjp_events_update ON public.sjjp_events;
CREATE TRIGGER on_sjjp_events_update BEFORE UPDATE ON public.sjjp_events
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_athletes_update ON public.sjjp_athletes;
CREATE TRIGGER on_sjjp_athletes_update BEFORE UPDATE ON public.sjjp_athletes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_divisions_update ON public.sjjp_divisions;
CREATE TRIGGER on_sjjp_divisions_update BEFORE UPDATE ON public.sjjp_divisions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_profiles_update ON public.sjjp_profiles;
CREATE TRIGGER on_sjjp_profiles_update BEFORE UPDATE ON public.sjjp_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

-- ============================================================
-- PARTE 4: TABELAS DE BRACKETS (Normalização)
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.sjjp_brackets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.sjjp_events(id) ON DELETE CASCADE,
  division_id UUID NOT NULL REFERENCES public.sjjp_divisions(id) ON DELETE CASCADE,
  bracket_size INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  runner_up_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  third_place_winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  group_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_bracket_per_division_group UNIQUE (event_id, division_id, group_name)
);

CREATE INDEX IF NOT EXISTS idx_sjjp_brackets_event_id ON public.sjjp_brackets(event_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_brackets_division_id ON public.sjjp_brackets(division_id);

CREATE TABLE IF NOT EXISTS public.sjjp_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bracket_id UUID NOT NULL REFERENCES public.sjjp_brackets(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  mat_fight_number INTEGER,
  fighter1_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  fighter2_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  fighter1_is_bye BOOLEAN DEFAULT false,
  fighter2_is_bye BOOLEAN DEFAULT false,
  winner_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  loser_id UUID REFERENCES public.sjjp_athletes(id) ON DELETE SET NULL,
  result_type TEXT CHECK (result_type IN ('submission', 'points', 'decision', 'disqualification', 'walkover')),
  result_details TEXT,
  next_match_id UUID REFERENCES public.sjjp_matches(id) ON DELETE SET NULL,
  prev_match1_id UUID,
  prev_match2_id UUID,
  is_third_place_match BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_match_position UNIQUE (bracket_id, round, match_number)
);

CREATE INDEX IF NOT EXISTS idx_sjjp_matches_bracket_id ON public.sjjp_matches(bracket_id);
CREATE INDEX IF NOT EXISTS idx_sjjp_matches_winner ON public.sjjp_matches(winner_id);

-- RLS
ALTER TABLE public.sjjp_brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sjjp_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read brackets" ON public.sjjp_brackets;
CREATE POLICY "Public can read brackets" ON public.sjjp_brackets FOR SELECT USING (true);
DROP POLICY IF EXISTS "Organizers can manage brackets" ON public.sjjp_brackets;
CREATE POLICY "Organizers can manage brackets" ON public.sjjp_brackets FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.sjjp_events e WHERE e.id = sjjp_brackets.event_id AND e.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Public can read matches" ON public.sjjp_matches;
CREATE POLICY "Public can read matches" ON public.sjjp_matches FOR SELECT USING (true);
DROP POLICY IF EXISTS "Organizers can manage matches" ON public.sjjp_matches;
CREATE POLICY "Organizers can manage matches" ON public.sjjp_matches FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.sjjp_brackets b
    JOIN public.sjjp_events e ON b.event_id = e.id
    WHERE b.id = sjjp_matches.bracket_id AND e.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS on_sjjp_brackets_update ON public.sjjp_brackets;
CREATE TRIGGER on_sjjp_brackets_update BEFORE UPDATE ON public.sjjp_brackets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_sjjp_matches_update ON public.sjjp_matches;
CREATE TRIGGER on_sjjp_matches_update BEFORE UPDATE ON public.sjjp_matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMIT;

-- ============================================================
-- PARTE 5: MIGRAÇÃO DE DADOS (JSONB → Tabelas)
-- ============================================================

DO $$
DECLARE
  event_record RECORD;
  v_division_id TEXT;
  bracket_json JSONB;
  match_json JSONB;
  round_idx INTEGER;
  match_idx INTEGER;
  new_bracket_id UUID;
  rounds_array JSONB;
BEGIN
  FOR event_record IN 
    SELECT id, brackets FROM public.sjjp_events 
    WHERE brackets IS NOT NULL AND brackets != '{}'::jsonb
  LOOP
    FOR v_division_id, bracket_json IN SELECT * FROM jsonb_each(event_record.brackets)
    LOOP
      INSERT INTO public.sjjp_brackets (id, event_id, division_id, bracket_size, winner_id, runner_up_id, third_place_winner_id, group_name)
      VALUES (
        COALESCE((bracket_json->>'id')::uuid, gen_random_uuid()),
        event_record.id, v_division_id::uuid,
        COALESCE((bracket_json->>'bracket_size')::integer, 0),
        NULLIF(bracket_json->>'winner_id', '')::uuid,
        NULLIF(bracket_json->>'runner_up_id', '')::uuid,
        NULLIF(bracket_json->>'third_place_winner_id', '')::uuid,
        bracket_json->>'group_name'
      )
      ON CONFLICT (event_id, division_id, group_name) DO NOTHING
      RETURNING id INTO new_bracket_id;
      
      IF new_bracket_id IS NULL THEN
        SELECT id INTO new_bracket_id FROM public.sjjp_brackets 
        WHERE event_id = event_record.id AND sjjp_brackets.division_id = v_division_id::uuid;
      END IF;
      
      rounds_array := bracket_json->'rounds';
      IF rounds_array IS NOT NULL AND jsonb_typeof(rounds_array) = 'array' THEN
        FOR round_idx IN 0..jsonb_array_length(rounds_array) - 1
        LOOP

          match_idx := 0;
          FOR match_json IN SELECT * FROM jsonb_array_elements(rounds_array->round_idx)
          LOOP
            INSERT INTO public.sjjp_matches (id, bracket_id, round, match_number, mat_fight_number,
              fighter1_id, fighter2_id, fighter1_is_bye, fighter2_is_bye,
              winner_id, loser_id, result_type, result_details, is_third_place_match)
            VALUES (
              gen_random_uuid(), -- IDs originais não são UUID válidos
              new_bracket_id, round_idx, match_idx,
              (match_json->>'mat_fight_number')::integer,
              CASE WHEN match_json->>'fighter1_id' = 'BYE' OR match_json->>'fighter1_id' IS NULL THEN NULL 
                   WHEN match_json->>'fighter1_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (match_json->>'fighter1_id')::uuid
                   ELSE NULL END,
              CASE WHEN match_json->>'fighter2_id' = 'BYE' OR match_json->>'fighter2_id' IS NULL THEN NULL 
                   WHEN match_json->>'fighter2_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (match_json->>'fighter2_id')::uuid
                   ELSE NULL END,
              match_json->>'fighter1_id' = 'BYE',
              match_json->>'fighter2_id' = 'BYE',
              CASE WHEN match_json->>'winner_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (match_json->>'winner_id')::uuid ELSE NULL END,
              CASE WHEN match_json->>'loser_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (match_json->>'loser_id')::uuid ELSE NULL END,
              match_json->'result'->>'type',
              match_json->'result'->>'details',
              false
            )
            ON CONFLICT (bracket_id, round, match_number) DO NOTHING;
            match_idx := match_idx + 1;
          END LOOP;

        END LOOP;
      END IF;
    END LOOP;
  END LOOP;
  RAISE NOTICE 'Migration completed successfully.';
END $$;

-- Verificação
DO $$
DECLARE b_count INT; m_count INT;
BEGIN
  SELECT COUNT(*) INTO b_count FROM public.sjjp_brackets;
  SELECT COUNT(*) INTO m_count FROM public.sjjp_matches;
  RAISE NOTICE 'Result: % brackets, % matches', b_count, m_count;
END $$;
