import { supabase } from "@/integrations/supabase/client";
import { Bracket } from "@/types/index";

export const bracketService = {
  /**
   * Save generated brackets and mat fight order to the event.
   */
  saveBracketsAndFightOrder: async (
    eventId: string, 
    brackets: Record<string, Bracket>, 
    matFightOrder: Record<string, string[]>
  ): Promise<void> => {
    const { error } = await supabase
      .from('sjjp_events')
      .update({
        brackets: brackets,
        mat_fight_order: matFightOrder
      })
      .eq('id', eventId);

    if (error) throw error;
  }
};
