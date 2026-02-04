import { supabase } from "@/integrations/supabase/client";
import { Athlete } from "@/types/index";

export const checkInService = {
  /**
   * Updates an athlete's check-in status and related fields.
   */
  checkIn: async (athlete: Athlete) => {
    // Prepare update payload with all check-in related fields
    const updatePayload: Record<string, any> = {
      check_in_status: athlete.check_in_status,
      registered_weight: athlete.registered_weight,
      weight_attempts: athlete.weight_attempts,
    };

    // Include division move fields if they exist
    if (athlete.moved_to_division_id !== undefined) {
      updatePayload.moved_to_division_id = athlete.moved_to_division_id;
    }
    if (athlete.move_reason !== undefined) {
      updatePayload.move_reason = athlete.move_reason;
    }

    const { data, error } = await supabase
      .from('sjjp_athletes')
      .update(updatePayload)
      .eq('id', athlete.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Batch checks in multiple athletes.
   */
  batchCheckIn: async (athleteIds: string[]) => {
    const { error } = await supabase
      .from('sjjp_athletes')
      .update({ check_in_status: 'checked_in' })
      .in('id', athleteIds);

    if (error) throw error;
    return athleteIds;
  }
};
