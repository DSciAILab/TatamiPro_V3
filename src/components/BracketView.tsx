"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import BracketMatchCard from './BracketMatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslations } from '@/hooks/use-translations';

interface BracketViewProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
  eventId: string;
  isPublic?: boolean;
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

const BracketView: React.FC<BracketViewProps> = ({ bracket, allAthletes, division, eventId, isPublic = false }) => {
  const { t } = useTranslations();
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

  // --- Handle Double Elimination (3 athletes) ---
  if (bracket._is_double_elimination && bracket.rounds.length === 3) {
    const [round1, round2, round3] = bracket.rounds;
    const participants = bracket.participants.filter(p => p !== 'BYE') as Athlete[];

    return (
      <Card className="p-4">
        <CardHeader>
          <CardTitle className="text-2xl font-bold mb-2">Double Elimination (3 Atletas): {division.name}</CardTitle>
          <p className="text-muted-foreground">Formato de eliminação dupla para {participants.length} atletas. ({t('teamStandings')})</p>
        </CardHeader>
        <CardContent className="flex flex-col items-start overflow-x-auto">
          <div className="flex space-x-8 p-4 relative">
            {/* Round 1 */}
            <div className="flex flex-col items-center min-w-[375px]">
              <h3 className="text-lg font-semibold mb-4">Luta 1</h3>
              <BracketMatchCard
                match={round1[0]}
                athletesMap={athletesMap}
                eventId={eventId}
                divisionId={bracket.division_id}
                isPublic={isPublic}
              />
            </div>

            {/* Round 2 (Repescagem) */}
            <div className="flex flex-col items-center min-w-[375px]">
              <h3 className="text-lg font-semibold mb-4">Luta 2 (Repescagem)</h3>
              <BracketMatchCard
                match={round2[0]}
                athletesMap={athletesMap}
                eventId={eventId}
                divisionId={bracket.division_id}
                isPublic={isPublic}
              />
            </div>

            {/* Round 3 (Final) */}
            <div className="flex flex-col items-center min-w-[375px]">
              <h3 className="text-lg font-semibold mb-4">Luta 3 (Final)</h3>
              <BracketMatchCard
                match={round3[0]}
                athletesMap={athletesMap}
                eventId={eventId}
                divisionId={bracket.division_id}
                isPublic={isPublic}
                isFinal={true}
                bracketWinnerId={bracket.winner_id}
                bracketRunnerUpId={bracket.runner_up_id}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground pt-4">
            O perdedor da Luta 1 enfrenta o terceiro atleta na Luta 2. Os vencedores da Luta 1 e Luta 2 se enfrentam na Final.
          </p>
        </CardContent>
      </Card>
    );
  }
  // --- End Double Elimination ---

  const totalRounds = bracket.rounds.length;

  const cardHeight = 140;
  const baseVerticalGap = 40;
  const matchFullHeight = cardHeight + baseVerticalGap;
  const cardWidth = 375;

  const matchMarginTops = useMemo(() => {
    const yTops: Map<string, number> = new Map();
    const marginTops: Map<string, number> = new Map();

    bracket.rounds.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        if (roundIndex === 0) {
          yTops.set(match.id, matchIndex * matchFullHeight);
        } else {
          const prevRound = bracket.rounds[roundIndex - 1];
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

    bracket.rounds.forEach((round) => {
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
  }, [bracket, cardHeight, matchFullHeight]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4">Bracket: {division.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-start overflow-x-auto">
        <div className="flex space-x-8 p-4 relative">
          {bracket.rounds.map((round, roundIndex) => {
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
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketView;