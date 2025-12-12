"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAppId } from "@/lib/app-id";
import { useAuth } from "@/context/auth-context";
import { Event } from "@/types/index";

const fetchEvents = async (userId?: string): Promise<Event[]> => {
  if (!userId) {
    // If there's no user, we shouldn't be able to see any user-specific events.
    // Depending on RLS, you might want to fetch public events here,
    // but for now, we return an empty array for clarity.
    return [];
  }

  const appId = await getAppId();
  
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('app_id', appId)
    .order('event_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const useEvents = () => {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user?.id;

  return useQuery({
    // The query key now includes the user's ID.
    // When the user logs in or out, this key changes, and React Query automatically refetches the data.
    queryKey: ['events', userId],
    queryFn: () => fetchEvents(userId),
    // The query will only run when auth is no longer loading and we have a user ID.
    enabled: !authLoading && !!userId,
    // Keep data for a short while to avoid flickering on navigation
    staleTime: 1000 * 60, // 1 minute
  });
};