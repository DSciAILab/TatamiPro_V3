"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Match, Athlete, Bracket, FightResultType, Event } from '@/types/index';
import { UserRound, Trophy, ArrowLeft, ArrowRight, List } from 'lucide-react';
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
  const { isOfflineMode, trackChange } = useOffline(); // Use offline hook
  
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentBracket, setCurrentBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(undefined);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(undefined);
  const [resultDetails, setResultDetails] = useState<string | undefined>(undefined);
  const [showPostFightOptions, setShowPostFightOptions] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);

  const loadFightData = useCallback(async () => {
    if (!eventId || !divisionId || !matchId) return;
    setLoading(true);
    try {
      let eventData, athletesData, divisionsData;

      if (isOfflineMode) {
        // FETCH FROM LOCAL DB
        eventData = await db.events.get(eventId);
        if (!eventData) throw new Error("Event not found locally. Please sync online first.");
        
        athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
        divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
      } else {
        // FETCH FROM SUPABASE
        const { data: eData, error: eventError } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;
        eventData = eData;

        const { data: aData, error: athletesError } = await supabase.from('athletes').select('*').eq('event_id', eventId);
        if (athletesError) throw athletesError;
        athletesData = aData;
        
        const { data: dData, error: divisionsError } = await supabase.from('divisions').select('*').eq('event_id', eventId);
        if (divisionsError) throw divisionsError;
        divisionsData = dData;
      }

      const processedAthletes = (athletesData || []).map(a => processAthleteData(a, divisionsData || []));
      const fullEventData: Event = {
        ...eventData,
        athletes: processedAthletes,
        divisions: divisionsData || [],
        check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
        check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
      };
      setEvent(fullEventData);

      const bracket = fullEventData.brackets?.[divisionId];
      if (bracket) {
        setCurrentBracket(bracket);
        const match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
        if (match) {
          setCurrentMatch(match);
          setSelectedWinnerId(match.winner_id);
          setSelectedResultType(match.result?.type);
          setResultDetails(match.result?.details);
          setShowPostFightOptions(!!match.winner_id);
        } else {
          throw new Error("Luta não encontrada.");
        }
      } else {
        throw new Error("Bracket não encontrado para esta divisão.");
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
        const { error } = await supabase.from('events').update(updateData).eq('id', eventId);
        if (error) throw error;
        showSuccess(`Resultado da luta ${currentMatch?.mat_fight_number} registrado!`);
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
      // Lógica de finalização do Bracket
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound?.[0]?.winner_id) {
        updatedBracket.winner_id = finalRound[0].winner_id;
        updatedBracket.runner_up_id = finalRound[0].loser_id;
      }
      
      await handleUpdateBracket(updatedBracket);
      
      const currentRoundMatches = currentBracket.rounds[currentMatch.round - 1];
      const allMatchesInRoundCompleted = currentRoundMatches?.every(m => m.id === currentMatch.id || m.winner_id !== undefined);
      if (allMatchesInRoundCompleted) {
        setShowRoundEndDialog(true);
      }
    } else {
      showError("Luta não encontrada no bracket.");
    }
  };

  const findNextFight = (): Match | undefined => {
    if (!event || !currentMatch || !currentMatch._mat_name || !event.mat_fight_order) return undefined;
    const matMatchesIds = event.mat_fight_order[currentMatch._mat_name];
    if (!matMatchesIds) return undefined;
    const currentMatchIndex = matMatchesIds.indexOf(currentMatch.id);
    if (currentMatchIndex === -1 || currentMatchIndex >= matMatchesIds.length - 1) return undefined;
    const nextMatchId = matMatchesIds[currentMatchIndex + 1];
    for (const bracket of Object.values(event.brackets || {})) {
      const match = bracket.rounds.flat().find(m => m.id === nextMatchId) || (bracket.third_place_match?.id === nextMatchId ? bracket.third_place_match : undefined);
      if (match) return match;
    }
    return undefined;
  };

  const handleNextFight = () => {
    const nextFight = findNextFight();
    if (nextFight?._division_id) {
      navigate(`/events/${eventId}/fights/${nextFight._division_id}/${nextFight.id}`);
    } else {
      // Se não houver próxima luta, volta para o gerenciamento de lutas, preservando o mat
      handleReturnToManageFights();
    }
  };

  const handleAdvanceToNextRound = () => {
    setShowRoundEndDialog(false);
    handleNextFight();
  };

  const handleReturnToManageFights = () => {
    setShowRoundEndDialog(false);
    // Navega de volta para a aba manage-fights, passando o mat e a divisão para restaurar o estado
    navigate(`/events/${eventId}`, { 
      state: { 
        activeTab: 'brackets', 
        bracketsSubTab: 'manage-fights',
        selectedMat: currentMatch?._mat_name,
        selectedDivisionId: divisionId,
        detailTab: 'bracket', // Adiciona o estado para forçar a aba 'bracket' no DivisionDetailView
      } 
    });
  };

  const handleReturnToBracket = () => {
    setShowRoundEndDialog(false);
    navigate(`/events/${eventId}`, { state: { activeTab: 'brackets', bracketsSubTab: 'generate-brackets' } });
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
        <Button onClick={handleReturnToManageFights} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Gerenciar Lutas
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
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={handleNextFight} className="w-full"><ArrowRight className="mr-2 h-4 w-4" /> Próxima Luta</Button>
              <Button variant="outline" onClick={handleReturnToManageFights} className="w-full"><List className="mr-2 h-4 w-4" /> Voltar para o Gerenciamento de Lutas</Button>
              <Button variant="outline" onClick={handleReturnToBracket} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Bracket</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showRoundEndDialog} onOpenChange={setShowRoundEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fim da {currentRoundName}</AlertDialogTitle>
            <AlertDialogDescription>Todas as lutas da {currentRoundName} foram concluídas. O que você gostaria de fazer a seguir?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReturnToManageFights}>Retornar ao Gerenciamento de Lutas</AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvanceToNextRound}>Avançar para a Próxima Luta no Mat</AlertDialogAction>
            <AlertDialogAction onClick={handleReturnToBracket}>Voltar para o Bracket</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default FightDetail;