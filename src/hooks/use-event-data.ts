import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/local-db";
import { useOffline } from "@/context/offline-context";
import { Event } from "@/types/index";
import { processAthleteData } from "@/utils/athlete-utils";
import { parseISO } from "date-fns";
import { useEffect } from "react";

export const useEventData = (eventId?: string) => {
  const { isOfflineMode } = useOffline();
  const queryClient = useQueryClient();

  const fetchEvent = async (): Promise<Event | null> => {
    if (!eventId) return null;

    let eventData, athletesData, divisionsData;

    if (isOfflineMode) {
      // Fetch from Local IndexedDB
      eventData = await db.events.get(eventId);
      if (!eventData) throw new Error("Event not found locally. Please sync online first.");
      
      athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
      divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
    } else {
      // Fetch from Supabase
      const { data: eData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (eventError) throw eventError;
      eventData = eData;

      const { data: aData, error: athletesError } = await supabase
        .from('athletes')
        .select('*')
        .eq('event_id', eventId);
      if (athletesError) throw athletesError;
      athletesData = aData;

      const { data: dData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('event_id', eventId);
      if (divisionsError) throw divisionsError;
      divisionsData = dData;
    }

    if (!eventData) throw new Error("Event not found.");

    // Data Processing
    const processedAthletes = (athletesData || []).map(a => 
      processAthleteData(a, divisionsData || [], eventData.age_division_settings || [])
    );
    
    const fullEventData: Event = {
      ...eventData,
      athletes: processedAthletes,
      divisions: divisionsData || [],
      check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
      check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
    };

    return fullEventData;
  };

  const query = useQuery({
    queryKey: ['event', eventId, isOfflineMode],
    queryFn: fetchEvent,
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Realtime Subscription Logic
  useEffect(() => {
    if (!eventId || isOfflineMode) return;

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes', filter: `event_id=eq.${eventId}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions', filter: `event_id=eq.${eventId}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, isOfflineMode, queryClient]);

  return query;
};