"use client";

import React, { useMemo } from 'react';
import { Event } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

interface TeamLeaderboardProps {
  event: Event;
}

interface TeamScore {
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  totalPoints: number;
}

const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ event }) => {
  const athletesMap = useMemo(() => {
    return new Map((event.athletes || []).map(athlete => [athlete.id, athlete]));
  }, [event.athletes]);

  const teamScores = useMemo(() => {
    const scores: Record<string, TeamScore> = {};

    if (!event.brackets || !event.athletes) {
      return [];
    }

    const getClub = (athleteId: string): string | null => {
      return athletesMap.get(athleteId)?.club || null;
    };

    Object.values(event.brackets).forEach(bracket => {
      if (bracket.winner_id) {
        const club = getClub(bracket.winner_id);
        if (club) {
          if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
          scores[club].gold += 1;
          scores[club].totalPoints += event.champion_points || 9;
        }
      }
      if (bracket.runner_up_id) {
        const club = getClub(bracket.runner_up_id);
        if (club) {
          if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
          scores[club].silver += 1;
          scores[club].totalPoints += event.runner_up_points || 3;
        }
      }
      if (bracket.third_place_winner_id) {
        const club = getClub(bracket.third_place_winner_id);
        if (club) {
          if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
          scores[club].bronze += 1;
          scores[club].totalPoints += event.third_place_points || 1;
        }
      }
    });

    return Object.values(scores).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });
  }, [event, athletesMap]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
          Classificação por Equipes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {teamScores.length === 0 ? (
          <p className="text-muted-foreground">Nenhum resultado finalizado para calcular a classificação.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead className="text-center">Ouro</TableHead>
                <TableHead className="text-center">Prata</TableHead>
                <TableHead className="text-center">Bronze</TableHead>
                <TableHead className="text-right">Pontos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamScores.map((team, index) => (
                <TableRow key={team.name}>
                  <TableCell className="font-bold">{index + 1}</TableCell>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell className="text-center">{team.gold}</TableCell>
                  <TableCell className="text-center">{team.silver}</TableCell>
                  <TableCell className="text-center">{team.bronze}</TableCell>
                  <TableCell className="text-right font-bold">{team.totalPoints}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamLeaderboard;