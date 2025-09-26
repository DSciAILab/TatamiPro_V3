"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import BracketMatchCard from './BracketMatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BracketViewProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
  eventId: string; // NOVO: ID do evento
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

const BracketView: React.FC<BracketViewProps> = ({ bracket, allAthletes, division, eventId }) => {
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

  // Definindo constantes para o layout das linhas
  const cardHeight = 140; // Altura calculada de um BracketMatchCard (2 slots * 56px + padding/margin + bordas)
  const baseVerticalGap = 40; // Espaçamento vertical entre as lutas na primeira rodada (AUMENTADO)
  const matchFullHeight = cardHeight + baseVerticalGap; // Altura total que um card 'ocupa' na primeira rodada
  const cardWidth = 375; // Largura máxima de um BracketMatchCard (250 * 1.5 = 375)

  // Calcula as posições Y (top) e os margin-tops para cada luta
  const matchMarginTops = useMemo(() => {
    const yTops: Map<string, number> = new Map();
    const marginTops: Map<string, number> = new Map();

    // 1. Calcular a posição Y (top) absoluta de cada luta dentro de sua coluna
    bracket.rounds.forEach((round, roundIndex) => {
      round.forEach((match, matchIndex) => {
        if (roundIndex === 0) {
          // Primeira rodada: empilhamento simples
          yTops.set(match.id, matchIndex * matchFullHeight);
        } else {
          // Rodadas subsequentes: centralizar entre os pais
          const prevRound = bracket.rounds[roundIndex - 1];
          const parent1 = prevRound[matchIndex * 2];
          const parent2 = prevRound[matchIndex * 2 + 1];

          if (parent1 && parent2) {
            const center1 = (yTops.get(parent1.id) || 0) + cardHeight / 2;
            const center2 = (yTops.get(parent2.id) || 0) + cardHeight / 2;
            const midPoint = (center1 + center2) / 2;
            yTops.set(match.id, midPoint - cardHeight / 2);
          } else {
            // Fallback, embora não deva acontecer em brackets válidos
            yTops.set(match.id, 0);
          }
        }
      });
    });

    // 2. Calcular o margin-top para cada luta com base nas posições Y absolutas
    bracket.rounds.forEach((round) => {
      round.forEach((match, matchIndex) => {
        const currentYTop = yTops.get(match.id)!;
        let calculatedMarginTop = 0;

        if (matchIndex === 0) {
          // O primeiro card da rodada tem seu margin-top igual à sua posição Y absoluta
          calculatedMarginTop = currentYTop;
        } else {
          // Cards subsequentes na mesma rodada: margin-top é o espaço do final do card anterior até o início do atual
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
      <CardContent className="flex flex-col items-center overflow-x-auto">
        <div className="flex space-x-8 p-4 relative"> {/* Este div é o container relativo para as linhas */}
          {bracket.rounds.map((round, roundIndex) => {
            const isLastRound = roundIndex === totalRounds - 1;
            return (
              <React.Fragment key={roundIndex}>
                <div
                  className="flex flex-col items-center min-w-[375px]"
                  style={{ width: `${cardWidth}px` }} // Largura explícita para a coluna da rodada
                >
                  <h3 className="text-lg font-semibold mb-4">{getRoundName(roundIndex, totalRounds)}</h3>
                  <div className="flex flex-col">
                    {round.map((match) => (
                      <div
                        key={match.id}
                        style={{
                          marginTop: `${matchMarginTops.get(match.id) || 0}px`,
                          height: `${cardHeight}px`, // Altura explícita para espaçamento consistente
                        }}
                      >
                        <BracketMatchCard
                          match={match}
                          athletesMap={athletesMap}
                          isFinal={isLastRound}
                          bracketWinnerId={bracket.winnerId}
                          bracketRunnerUpId={bracket.runnerUpId}
                          bracketThirdPlaceWinnerId={bracket.thirdPlaceWinnerId}
                          eventId={eventId} // Passar eventId
                          divisionId={bracket.divisionId} // Passar divisionId
                        />
                      </div>
                    ))}
                  </div>
                </div>
                {/* As linhas de conexão foram removidas daqui */}
              </React.Fragment>
            );
          })}
        </div>
        {bracket.thirdPlaceMatch && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Luta pelo 3º Lugar</h3>
            <BracketMatchCard
              match={bracket.thirdPlaceMatch}
              athletesMap={athletesMap}
              bracketWinnerId={bracket.winnerId}
              bracketRunnerUpId={bracket.runnerUpId}
              bracketThirdPlaceWinnerId={bracket.thirdPlaceWinnerId}
              eventId={eventId} // Passar eventId
              divisionId={bracket.divisionId} // Passar divisionId
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketView;