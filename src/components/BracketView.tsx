"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import BracketMatchCard from './BracketMatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BracketViewProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
  eventId: string;
  isPublic?: boolean;
  basePath?: string;
  source?: 'brackets' | 'mat-control' | 'division-bracket-view';
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

const BracketView: React.FC<BracketViewProps> = ({ bracket, allAthletes, division, eventId, isPublic = false, basePath, source }) => {
  const athletesMap = useMemo(() => {
    return new Map(allAthletes.map(athlete => [athlete.id, athlete]));
  }, [allAthletes]);

  const rounds = bracket?.rounds ?? [];
  const hasRounds = rounds.length > 0;
  const totalRounds = rounds.length;

  const cardHeight = 140;
  const baseVerticalGap = 40;
  const matchFullHeight = cardHeight + baseVerticalGap;
  const cardWidth = 375;

  const matchMarginTops = useMemo(() => {
    if (!hasRounds) return new Map<string, number>();

    const yTops: Map<string, number> = new Map();
    const marginTops: Map<string, number> = new Map();

    // 1. Calcular a posição Y (top) absoluta de cada luta dentro de sua coluna
    rounds.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        if (roundIndex === 0) {
          yTops.set(match.id, matchIndex * matchFullHeight);
        } else {
          // Rodadas subsequentes: centralizar entre os pais
          const prevRound = rounds[roundIndex - 1];
          const parent1 = prevRound[matchIndex * 2];
          const parent2 = prevRound[matchIndex * 2 + 1];

          if (parent1 && parent2) {
            const center1 = (yTops.get(parent1.id) || 0) + cardHeight / 2;
            const center2 = (yTops.get(parent2.id) || 0) + cardHeight / 2;
            const midPoint = (center1 + center2) / 2;
            yTops.set(match.id, midPoint - cardHeight / 2);
          } else {
            yTops.set(match.id, 0);
          }
        }
      });
    });

    // 2. Calcular o margin-top para cada luta com base nas posições Y absolutas
    rounds.forEach((round) => {
      round.forEach((match, matchIndex) => {
        const currentYTop = yTops.get(match.id)!;
        let calculatedMarginTop = 0;

        if (matchIndex === 0) {
          calculatedMarginTop = currentYTop;
        } else {
          const prevMatchInRound = round[matchIndex - 1];
          const prevYTop = yTops.get(prevMatchInRound.id)!;
          calculatedMarginTop = currentYTop - (prevYTop + cardHeight);
        }
        marginTops.set(match.id, calculatedMarginTop);
      });
    });

    return marginTops;
  }, [hasRounds, rounds, cardHeight, matchFullHeight]);

  if (!hasRounds) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bracket para {division.name}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No bracket generated for this division yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4">Bracket: {division.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center overflow-x-auto">
        <div className="flex space-x-8 p-4 relative"> {/* Este div é o container relativo para as linhas */}
          {rounds.map((round, roundIndex) => {
            const isLastRound = roundIndex === totalRounds - 1;
            return (
              <React.Fragment key={roundIndex}>
                <div
                  className="flex flex-col items-center min-w-[375px]"
                  style={{ width: `${cardWidth}px` }}
                >
                  <h3 className="text-lg font-semibold mb-4">{getRoundName(roundIndex, totalRounds)}</h3>
                  <div className="flex flex-col">
                    {round.map((match) => (
                      <div
                        key={match.id}
                        style={{
                          marginTop: `${matchMarginTops.get(match.id) || 0}px`,
                          height: `${cardHeight}px`,
                        }}
                      >
                        <BracketMatchCard
                          match={match}
                          athletesMap={athletesMap}
                          isFinal={isLastRound}
                          bracketWinnerId={bracket.winner_id}
                          bracketRunnerUpId={bracket.runner_up_id}
                          bracketThirdPlaceWinnerId={bracket.third_place_winner_id}
                          eventId={eventId}
                          divisionId={bracket.division_id}
                          isPublic={isPublic}
                          basePath={basePath}
                          source="brackets"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
        {bracket.third_place_match && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Luta pelo 3º Lugar</h3>
            <BracketMatchCard
              match={bracket.third_place_match}
              athletesMap={athletesMap}
              bracketWinnerId={bracket.winner_id}
              bracketRunnerUpId={bracket.runner_up_id}
              bracketThirdPlaceWinnerId={bracket.third_place_winner_id}
              eventId={eventId}
              divisionId={bracket.division_id}
              isPublic={isPublic}
              basePath={basePath}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketView;
