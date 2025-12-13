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

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Security Guard for Password Change
  useEffect(() => {
    if (!authLoading && profile && (profile as any).must_change_password) {
      navigate('/change-password');
    }
  }, [profile, authLoading, navigate]);

  const fetchEventData = useCallback(async (type: 'initial' | 'refresh' | 'subscription' = 'initial') => {
    if (hasUnsavedChangesRef.current && type === 'subscription') {
      console.warn("Real-time update ignored due to unsaved local changes.");
      return;
    }
    if (!eventId) return;
    
    // Only trigger full screen loading on initial load
    if (type === 'initial') setLoading(true);
    
    try {
      let eventData, athletesData, divisionsData;

      if (isOfflineMode) {
        eventData = await db.events.get(eventId);
        if (!eventData) throw new Error("Event not found locally. Please sync online first.");
        
        athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
        divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
      } else {
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

      const processedAthletes = (athletesData || []).map(a => processAthleteData(a, divisionsData || [], eventData.age_division_settings || []));
      
      const fullEventData: Event = {
        ...eventData,
        athletes: processedAthletes,
        divisions: divisionsData || [],
        check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
        check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
      };
      setEvent(fullEventData);
    } catch (error: any) {
      // Only show error toast if it's not the initial load (which renders an error component)
      if (type !== 'initial') {
        showError(`Failed to refresh event data: ${error.message}`);
      } else {
        setEvent(null);
      }
    } finally {
      if (type === 'initial') {
        setLoading(false);
        setHasUnsavedChanges(false);
      }
    }
  }, [eventId, isOfflineMode, navigate]);

  useEffect(() => {
    fetchEventData('initial');

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes', filter: `event_id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions', filter: `event_id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchEventData]);

  const handleSaveChanges = async () => {
    if (!event || !eventId || !hasUnsavedChanges) return;
    setIsSaving(true);
    const toastId = showLoading("Saving event settings...");

    try {
      const { athletes, divisions, ...eventToUpdate } = event;
      
      const { error } = await supabase
        .from('events')
        .update({
          ...eventToUpdate,
          check_in_start_time: event.check_in_start_time?.toISOString(),
          check_in_end_time: event.check_in_end_time?.toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      setHasUnsavedChanges(false);
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
    setEvent(prev => {
      if (!prev) return null;
      setHasUnsavedChanges(true);
      return { ...prev, [key]: value };
    });
  }, []);

  return {
    event,
    loading,
    hasUnsavedChanges,
    isSaving,
    handleSaveChanges,
    handleUpdateEventProperty,
    fetchEventData,
  };
};