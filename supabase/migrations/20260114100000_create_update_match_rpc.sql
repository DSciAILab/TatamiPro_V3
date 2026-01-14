-- Function to atomically update a single match result in the brackets JSONB column
-- This prevents race conditions where concurrent updates to different matches would overwrite each other
-- if the entire brackets JSON was sent from the client.

-- Drop potentially ambiguous overloaded versions first
DROP FUNCTION IF EXISTS public.update_match_result(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.update_match_result(UUID, TEXT, TEXT, JSONB, TEXT, TEXT);

-- Create the single, flexible function
-- Create the single, flexible function (v2 to avoid cache issues)
CREATE OR REPLACE FUNCTION public.update_match_result_v2(
  p_event_id UUID,
  p_bracket_id TEXT,
  p_match_id TEXT,
  p_match_data JSONB,
  p_bracket_winner_id TEXT DEFAULT NULL,
  p_bracket_runner_up_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_brackets JSONB;
  v_bracket JSONB;
  v_rounds JSONB;
  v_round JSONB;
  v_match JSONB;
  v_updated_brackets JSONB;
  v_updated_rounds JSONB;
  v_round_idx INT;
  v_match_idx INT;
  v_found BOOLEAN := FALSE;
BEGIN
  -- 1. Lock the row for update to ensure serialization
  SELECT brackets INTO v_brackets
  FROM public.sjjp_events
  WHERE id = p_event_id
  FOR UPDATE;

  IF v_brackets IS NULL THEN
    RAISE EXCEPTION 'Event not found or no brackets data';
  END IF;

  -- 2. Get the specific bracket
  v_bracket := v_brackets -> p_bracket_id;
  
  IF v_bracket IS NULL THEN
    RAISE EXCEPTION 'Bracket % not found in event', p_bracket_id;
  END IF;

  -- 3. Search for the match in rounds
  v_rounds := v_bracket -> 'rounds';
  v_updated_rounds := '[]'::jsonb;
  
  -- Iterate through rounds
  IF v_rounds IS NOT NULL THEN
      FOR v_round_idx IN 0 .. jsonb_array_length(v_rounds) - 1 LOOP
        v_round := v_rounds -> v_round_idx;
        
        -- Iterate through matches in round
        FOR v_match_idx IN 0 .. jsonb_array_length(v_round) - 1 LOOP
            v_match := v_round -> v_match_idx;
            
            IF v_match ->> 'id' = p_match_id THEN
                -- Found the match! Replace it with new data
                v_round := jsonb_set(v_round, ARRAY[v_match_idx::text], p_match_data);
                v_found := TRUE;
            END IF;
        END LOOP;
        
        -- Append (potentially updated) round to updated rounds list
        v_updated_rounds := v_updated_rounds || jsonb_build_array(v_round);
      END LOOP;
  END IF;

  -- 4. Check third place match if not found in rounds
  IF NOT v_found THEN
      v_match := v_bracket -> 'third_place_match';
      IF v_match IS NOT NULL AND v_match ->> 'id' = p_match_id THEN
          -- Update third place match
          v_bracket := jsonb_set(v_bracket, '{third_place_match}', p_match_data);
          v_found := TRUE;
      END IF;
  END IF;

  -- 5. If found, save back to database
  IF v_found THEN
      -- If we updated rounds, put them back into the bracket
      IF v_rounds IS NOT NULL THEN
         v_bracket := jsonb_set(v_bracket, '{rounds}', v_updated_rounds);
      END IF;

      -- Update bracket winner/runner-up if provided (for final match)
      IF p_bracket_winner_id IS NOT NULL THEN
         v_bracket := jsonb_set(v_bracket, '{winner_id}', to_jsonb(p_bracket_winner_id));
      END IF;
      
      IF p_bracket_runner_up_id IS NOT NULL THEN
         v_bracket := jsonb_set(v_bracket, '{runner_up_id}', to_jsonb(p_bracket_runner_up_id));
      END IF;
      
      -- Put the updated bracket back into the brackets object
      v_updated_brackets := jsonb_set(v_brackets, ARRAY[p_bracket_id], v_bracket);
      
      -- Update the table
      UPDATE public.sjjp_events
      SET brackets = v_updated_brackets
      WHERE id = p_event_id;
  ELSE
      RAISE EXCEPTION 'Match % not found in bracket %', p_match_id, p_bracket_id;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (staff/admins)
GRANT EXECUTE ON FUNCTION public.update_match_result_v2(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_result_v2(UUID, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;
