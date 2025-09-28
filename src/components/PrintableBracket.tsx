"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division, Match } from '@/types/index'; // Adicionado Match
import { cn } from '@/lib/utils';
import { UserRound, Trophy } from 'lucide-react';

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
        {fighter.first_name} {fighter.last_name} ({fighter.club})
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
    return fighter?.photo_url ? (
      <img src={fighter.photo_url} alt={fighter.first_name} className="w-4 h-4 rounded-full object-cover" />
    ) : (
      <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-2 w-2 text-muted-foreground" />
      </div>
    );
  };

  const renderMatch = (match: Match, isFinal: boolean = false) => {
    const fighter1IsWinner = match.winner_id === match.fighter1_id;
    const fighter2IsWinner = match.winner_id === match.fighter2_id;

    const matchNumberDisplay = match.mat_fight_number ? `${match._mat_name?.replace('Mat ', '') || ''}-${match.mat_fight_number}` : `Luta ${match.match_number}`;

    return (
      <div key={match.id} className="border border-gray-300 dark:border-gray-700 rounded-sm p-1 mb-1 text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-muted-foreground">{matchNumberDisplay}</span>
          {isFinal && match.winner_id && <Trophy className="h-3 w-3 text-yellow-500" />}
        </div>
        <div className="space-y-0.5">
          <div className={cn("flex items-center space-x-1", fighter1IsWinner && "bg-green-50 dark:bg-green-900 rounded-sm")}>
            {getFighterPhoto(match.fighter1_id)}
            {getFighterDisplay(match.fighter1_id, fighter1IsWinner)}
          </div>
          <div className={cn("flex items-center space-x-1", fighter2IsWinner && "bg-green-50 dark:bg-green-900 rounded-sm")}>
            {getFighterPhoto(match.fighter2_id)}
            {getFighterDisplay(match.fighter2_id, fighter2IsWinner)}
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
      {bracket.third_place_match && (
        <div className="mt-8 text-center">
          <h2 className="text-sm font-semibold mb-2">Luta pelo 3º Lugar</h2>
          {renderMatch(bracket.third_place_match, false)}
        </div>
      )}
    </div>
  );
};

export default PrintableBracket;