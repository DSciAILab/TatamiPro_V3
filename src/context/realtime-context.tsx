import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface RealtimeContextType {
  isConnected: boolean;
}

const RealtimeContext = createContext<RealtimeContextType>({ isConnected: false });

export const useRealtime = () => useContext(RealtimeContext);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase.channel('global-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
        },
        (payload) => {
          console.log('[Realtime] Change received!', payload);
          
          // Intelligent invalidation based on table
          const table = payload.table;
          
          if (table === 'sjjp_events') {
            queryClient.invalidateQueries({ queryKey: ['event'] });
            queryClient.invalidateQueries({ queryKey: ['events'] });
          } else if (table === 'sjjp_matches' || table === 'sjjp_brackets') {
             // For matches/brackets, we might want to be more specific if we had the eventId
             // But invalidating generic keys works for safety
             queryClient.invalidateQueries({ queryKey: ['event'] }); 
             // If you have specific match queries:
             queryClient.invalidateQueries({ queryKey: ['matches'] });
             queryClient.invalidateQueries({ queryKey: ['brackets'] });
          } else if (table === 'sjjp_athletes') {
             queryClient.invalidateQueries({ queryKey: ['event'] }); // Athletes are part of event usually
             queryClient.invalidateQueries({ queryKey: ['athletes'] });
          }
          
          // Optional: Show toast for major updates? Might be too noisy.
          // toast.info(`Update received for ${table}`);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to global changes');
          setIsConnected(true);
        } else if (status === 'CHANNEL_ERROR') {
           console.error('[Realtime] Connection error');
           setIsConnected(false);
        } else if (status === 'TIMED_OUT') {
            console.error('[Realtime] Connection timed out');
            setIsConnected(false);
        } else if (status === 'CLOSED') {
            setIsConnected(false);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <RealtimeContext.Provider value={{ isConnected }}>
      {children}
    </RealtimeContext.Provider>
  );
};
