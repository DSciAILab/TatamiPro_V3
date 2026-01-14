"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Match, Athlete, Bracket, FightResultType, Event, Division } from '@/types/index';
import { UserRound, Trophy, ArrowLeft, ArrowRight, List, RotateCcw } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { supabase } from '@/integrations/supabase/client';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import { useOffline } from '@/context/offline-context'; // Import offline context
import { db } from '@/lib/local-db'; // Import local DB

const getRoundName = (roundIndex: number, totalRounds: number, isThirdPlaceMatch: boolean = false): string => {
  if (isThirdPlaceMatch) return 'Luta pelo 3º Lugar';
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-final';
    case 3: return 'Quartas de Final';
    case 4: return 'Oitavas de Final';
    default: return `Rodada ${roundIndex + 1}`;
  }
};

const FightDetail: React.FC = () => {
  const { eventId, divisionId, matchId } = useParams<{ eventId: string; divisionId: string; matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  // const { isOfflineMode, trackChange } = useOffline(); // Use offline hook
  const isOfflineMode = false;
  const trackChange = async (table: string, action: 'create' | 'update' | 'delete', data: any) => {};
  
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentBracket, setCurrentBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(undefined);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(undefined);
  const [resultDetails, setResultDetails] = useState<string | undefined>(undefined);
  const [showPostFightOptions, setShowPostFightOptions] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);
  const [showDivisionCompleteDialog, setShowDivisionCompleteDialog] = useState(false);
  const [showRevertDialog, setShowRevertDialog] = useState(false);

  const loadFightData = useCallback(async () => {
    if (!eventId || !divisionId || !matchId) return;
    setLoading(true);
    try {
      let eventData: Event;
      let athletesData: Athlete[] = [];
      let divisionsData: Division[] = [];

      if (isOfflineMode) {
        // FETCH FROM LOCAL DB (OPTIMIZED)
        const eData = await db.events.get(eventId);
        if (!eData) throw new Error("Event not found locally. Please sync online first.");
        eventData = eData;

        // Extract match first to know which athletes to fetch
        const bracket = eData.brackets?.[divisionId];
        if (!bracket) throw new Error("Bracket não encontrado para esta divisão.");
        
        const match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
        if (!match) throw new Error("Luta não encontrada.");
        
        const fighterIds = [match.fighter1_id, match.fighter2_id].filter(id => id && id !== 'BYE') as string[];
        
        if (fighterIds.length > 0) {
          athletesData = await db.athletes.where('id').anyOf(fighterIds).toArray();
        }
        
        const dData = await db.divisions.get(divisionId);
        if (dData) divisionsData = [dData];
      } else {
        // FETCH FROM SUPABASE (OPTIMIZED)
        // 1. Fetch Event first to get brackets
        const { data: eData, error: eventError } = await supabase.from('sjjp_events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;
        eventData = eData;

        const bracket = eventData.brackets?.[divisionId];
        if (!bracket) throw new Error("Bracket não encontrado para esta divisão.");

        let match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
        
        // Navigation State Fallback/Override logic
        // If we have match data in navigation state (from BracketView), use it if:
        // 1. Match not found in DB bracket
        // 2. DB match is missing fighters that are present in state match (sync lag)
        const stateMatch = location.state?.match as Match | undefined;
        if (stateMatch && stateMatch.id === matchId) {
           if (!match || 
               (!match.fighter1_id && stateMatch.fighter1_id) || 
               (!match.fighter2_id && stateMatch.fighter2_id)) {
               console.log('[FightDetail] Using match data from navigation state (sync lag compensation)');
               match = stateMatch;
           }
        }
        
        if (!match) throw new Error("Luta não encontrada.");

        // 2. Determine necessary fighter IDs
        const fighterIds = [match.fighter1_id, match.fighter2_id].filter(id => id && id !== 'BYE') as string[];

        // 3. Fetch ONLY involved athletes
        if (fighterIds.length > 0) {
          const { data: aData, error: athletesError } = await supabase.from('sjjp_athletes').select('*').in('id', fighterIds);
          if (athletesError) throw athletesError;
          athletesData = aData;
        }
        
        // 4. Fetch ONLY the relevant division (optional context)
        const { data: dData, error: divisionsError } = await supabase.from('sjjp_divisions').select('*').eq('id', divisionId);
        if (divisionsError) throw divisionsError;
        divisionsData = dData;
      }

      // No need to process ALL athletes against ALL divisions anymore.
      // We process only the fetched athletes.
      const processedAthletes = athletesData.map(a => processAthleteData(a, divisionsData));

      const fullEventData: Event = {
        ...eventData,
        athletes: processedAthletes, // Now contains only relevant athletes
        divisions: divisionsData,    // Now contains only relevant division
        check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time as unknown as string) : undefined,
        check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time as unknown as string) : undefined,
      };
      setEvent(fullEventData);

      const bracket = fullEventData.brackets?.[divisionId];
      if (bracket) {
        setCurrentBracket(bracket);
        console.log('[FightDetail] Searching for matchId:', matchId, 'in division:', divisionId);
        const allMatches = bracket.rounds.flat();
        if (bracket.third_place_match) allMatches.push(bracket.third_place_match);
        
        const match = allMatches.find(m => m.id === matchId);
        
        console.log('[FightDetail] Match found?', match ? 'Yes' : 'No', match?.id);
        
        if (match) {
          setCurrentMatch(match);
          setSelectedWinnerId(match.winner_id);
          setSelectedResultType(match.result?.type);
          setResultDetails(match.result?.details);
          setShowPostFightOptions(!!match.winner_id);
        } else {
            console.error('[FightDetail] Match NOT FOUND. Available IDs:', allMatches.map(m => m.id));
        }
      }
    } catch (error: any) {
      showError(error.message);
      navigate(`/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, divisionId, matchId, navigate, isOfflineMode]);

  useEffect(() => {
    loadFightData();
  }, [loadFightData]);

  const athletesMap = useMemo(() => {
    return new Map(event?.athletes?.map(athlete => [athlete.id, athlete]) || []);
  }, [event?.athletes]);

  const getFighterDisplay = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE') return 'BYE';
    if (!fighter) return 'Aguardando';
    return `${fighter.first_name} ${fighter.last_name} (${fighter.club})`;
  };

  const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE' || !fighter) {
      return (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-6 w-6 text-muted-foreground" />
        </div>
      );
    }
    return fighter.photo_url ? (
      <img src={fighter.photo_url} alt={fighter.first_name} className="w-12 h-12 rounded-full object-cover" />
    ) : (
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  };

  const handleUpdateBracket = async (updatedBracket: Bracket) => {
    if (!event || !eventId) return;
    const toastId = showLoading('Salvando resultado...');

    const updatedBrackets = {
      ...event.brackets,
      [divisionId!]: updatedBracket,
    };
    
    const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
      ...event,
      brackets: updatedBrackets,
    });

    const updateData = { brackets: finalBrackets, mat_fight_order: newMatFightOrder };

    try {
      if (isOfflineMode) {
        // SAVE LOCALLY
        await trackChange('events', 'update', { id: eventId, ...updateData });
        const localEvent = await db.events.get(eventId);
        if (localEvent) {
          await db.events.put({ ...localEvent, ...updateData });
        }
        showSuccess(isOfflineMode ? "Resultado salvo localmente." : "Resultado registrado!");
      } else {
        // SAVE ONLINE
        const { error } = await supabase.from('sjjp_events').update(updateData).eq('id', eventId);
        if (error) throw error;
        showSuccess(`Resultado da luta ${currentMatch?.mat_fight_number} registrado!`);
        // Invalidate React Query cache to ensure EventDetail gets fresh data
        queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      }
      
      await loadFightData();
    } catch (error: any) {
      showError(`Falha ao salvar o resultado: ${error.message}`);
    } finally {
      dismissToast(toastId);
    }
  };

  const handleRecordResult = async () => {
    if (!currentMatch || !currentBracket || !selectedWinnerId || !selectedResultType) {
      showError("Por favor, selecione o vencedor e o tipo de resultado.");
      return;
    }

    const loserId = (currentMatch.fighter1_id === selectedWinnerId) ? currentMatch.fighter2_id : currentMatch.fighter1_id;

    if (selectedWinnerId === 'BYE' || loserId === 'BYE' || !loserId || !currentMatch.fighter1_id || !currentMatch.fighter2_id) {
      showError("Não é possível registrar resultado para esta luta.");
      return;
    }

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket));
    let matchFound = false;

    const processMatchUpdate = (match: Match) => {
      match.winner_id = selectedWinnerId;
      match.loser_id = loserId;
      match.result = { type: selectedResultType, winner_id: selectedWinnerId, loser_id: loserId, details: resultDetails };
      matchFound = true;

      if (match.next_match_id) {
        for (const nextRound of updatedBracket.rounds) {
          const nextMatch = nextRound.find(m => m.id === match.next_match_id);
          if (nextMatch) {
            if (nextMatch.prev_match_ids?.[0] === match.id) nextMatch.fighter1_id = selectedWinnerId;
            else if (nextMatch.prev_match_ids?.[1] === match.id) nextMatch.fighter2_id = selectedWinnerId;
          }
        }
      }

      // NOVO: Propagar perdedor para lutas que referenciam esta luta em prev_match_ids, MAS não são o destino do vencedor
      // Isso é necessário para Double Elimination, chaves de 3, ou qualquer formato onde o perdedor avança
      for (const round of updatedBracket.rounds) {
        for (const m of round) {
           if (m.id === match.next_match_id) continue; // Pula se for a luta do vencedor
           
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

    if (updatedBracket.third_place_match && currentMatch.round > 0 && currentMatch.round === updatedBracket.rounds.length - 1) {
      if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[0]) updatedBracket.third_place_match.fighter1_id = loserId;
      else if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[1]) updatedBracket.third_place_match.fighter2_id = loserId;
    }

    if (matchFound) {
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound?.[0]?.winner_id) {
        updatedBracket.winner_id = finalRound[0].winner_id;
        updatedBracket.runner_up_id = finalRound[0].loser_id;
      }
      await handleUpdateBracket(updatedBracket);
      
      // Check if division is complete (no more fights left)
      const allMatches = updatedBracket.rounds.flat();
      if (updatedBracket.third_place_match) {
        allMatches.push(updatedBracket.third_place_match);
      }
      const hasRemainingFights = allMatches.some(m => 
        !m.winner_id && 
        m.fighter1_id && m.fighter1_id !== 'BYE' &&
        m.fighter2_id && m.fighter2_id !== 'BYE'
      );
      
      if (!hasRemainingFights && updatedBracket.winner_id) {
        // Division is complete!
        setShowDivisionCompleteDialog(true);
      } else {
        // Show next round dialog if current round is complete
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

  const handleRevertResult = async () => {
    if (!currentMatch || !currentBracket) {
      showError("Dados da luta não encontrados.");
      return;
    }

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket));
    let matchToRevert: Match | null = null;
    
    // Find the match in the bracket
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

    // Check if next match already has a result - prevent cascading issues
    if (matchToRevert.next_match_id) {
      for (const round of updatedBracket.rounds) {
        const nextMatch = round.find(m => m.id === matchToRevert!.next_match_id);
        if (nextMatch?.winner_id) {
          showError("Não é possível reverter: a próxima luta já possui resultado. Reverta primeiro a luta seguinte.");
          return;
        }
      }
    }

    // Check if third place match has result (for semi-final losers)
    if (updatedBracket.third_place_match && matchToRevert.round === updatedBracket.rounds.length) {
      // This is a semi-final, check if third place has result
      if (updatedBracket.third_place_match.winner_id) {
        showError("Não é possível reverter: a luta pelo 3º lugar já possui resultado. Reverta-a primeiro.");
        return;
      }
    }

    const previousWinnerId = matchToRevert.winner_id;
    const previousLoserId = matchToRevert.loser_id;

    // Clear the match result
    matchToRevert.winner_id = undefined;
    matchToRevert.loser_id = undefined;
    matchToRevert.result = undefined;

    // Clear winner from next match
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

    // Clear loser from any match that received it (e.g., third place match)
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
      // Also check third place match
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

    // Clear bracket winner/runner-up if this was the final
    const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
    if (finalRound?.[0]?.id === matchToRevert!.id) {
      updatedBracket.winner_id = undefined;
      updatedBracket.runner_up_id = undefined;
    }

    // Clear third place winner if reverting third place match
    if (currentMatch.round === -1 && updatedBracket.third_place_match?.id === currentMatch.id) {
      updatedBracket.third_place_winner_id = undefined;
    }

    await handleUpdateBracket(updatedBracket);
    setShowRevertDialog(false);
    setShowPostFightOptions(false);
    showSuccess("Resultado da luta revertido com sucesso!");
  };

  // Find next fight in the SAME DIVISION (not mat)
  const findNextFightInDivision = (): Match | undefined => {
    if (!currentBracket || !currentMatch) return undefined;
    
    // Collect all matches in the bracket
    const allMatches = currentBracket.rounds.flat();
    if (currentBracket.third_place_match) {
      allMatches.push(currentBracket.third_place_match);
    }
    
    // Find incomplete matches (no winner yet)
    const incompleteMatches = allMatches.filter(m => 
      !m.winner_id && 
      m.id !== currentMatch.id &&
      m.fighter1_id && m.fighter1_id !== 'BYE' &&
      m.fighter2_id && m.fighter2_id !== 'BYE'
    );
    
    return incompleteMatches[0];
  };

  const handleNextFightInDivision = () => {
    const nextFight = findNextFightInDivision();
    if (nextFight) {
      navigate(`/events/${eventId}/fights/${divisionId}/${nextFight.id}`);
    }
  };

  const handleGoBack = () => {
    // Navigate back to Event Detail with brackets tab and mat control center sub-tab
    navigate(`/events/${eventId}`, {
      state: {
        activeTab: 'brackets',
        bracketsSubTab: 'mat-control',
        selectedMat: currentMatch?._mat_name || null,
        selectedDivisionId: divisionId || null,
      }
    });
  };

  const handleAdvanceToNextRound = () => {
    setShowRoundEndDialog(false);
    const nextFight = findNextFightInDivision();
    if (nextFight) {
      navigate(`/events/${eventId}/fights/${divisionId}/${nextFight.id}`);
    } else {
      handleGoBack();
    }
  };

  if (loading || !event || !currentMatch || !currentBracket) {
    return <Layout><div className="text-center text-xl mt-8">Carregando detalhes da luta...</div></Layout>;
  }

  const fighter1Athlete = currentMatch.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter1_id || '');
  const fighter2Athlete = currentMatch.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter2_id || '');
  const isFightCompleted = !!currentMatch.winner_id;
  const isByeFight = (currentMatch.fighter1_id === 'BYE' || currentMatch.fighter2_id === 'BYE');
  const isPendingFight = (!currentMatch.fighter1_id || !currentMatch.fighter2_id);
  const isFightRecordable = !isByeFight && !isPendingFight;

  const mainCardBorderClass = isFightCompleted ? 'border-green-500' : isByeFight ? 'border-blue-500' : 'border-gray-300 dark:border-gray-700';
  const fightResultTypes: { value: FightResultType; label: string }[] = [
    { value: 'submission', label: 'Finalização' }, { value: 'points', label: 'Pontos' },
    { value: 'decision', label: 'Decisão' }, { value: 'disqualification', label: 'Desclassificação' },
    { value: 'walkover', label: 'W.O.' },
  ];
  const matNumber = currentMatch._mat_name?.replace('Mat ', '') || 'N/A';
  const fightNumberDisplay = `${matNumber}-${currentMatch.mat_fight_number}`;
  const currentRoundName = getRoundName(currentMatch.round - 1, currentBracket.rounds.length, currentMatch.round === -1);

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{currentMatch._mat_name} - Luta {fightNumberDisplay}</h1>
        <Button onClick={handleGoBack} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>

      <Card className={`mb-6 border-2 ${mainCardBorderClass}`}>
        <CardHeader>
          <CardTitle className="text-2xl">Detalhes da Luta ({currentRoundName})</CardTitle>
          <CardDescription>Registre o resultado desta luta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={cn("flex flex-col items-center p-4 border rounded-md transition-colors", isFightCompleted ? (currentMatch.winner_id === currentMatch.fighter1_id ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950') : (selectedWinnerId === currentMatch.fighter1_id && isFightRecordable ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'), isFightRecordable ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed opacity-70')}
              onClick={() => isFightRecordable && !isFightCompleted && setSelectedWinnerId(currentMatch.fighter1_id)}
            >
              {getFighterPhoto(fighter1Athlete)}
              <span className="text-xl font-medium mt-2 text-center">{getFighterDisplay(fighter1Athlete)}</span>
            </div>
            <div
              className={cn("flex flex-col items-center p-4 border rounded-md transition-colors", isFightCompleted ? (currentMatch.winner_id === currentMatch.fighter2_id ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-red-500 bg-red-50 dark:bg-red-950') : (selectedWinnerId === currentMatch.fighter2_id && isFightRecordable ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'), isFightRecordable ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed opacity-70')}
              onClick={() => isFightRecordable && !isFightCompleted && setSelectedWinnerId(currentMatch.fighter2_id)}
            >
              {getFighterPhoto(fighter2Athlete)}
              <span className="text-xl font-medium mt-2 text-center">{getFighterDisplay(fighter2Athlete)}</span>
            </div>
          </div>

          {isByeFight ? <p className="text-center text-muted-foreground mt-4 text-lg">Esta luta envolve um BYE. O atleta avança automaticamente.</p>
          : isPendingFight ? <p className="text-center text-muted-foreground mt-4 text-lg">Aguardando adversário(s) para esta luta.</p>
          : isFightCompleted ? (
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-green-600">Vencedor: {getFighterDisplay(athletesMap.get(currentMatch.winner_id!))} <Trophy className="inline-block ml-2 h-6 w-6 text-yellow-500" /></p>
              <p className="text-lg text-muted-foreground mt-2">Tipo de Resultado: {currentMatch.result?.type}</p>
              {currentMatch.result?.details && <p className="text-md text-muted-foreground">{currentMatch.result.details}</p>}
              
              {/* Revert Result Button */}
              <Button 
                variant="outline" 
                className="mt-4 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => setShowRevertDialog(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reverter Resultado
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Tipo de Resultado</Label>
                <ToggleGroup type="single" value={selectedResultType} onValueChange={(value: FightResultType) => setSelectedResultType(value)} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                  {fightResultTypes.map(type => <ToggleGroupItem key={type.value} value={type.value} aria-label={type.label} variant="outline" className={cn(selectedResultType === type.value && 'bg-blue-600 text-white hover:bg-blue-700')}>{type.label}</ToggleGroupItem>)}
                </ToggleGroup>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="resultDetails">Detalhes (Opcional)</Label>
                <Input id="resultDetails" placeholder="Ex: Armlock, 6-2, Decisão Unânime" value={resultDetails || ''} onChange={(e) => setResultDetails(e.target.value)} />
              </div>
              <Button onClick={handleRecordResult} className="w-full mt-4" disabled={!selectedWinnerId || !selectedResultType}>Registrar Resultado</Button>
            </>
          )}

          {showPostFightOptions && !showRoundEndDialog && (
            <div className="flex gap-4 mt-4">
              {findNextFightInDivision() && (
                <Button onClick={handleNextFightInDivision} className="flex-1">
                  <ArrowRight className="mr-2 h-4 w-4" /> Próxima Luta
                </Button>
              )}
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revert Result Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reverter Resultado
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Tem certeza que deseja reverter o resultado desta luta?
              </p>
              <p className="text-sm">
                Esta ação irá:
              </p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Remover o vencedor e perdedor desta luta</li>
                <li>Remover o atleta avançado da próxima luta (se houver)</li>
                <li>Permitir o registro de um novo resultado</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevertResult}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Reversão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRoundEndDialog} onOpenChange={setShowRoundEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fim da {currentRoundName}</AlertDialogTitle>
            <AlertDialogDescription>Todas as lutas da {currentRoundName} foram concluídas. O que você gostaria de fazer a seguir?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleGoBack}>Voltar</AlertDialogCancel>
            {findNextFightInDivision() && (
              <AlertDialogAction onClick={handleAdvanceToNextRound}>Próxima Luta</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Division Complete Dialog */}
      <AlertDialog open={showDivisionCompleteDialog} onOpenChange={setShowDivisionCompleteDialog}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Divisão Concluída!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-lg">
                Todas as lutas desta divisão foram finalizadas.
              </p>
              {currentBracket?.winner_id && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-muted-foreground mb-1">Campeão</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    🥇 {athletesMap.get(currentBracket.winner_id)?.first_name} {athletesMap.get(currentBracket.winner_id)?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {athletesMap.get(currentBracket.winner_id)?.club}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogAction 
              onClick={handleGoBack} 
              className="min-w-32"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default FightDetail;