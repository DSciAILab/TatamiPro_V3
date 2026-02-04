import { supabase } from "@/integrations/supabase/client";
import { Athlete } from "@/types/index";

export const athleteService = {
  /**
   * Update an existing athlete.
   */
  update: async (athlete: Athlete): Promise<void> => {
    // Prepare data for Supabase (remove _division which is a computed field)
    const { _division, ...athleteData } = athlete;
    
    const { error } = await supabase
      .from('sjjp_athletes')
      .update({
        first_name: athleteData.first_name,
        last_name: athleteData.last_name,
        date_of_birth: athleteData.date_of_birth instanceof Date 
          ? athleteData.date_of_birth.toISOString() 
          : athleteData.date_of_birth,
        club: athleteData.club,
        gender: athleteData.gender,
        belt: athleteData.belt,
        weight: athleteData.weight,
        nationality: athleteData.nationality,
        email: athleteData.email,
        phone: athleteData.phone,
        emirates_id: athleteData.emirates_id,
        school_id: athleteData.school_id,
        age: athleteData.age,
        age_division: athleteData.age_division,
        weight_division: athleteData.weight_division,
        registration_status: athleteData.registration_status,
        photo_url: athleteData.photo_url,
        emirates_id_front_url: athleteData.emirates_id_front_url,
        emirates_id_back_url: athleteData.emirates_id_back_url,
        moved_to_division_id: athleteData.moved_to_division_id || null,
        move_reason: athleteData.move_reason || null,
      })
      .eq('id', athlete.id);

    if (error) throw error;
  },

  /**
   * Delete an athlete by ID.
   */
  delete: async (id: string): Promise<void> => {
    const { error } = await supabase.from('sjjp_athletes').delete().eq('id', id);
    if (error) throw error;
  },

  /**
   * Bulk delete athletes by IDs.
   */
  bulkDelete: async (ids: string[]): Promise<void> => {
    const { error } = await supabase.from('sjjp_athletes').delete().in('id', ids);
    if (error) throw error;
  },

  /**
   * Bulk update registration status (Approve/Reject).
   */
  updateRegistrationStatus: async (ids: string[], status: 'approved' | 'rejected'): Promise<void> => {
    const { error } = await supabase
      .from('sjjp_athletes')
      .update({ registration_status: status })
      .in('id', ids);
    
    if (error) throw error;
  },

  /**
   * Update athlete attendance status.
   */
  updateAttendance: async (id: string, status: Athlete['attendance_status']): Promise<void> => {
    const { error } = await supabase
      .from('sjjp_athletes')
      .update({ attendance_status: status })
      .eq('id', id);

    if (error) throw error;
  }
};
