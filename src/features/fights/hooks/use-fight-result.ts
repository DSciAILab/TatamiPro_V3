"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Bracket, Match, FightResultType, Event } from '@/types/index';
import { useUpdateMatchResult } from '@/features/events/hooks/use-event-mutations';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { db } from '@/lib/local-db';
import { supabase } from '@/integrations/supabase/client';

interface UseFightResultOptions {
  event: Event | null;
  eventId: string | undefined;
  divisionId: string | undefined;
  currentMatch: Match | null;
  currentBracket: Bracket | null;
  isOfflineMode: boolean;
  onSuccess?: () => Promise<void>;
  trackChange: (table: string, action: 'create' | 'update' | 'delete', data: any) => Promise<void>;
}

export const useFightResult = ({
  event,
  eventId,
  divisionId,
  currentMatch,
  currentBracket,
  isOfflineMode,
  onSuccess,
  trackChange
}: UseFightResultOptions) => {
  const queryClient = useQueryClient();
  const { mutateAsync: updateMatchResult } = useUpdateMatchResult();

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(undefined);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(undefined);
  const [resultDetails, setResultDetails] = useState<string | undefined>(undefined);
  
  // Dialog states
  const [showDivisionCompleteDialog, setShowDivisionCompleteDialog] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);

  // Helper to save bracket updates
  const handleUpdateBracket = async (updatedBracket: Bracket) => {
    if (!event || !eventId || !currentMatch || !divisionId) return;
    const toastId = showLoading('Salvando resultado...');

    try {
      if (isOfflineMode) {
        // SAVE LOCALLY
        const updatedBrackets = {
           ...event.brackets,
           [divisionId]: updatedBracket,
        };
        const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
            ...event,
            brackets: updatedBrackets,
        });
        const updateData = { brackets: finalBrackets, mat_fight_order: newMatFightOrder };

        await trackChange('events', 'update', { id: eventId, ...updateData });
        const localEvent = await db.events.get(eventId);
        if (localEvent) {
          await db.events.put({ ...localEvent, ...updateData });
        }
        showSuccess("Resultado salvo localmente.");
      } else {
        // SAVE ONLINE (ATOMIC UPDATE via RPC)
        const allMatches = updatedBracket.rounds.flat();
        if (updatedBracket.third_place_match) allMatches.push(updatedBracket.third_place_match);
        
        const match = allMatches.find(m => m.id === currentMatch.id);
        const nextMatchId = match?.next_match_id;
        const nextMatch = nextMatchId ? allMatches.find(m => m.id === nextMatchId) : null;
        
        // 1. Update main match
        if (match) {
             await updateMatchResult({ 
                eventId, 
                bracketId: divisionId, 
                matchId: match.id, 
                matchData: match,
                bracketWinnerId: updatedBracket.winner_id,
                bracketRunnerUpId: updatedBracket.runner_up_id
             });
        }
        
        // 2. Update next match if it exists (propagation)
        if (nextMatch) {
             await updateMatchResult({ 
                eventId, 
                bracketId: divisionId, 
                matchId: nextMatch.id, 
                matchData: nextMatch 
             });
        }

        // 3. Update third place match if affected (propagation)
        if (updatedBracket.third_place_match && updatedBracket.third_place_match.prev_match_ids?.includes(currentMatch.id)) {
            await updateMatchResult({ 
                eventId, 
                bracketId: divisionId, 
                matchId: updatedBracket.third_place_match.id, 
                matchData: updatedBracket.third_place_match 
             });
        }
        
        showSuccess(`Resultado registrado!`);
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      }
      
      if (onSuccess) await onSuccess();
    } catch (error: any) {
      showError(`Falha ao salvar o resultado: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const recordResult = async () => {
    if (!currentMatch || !currentBracket || !selectedWinnerId || !selectedResultType) {
      showError("Por favor, selecione o vencedor e o tipo de resultado.");
      return;
    }

    const loserId = (currentMatch.fighter1_id === selectedWinnerId) ? currentMatch.fighter2_id : currentMatch.fighter1_id;

    // Allow BYE as loser safety check
    if (selectedWinnerId === 'BYE' || (!loserId && loserId !== 'BYE') || !currentMatch.fighter1_id || !currentMatch.fighter2_id) {
       const isBye = currentMatch.fighter1_id === 'BYE' || currentMatch.fighter2_id === 'BYE';
       if (!isBye) {
          showError("Não é possível registrar resultado para esta luta.");
          return;
       }
    }

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket));
    let matchFound = false;

    const processMatchUpdate = (match: Match) => {
      const winnerId = selectedWinnerId!;
      match.winner_id = winnerId;
      match.loser_id = loserId;
      match.result = { type: selectedResultType!, winner_id: winnerId, loser_id: loserId, details: resultDetails };
      matchFound = true;

      // Update next match fighters
      if (match.next_match_id) {
        for (const nextRound of updatedBracket.rounds) {
          const nextMatch = match.next_match_id ? nextRound.find(m => m.id === match.next_match_id) : undefined;
          if (nextMatch) {
            if (nextMatch.prev_match_ids?.[0] === match.id) nextMatch.fighter1_id = selectedWinnerId;
            else if (nextMatch.prev_match_ids?.[1] === match.id) nextMatch.fighter2_id = selectedWinnerId;
          }
        }
      }

      // Propagate loser logic (double elim, etc)
      for (const round of updatedBracket.rounds) {
        for (const m of round) {
           if (m.id === match.next_match_id) continue;
           
           if (m.prev_match_ids?.[0] === match.id) {
              m.fighter1_id = loserId; 
           } else if (m.prev_match_ids?.[1] === match.id) {
              m.fighter2_id = loserId;
           }
        }
      }
    };

    if (currentMatch.round === -1 && updatedBracket.third_place_match?.id === currentMatch.id) {
      processMatchUpdate(updatedBracket.third_place_match);
      updatedBracket.third_place_winner_id = selectedWinnerId;
    } else {
      for (const round of updatedBracket.rounds) {
        const targetMatch = round.find(m => m.id === currentMatch.id);
        if (targetMatch) {
          processMatchUpdate(targetMatch);
          break;
        }
      }
    }

    // Third place match propagation logic
    if (updatedBracket.third_place_match && currentMatch.round > 0 && currentMatch.round === updatedBracket.rounds.length - 1) {
      if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[0]) updatedBracket.third_place_match.fighter1_id = loserId;
      else if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[1]) updatedBracket.third_place_match.fighter2_id = loserId;
    }

    if (matchFound) {
      // Check for division winner
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound?.[0]?.winner_id) {
        updatedBracket.winner_id = finalRound[0].winner_id;
        updatedBracket.runner_up_id = finalRound[0].loser_id;
      }
      
      await handleUpdateBracket(updatedBracket);
      
      // Check status for dialogs
      const allMatches = updatedBracket.rounds.flat();
      if (updatedBracket.third_place_match) allMatches.push(updatedBracket.third_place_match);
      
      const hasRemainingFights = allMatches.some(m => 
        !m.winner_id && 
        m.fighter1_id && m.fighter1_id !== 'BYE' &&
        m.fighter2_id && m.fighter2_id !== 'BYE'
      );
      
      if (!hasRemainingFights && updatedBracket.winner_id) {
        setShowDivisionCompleteDialog(true);
      } else {
        const currentRoundMatches = currentBracket.rounds[currentMatch.round - 1];
        const allMatchesInRoundCompleted = currentRoundMatches?.every(m => m.id === currentMatch.id || m.winner_id !== undefined);
        if (allMatchesInRoundCompleted) {
          setShowRoundEndDialog(true);
        }
      }
    } else {
      showError("Luta não encontrada no bracket.");
    }
  };

  const revertResult = async () => {
    if (!currentMatch || !currentBracket) return;

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket));
    let matchToRevert: Match | null = null;
    
    // Find matching match
    if (currentMatch.round === -1 && updatedBracket.third_place_match?.id === currentMatch.id) {
      matchToRevert = updatedBracket.third_place_match;
    } else {
      for (const round of updatedBracket.rounds) {
        const found = round.find(m => m.id === currentMatch.id);
        if (found) {
          matchToRevert = found;
          break;
        }
      }
    }

    if (!matchToRevert) {
      showError("Luta não encontrada no bracket.");
      return;
    }

    // Validation checks
    if (matchToRevert.next_match_id) {
      for (const round of updatedBracket.rounds) {
        const nextMatch = round.find(m => m.id === matchToRevert!.next_match_id);
        if (nextMatch?.winner_id) {
          showError("Não é possível reverter: a próxima luta já possui resultado. Reverta primeiro a luta seguinte.");
          return;
        }
      }
    }

    // Third place check
    if (updatedBracket.third_place_match && matchToRevert.round === updatedBracket.rounds.length) {
      if (updatedBracket.third_place_match.winner_id) {
        showError("Não é possível reverter: a luta pelo 3º lugar já possui resultado. Reverta-a primeiro.");
        return;
      }
    }

    const previousWinnerId = matchToRevert.winner_id;
    const previousLoserId = matchToRevert.loser_id;

    // Clear result
    matchToRevert.winner_id = undefined;
    matchToRevert.loser_id = undefined;
    matchToRevert.result = undefined;

    // Clear propogated fighters
    if (matchToRevert.next_match_id && previousWinnerId) {
      for (const round of updatedBracket.rounds) {
        const nextMatch = round.find(m => m.id === matchToRevert!.next_match_id);
        if (nextMatch) {
          if (nextMatch.fighter1_id === previousWinnerId && nextMatch.prev_match_ids?.[0] === matchToRevert!.id) {
            nextMatch.fighter1_id = undefined;
          } else if (nextMatch.fighter2_id === previousWinnerId && nextMatch.prev_match_ids?.[1] === matchToRevert!.id) {
            nextMatch.fighter2_id = undefined;
          }
          break;
        }
      }
    }

    if (previousLoserId) {
      for (const round of updatedBracket.rounds) {
        for (const m of round) {
          if (m.id === matchToRevert!.next_match_id) continue;
          if (m.fighter1_id === previousLoserId && m.prev_match_ids?.[0] === matchToRevert!.id) {
            m.fighter1_id = undefined;
          } else if (m.fighter2_id === previousLoserId && m.prev_match_ids?.[1] === matchToRevert!.id) {
            m.fighter2_id = undefined;
          }
        }
      }
      // Check third place match
      if (updatedBracket.third_place_match) {
        if (updatedBracket.third_place_match.fighter1_id === previousLoserId && 
            updatedBracket.third_place_match.prev_match_ids?.[0] === matchToRevert!.id) {
          updatedBracket.third_place_match.fighter1_id = undefined;
        } else if (updatedBracket.third_place_match.fighter2_id === previousLoserId && 
                   updatedBracket.third_place_match.prev_match_ids?.[1] === matchToRevert!.id) {
          updatedBracket.third_place_match.fighter2_id = undefined;
        }
      }
    }

    // Clear overall winners
    const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
    if (finalRound?.[0]?.id === matchToRevert!.id) {
      updatedBracket.winner_id = undefined;
      updatedBracket.runner_up_id = undefined;
    }
    if (currentMatch.round === -1 && updatedBracket.third_place_match?.id === currentMatch.id) {
      updatedBracket.third_place_winner_id = undefined;
    }

    await handleUpdateBracket(updatedBracket);
    showSuccess("Resultado da luta revertido com sucesso!");
  };

  return {
    selectedWinnerId,
    setSelectedWinnerId,
    selectedResultType,
    setSelectedResultType,
    resultDetails,
    setResultDetails,
    recordResult,
    revertResult,
    showDivisionCompleteDialog,
    setShowDivisionCompleteDialog,
    showRoundEndDialog,
    setShowRoundEndDialog
  };
};
