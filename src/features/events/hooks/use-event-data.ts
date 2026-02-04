import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOffline } from "@/context/offline-context";
import { connectionManager } from "@/lib/connection-manager";
import { eventService } from "@/services/event-service";
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

  const fetchEvent = async () => {
    if (!eventId) return null;
    return eventService.getById(eventId, { isLocalServerMode, isOfflineMode });
  };

  const query = useQuery({
    queryKey: ['event', eventId, isOfflineMode, isLocalServerMode],
    queryFn: fetchEvent,
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes cache
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
      // Event updates (including brackets and mat_fight_order)
      // NOTE: We invalidate and refetch instead of using payload directly because
      // Supabase Realtime may truncate large JSONB columns like brackets
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sjjp_events', filter: `id=eq.${eventId}` }, 
        (payload) => {
             console.log('[Realtime] Event UPDATE received - invalidating cache to refetch fresh data');
             // Force refetch instead of using potentially incomplete payload
             queryClient.invalidateQueries({ queryKey: ['event', eventId], exact: false });
        })
      // Athlete updates - STRICT SYNC: Invalidate & Refetch
      // Replaces previous optimistic logic to guarantee consistency across all devices
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sjjp_athletes', filter: `event_id=eq.${eventId}` }, 
        (payload) => {
             console.log('[Realtime] Athlete change detected - invalidating cache to force sync');
             queryClient.invalidateQueries({ queryKey: ['event', eventId], exact: false });
        })
      // Division updates
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sjjp_divisions', filter: `event_id=eq.${eventId}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['event', eventId], exact: false }))
      .subscribe();

    // 2. Broadcast Channel (Direct Client-to-Client Sync)
    // Listens for explicit signals from other clients (faster than DB)
    const syncChannel = supabase.channel(`event-sync:${eventId}`)
      .on('broadcast', { event: 'match-update' }, (payload) => {
        console.log('[Realtime] Broadcast received:', payload);
        queryClient.invalidateQueries({ queryKey: ['event', eventId], exact: false });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(syncChannel);
    };
  }, [eventId, isOfflineMode, isLocalServerMode, queryClient]);

  return query;
};