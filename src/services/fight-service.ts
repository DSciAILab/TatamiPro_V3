import { supabase } from "@/integrations/supabase/client";
import { Match } from "@/types/index";

export interface UpdateMatchParams {
  eventId: string;
  bracketId: string;
  matchId: string;
  matchData: Match;
  bracketWinnerId?: string;
  bracketRunnerUpId?: string;
}

export const fightService = {
  /**
   * Updates a match result using the atomic RPC function.
   * This ensures consistency and handles race conditions.
   */
  updateMatchResult: async ({ 
    eventId, 
    bracketId, 
    matchId, 
    matchData, 
    bracketWinnerId, 
    bracketRunnerUpId 
  }: UpdateMatchParams): Promise<void> => {
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
  },

  /**
   * Broadcasts a match update signal to other clients via Realtime.
   * This allows for faster UI updates without waiting for DB polling.
   */
  broadcastMatchUpdate: async (eventId: string, bracketId: string, matchId: string) => {
    const channel = supabase.channel(`event-sync:${eventId}`);
      
    return new Promise<void>((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'match-update',
            payload: { bracketId, matchId, timestamp: Date.now() },
          }).then(() => {
             console.log('[Broadcast] Match update signal sent');
             supabase.removeChannel(channel);
             resolve();
          });
        }
      });
    });
  }
};
