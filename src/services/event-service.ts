import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/local-db";
import { localApi } from "@/lib/local-api";
import { Event, Division } from "@/types/index";
import { processAthleteData } from "@/utils/athlete-utils";
import { parseISO } from "date-fns";

export type DataFetchMode = {
  isLocalServerMode: boolean;
  isOfflineMode: boolean;
};

export const eventService = {
  /**
   * Fetch event data by ID, handling different connection modes (Local, Offline, Cloud).
   * 
   * @param eventId - The ID of the event to fetch.
   * @param mode - The current connection mode configuration.
   * @returns The processed Event object.
   * @throws Error if event is not found or fetch fails.
   */
  getById: async (eventId: string, mode: DataFetchMode): Promise<Event> => {
    const { isLocalServerMode, isOfflineMode } = mode;
    let eventData, athletesData, divisionsData;

    // Priority: Local Server > Offline IndexedDB > Supabase Cloud
    if (isLocalServerMode) {
      // Fetch from Local Server (REST API)
      const { data, error } = await localApi.getEvent(eventId);
      if (error) throw error;
      eventData = data;
      athletesData = data?.athletes || [];
      divisionsData = data?.divisions || [];
    } else if (isOfflineMode) {
      // Fetch from Local IndexedDB
      eventData = await db.events.get(eventId);
      if (!eventData) throw new Error("Event not found locally. Please sync online first.");
      
      athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
      divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
    } else {
      // Fetch from Supabase in Parallel for maximized performance (PERF-001)
      const [eventRes, athletesRes, divisionsRes] = await Promise.all([
        supabase
          .from('sjjp_events')
          .select('*')
          .eq('id', eventId)
          .single(),
        supabase
          .from('sjjp_athletes')
          .select('*')
          .eq('event_id', eventId),
        supabase
          .from('sjjp_divisions')
          .select('*')
          .eq('event_id', eventId)
      ]);

      if (eventRes.error) throw eventRes.error;
      if (athletesRes.error) throw athletesRes.error;
      if (divisionsRes.error) throw divisionsRes.error;

      eventData = eventRes.data;
      athletesData = athletesRes.data;
      divisionsData = divisionsRes.data;
    }

    if (!eventData) throw new Error("Event not found.");

    // Data Processing
    // This transforms raw DB data into the enriched Event type
    const processedAthletes = (athletesData || []).map((a: any) => 
      processAthleteData(a, divisionsData || [], eventData.age_division_settings || [])
    );
    
    // Construct full Event object
    const fullEventData: Event = {
      ...eventData,
      athletes: processedAthletes,
      divisions: divisionsData || [],
      // Parse dates to Date objects if they exist
      check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
      check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
    };

    return fullEventData;
  },

  /**
   * Update event properties in sjjp_events table.
   */
  update: async (eventId: string, data: Partial<Event>): Promise<void> => {
    // Exclude computed/joined fields
    const { athletes, divisions, ...updateData } = data as any;
    
    const payload: any = { ...updateData };
    if (payload.check_in_start_time instanceof Date) payload.check_in_start_time = payload.check_in_start_time.toISOString();
    if (payload.check_in_end_time instanceof Date) payload.check_in_end_time = payload.check_in_end_time.toISOString();

    const { error } = await supabase
      .from('sjjp_events')
      .update(payload)
      .eq('id', eventId);

    if (error) throw error;
  },

  /**
   * Sync divisions for an event (Handle Deletions and Upserts).
   */
  syncDivisions: async (eventId: string, divisions: Division[]): Promise<void> => {
     // A. Get existing divisions from DB to find deletions
     const { data: existingDivisions, error: fetchError } = await supabase
       .from('sjjp_divisions')
       .select('id')
       .eq('event_id', eventId);
     
     if (fetchError) throw fetchError;
     
     // Deduplicate divisions by name as a safety measure (Defense in Depth)
     // Also trim names to ensure consistency
     const uniqueByName = new Map<string, Division>();
     divisions.forEach(d => {
       const trimmedName = d.name.trim();
       if (!uniqueByName.has(trimmedName)) {
         uniqueByName.set(trimmedName, { ...d, name: trimmedName });
       } else {
         console.warn(`[eventService] Redundant division name detected and skipped: ${trimmedName}`);
       }
     });
     const uniqueDivisions = Array.from(uniqueByName.values());

     const existingIds = new Set(existingDivisions?.map(d => d.id) || []);
     const currentIds = new Set(uniqueDivisions.map(d => d.id));
     
     // Find IDs to delete (in DB but not in current state)
     const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));
     
     // B. Perform Deletions (with Soft-Delete Fallback)
     if (idsToDelete.length > 0) {
       try {
         // Attempt physical deletion first
         const { error: deleteError } = await supabase
           .from('sjjp_divisions')
           .delete()
           .in('id', idsToDelete);
         
         if (deleteError) throw deleteError;
       } catch (err) {
         console.warn(`[eventService] Physical deletion failed for ${idsToDelete.length} divisions (likely constraints). Falling back to soft-delete.`, err);
         
         // Soft-delete: mark them as disabled instead of removing
         const { error: softDeleteError } = await supabase
           .from('sjjp_divisions')
           .update({ is_enabled: false })
           .in('id', idsToDelete);
           
         if (softDeleteError) throw softDeleteError;
       }
     }

     // C. Perform Upserts (Insert New / Update Existing)
     const divisionsToUpsert = uniqueDivisions.map(d => ({
       ...d,
       event_id: eventId
     }));
     
     if (divisionsToUpsert.length > 0) {
       const { error: upsertError } = await supabase
         .from('sjjp_divisions')
         .upsert(divisionsToUpsert as any);
         
       if (upsertError) throw upsertError;
     }
  }
};
