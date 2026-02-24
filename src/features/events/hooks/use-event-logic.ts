import { useReducer, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Event, Athlete, Division, Bracket, AgeDivisionSetting } from '@/types/index';
import { eventReducer, initialState } from '../reducers/event-reducer';
import { eventService } from '@/services/event-service';
import { athleteService } from '@/services/athlete-service';
import { bracketService } from '@/services/bracket-service';
import { showLoading, showSuccess, showError, dismissToast } from '@/utils/toast';

export const useEventLogic = (eventId: string | undefined, serverEvent: Event | undefined) => {
  const [state, dispatch] = useReducer(eventReducer, initialState);
  const queryClient = useQueryClient();
  const hasUnsavedChangesRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    hasUnsavedChangesRef.current = state.hasUnsavedChanges;
  }, [state.hasUnsavedChanges]);

  // Sync with Server Data
  useEffect(() => {
    if (serverEvent) {
      if (!hasUnsavedChangesRef.current) {
        // No unsaved changes - sync everything from server
        dispatch({ type: 'SET_EVENT', payload: serverEvent });
      } else {
        // Has unsaved changes - only sync brackets and mat_fight_order (always fresh)
        // Also sync athletes as they may be updated elsewhere (check-ins, etc)
        if (state.event) {
             const updatedEvent = {
                 ...state.event,
                 brackets: serverEvent.brackets,
                 mat_fight_order: serverEvent.mat_fight_order,
                 athletes: serverEvent.athletes
             };
             // We manipulate state directly via dispatch but preserve unsaved status
             // Using a specialized action or just ensuring we don't reset 'hasUnsavedChanges'
             // The reducer's SET_EVENT resets it. So we need a different approach or custom logic.
             // Let's manually trigger an update that respects existing changes
             // Actually, the reducer simplifies this. We can just update specific fields.
             dispatch({ 
                 type: 'UPDATE_BRACKETS', 
                 payload: { 
                     brackets: serverEvent.brackets || {}, 
                     fightOrder: serverEvent.mat_fight_order || {} 
                 } 
             });
             
             // For athletes, we might want to merge or just replace if we trust server more?
             // Usually athletes are source of truth from server unless editing.
             // Let's assume server athletes are source of truth.
             dispatch({ type: 'BATCH_UPDATE_ATHLETES', payload: serverEvent.athletes || [] });
        }
      }
    }
  }, [serverEvent]);

  // --- Actions ---

  const updateEventProperty = useCallback(<K extends keyof Event>(key: K, value: Event[K]) => {
    dispatch({ type: 'UPDATE_EVENT_FIELD', payload: { key, value } });
  }, []);

  const saveChanges = useCallback(async () => {
    if (!state.event || !eventId || !state.hasUnsavedChanges) return;
    
    dispatch({ type: 'SET_SAVING', payload: true });
    const toastId = showLoading("Saving event settings...");

    try {
      // 1. Update Event Details
      await eventService.update(eventId, state.event);

      // 2. Sync Divisions
      if (state.event.divisions) {
        await eventService.syncDivisions(eventId, state.event.divisions);
      }

      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false });
      dismissToast(toastId);
      showSuccess("Event settings saved successfully!");
      
      // Force refresh
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });

    } catch (error: any) {
      dismissToast(toastId);
      showError("Failed to save event settings: " + error.message);
      console.error("Save Error:", error);
    } finally {
      dispatch({ type: 'SET_SAVING', payload: false });
    }
  }, [state.event, eventId, state.hasUnsavedChanges, queryClient]);

  const updateBracketsAndFightOrder = useCallback(async (updatedBrackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>, shouldSave: boolean = false) => {
      // 1. Update State
      dispatch({ type: 'UPDATE_BRACKETS', payload: { brackets: updatedBrackets, fightOrder: matFightOrder } });
      
      if (!shouldSave) {
          dispatch({ type: 'SET_UNSAVED_CHANGES', payload: true });
      }

      // 2. Persist if requested
      if (shouldSave && state.event && eventId) {
         try {
            const toastId = showLoading("Saving brackets...");
            await bracketService.saveBracketsAndFightOrder(eventId, updatedBrackets, matFightOrder);
            dismissToast(toastId);
            showSuccess("Brackets updated and saved successfully!");
            // If saved successfully, we might want to clear unsaved changes flag if brackets were the only change?
            // But we don't track what changed exactly. 
         } catch (err: any) {
            console.error("Error saving brackets:", err);
            showError("Error saving brackets: " + err.message);
            dispatch({ type: 'SET_UNSAVED_CHANGES', payload: true });
         }
      }
  }, [state.event, eventId]);

  const updateAthlete = useCallback(async (updatedAthlete: Athlete) => {
    if (!state.event || !eventId) return;
    try {
      const toastId = showLoading("Saving athlete changes...");
      await athleteService.update(updatedAthlete);
      
      dispatch({ type: 'UPDATE_ATHLETE', payload: updatedAthlete });
      
      dismissToast(toastId);
      showSuccess("Athlete updated successfully!");
    } catch (error: any) {
      showError("Failed to update athlete: " + error.message);
    }
  }, [state.event, eventId]);

  const deleteAthlete = useCallback(async (id: string) => {
      if (!state.event || !eventId) return;
      const toastId = showLoading(`Deleting athlete...`);
      try {
        await athleteService.delete(id);
        dispatch({ type: 'DELETE_ATHLETE', payload: id });
        dismissToast(toastId);
        showSuccess('Athlete deleted successfully');
      } catch (error: any) {
        dismissToast(toastId);
        showError('Failed to delete athlete: ' + error.message);
      }
  }, [state.event, eventId]);

  const bulkDeleteAthletes = useCallback(async (ids: string[]) => {
      if (!state.event || !eventId || ids.length === 0) return;
      const toastId = showLoading(`Deleting ${ids.length} athletes...`);
      try {
        await athleteService.bulkDelete(ids);
        dispatch({ type: 'BULK_DELETE_ATHLETES', payload: ids });
        dismissToast(toastId);
        showSuccess('Athletes deleted successfully');
      } catch (error: any) {
        dismissToast(toastId);
        showError('Failed to delete athletes: ' + error.message);
      }
  }, [state.event, eventId]);

  const updateRegistrationStatus = useCallback(async (ids: string[], status: 'approved' | 'rejected' | 'under_approval') => {
    if (!state.event || !eventId || ids.length === 0) return;
    const toastId = showLoading(`Updating ${ids.length} athlete(s)...`);
    try {
      await athleteService.updateRegistrationStatus(ids, status);
      dispatch({ type: 'UPDATE_REGISTRATION_STATUS', payload: { ids, status } });
      dismissToast(toastId);
      showSuccess(`${ids.length} athlete(s) ${status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'reverted to pending'} successfully!`);
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to update athletes: ${error.message}`);
    }
  }, [state.event, eventId]);

  const updateAttendance = useCallback(async (athleteId: string, status: any) => {
    try {
      await athleteService.updateAttendance(athleteId, status);
      dispatch({ type: 'UPDATE_ATTENDANCE', payload: { id: athleteId, status } });
      showSuccess('Attendance updated successfully!');
    } catch (err: any) {
      showError('Error updating attendance.');
    }
  }, []);

  // Setters for UI state
  const setSelectedAthletes = useCallback((ids: string[]) => {
      dispatch({ type: 'SET_SELECTED_ATHLETES', payload: ids });
  }, []);

  const setEditingAthlete = useCallback((athlete: Athlete | null) => {
      dispatch({ type: 'SET_EDITING_ATHLETE', payload: athlete });
  }, []);

  const batchUpdateAthletes = useCallback((athletes: Athlete[]) => {
      dispatch({ type: 'BATCH_UPDATE_ATHLETES', payload: athletes });
  }, []);

  return {
    state,
    actions: {
      updateEventProperty,
      saveChanges,
      updateBracketsAndFightOrder,
      updateAthlete,
      deleteAthlete,
      bulkDeleteAthletes,
      updateRegistrationStatus,
      updateAttendance,
      setSelectedAthletes,
      setEditingAthlete,
      batchUpdateAthletes
    },
    dispatch
  };
};
