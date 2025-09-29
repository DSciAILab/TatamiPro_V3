"use client";

import React, { useMemo } from 'react';
import { Event, Match } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PublicFightOrderProps {
  event: Event;
}

const PublicFightOrder: React.FC<PublicFightOrderProps> = ({ event }) => {
  const athletesMap = useMemo(() => {
    return new Map((event.athletes || []).map(athlete => [athlete.id, athlete]));
  }, [event.athletes]);

  const allFightsOrdered = useMemo(() => {
    if (!event.mat_fight_order || !event.brackets) return [];

    const allMatches: Match[] = [];
    Object.values(event.brackets).forEach(bracket => {
      allMatches.push(...bracket.rounds.flat());
      if (bracket.third_place_match) allMatches.push(bracket.third_place_match);
    });
    const allMatchesMap = new Map(allMatches.map(m => [m.id, m]));

    const orderedFightIds: string[] = [];
    const matNames = Object.keys(event.mat_fight_order).sort();
    matNames.forEach(matName => {
      orderedFightIds.push(...event.mat_fight_order![matName]);
    });

    return orderedFightIds
      .map(id => allMatchesMap.get(id))
      .filter((m): m is Match => !!m && m.fighter1_id !== 'BYE' && m.fighter2_id !== 'BYE');
  }, [event.brackets, event.mat_fight_order]);

  const getFighterDisplay = (fighterId?: string) => {
    if (!fighterId) return { name: 'Aguardando', club: '' };
    const athlete = athletesMap.get(fighterId);
    if (!athlete) return { name: 'Desconhecido', club: '' };
    return { name: `${athlete.first_name} ${athlete.last_name}`, club: athlete.club };
  };

  if (allFightsOrdered.length === 0) {
    return <p className="text-muted-foreground">A ordem das lutas ainda não foi gerada.</p>;
  }

  return (
    <div className="space-y-4">
      {allFightsOrdered.map(match => {
        const fighter1 = getFighterDisplay(match.fighter1_id);
        const fighter2 = getFighterDisplay(match.fighter2_id);
        const fightNumberDisplay = `${match._mat_name?.replace('Mat ', '') || 'N/A'}-${match.mat_fight_number}`;

        return (
          <Card key={match.id} className={cn("transition-all", match.winner_id ? "bg-muted" : "bg-card")}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="font-bold text-lg w-20">{fightNumberDisplay}</div>
              <div className="flex-1 space-y-2">
                <div className={cn("flex items-center", match.winner_id === match.fighter1_id && "font-bold text-green-600")}>
                  <UserRound className="mr-2 h-5 w-5" />
                  <div>
                    <p>{fighter1.name}</p>
                    <p className="text-xs text-muted-foreground">{fighter1.club}</p>
                  </div>
                </div>
                <div className={cn("flex items-center", match.winner_id === match.fighter2_id && "font-bold text-green-600")}>
                  <UserRound className="mr-2 h-5 w-5" />
                  <div>
                    <p>{fighter2.name}</p>
                    <p className="text-xs text-muted-foreground">{fighter2.club}</p>
                  </div>
                </div>
              </div>
              {match.winner_id && (
                <div className="text-right w-40">
                  <p className="font-bold text-green-600">Vencedor</p>
                  <p className="text-sm">{getFighterDisplay(match.winner_id).name}</p>
                  <p className="text-xs text-muted-foreground">{match.result?.type}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PublicFightOrder;