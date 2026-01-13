import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Athlete, Event } from "@/types/index";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";

interface CheckInMutationVariables {
  athlete: Athlete;
}

interface BatchCheckInMutationVariables {
  athleteIds: string[];
}

export const useCheckInMutation = (eventId: string) => {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: async ({ athlete }: CheckInMutationVariables) => {
      // Prepare update payload with all check-in related fields
      const updatePayload: Record<string, any> = {
        check_in_status: athlete.check_in_status,
        registered_weight: athlete.registered_weight,
        weight_attempts: athlete.weight_attempts,
      };

      // Include division move fields if they exist
      if (athlete.moved_to_division_id !== undefined) {
        updatePayload.moved_to_division_id = athlete.moved_to_division_id;
      }
      if (athlete.move_reason !== undefined) {
        updatePayload.move_reason = athlete.move_reason;
      }

      const { data, error } = await supabase
        .from('sjjp_athletes')
        .update(updatePayload)
        .eq('id', athlete.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ athlete }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });

      // Snapshot the previous value
      const previousEvent = queryClient.getQueryData<Event>(['event', eventId]);

      // Optimistically update to the new value
      if (previousEvent && previousEvent.athletes) {
        const newAthletes = previousEvent.athletes.map((a) =>
          a.id === athlete.id ? { ...a, ...athlete } : a
        );
        
        queryClient.setQueryData<Event>(['event', eventId], {
          ...previousEvent,
          athletes: newAthletes,
        });
      }

      return { previousEvent };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
      showError(`Failed to update check-in: ${err.message}`);
    },
    onSuccess: (_, { athlete }) => {
      const statusMessage = athlete.check_in_status === 'checked_in' 
        ? 'checked in' 
        : athlete.check_in_status === 'overweight'
          ? 'marked as overweight'
          : 'check-in cancelled';
      
      showSuccess(`${athlete.first_name} ${athlete.last_name} ${statusMessage} successfully!`);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server sync
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  const batchCheckInMutation = useMutation({
    mutationFn: async ({ athleteIds }: BatchCheckInMutationVariables) => {
      const toastId = showLoading(`Checking in ${athleteIds.length} athletes...`);
      try {
        const { error } = await supabase
          .from('sjjp_athletes')
          .update({ check_in_status: 'checked_in' })
          .in('id', athleteIds);

        if (error) throw error;
        dismissToast(toastId);
        return athleteIds;
      } catch (error) {
        dismissToast(toastId);
        throw error;
      }
    },
    onMutate: async ({ athleteIds }) => {
      await queryClient.cancelQueries({ queryKey: ['event', eventId] });
      const previousEvent = queryClient.getQueryData<Event>(['event', eventId]);

      if (previousEvent && previousEvent.athletes) {
        const newAthletes = previousEvent.athletes.map((a) =>
          athleteIds.includes(a.id) ? { ...a, check_in_status: 'checked_in' as const } : a
        );
        
        queryClient.setQueryData<Event>(['event', eventId], {
          ...previousEvent,
          athletes: newAthletes,
        });
      }

      return { previousEvent };
    },
    onError: (err, variables, context) => {
      if (context?.previousEvent) {
        queryClient.setQueryData(['event', eventId], context.previousEvent);
      }
      showError(`Failed to batch check-in: ${err.message}`);
    },
    onSuccess: (_, { athleteIds }) => {
      showSuccess(`${athleteIds.length} athletes checked in successfully!`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
    },
  });

  return {
    checkInAthlete: checkInMutation.mutate,
    isCheckInPending: checkInMutation.isPending,
    batchCheckIn: batchCheckInMutation.mutate,
    isBatchCheckInPending: batchCheckInMutation.isPending
  };
};
