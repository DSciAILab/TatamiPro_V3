import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Match } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { fightService, UpdateMatchParams } from '@/services/fight-service';

export const useUpdateMatchResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateMatchParams) => {
      console.log(`[RPC] Updating match ${params.matchId} in bracket ${params.bracketId} via atomic function...`);
      await fightService.updateMatchResult(params);
      return params;
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
    onSuccess: async (_, { eventId, bracketId, matchId }) => {
      // 1. Invalidate local queries immediately
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });

      // 2. Broadcast update to other clients via Supabase Realtime
      fightService.broadcastMatchUpdate(eventId, bracketId, matchId);
    }
  });
};
