"use client";

import React, { useMemo } from 'react';
import { Event } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { UserRound, Trophy } from 'lucide-react';
import TeamLeaderboard from './TeamLeaderboard';

interface ResultsTabProps {
  event: Event;
}

const ResultsTab: React.FC<ResultsTabProps> = ({ event }) => {
  const athletesMap = useMemo(() => {
    return new Map((event.athletes || []).map(athlete => [athlete.id, athlete]));
  }, [event.athletes]);

  const completedDivisions = useMemo(() => {
    if (!event.brackets || !event.divisions) return [];
    return event.divisions.filter(div => event.brackets?.[div.id]?.winner_id);
  }, [event.brackets, event.divisions]);

  const getAthleteDisplay = (athleteId?: string) => {
    if (!athleteId) return <span className="text-muted-foreground">N/A</span>;
    const athlete = athletesMap.get(athleteId);
    if (!athlete) return <span className="text-muted-foreground">Atleta Desconhecido</span>;
    return (
      <div className="flex items-center space-x-2">
        {athlete.photo_url ? (
          <img src={athlete.photo_url} alt={athlete.first_name} className="w-6 h-6 rounded-full object-cover" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <UserRound className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        <span>{athlete.first_name} {athlete.last_name} ({athlete.club})</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <TeamLeaderboard event={event} />

      <Card>
        <CardHeader>
          <CardTitle>Pódios por Divisão</CardTitle>
          <CardDescription>Resultados finais para cada divisão concluída.</CardDescription>
        </CardHeader>
        <CardContent>
          {completedDivisions.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma divisão foi finalizada ainda.</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {completedDivisions.map(division => {
                const bracket = event.brackets?.[division.id];
                return (
                  <AccordionItem key={division.id} value={division.id}>
                    <AccordionTrigger>{division.name}</AccordionTrigger>
                    <AccordionContent>
                      <ul className="space-y-2">
                        <li className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <span className="font-semibold w-20">1º Lugar:</span>
                          {getAthleteDisplay(bracket?.winner_id)}
                        </li>
                        <li className="flex items-center space-x-2">
                          <Trophy className="h-5 w-5 text-gray-400" />
                          <span className="font-semibold w-20">2º Lugar:</span>
                          {getAthleteDisplay(bracket?.runner_up_id)}
                        </li>
                        {event.include_third_place && bracket?.third_place_winner_id && (
                          <li className="flex items-center space-x-2">
                            <Trophy className="h-5 w-5 text-orange-500" />
                            <span className="font-semibold w-20">3º Lugar:</span>
                            {getAthleteDisplay(bracket.third_place_winner_id)}
                          </li>
                        )}
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResultsTab;