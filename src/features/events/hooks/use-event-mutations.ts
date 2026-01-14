import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Match, Bracket } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

interface UpdateMatchParams {
  eventId: string;
  bracketId: string;
  matchId: string;
  matchData: Match;
  bracketWinnerId?: string;
  bracketRunnerUpId?: string;
}

export const useUpdateMatchResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, bracketId, matchId, matchData, bracketWinnerId, bracketRunnerUpId }: UpdateMatchParams) => {
      console.log(`[RPC] Updating match ${matchId} in bracket ${bracketId} via atomic function...`);
      const { error } = await supabase.rpc('update_match_result_v2', {
        p_event_id: eventId,
        p_bracket_id: bracketId,
        p_match_id: matchId,
        p_match_data: matchData,
        p_bracket_winner_id: bracketWinnerId || null,
        p_bracket_runner_up_id: bracketRunnerUpId || null
      });

      if (error) {
        console.error('[RPC] Error updating match:', error);
        throw error;
      }
      
      return { eventId, bracketId, matchId, matchData };
    },
    onMutate: async ({ eventId, bracketId, matchId, matchData }) => {
      // Optimistic Update
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });
      
      const previousEvent = queryClient.getQueryData(['event', eventId]);
      
      queryClient.setQueryData(['event', eventId], (old: any) => {
        if (!old || !old.brackets) return old;
        
        const newBrackets = { ...old.brackets };
        const bracket = { ...newBrackets[bracketId] };
        
        if (!bracket) return old;
        
        // Find and update match in rounds
        let found = false;
        if (bracket.rounds) {
          bracket.rounds = bracket.rounds.map((round: Match[]) => 
            round.map((m: Match) => {
              if (m.id === matchId) {
                found = true;
                return matchData;
              }
              return m;
            })
          );
        }
        
        // Check third place match
        if (!found && bracket.third_place_match && bracket.third_place_match.id === matchId) {
           bracket.third_place_match = matchData;
        }
        
        newBrackets[bracketId] = bracket;
        
        return {
          ...old,
          brackets: newBrackets
        };
      });
      
      return { previousEvent };
    },
    onError: (err, newTodo, context) => {
      showError("Failed to save match result: " + err.message);
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', newTodo.eventId], context.previousEvent);
      }
    },
    onSuccess: (_, { eventId }) => {
      // The update_match_result RPC updates the database, which triggers the realtime subscription.
      // The verify global sync logic we added earlier will then invalidate the query and re-fetch.
      // So technically we don't need to do much here, but invalidating explicitly is safe.
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    }
  });
};
