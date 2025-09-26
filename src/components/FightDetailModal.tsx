"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Match, Athlete, Bracket, FightResultType } from '@/types/index';
import { UserRound, Trophy, ArrowRight, List } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

interface FightDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: Match;
  currentBracket: Bracket;
  allAthletes: Athlete[];
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
  onNavigateToNextFight: (nextMatchId: string) => void;
  onBackToBracket: () => void;
}

const FightDetailModal: React.FC<FightDetailModalProps> = ({
  isOpen,
  onClose,
  match,
  currentBracket,
  allAthletes,
  onUpdateBracket,
  onNavigateToNextFight,
  onBackToBracket,
}) => {
  const athletesMap = useMemo(() => {
    return new Map(allAthletes.map(athlete => [athlete.id, athlete]));
  }, [allAthletes]);

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(match.winnerId);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(match.result?.type);
  const [resultDetails, setResultDetails] = useState<string | undefined>(match.result?.details);
  const [showPostFightOptions, setShowPostFightOptions] = useState(false);

  useEffect(() => {
    setSelectedWinnerId(match.winnerId);
    setSelectedResultType(match.result?.type);
    setResultDetails(match.result?.details);
    setShowPostFightOptions(!!match.winnerId); // Show options if match already has a winner
  }, [match]);

  const fighter1 = match.fighter1Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1Id || '');
  const fighter2 = match.fighter2Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2Id || '');

  const getFighterDisplay = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE') return 'BYE';
    if (!fighter) return 'Aguardando';
    return `${fighter.firstName} ${fighter.lastName} (${fighter.club})`;
  };

  const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE' || !fighter) {
      return (
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-6 w-6 text-muted-foreground" />
        </div>
      );
    }
    return fighter.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-12 h-12 rounded-full object-cover" />
    ) : (
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  };

  const handleRecordResult = () => {
    if (!selectedWinnerId || !selectedResultType) {
      showError("Por favor, selecione o vencedor e o tipo de resultado.");
      return;
    }

    const loserId = (match.fighter1Id === selectedWinnerId) ? match.fighter2Id : match.fighter1Id;

    if (selectedWinnerId === 'BYE' || loserId === 'BYE') {
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
        targetMatch.winnerId = selectedWinnerId;
        targetMatch.loserId = loserId;
        targetMatch.result = { type: selectedResultType, winnerId: selectedWinnerId, loserId: loserId, details: resultDetails };
        matchFound = true;

        // Advance winner to next match
        if (targetMatch.nextMatchId) {
          for (const nextRound of updatedBracket.rounds) {
            const nextMatch = nextRound.find(m => m.id === targetMatch.nextMatchId);
            if (nextMatch) {
              if (nextMatch.prevMatchIds?.[0] === targetMatch.id) {
                nextMatch.fighter1Id = selectedWinnerId;
              } else if (nextMatch.prevMatchIds?.[1] === targetMatch.id) {
                nextMatch.fighter2Id = selectedWinnerId;
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
      setShowPostFightOptions(true);
    } else {
      showError("Luta não encontrada no bracket.");
    }
  };

  const findNextFight = (): Match | undefined => {
    const currentRoundIndex = currentBracket.rounds.findIndex(r => r.some(m => m.id === match.id));
    if (currentRoundIndex === -1) return undefined;

    const currentMatchIndex = currentBracket.rounds[currentRoundIndex].findIndex(m => m.id === match.id);

    // Try next match in current round
    if (currentMatchIndex < currentBracket.rounds[currentRoundIndex].length - 1) {
      return currentBracket.rounds[currentRoundIndex][currentMatchIndex + 1];
    }

    // Try first match in next round
    if (currentRoundIndex < currentBracket.rounds.length - 1) {
      return currentBracket.rounds[currentRoundIndex + 1][0];
    }

    // If it's the final match, check for third place match if not played
    if (currentRoundIndex === currentBracket.rounds.length - 1 && currentBracket.thirdPlaceMatch && !currentBracket.thirdPlaceMatch.winnerId) {
      return currentBracket.thirdPlaceMatch;
    }

    return undefined;
  };

  const handleNextFight = () => {
    const nextFight = findNextFight();
    if (nextFight) {
      onNavigateToNextFight(nextFight.id);
      setShowPostFightOptions(false); // Reset options for the new fight
    } else {
      showError("Não há próxima luta disponível.");
      onBackToBracket();
    }
  };

  const isFightCompleted = !!match.winnerId;
  const isByeFight = (match.fighter1Id === 'BYE' || match.fighter2Id === 'BYE');

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {match.round === -1 ? 'Luta pelo 3º Lugar' : `Luta ${match.matchNumber} (Rodada ${match.round})`}
          </DialogTitle>
          <DialogDescription>
            Registre o resultado desta luta.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-between p-3 border rounded-md">
            {getFighterPhoto(fighter1)}
            <span className="text-lg font-medium flex-1 text-center">{getFighterDisplay(fighter1)}</span>
          </div>
          <div className="text-center text-xl font-bold">VS</div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            {getFighterPhoto(fighter2)}
            <span className="text-lg font-medium flex-1 text-center">{getFighterDisplay(fighter2)}</span>
          </div>

          {isByeFight ? (
            <p className="text-center text-muted-foreground mt-4">
              Esta luta envolve um BYE. O atleta {match.fighter1Id === 'BYE' ? getFighterDisplay(fighter2) : getFighterDisplay(fighter1)} avança automaticamente.
            </p>
          ) : isFightCompleted ? (
            <div className="text-center mt-4">
              <p className="text-lg font-semibold text-green-600">
                Vencedor: {getFighterDisplay(athletesMap.get(match.winnerId!))} ({match.result?.type})
              </p>
              {match.result?.details && <p className="text-sm text-muted-foreground">{match.result.details}</p>}
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="winner">Vencedor</Label>
                <Select value={selectedWinnerId} onValueChange={setSelectedWinnerId}>
                  <SelectTrigger id="winner">
                    <SelectValue placeholder="Selecione o vencedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {match.fighter1Id && match.fighter1Id !== 'BYE' && (
                      <SelectItem value={match.fighter1Id}>{getFighterDisplay(fighter1)}</SelectItem>
                    )}
                    {match.fighter2Id && match.fighter2Id !== 'BYE' && (
                      <SelectItem value={match.fighter2Id}>{getFighterDisplay(fighter2)}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="resultType">Tipo de Resultado</Label>
                <Select value={selectedResultType} onValueChange={(value: FightResultType) => setSelectedResultType(value)}>
                  <SelectTrigger id="resultType">
                    <SelectValue placeholder="Selecione o tipo de resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submission">Finalização</SelectItem>
                    <SelectItem value="points">Pontos</SelectItem>
                    <SelectItem value="decision">Decisão</SelectItem>
                    <SelectItem value="disqualification">Desclassificação</SelectItem>
                    <SelectItem value="walkover">W.O. (Walkover)</SelectItem>
                  </SelectContent>
                </Select>
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

          {showPostFightOptions && (
            <div className="flex flex-col gap-2 mt-4">
              <Button onClick={handleNextFight} className="w-full">
                <ArrowRight className="mr-2 h-4 w-4" /> Próxima Luta
              </Button>
              <Button variant="outline" onClick={onBackToBracket} className="w-full">
                <List className="mr-2 h-4 w-4" /> Voltar para o Bracket
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FightDetailModal;