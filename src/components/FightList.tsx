"use client";

import React, { useMemo, useState } from 'react';
import { Event, Bracket, Match, Athlete, FightResultType } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRound, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import FightDetailModal from './FightDetailModal'; // Importar o novo modal

interface FightListProps {
  event: Event;
  selectedCategoryKey: string; // e.g., "Masculino/Adult/Preta"
  selectedDivisionId: string; // NOVO: ID da divisão
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
}

const FightList: React.FC<FightListProps> = ({ event, selectedCategoryKey, selectedDivisionId, onUpdateBracket }) => {
  const { divisions, athletes, brackets, isBeltGroupingEnabled } = event;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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

  const handleOpenFightModal = (match: Match) => {
    setSelectedMatch(match);
    setIsModalOpen(true);
  };

  const handleCloseFightModal = () => {
    setSelectedMatch(null);
    setIsModalOpen(false);
  };

  const handleNavigateToNextFight = (nextMatchId: string) => {
    if (currentBracket) {
      const nextMatch = currentBracket.rounds.flat().find(m => m.id === nextMatchId) || currentBracket.thirdPlaceMatch;
      if (nextMatch) {
        setSelectedMatch(nextMatch);
      } else {
        showError("Próxima luta não encontrada.");
        handleCloseFightModal();
        // Optionally navigate back to bracket view if no next fight
        // onBackToBracket();
      }
    }
  };

  const handleBackToBracket = () => {
    handleCloseFightModal();
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
              <Card
                key={match.id}
                className={`border-2 cursor-pointer ${match.winnerId ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}
                onClick={() => handleOpenFightModal(match)}
              >
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
            ))}
          </div>
        </div>
      ))}

      {currentBracket.thirdPlaceMatch && (
        <div className="space-y-4 mt-6">
          <h4 className="text-lg font-semibold">Luta pelo 3º Lugar</h4>
          <Card
            className={`border-2 cursor-pointer ${currentBracket.thirdPlaceMatch.winnerId ? 'border-green-500' : 'border-gray-200 dark:border-gray-700'}`}
            onClick={() => handleOpenFightModal(currentBracket.thirdPlaceMatch!)}
          >
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

      {selectedMatch && (
        <FightDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseFightModal}
          match={selectedMatch}
          currentBracket={currentBracket}
          allAthletes={athletes}
          onUpdateBracket={onUpdateBracket}
          onNavigateToNextFight={handleNavigateToNextFight}
          onBackToBracket={handleBackToBracket}
        />
      )}
    </div>
  );
};

export default FightList;