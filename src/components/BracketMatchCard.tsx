"use client";

import React from 'react';
import { Match, Athlete } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound, Trophy, CheckCircle } from 'lucide-react'; // Added CheckCircle
import { cn } from '@/lib/utils'; // For conditional classes

interface BracketMatchCardProps {
  match: Match;
  athletesMap: Map<string, Athlete>;
  isFinal?: boolean;
  isThirdPlace?: boolean;
  // New props for ranking
  bracketWinnerId?: string;
  bracketRunnerUpId?: string;
  bracketThirdPlaceWinnerId?: string;
}

// Helper para formatar o ID da luta anterior para exibição
const getShortMatchIdentifier = (fullMatchId: string): string => {
  const parts = fullMatchId.split('-'); // Ex: divisionId-R1-M1
  if (parts.length >= 3) {
    const roundNum = parts[1].replace('R', ''); // Extract '1' from 'R1'
    const matchNum = parts[2].replace('M', ''); // Extract '1' from 'M1'
    return `${roundNum}-${matchNum}`; // e.g., "1-1"
  }
  return fullMatchId; // Fallback
};

const BracketMatchCard: React.FC<BracketMatchCardProps> = ({
  match,
  athletesMap,
  isFinal,
  isThirdPlace,
  bracketWinnerId,
  bracketRunnerUpId,
  bracketThirdPlaceWinnerId,
}) => {
  const fighter1 = match.fighter1Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1Id || '');
  const fighter2 = match.fighter2Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2Id || '');

  const getFighterDisplay = (fighter: Athlete | 'BYE' | undefined, fighterSlot: 1 | 2) => {
    if (fighter === 'BYE') return 'BYE';
    if (!fighter) {
      // Se o lutador é undefined, significa que estamos esperando o vencedor de uma luta anterior
      const prevMatchId = fighterSlot === 1 ? match.prevMatchIds?.[0] : match.prevMatchIds?.[1];
      return (
        <div className="flex flex-col items-start">
          <span className="font-medium text-sm text-muted-foreground">
            Aguardando {prevMatchId ? getShortMatchIdentifier(prevMatchId) : 'Luta Anterior'}
          </span>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start">
        <span className="font-medium text-sm flex items-center">
          {fighter.firstName} {fighter.lastName}
          {match.winnerId === fighter.id && <CheckCircle className="ml-1 h-3 w-3 text-green-500" />}
        </span>
        <span className="text-xs text-muted-foreground">{fighter.club}</span>
      </div>
    );
  };

  const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE' || !fighter) {
      return (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-3 w-3 text-muted-foreground" />
        </div>
      );
    }
    return fighter.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-6 h-6 rounded-full object-cover" />
    ) : (
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  };

  const getRankingIndicator = (fighterId: string | undefined) => {
    if (fighterId === bracketWinnerId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-yellow-500 text-white">1</span>;
    if (fighterId === bracketRunnerUpId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-gray-400 text-white">2</span>;
    if (fighterId === bracketThirdPlaceWinnerId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-orange-500 text-white">3</span>;
    return null;
  };

  const matchNumberDisplay = match.matFightNumber ? `${match._matName?.replace('Mat ', '') || ''}-${match.matFightNumber}` : `${getShortMatchIdentifier(match.id)}`;

  return (
    <Card className="w-full min-w-[200px] max-w-[250px] border-2 bg-card text-foreground">
      <CardContent className="p-2 text-sm">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-xs text-muted-foreground">{matchNumberDisplay}</span>
          {isFinal && match.winnerId && <Trophy className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="space-y-1">
          <div className={cn(
            "flex items-center space-x-2 p-1 rounded-md",
            match.winnerId === (fighter1 !== 'BYE' ? fighter1?.id : undefined) ? 'bg-green-100 dark:bg-green-900' :
            (match.winnerId && match.winnerId !== 'BYE' && match.winnerId !== (fighter1 !== 'BYE' ? fighter1?.id : undefined)) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(fighter1)}
            <div className="flex-1 flex items-center justify-between">
              {getFighterDisplay(fighter1, 1)}
              {isFinal && getRankingIndicator(fighter1 !== 'BYE' ? fighter1?.id : undefined)}
            </div>
          </div>
          <div className={cn(
            "flex items-center space-x-2 p-1 rounded-md",
            match.winnerId === (fighter2 !== 'BYE' ? fighter2?.id : undefined) ? 'bg-green-100 dark:bg-green-900' :
            (match.winnerId && match.winnerId !== 'BYE' && match.winnerId !== (fighter2 !== 'BYE' ? fighter2?.id : undefined)) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(fighter2)}
            <div className="flex-1 flex items-center justify-between">
              {getFighterDisplay(fighter2, 2)}
              {isFinal && getRankingIndicator(fighter2 !== 'BYE' ? fighter2?.id : undefined)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BracketMatchCard;