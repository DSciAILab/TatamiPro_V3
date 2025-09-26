"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { UserRound, CheckCircle, Trophy } from 'lucide-react';

interface PrintableBracketProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
}

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'FINAL';
    case 2: return 'SEMIFINAL';
    case 3: return 'QUARTAS DE FINAL';
    case 4: return 'OITAVAS DE FINAL';
    default: return `RODADA ${roundIndex + 1}`;
  }
};

const PrintableBracket: React.FC<PrintableBracketProps> = ({ bracket, allAthletes, division }) => {
  const athletesMap = useMemo(() => {
    return new Map(allAthletes.map(athlete => [athlete.id, athlete]));
  }, [allAthletes]);

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        Nenhum bracket gerado para esta divisão ainda.
      </div>
    );
  }

  const totalRounds = bracket.rounds.length;

  const getFighterDisplay = (fighterId: string | 'BYE' | undefined, isWinner: boolean) => {
    if (fighterId === 'BYE') return 'BYE';
    if (!fighterId) return 'Aguardando';
    const fighter = athletesMap.get(fighterId);
    if (!fighter) return 'Atleta Desconhecido';
    return (
      <span className={cn("text-xs font-medium", isWinner && "font-bold")}>
        {fighter.firstName} {fighter.lastName} ({fighter.club})
      </span>
    );
  };

  const getFighterPhoto = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE' || !fighterId) {
      return (
        <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-2 w-2 text-muted-foreground" />
        </div>
      );
    }
    const fighter = athletesMap.get(fighterId);
    return fighter?.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-4 h-4 rounded-full object-cover" />
    ) : (
      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-2 w-2 text-muted-foreground" />
      </div>
    );
  };

  const renderMatch = (match: Match, isFinal: boolean = false, isThirdPlace: boolean = false) => {
    const fighter1IsWinner = match.winnerId === match.fighter1Id;
    const fighter2IsWinner = match.winnerId === match.fighter2Id;

    const matchNumberDisplay = match.matFightNumber ? `${match._matName?.replace('Mat ', '') || ''}-${match.matFightNumber}` : `Luta ${match.matchNumber}`;

    return (
      <div key={match.id} className="border border-gray-300 dark:border-gray-700 rounded-sm p-1 mb-1 text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-muted-foreground">{matchNumberDisplay}</span>
          {isFinal && match.winnerId && <Trophy className="h-3 w-3 text-yellow-500" />}
        </div>
        <div className="space-y-0.5">
          <div className={cn("flex items-center space-x-1", fighter1IsWinner && "bg-green-50 dark:bg-green-900 rounded-sm")}>
            {getFighterPhoto(match.fighter1Id)}
            {getFighterDisplay(match.fighter1Id, fighter1IsWinner)}
          </div>
          <div className={cn("flex items-center space-x-1", fighter2IsWinner && "bg-green-50 dark:bg-green-900 rounded-sm")}>
            {getFighterPhoto(match.fighter2Id)}
            {getFighterDisplay(match.fighter2Id, fighter2IsWinner)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 bg-white text-black min-h-[297mm] w-[210mm] mx-auto shadow-lg print:shadow-none print:m-0 print:p-0">
      <h1 className="text-xl font-bold text-center mb-4">{division.name}</h1>
      <div className="flex justify-around space-x-2">
        {bracket.rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="flex flex-col items-center flex-1">
            <h2 className="text-sm font-semibold mb-2">{getRoundName(roundIndex, totalRounds)}</h2>
            <div className="flex flex-col space-y-2 w-full">
              {round.map(match => renderMatch(match, roundIndex === totalRounds - 1))}
            </div>
          </div>
        ))}
      </div>
      {bracket.thirdPlaceMatch && (
        <div className="mt-8 text-center">
          <h2 className="text-sm font-semibold mb-2">Luta pelo 3º Lugar</h2>
          {renderMatch(bracket.thirdPlaceMatch, false, true)}
        </div>
      )}
    </div>
  );
};

export default PrintableBracket;