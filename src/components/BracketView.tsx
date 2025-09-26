"use client";

import React, { useMemo } from 'react';
import { Bracket, Athlete, Division } from '@/types/index';
import BracketMatchCard from './BracketMatchCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BracketViewProps {
  bracket: Bracket;
  allAthletes: Athlete[];
  division: Division;
}

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

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-4">Bracket: {division.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center overflow-x-auto">
        <div className="flex space-x-4 p-4">
          {bracket.rounds.map((round, roundIndex) => (
            <div key={roundIndex} className="flex flex-col items-center space-y-8 min-w-[220px]">
              <h3 className="text-lg font-semibold">Rodada {roundIndex + 1}</h3>
              {round.map(match => (
                <BracketMatchCard
                  key={match.id}
                  match={match}
                  athletesMap={athletesMap}
                  isFinal={roundIndex === bracket.rounds.length - 1}
                />
              ))}
            </div>
          ))}
        </div>
        {bracket.thirdPlaceMatch && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Luta pelo 3º Lugar</h3>
            <BracketMatchCard
              match={bracket.thirdPlaceMatch}
              athletesMap={athletesMap}
              isThirdPlace
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BracketView;