-- Migration: 20260114210800_migrate_brackets_data.sql
-- Description: Migra dados da coluna JSONB 'brackets' para as novas tabelas
-- NOTA: Esta migration lê os dados existentes e os insere nas tabelas relacionais.
--       A coluna JSONB original NÃO é modificada (rollback seguro).

-- IMPORTANTE: Execute esta migration APÓS criar as tabelas (20260114210700)

DO $$
DECLARE
  event_record RECORD;
  division_id TEXT;
  bracket_json JSONB;
  match_json JSONB;
  round_idx INTEGER;
  match_idx INTEGER;
  new_bracket_id UUID;
  rounds_array JSONB;
BEGIN
  -- Loop por todos os eventos que têm brackets
  FOR event_record IN 
    SELECT id, brackets 
    FROM public.sjjp_events 
    WHERE brackets IS NOT NULL AND brackets != '{}'::jsonb
  LOOP
    -- Loop por cada divisão dentro do brackets JSONB
    FOR division_id, bracket_json IN 
      SELECT * FROM jsonb_each(event_record.brackets)
    LOOP
      -- Inserir o bracket
      INSERT INTO public.sjjp_brackets (
        id,
        event_id,
        division_id,
        bracket_size,
        winner_id,
        runner_up_id,
        third_place_winner_id,
        group_name
      ) VALUES (
        COALESCE((bracket_json->>'id')::uuid, gen_random_uuid()),
        event_record.id,
        division_id::uuid,
        COALESCE((bracket_json->>'bracket_size')::integer, 0),
        NULLIF(bracket_json->>'winner_id', '')::uuid,
        NULLIF(bracket_json->>'runner_up_id', '')::uuid,
        NULLIF(bracket_json->>'third_place_winner_id', '')::uuid,
        bracket_json->>'group_name'
      )
      ON CONFLICT (event_id, division_id, group_name) DO NOTHING
      RETURNING id INTO new_bracket_id;
      
      -- Se não conseguiu inserir (conflito), buscar o ID existente
      IF new_bracket_id IS NULL THEN
        SELECT id INTO new_bracket_id 
        FROM public.sjjp_brackets 
        WHERE event_id = event_record.id 
          AND division_id = division_id::uuid
          AND COALESCE(group_name, '') = COALESCE(bracket_json->>'group_name', '');
      END IF;
      
      -- Processar rounds (array de arrays de matches)
      rounds_array := bracket_json->'rounds';
      IF rounds_array IS NOT NULL AND jsonb_typeof(rounds_array) = 'array' THEN
        round_idx := 0;
        FOR round_idx IN 0..jsonb_array_length(rounds_array) - 1
        LOOP
          match_idx := 0;
          FOR match_json IN SELECT * FROM jsonb_array_elements(rounds_array->round_idx)
          LOOP
            INSERT INTO public.sjjp_matches (
              id,
              bracket_id,
              round,
              match_number,
              mat_fight_number,
              fighter1_id,
              fighter2_id,
              fighter1_is_bye,
              fighter2_is_bye,
              winner_id,
              loser_id,
              result_type,
              result_details,
              next_match_id,
              is_third_place_match
            ) VALUES (
              COALESCE((match_json->>'id')::uuid, gen_random_uuid()),
              new_bracket_id,
              round_idx,
              match_idx,
              (match_json->>'mat_fight_number')::integer,
              CASE 
                WHEN match_json->>'fighter1_id' = 'BYE' THEN NULL 
                ELSE NULLIF(match_json->>'fighter1_id', '')::uuid 
              END,
              CASE 
                WHEN match_json->>'fighter2_id' = 'BYE' THEN NULL 
                ELSE NULLIF(match_json->>'fighter2_id', '')::uuid 
              END,
              match_json->>'fighter1_id' = 'BYE',
              match_json->>'fighter2_id' = 'BYE',
              NULLIF(match_json->>'winner_id', '')::uuid,
              NULLIF(match_json->>'loser_id', '')::uuid,
              match_json->'result'->>'type',
              match_json->'result'->>'details',
              NULLIF(match_json->>'next_match_id', '')::uuid,
              false
            )
            ON CONFLICT (bracket_id, round, match_number) DO NOTHING;
            
            match_idx := match_idx + 1;
          END LOOP;
        END LOOP;
      END IF;
      
      -- Processar third_place_match se existir
      IF bracket_json->'third_place_match' IS NOT NULL THEN
        match_json := bracket_json->'third_place_match';
        INSERT INTO public.sjjp_matches (
          id,
          bracket_id,
          round,
          match_number,
          fighter1_id,
          fighter2_id,
          winner_id,
          loser_id,
          result_type,
          result_details,
          is_third_place_match
        ) VALUES (
          COALESCE((match_json->>'id')::uuid, gen_random_uuid()),
          new_bracket_id,
          -1, -- Round especial para terceiro lugar
          0,
          NULLIF(match_json->>'fighter1_id', '')::uuid,
          NULLIF(match_json->>'fighter2_id', '')::uuid,
          NULLIF(match_json->>'winner_id', '')::uuid,
          NULLIF(match_json->>'loser_id', '')::uuid,
          match_json->'result'->>'type',
          match_json->'result'->>'details',
          true
        )
        ON CONFLICT (bracket_id, round, match_number) DO NOTHING;
      END IF;
      
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Migration completed. Check sjjp_brackets and sjjp_matches tables.';
END $$;

-- Verificação pós-migration
DO $$
DECLARE
  bracket_count INTEGER;
  match_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bracket_count FROM public.sjjp_brackets;
  SELECT COUNT(*) INTO match_count FROM public.sjjp_matches;
  RAISE NOTICE 'Migration result: % brackets, % matches migrated.', bracket_count, match_count;
END $$;
