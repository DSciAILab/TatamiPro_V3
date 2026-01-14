import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/local-db";
import { useOffline } from "@/context/offline-context";
import { connectionManager } from "@/lib/connection-manager";
import { localApi } from "@/lib/local-api";
import { Event } from "@/types/index";
import { processAthleteData } from "@/utils/athlete-utils";
import { parseISO } from "date-fns";
import { useEffect, useState } from "react";

export const useEventData = (eventId?: string) => {
  const { isOfflineMode } = useOffline();
  const queryClient = useQueryClient();
  const [isLocalServerMode, setIsLocalServerMode] = useState(connectionManager.isLocal);

  // Listen to connection mode changes
  useEffect(() => {
    const unsubscribe = connectionManager.onModeChange((mode) => {
      setIsLocalServerMode(mode === 'local');
    });
    return unsubscribe;
  }, []);

  const fetchEvent = async (): Promise<Event | null> => {
    if (!eventId) return null;

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
      // Fetch from Supabase
      const { data: eData, error: eventError } = await supabase
        .from('sjjp_events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (eventError) throw eventError;
      eventData = eData;

      const { data: aData, error: athletesError } = await supabase
        .from('sjjp_athletes')
        .select('*')
        .eq('event_id', eventId);
      if (athletesError) throw athletesError;
      athletesData = aData;

      const { data: dData, error: divisionsError } = await supabase
        .from('sjjp_divisions')
        .select('*')
        .eq('event_id', eventId);
      if (divisionsError) throw divisionsError;
      divisionsData = dData;
    }

    if (!eventData) throw new Error("Event not found.");

    // Data Processing
    const processedAthletes = (athletesData || []).map((a: any) => 
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
    queryKey: ['event', eventId, isOfflineMode, isLocalServerMode],
    queryFn: fetchEvent,
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });

  // Realtime Subscription Logic
  useEffect(() => {
    if (!eventId) return;

    // If using local server, use Socket.io for real-time
    if (isLocalServerMode) {
      connectionManager.joinEvent(eventId);
      
      // Listen to WebSocket events from local server
      connectionManager.on('event:updated', (data: { eventId: string }) => {
        if (data.eventId === eventId) {
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      });
      
      connectionManager.on('athlete:updated', (data: { eventId: string }) => {
        if (data.eventId === eventId) {
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      });
      
      connectionManager.on('bracket:updated', (data: { eventId: string }) => {
        if (data.eventId === eventId) {
          queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        }
      });

      return () => {
        connectionManager.leaveEvent(eventId);
      };
    }
    
    // If offline mode, no real-time updates
    if (isOfflineMode) return;
    
    // Helper to safely update cache - use predicate to match all variations of event query
    const updateEventCache = (updater: (oldData: Event) => Event) => {
      // Invalidate and update all queries that start with ['event', eventId]
      queryClient.setQueriesData<Event>(
        { queryKey: ['event', eventId], exact: false },
        (oldData) => {
          if (!oldData) return oldData;
          return updater(oldData);
        }
      );
    };

    // Use Supabase real-time for cloud mode
    const channel = supabase
      .channel(`event-${eventId}`)
      // Event updates
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sjjp_events', filter: `id=eq.${eventId}` }, 
        (payload) => {
             updateEventCache(oldData => ({ ...oldData, ...payload.new }));
        })
      // Athlete updates - SMART CACHE UPDATE
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sjjp_athletes', filter: `event_id=eq.${eventId}` }, 
        (payload) => {
            updateEventCache(oldData => {
                 const divisions = oldData.divisions || [];
                 const ageSettings = oldData.age_division_settings || [];
                 
                 let newAthletes = [...(oldData.athletes || [])];
                 
                 if (payload.eventType === 'INSERT') {
                     const processed = processAthleteData(payload.new, divisions, ageSettings);
                     newAthletes.push(processed);
                 } else if (payload.eventType === 'UPDATE') {
                     // Check if only check-in status changed to avoid expensive reprocessing if possible? 
                     // But processAthleteData is fast enough for one item.
                     const processed = processAthleteData(payload.new, divisions, ageSettings);
                     newAthletes = newAthletes.map(a => a.id === payload.new.id ? processed : a);
                 } else if (payload.eventType === 'DELETE') {
                     newAthletes = newAthletes.filter(a => a.id !== payload.old.id);
                 }
                 
                 return { ...oldData, athletes: newAthletes };
            });
        })
      // Division updates - For now, still invalidate because it affects athlete calculation
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sjjp_divisions', filter: `event_id=eq.${eventId}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId] }))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, isOfflineMode, isLocalServerMode, queryClient]);

  return query;
};