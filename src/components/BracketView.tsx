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

  // Definindo alturas e espaçamentos base para o cálculo do layout
  const cardHeight = 100; // Altura aproximada de um BracketMatchCard
  const baseVerticalGap = 20; // Espaçamento vertical entre as lutas na primeira rodada
  const matchCardTotalHeight = cardHeight + baseVerticalGap; // Altura total que um card 'ocupa' na primeira rodada

  // Pré-calcula os `marginTop` para o primeiro card de cada rodada e entre os cards da mesma rodada
  const { initialMarginTops, interMatchMarginTops } = useMemo(() => {
    const initialMts: number[] = [];
    const interMts: number[] = [];

    initialMts[0] = 0; // O primeiro card da primeira rodada não tem margin-top inicial
    interMts[0] = baseVerticalGap; // Espaçamento padrão entre cards na primeira rodada

    for (let r = 1; r < totalRounds; r++) {
      // O margin-top inicial de uma rodada é o margin-top inicial da rodada anterior
      // mais metade do espaçamento entre os cards da rodada anterior.
      initialMts[r] = initialMts[r - 1] + interMts[r - 1] / 2;
      
      // O margin-top entre os cards de uma rodada subsequente aumenta exponencialmente
      // para criar o efeito de pirâmide.
      interMts[r] = (Math.pow(2, r) * matchCardTotalHeight) - cardHeight;
    }
    return { initialMarginTops: initialMts, interMatchMarginTops: interMts };
  }, [totalRounds]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4">Bracket: {division.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center overflow-x-auto">
        <div className="flex space-x-8 p-4">
          {bracket.rounds.map((round, roundIndex) => {
            return (
              <div
                key={roundIndex}
                className="flex flex-col items-center min-w-[250px]"
              >
                <h3 className="text-lg font-semibold mb-4">{getRoundName(roundIndex, totalRounds)}</h3>
                <div className="flex flex-col">
                  {round.map((match, matchIndex) => (
                    <div
                      key={match.id}
                      style={{
                        // Aplica o margin-top calculado para o primeiro card da rodada
                        // ou o margin-top calculado entre os cards da mesma rodada.
                        marginTop: matchIndex === 0 ? `${initialMarginTops[roundIndex]}px` : `${interMatchMarginTops[roundIndex]}px`,
                      }}
                    >
                      <BracketMatchCard
                        match={match}
                        athletesMap={athletesMap}
                        isFinal={roundIndex === bracket.rounds.length - 1}
                        bracketWinnerId={bracket.winnerId}
                        bracketRunnerUpId={bracket.runnerUpId}
                        bracketThirdPlaceWinnerId={bracket.thirdPlaceWinnerId}
                      />
                    </div>
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