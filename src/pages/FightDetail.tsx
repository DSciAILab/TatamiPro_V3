"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Match, Athlete, Bracket, FightResultType, Event } from '@/types/index';
import { UserRound, Trophy, ArrowLeft, ArrowRight, List } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils'; // Importar cn para utilitários de classe
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
import { generateMatFightOrder } from '@/utils/fight-order-generator'; // Importar a nova função

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
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentBracket, setCurrentBracket] = useState<Bracket | null>(null);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(undefined);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(undefined);
  const [resultDetails, setResultDetails] = useState<string | undefined>(undefined);
  const [showPostFightOptions, setShowPostFightOptions] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false); // Novo estado para o diálogo

  useEffect(() => {
    if (eventId && divisionId && matchId) {
      const existingEventData = localStorage.getItem(`event_${eventId}`);
      if (existingEventData) {
        try {
          const parsedEvent: Event = JSON.parse(existingEventData);
          // Re-parse dates for Athlete objects
          const processedAthletes = (parsedEvent.athletes || []).map(athlete => ({
            ...athlete,
            date_of_birth: new Date(athlete.date_of_birth),
            consent_date: new Date(athlete.consent_date),
          }));
          const eventWithProcessedAthletes = { ...parsedEvent, athletes: processedAthletes };
          setEvent(eventWithProcessedAthletes);

          const bracket = eventWithProcessedAthletes.brackets?.[divisionId];
          if (bracket) {
            setCurrentBracket(bracket);
            // Find match in rounds or third place match
            const match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
            if (match) {
              setCurrentMatch(match);
              setSelectedWinnerId(match.winner_id);
              setSelectedResultType(match.result?.type);
              setResultDetails(match.result?.details);
              setShowPostFightOptions(!!match.winner_id);
            } else {
              showError("Luta não encontrada.");
              navigate(`/events/${eventId}/manage-fights`);
            }
          } else {
            showError("Bracket não encontrado para esta divisão.");
            navigate(`/events/${eventId}/manage-fights`);
          }
        } catch (e) {
          console.error("Failed to parse event data from localStorage", e);
          showError("Erro ao carregar dados do evento.");
          navigate(`/events/${eventId}/manage-fights`);
        }
      } else {
        showError("Evento não encontrado.");
        navigate(`/events`);
      }
    }
  }, [eventId, divisionId, matchId, navigate]);

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

  const handleUpdateBracket = (updatedBracket: Bracket) => {
    if (!event || !eventId) return;

    const updatedBrackets = {
      ...event.brackets,
      [divisionId!]: updatedBracket,
    };
    
    // Recalculate mat fight order after a bracket is updated
    const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
      ...event,
      brackets: updatedBrackets,
    });

    const updatedEvent = { ...event, brackets: finalBrackets, mat_fight_order: newMatFightOrder };
    localStorage.setItem(`event_${eventId}`, JSON.stringify(updatedEvent));
    setEvent(updatedEvent);
    setCurrentBracket(finalBrackets[divisionId!]); // Ensure currentBracket is updated with the new mat_fight_number
  };

  const handleRecordResult = () => {
    if (!currentMatch || !currentBracket || !selectedWinnerId || !selectedResultType) {
      showError("Por favor, selecione o vencedor e o tipo de resultado.");
      return;
    }

    const loserId = (currentMatch.fighter1_id === selectedWinnerId) ? currentMatch.fighter2_id : currentMatch.fighter1_id;

    if (selectedWinnerId === 'BYE' || loserId === 'BYE' || !loserId) {
      showError("Não é possível registrar resultado para lutas com BYE ou sem perdedor definido.");
      return;
    }
    if (!currentMatch.fighter1_id || !currentMatch.fighter2_id) {
      showError("Ambos os lutadores devem estar definidos para registrar um resultado.");
      return;
    }

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket)); // Deep copy
    let matchFound = false;
    let updatedMatch: Match | null = null;

    // Check if it's the third-place match
    if (currentMatch.round === -1 && updatedBracket.third_place_match && updatedBracket.third_place_match.id === currentMatch.id) {
      updatedBracket.third_place_match.winner_id = selectedWinnerId;
      updatedBracket.third_place_match.loser_id = loserId;
      updatedBracket.third_place_match.result = { type: selectedResultType, winner_id: selectedWinnerId, loser_id: loserId, details: resultDetails };
      matchFound = true;
      updatedMatch = updatedBracket.third_place_match;
      updatedBracket.third_place_winner_id = selectedWinnerId; // Set the third place winner
    } else {
      // Iterate through rounds for regular matches
      for (const round of updatedBracket.rounds) {
        const targetMatch = round.find(m => m.id === currentMatch.id);
        if (targetMatch) {
          targetMatch.winner_id = selectedWinnerId;
          targetMatch.loser_id = loserId;
          targetMatch.result = { type: selectedResultType, winner_id: selectedWinnerId, loser_id: loserId, details: resultDetails };
          matchFound = true;
          updatedMatch = targetMatch; // Store the updated match

          // Advance winner to next match
          if (targetMatch.next_match_id) {
            for (const nextRound of updatedBracket.rounds) {
              const nextMatch = nextRound.find(m => m.id === targetMatch.next_match_id);
              if (nextMatch) {
                if (nextMatch.prev_match_ids?.[0] === targetMatch.id) {
                  nextMatch.fighter1_id = selectedWinnerId;
                } else if (nextMatch.prev_match_ids?.[1] === targetMatch.id) {
                  nextMatch.fighter2_id = selectedWinnerId;
                }
                // If both prev matches are done, and nextMatch has both fighters,
                // its winner_id might be set if one of them was a BYE.
                // Otherwise, it remains undefined until that match is played.
                if (nextMatch.fighter1_id === 'BYE' && nextMatch.fighter2_id && nextMatch.fighter2_id !== 'BYE') {
                  nextMatch.winner_id = nextMatch.fighter2_id;
                } else if (nextMatch.fighter2_id === 'BYE' && nextMatch.fighter1_id && nextMatch.fighter1_id !== 'BYE') {
                  nextMatch.winner_id = nextMatch.fighter1_id;
                } else if (nextMatch.fighter1_id === 'BYE' && nextMatch.fighter2_id === 'BYE') {
                  nextMatch.winner_id = 'BYE';
                }
              }
            }
          }
          break;
        }
      }
    }

    // Handle third place match losers (if current match was a semi-final)
    if (updatedBracket.third_place_match && currentMatch.round > 0 && currentMatch.round === updatedBracket.rounds.length - 1) { // If it's a semi-final
      if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[0]) {
        updatedBracket.third_place_match.fighter1_id = loserId;
      } else if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[1]) {
        updatedBracket.third_place_match.fighter2_id = loserId;
      }
    }

    if (matchFound) {
      // Check for bracket completion and update finalists/winner
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound && finalRound.length === 1 && finalRound[0].winner_id) {
        updatedBracket.winner_id = finalRound[0].winner_id;
        const finalMatch = finalRound[0];
        updatedBracket.finalists = [finalMatch.fighter1_id as string, finalMatch.fighter2_id as string];
        updatedBracket.runner_up_id = (finalMatch.fighter1_id === updatedBracket.winner_id) ? finalMatch.fighter2_id as string : finalMatch.fighter1_id as string;
      }

      setCurrentMatch(updatedMatch); // Explicitly update currentMatch state to trigger re-render
      handleUpdateBracket(updatedBracket);
      showSuccess(`Resultado da luta ${currentMatch.mat_fight_number} registrado!`); // Usar mat_fight_number
      setShowPostFightOptions(true);

      // Check if this is the last fight of the round (excluding third-place match for this check)
      if (currentMatch.round > 0 && currentBracket.rounds.length > 0) { // Only for main bracket rounds
        const currentRoundMatches = currentBracket.rounds[currentMatch.round - 1];
        const allMatchesInRoundCompleted = currentRoundMatches.every(m => m.winner_id !== undefined);
        if (allMatchesInRoundCompleted) {
          setShowRoundEndDialog(true);
        }
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
    if (currentMatchIndex === -1 || currentMatchIndex >= matMatchesIds.length - 1) {
      return undefined; // No more fights on this mat
    }

    const nextMatchId = matMatchesIds[currentMatchIndex + 1];
    // Find the next match in the brackets
    for (const bracket of Object.values(event.brackets || {})) {
      const matchInRounds = bracket.rounds.flat().find(m => m.id === nextMatchId);
      if (matchInRounds) return matchInRounds;
      if (bracket.third_place_match?.id === nextMatchId) return bracket.third_place_match;
    }
    return undefined;
  };

  const handleNextFight = () => {
    const nextFight = findNextFight();
    if (nextFight && nextFight._division_id && nextFight._mat_name) {
      navigate(`/events/${eventId}/fights/${nextFight._division_id}/${nextFight.id}`);
    } else {
      showError("Não há próxima luta disponível neste mat.");
      navigate(`/events/${eventId}/manage-fights`);
    }
  };

  const handleAdvanceToNextRound = () => {
    setShowRoundEndDialog(false);
    const nextFight = findNextFight(); // This logic already handles moving to next round or 3rd place
    if (nextFight && nextFight._division_id && nextFight._mat_name) {
      navigate(`/events/${eventId}/fights/${nextFight._division_id}/${nextFight.id}`);
    } else {
      showSuccess("Todas as lutas desta divisão foram concluídas!");
      navigate(`/events/${eventId}/manage-fights`);
    }
  };

  const handleReturnToManageFights = () => {
    setShowRoundEndDialog(false);
    navigate(`/events/${eventId}/manage-fights`);
  };

  const handleReturnToBracket = () => {
    setShowRoundEndDialog(false);
    navigate(`/events/${eventId}/generate-brackets`); // Navegar de volta para a página de brackets
  };

  if (!event || !currentMatch || !currentBracket) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Carregando detalhes da luta...</div>
      </Layout>
    );
  }

  const fighter1Athlete = currentMatch.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter1_id || '');
  const fighter2Athlete = currentMatch.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter2_id || '');
  const isFightCompleted = !!currentMatch.winner_id;
  const isByeFight = (currentMatch.fighter1_id === 'BYE' || currentMatch.fighter2_id === 'BYE');
  const isPendingFight = (!currentMatch.fighter1_id || !currentMatch.fighter2_id);
  const isFightRecordable = !isByeFight && !isPendingFight;


  // Determine main card border class
  const mainCardBorderClass = isFightCompleted
    ? 'border-green-500'
    : isByeFight
      ? 'border-blue-500'
      : 'border-gray-300 dark:border-gray-700';

  const fightResultTypes: { value: FightResultType; label: string }[] = [
    { value: 'submission', label: 'Finalização' },
    { value: 'points', label: 'Pontos' },
    { value: 'decision', label: 'Decisão' },
    { value: 'disqualification', label: 'Desclassificação' },
    { value: 'walkover', label: 'W.O.' },
  ];

  const matNumber = currentMatch._mat_name?.replace('Mat ', '') || 'N/A';
  const fightNumberDisplay = `${matNumber}-${currentMatch.mat_fight_number}`;
  const currentRoundName = getRoundName(currentMatch.round - 1, currentBracket.rounds.length, currentMatch.round === -1);


  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          {currentMatch._mat_name} - Luta {fightNumberDisplay} {/* NOVO: Título com mat_fight_number */}
        </h1>
        <Button onClick={() => navigate(`/events/${eventId}/manage-fights`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Gerenciar Lutas
        </Button>
      </div>

      <Card className={`mb-6 border-2 ${mainCardBorderClass}`}> {/* Added dynamic border */}
        <CardHeader>
          <CardTitle className="text-2xl">Detalhes da Luta ({currentRoundName})</CardTitle>
          <CardDescription>Registre o resultado desta luta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={cn(
                "flex flex-col items-center p-4 border rounded-md transition-colors",
                isFightCompleted
                  ? currentMatch.winner_id === currentMatch.fighter1_id
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                  : selectedWinnerId === currentMatch.fighter1_id && isFightRecordable
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' // Azul para seleção
                    : 'border-gray-200 dark:border-gray-700',
                isFightRecordable ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed opacity-70'
              )}
              onClick={() => isFightRecordable && !isFightCompleted && setSelectedWinnerId(currentMatch.fighter1_id)}
            >
              {getFighterPhoto(fighter1Athlete)}
              <span className="text-xl font-medium mt-2 text-center">{getFighterDisplay(fighter1Athlete)}</span>
            </div>
            <div
              className={cn(
                "flex flex-col items-center p-4 border rounded-md transition-colors",
                isFightCompleted
                  ? currentMatch.winner_id === currentMatch.fighter2_id
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                  : selectedWinnerId === currentMatch.fighter2_id && isFightRecordable
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' // Azul para seleção
                    : 'border-gray-200 dark:border-gray-700',
                isFightRecordable ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed opacity-70'
              )}
              onClick={() => isFightRecordable && !isFightCompleted && setSelectedWinnerId(currentMatch.fighter2_id)}
            >
              {getFighterPhoto(fighter2Athlete)}
              <span className="text-xl font-medium mt-2 text-center">{getFighterDisplay(fighter2Athlete)}</span>
            </div>
          </div>

          {isByeFight ? (
            <p className="text-center text-muted-foreground mt-4 text-lg">
              Esta luta envolve um BYE. O atleta {currentMatch.fighter1_id === 'BYE' ? getFighterDisplay(fighter2Athlete) : getFighterDisplay(fighter1Athlete)} avança automaticamente.
            </p>
          ) : isPendingFight ? (
            <p className="text-center text-muted-foreground mt-4 text-lg">
              Aguardando adversário(s) para esta luta.
            </p>
          ) : isFightCompleted ? (
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-green-600">
                Vencedor: {getFighterDisplay(athletesMap.get(currentMatch.winner_id!))} <Trophy className="inline-block ml-2 h-6 w-6 text-yellow-500" />
              </p>
              <p className="text-lg text-muted-foreground mt-2">Tipo de Resultado: {currentMatch.result?.type}</p>
              {currentMatch.result?.details && <p className="text-md text-muted-foreground">{currentMatch.result.details}</p>}
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Tipo de Resultado</Label>
                <ToggleGroup
                  type="single"
                  value={selectedResultType}
                  onValueChange={(value: FightResultType) => setSelectedResultType(value)}
                  className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2"
                >
                  {fightResultTypes.map(type => (
                    <ToggleGroupItem
                      key={type.value}
                      value={type.value}
                      aria-label={type.label}
                      variant="outline" // Usar outline como base
                      className={cn(
                        selectedResultType === type.value && 'bg-blue-600 text-white hover:bg-blue-700' // Azul para seleção
                      )}
                    >
                      {type.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="resultDetails">Detalhes (Opcional)</Label>
                <Input
                  id="resultDetails"
                  placeholder="Ex: Armlock, 6-2, Decisão Unânime"
                  value={resultDetails || ''}
                  onChange={(e) => setResultDetails(e.target.value)}
                />
              </div>

              <Button onClick={handleRecordResult} className="w-full mt-4" disabled={!selectedWinnerId || !selectedResultType}>
                Registrar Resultado
              </Button>
            </>
          )}

          {showPostFightOptions && !showRoundEndDialog && ( // Esconder se o diálogo de fim de rodada estiver visível
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={handleNextFight} className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" /> Próxima Luta
              </Button>
              <Button variant="outline" onClick={() => navigate(`/events/${eventId}/manage-fights`)} className="w-full">
                <List className="mr-2 h-4 w-4" /> Voltar para o Gerenciamento de Lutas
              </Button>
              <Button variant="outline" onClick={handleReturnToBracket} className="w-full"> {/* NOVO BOTÃO */}
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Bracket
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog para o fim da rodada */}
      <AlertDialog open={showRoundEndDialog} onOpenChange={setShowRoundEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fim da {currentRoundName}</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as lutas da {currentRoundName} foram concluídas. O que você gostaria de fazer a seguir?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleReturnToManageFights}>
              Retornar ao Gerenciamento de Lutas
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAdvanceToNextRound}>
              Avançar para a Próxima Luta no Mat
            </AlertDialogAction>
            <AlertDialogAction onClick={handleReturnToBracket}> {/* NOVO BOTÃO */}
              Voltar para o Bracket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default FightDetail;