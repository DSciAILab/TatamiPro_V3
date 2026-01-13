"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useOffline } from '@/context/offline-context';
import { db } from '@/lib/local-db';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { processAthleteData } from '@/utils/athlete-utils';
import { Event } from '@/types/index';
import { useAuth } from '@/context/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface UseEventDataResult {
  event: Event | null;
  loading: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  handleSaveChanges: () => Promise<void>;
  handleUpdateEventProperty: <K extends keyof Event>(key: K, value: Event[K]) => void;
  fetchEventData: (type?: 'initial' | 'refresh' | 'subscription') => Promise<void>;
}

export const useEventData = (): UseEventDataResult => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOfflineMode } = useOffline();
  const { profile, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  // Local state for editing
  const [localEvent, setLocalEvent] = useState<Event | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Security Guard
  useEffect(() => {
    if (!authLoading && profile && (profile as any).must_change_password) {
      navigate('/change-password');
    }
  }, [profile, authLoading, navigate]);

  // Query Function
  const fetchEventDataFn = async () => {
    if (!eventId) throw new Error("No event ID provided");

    let eventData, athletesData, divisionsData;

    if (isOfflineMode) {
      eventData = await db.events.get(eventId);
      if (!eventData) throw new Error("Event not found locally. Please sync online first.");
      
      athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
      divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
    } else {
      // Parallel fetching for speed
      const [eventRes, athletesRes, divisionsRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', eventId).single(),
        supabase.from('athletes').select('*').eq('event_id', eventId),
        supabase.from('divisions').select('*').eq('event_id', eventId)
      ]);

      if (eventRes.error) throw eventRes.error;
      if (athletesRes.error) throw athletesRes.error;
      if (divisionsRes.error) throw divisionsRes.error;

      eventData = eventRes.data;
      athletesData = athletesRes.data;
      divisionsData = divisionsRes.data;
    }

    if (!eventData) throw new Error("Event not found.");

    const processedAthletes = (athletesData || []).map(a => 
      processAthleteData(a, divisionsData || [], eventData.age_division_settings || [])
    );
    
    // Construct full event object
    const fullEventData: Event = {
      ...eventData,
      athletes: processedAthletes,
      divisions: divisionsData || [],
      check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
      check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
    };

    return fullEventData;
  };

  // React Query
  const { data: serverEvent, isLoading, error, refetch } = useQuery({
    queryKey: ['event', eventId],
    queryFn: fetchEventDataFn,
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes stale time
    gcTime: 1000 * 60 * 30, // 30 minutes cache time
    refetchOnWindowFocus: false, // Prevent aggressive refetching
  });

  // Sync Server Data to Local State
  useEffect(() => {
    if (serverEvent && !hasUnsavedChangesRef.current) {
      setLocalEvent(serverEvent);
    }
  }, [serverEvent]);

  // Error Handling
  useEffect(() => {
    if (error) {
       showError(`Failed to load event data: ${(error as Error).message}`);
    }
  }, [error]);

  // Realtime Subscription
  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, 
        () => {
           if (!hasUnsavedChangesRef.current) queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes', filter: `event_id=eq.${eventId}` }, 
        () => {
           if (!hasUnsavedChangesRef.current) queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions', filter: `event_id=eq.${eventId}` }, 
        (payload) => {
           if (!hasUnsavedChangesRef.current) queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, queryClient]);

  // Legacy Wrapper for Manual Fetch
  const fetchEventData_Legacy = useCallback(async (type: 'initial' | 'refresh' | 'subscription' = 'initial') => {
    if (hasUnsavedChangesRef.current && type === 'subscription') {
      console.warn("Update ignored due to unsaved local changes.");
      return;
    }
    // Just refetch via React Query
    await refetch();
  }, [refetch]);

  const handleSaveChanges = async () => {
    if (!localEvent || !eventId || !hasUnsavedChanges) return;
    setIsSaving(true);
    const toastId = showLoading("Saving event settings...");

    try {
      const { athletes, divisions, ...eventToUpdate } = localEvent;
      
      const { error } = await supabase
        .from('events')
        .update({
          ...eventToUpdate,
          check_in_start_time: localEvent.check_in_start_time?.toISOString(),
          check_in_end_time: localEvent.check_in_end_time?.toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      setHasUnsavedChanges(false);
      // Invalidate query to ensure server state matches what we just saved (and re-fetch to get any triggers etc)
      await queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      
      dismissToast(toastId);
      showSuccess("Event settings saved successfully!");
    } catch (error: any) {
      dismissToast(toastId);
      showError("Failed to save event settings: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEventProperty = useCallback(<K extends keyof Event>(key: K, value: Event[K]) => {
    setLocalEvent(prev => {
      if (!prev) return null;
      setHasUnsavedChanges(true);
      return { ...prev, [key]: value };
    });
  }, []);

  return {
    event: localEvent,
    loading: isLoading && !localEvent, // Show loading only if we have no data at all
    hasUnsavedChanges,
    isSaving,
    handleSaveChanges,
    handleUpdateEventProperty,
    fetchEventData: fetchEventData_Legacy,
  };
};