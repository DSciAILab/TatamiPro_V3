"use client";

import React from 'react';
import { Match, Athlete } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound, Trophy } from 'lucide-react';

interface BracketMatchCardProps {
  match: Match;
  athletesMap: Map<string, Athlete>;
  isFinal?: boolean;
  isThirdPlace?: boolean;
}

const BracketMatchCard: React.FC<BracketMatchCardProps> = ({ match, athletesMap, isFinal, isThirdPlace }) => {
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
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    return fighter.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  const matchStatusClass = match.winnerId
    ? 'border-green-500'
    : (fighter1 === 'BYE' && fighter2 === 'BYE')
      ? 'border-gray-300'
      : 'border-blue-500';

  return (
    <Card className={`w-full min-w-[200px] ${matchStatusClass} border-2`}>
      <CardContent className="p-2 text-sm">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold">
            {isThirdPlace ? '3º Lugar' : `Luta ${match.matchNumber}`}
          </span>
          {isFinal && <Trophy className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="space-y-1">
          <div className={`flex items-center space-x-2 p-1 rounded-md ${match.winnerId === (fighter1 !== 'BYE' ? fighter1?.id : undefined) ? 'bg-green-100 dark:bg-green-900' : ''}`}>
            {getFighterPhoto(fighter1)}
            <span className="flex-1 truncate">{getFighterDisplay(fighter1)}</span>
          </div>
          <div className={`flex items-center space-x-2 p-1 rounded-md ${match.winnerId === (fighter2 !== 'BYE' ? fighter2?.id : undefined) ? 'bg-green-100 dark:bg-green-900' : ''}`}>
            {getFighterPhoto(fighter2)}
            <span className="flex-1 truncate">{getFighterDisplay(fighter2)}</span>
          </div>
        </div>
        {match.winnerId && match.winnerId !== 'BYE' && (
          <div className="mt-2 text-right text-xs font-medium text-green-600">
            Vencedor: {athletesMap.get(match.winnerId)?.firstName}
          </div>
        )}
        {(fighter1 === 'BYE' && fighter2 !== 'BYE') && (
          <div className="mt-2 text-right text-xs font-medium text-blue-600">
            {getFighterDisplay(fighter2)} avança por BYE
          </div>
        )}
        {(fighter2 === 'BYE' && fighter1 !== 'BYE') && (
          <div className="mt-2 text-right text-xs font-medium text-blue-600">
            {getFighterDisplay(fighter1)} avança por BYE
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketMatchCard;