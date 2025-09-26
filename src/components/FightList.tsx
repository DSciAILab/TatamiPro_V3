"use client";

import React, { useMemo, useState } from 'react';
import { Event, Bracket, Match, Athlete, FightResultType } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRound, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom'; // Importar Link

interface FightListProps {
  event: Event;
  selectedCategoryKey: string; // e.g., "Masculino/Adult/Preta"
  selectedDivisionId: string; // NOVO: ID da divisão
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
}

const FightList: React.FC<FightListProps> = ({ event, selectedCategoryKey, selectedDivisionId, onUpdateBracket }) => {
  const { divisions, athletes, brackets, isBeltGroupingEnabled } = event;

  const currentBracket = useMemo(() => {
    if (!brackets || !selectedDivisionId) return null;
    const bracket = brackets[selectedDivisionId];
    return bracket;
  }, [brackets, selectedDivisionId]);

  const athletesMap = useMemo(() => {
    return new Map(athletes.map(athlete => [athlete.id, athlete]));
  }, [athletes]);

  const getFighterDisplay = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE') return 'BYE';
    if (!fighterId) return 'Aguardando';
    const fighter = athletesMap.get(fighterId);
    return fighter ? `${fighter.firstName} ${fighter.lastName} (${fighter.club})` : 'Atleta Desconhecido';
  };

  const getFighterPhoto = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE' || !fighterId) {
      return (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    const fighter = athletesMap.get(fighterId);
    return fighter?.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  // Função para registrar resultado diretamente no FightList (para botões inline)
  const handleRecordResult = (match: Match, winnerId: string, resultType: FightResultType, details?: string) => {
    if (!currentBracket) return;

    const loserId = (match.fighter1Id === winnerId) ? match.fighter2Id : match.fighter1Id;

    if (winnerId === 'BYE' || loserId === 'BYE') {
      showError("Não é possível registrar resultado para lutas com BYE.");
      return;
    }
    if (!match.fighter1Id || !match.fighter2Id) {
      showError("Ambos os lutadores devem estar definidos para registrar um resultado.");
      return;
    }

    const updatedBracket: Bracket = JSON.parse(JSON.stringify(currentBracket)); // Deep copy
    let matchFound = false;

    // Update the current match
    for (const round of updatedBracket.rounds) {
      const targetMatch = round.find(m => m.id === match.id);
      if (targetMatch) {
        targetMatch.winnerId = winnerId;
        targetMatch.loserId = loserId;
        targetMatch.result = { type: resultType, winnerId, loserId, details };
        matchFound = true;

        // Advance winner to next match
        if (targetMatch.nextMatchId) {
          for (const nextRound of updatedBracket.rounds) {
            const nextMatch = nextRound.find(m => m.id === targetMatch.nextMatchId);
            if (nextMatch) {
              if (nextMatch.prevMatchIds?.[0] === targetMatch.id) {
                nextMatch.fighter1Id = winnerId;
              } else if (nextMatch.prevMatchIds?.[1] === targetMatch.id) {
                nextMatch.fighter2Id = winnerId;
              }
              // If both prev matches are done, and nextMatch has both fighters,
              // its winnerId might be set if one of them was a BYE.
              // Otherwise, it remains undefined until that match is played.
              if (nextMatch.fighter1Id === 'BYE' && nextMatch.fighter2Id && nextMatch.fighter2Id !== 'BYE') {
                nextMatch.winnerId = nextMatch.fighter2Id;
              } else if (nextMatch.fighter2Id === 'BYE' && nextMatch.fighter1Id && nextMatch.fighter1Id !== 'BYE') {
                nextMatch.winnerId = nextMatch.fighter1Id;
              } else if (nextMatch.fighter1Id === 'BYE' && nextMatch.fighter2Id === 'BYE') {
                nextMatch.winnerId = 'BYE';
              }
            }
          }
        }
        break;
      }
    }

    // Handle third place match losers
    if (updatedBracket.thirdPlaceMatch && match.round === updatedBracket.rounds.length - 1) { // If it's a semi-final
      if (match.id === updatedBracket.thirdPlaceMatch.prevMatchIds?.[0]) {
        updatedBracket.thirdPlaceMatch.fighter1Id = loserId;
      } else if (match.id === updatedBracket.thirdPlaceMatch.prevMatchIds?.[1]) {
        updatedBracket.thirdPlaceMatch.fighter2Id = loserId;
      }
    }

    if (matchFound) {
      // Check for bracket completion and update finalists/winner
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound && finalRound.length === 1 && finalRound[0].winnerId) {
        updatedBracket.winnerId = finalRound[0].winnerId;
        const finalMatch = finalRound[0];
        updatedBracket.finalists = [finalMatch.fighter1Id as string, finalMatch.fighter2Id as string];
        updatedBracket.runnerUpId = (finalMatch.fighter1Id === updatedBracket.winnerId) ? finalMatch.fighter2Id as string : finalMatch.fighter1Id as string;
      }

      if (updatedBracket.thirdPlaceMatch?.winnerId) {
        updatedBracket.thirdPlaceWinnerId = updatedBracket.thirdPlaceMatch.winnerId;
      }

      onUpdateBracket(currentBracket.divisionId, updatedBracket);
      showSuccess(`Resultado da luta ${match.matchNumber} registrado!`);
    } else {
      showError("Luta não encontrada no bracket.");
    }
  };

  if (!currentBracket || !currentBracket.rounds || currentBracket.rounds.length === 0) {
    return <p className="text-muted-foreground">Nenhum bracket gerado para esta categoria.</p>;
  }

  return (
    <div className="space-y-6">
      {currentBracket.rounds.map((round, roundIndex) => (
        <div key={roundIndex} className="space-y-4">
          <h4 className="text-lg font-semibold">Rodada {roundIndex + 1}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {round.map(match => (
              <Link
                key={match.id}
                to={`/events/${event.id}/fights/${selectedDivisionId}/${match.id}`}
                className={`block border-2 rounded-md transition-colors hover:border-primary ${match.winnerId ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}
              >
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-md">Luta {match.matchNumber} (Rodada {match.round})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className={`flex items-center space-x-2 p-1 rounded-md ${match.winnerId === match.fighter1Id ? 'bg-green-100 dark:bg-green-900' : match.loserId === match.fighter1Id ? 'bg-red-100 dark:bg-red-900' : ''}`}>
                      {getFighterPhoto(match.fighter1Id)}
                      <span className="flex-1 truncate">{getFighterDisplay(match.fighter1Id)}</span>
                    </div>
                    <div className={`flex items-center space-x-2 p-1 rounded-md ${match.winnerId === match.fighter2Id ? 'bg-green-100 dark:bg-green-900' : match.loserId === match.fighter2Id ? 'bg-red-100 dark:bg-red-900' : ''}`}>
                      {getFighterPhoto(match.fighter2Id)}
                      <span className="flex-1 truncate">{getFighterDisplay(match.fighter2Id)}</span>
                    </div>
                    {match.winnerId && match.winnerId !== 'BYE' && (
                      <p className="text-sm font-semibold text-green-600 mt-2">
                        Vencedor: {getFighterDisplay(match.winnerId)} ({match.result?.type})
                      </p>
                    )}
                    {(match.fighter1Id === 'BYE' && match.fighter2Id && match.fighter2Id !== 'BYE') && (
                      <p className="text-sm text-blue-600">
                        {getFighterDisplay(match.fighter2Id)} avança por BYE
                      </p>
                    )}
                    {(match.fighter2Id === 'BYE' && match.fighter1Id && match.fighter1Id !== 'BYE') && (
                      <p className="text-sm text-blue-600">
                        {getFighterDisplay(match.fighter1Id)} avança por BYE
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {currentBracket.thirdPlaceMatch && (
        <div className="space-y-4 mt-6">
          <h4 className="text-lg font-semibold">Luta pelo 3º Lugar</h4>
          <Link
            to={`/events/${event.id}/fights/${selectedDivisionId}/${currentBracket.thirdPlaceMatch.id}`}
            className={`block border-2 rounded-md transition-colors hover:border-primary ${currentBracket.thirdPlaceMatch.winnerId ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <Card className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-md">Luta pelo 3º Lugar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className={`flex items-center space-x-2 p-1 rounded-md ${currentBracket.thirdPlaceMatch.winnerId === currentBracket.thirdPlaceMatch.fighter1Id ? 'bg-green-100 dark:bg-green-900' : currentBracket.thirdPlaceMatch.loserId === currentBracket.thirdPlaceMatch.fighter1Id ? 'bg-red-100 dark:bg-red-900' : ''}`}>
                  {getFighterPhoto(currentBracket.thirdPlaceMatch.fighter1Id)}
                  <span className="flex-1 truncate">{getFighterDisplay(currentBracket.thirdPlaceMatch.fighter1Id)}</span>
                </div>
                <div className={`flex items-center space-x-2 p-1 rounded-md ${currentBracket.thirdPlaceMatch.winnerId === currentBracket.thirdPlaceMatch.fighter2Id ? 'bg-green-100 dark:bg-green-900' : currentBracket.thirdPlaceMatch.loserId === currentBracket.thirdPlaceMatch.fighter2Id ? 'bg-red-100 dark:bg-red-900' : ''}`}>
                  {getFighterPhoto(currentBracket.thirdPlaceMatch.fighter2Id)}
                  <span className="flex-1 truncate">{getFighterDisplay(currentBracket.thirdPlaceMatch.fighter2Id)}</span>
                </div>
                {currentBracket.thirdPlaceMatch.winnerId && currentBracket.thirdPlaceMatch.winnerId !== 'BYE' && (
                  <p className="text-sm font-semibold text-green-600 mt-2">
                    Vencedor: {getFighterDisplay(currentBracket.thirdPlaceMatch.winnerId)} ({currentBracket.thirdPlaceMatch.result?.type})
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {currentBracket.winnerId && (
        <Card className="mt-6 bg-yellow-100 dark:bg-yellow-900 border-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-700 dark:text-yellow-300">
              <Trophy className="mr-2 h-6 w-6" /> Campeão: {getFighterDisplay(currentBracket.winnerId)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Vice-Campeão: {getFighterDisplay(currentBracket.runnerUpId)}
            </p>
            {currentBracket.thirdPlaceWinnerId && (
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                3º Lugar: {getFighterDisplay(currentBracket.thirdPlaceWinnerId)}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FightList;