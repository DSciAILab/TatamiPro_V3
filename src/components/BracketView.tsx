"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import BracketMatchCard from './BracketMatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BracketViewProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
}

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'FINALS';
    case 2: return 'SEMIFINALS';
    case 3: return 'QUARTERFINALS';
    case 4: return 'ROUND OF 16';
    default: return `ROUND ${roundIndex + 1}`;
  }
};

const BracketView: React.FC<BracketViewProps> = ({ bracket, allAthletes, division }) => {
  const athletesMap = useMemo(() => {
    return new Map(allAthletes.map(athlete => [athlete.id, athlete]));
  }, [allAthletes]);

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bracket para {division.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Nenhum bracket gerado para esta divisão ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const totalRounds = bracket.rounds.length;

  // Base dimensions for visual calculation (approximate)
  const cardHeight = 100; // Estimated height of a match card (adjust if BracketMatchCard changes)
  const baseVerticalGap = 20; // Estimated vertical space between matches in the first round

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4">Bracket: {division.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center overflow-x-auto">
        <div className="flex space-x-8 p-4">
          {bracket.rounds.map((round, roundIndex) => {
            // Calculate dynamic vertical spacing for each round
            // Each subsequent round needs to be shifted up by half the height of the previous round's "gap"
            const numMatchesInPrevRound = roundIndex > 0 ? bracket.rounds[roundIndex - 1].length : 0;
            const numMatchesInCurrentRound = round.length;

            // Calculate the total height occupied by matches and gaps in the *first* round
            // This is a simplified approach to get the "tree" effect
            const verticalShift = (numMatchesInPrevRound - numMatchesInCurrentRound) * (cardHeight + baseVerticalGap) / 2;

            return (
              <div
                key={roundIndex}
                className="flex flex-col items-center min-w-[250px]"
                style={{ marginTop: roundIndex > 0 ? `${verticalShift}px` : '0px' }}
              >
                <h3 className="text-lg font-semibold mb-4">{getRoundName(roundIndex, totalRounds)}</h3>
                <div className="flex flex-col space-y-8"> {/* Space between matches in a round */}
                  {round.map(match => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      athletesMap={athletesMap}
                      isFinal={roundIndex === bracket.rounds.length - 1}
                      bracketWinnerId={bracket.winnerId}
                      bracketRunnerUpId={bracket.runnerUpId}
                      bracketThirdPlaceWinnerId={bracket.thirdPlaceWinnerId}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        {bracket.thirdPlaceMatch && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Luta pelo 3º Lugar</h3>
            <BracketMatchCard
              match={bracket.thirdPlaceMatch}
              athletesMap={athletesMap}
              isThirdPlace
              bracketWinnerId={bracket.winnerId}
              bracketRunnerUpId={bracket.runnerUpId}
              bracketThirdPlaceWinnerId={bracket.thirdPlaceWinnerId}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketView;