"use client";

import React, { useMemo } from 'react';
import { Event } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

interface TeamLeaderboardProps {
  event: Event;
  searchTerm?: string;
}

interface TeamScore {
  name: string;
  gold: number;
  silver: number;
  bronze: number;
  totalPoints: number;
}

const TeamLeaderboard: React.FC<TeamLeaderboardProps> = ({ event, searchTerm = '' }) => {
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
      
      // Check for third place winner from third place match
      if (bracket.third_place_winner_id) {
        const club = getClub(bracket.third_place_winner_id);
        if (club) {
          if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
          scores[club].bronze += 1;
          scores[club].totalPoints += event.third_place_points || 1;
        }
      } else if (!bracket.third_place_match && bracket.rounds.length >= 2) {
        // No third place match - both semi-final losers get 3rd place
        const semiRound = bracket.rounds[bracket.rounds.length - 2];
        semiRound.forEach(match => {
          if (match.loser_id && match.loser_id !== 'BYE') {
            const club = getClub(match.loser_id);
            if (club) {
              if (!scores[club]) scores[club] = { name: club, gold: 0, silver: 0, bronze: 0, totalPoints: 0 };
              scores[club].bronze += 1;
              scores[club].totalPoints += event.third_place_points || 1;
            }
          }
        });
      }
    });

    return Object.values(scores).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });
  }, [event, athletesMap]);

  // Filter teams based on searchTerm
  const filteredTeams = useMemo(() => {
    if (!searchTerm.trim()) return teamScores;
    
    const terms = searchTerm.toLowerCase().split(',').map(t => t.trim()).filter(t => t);
    return teamScores.filter(team => 
      terms.some(term => team.name.toLowerCase().includes(term))
    );
  }, [teamScores, searchTerm]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Trophy className="mr-2 h-6 w-6 text-yellow-500" />
          Team Rankings
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredTeams.length === 0 ? (
          <p className="text-muted-foreground">
            {teamScores.length === 0 
              ? 'No completed results to calculate rankings.'
              : 'No teams match your search.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-center">Gold</TableHead>
                <TableHead className="text-center">Silver</TableHead>
                <TableHead className="text-center">Bronze</TableHead>
                <TableHead className="text-right">Points</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeams.map((team) => {
                // Get original rank from full list
                const originalRank = teamScores.findIndex(t => t.name === team.name) + 1;
                return (
                  <TableRow key={team.name}>
                    <TableCell className="font-bold">{originalRank}</TableCell>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell className="text-center">{team.gold}</TableCell>
                    <TableCell className="text-center">{team.silver}</TableCell>
                    <TableCell className="text-center">{team.bronze}</TableCell>
                    <TableCell className="text-right font-bold">{team.totalPoints}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TeamLeaderboard;