"use client";

import React, { useMemo } from 'react';
import { Event, Division } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface FightOverviewProps {
  event: Event;
  onDivisionSelect: (division: Division) => void;
}

type BracketStatus = 'On Hold' | 'Generated' | 'In Progress' | 'Completed' | 'No Athletes';

interface DivisionMatInfo {
  division: Division;
  matName: string;
  athleteCount: number;
  bracketStatus: BracketStatus;
}

const FightOverview: React.FC<FightOverviewProps> = ({ event, onDivisionSelect }) => {

  const getBracketStatus = (division: Division, athleteCount: number): BracketStatus => {
    const bracket = event.brackets?.[division.id];

    if (athleteCount < 2) {
      return 'No Athletes';
    }
    if (!bracket) {
      return 'On Hold';
    }
    if (bracket.winner_id) {
      return 'Completed';
    }
    if (bracket.rounds.flat().some(match => match.winner_id !== undefined)) {
      return 'In Progress';
    }
    return 'Generated';
  };

  const getStatusColor = (status: BracketStatus) => {
    switch (status) {
      case 'Completed': return 'text-purple-600';
      case 'Generated': return 'text-green-600';
      case 'In Progress': return 'text-blue-600';
      case 'No Athletes': return 'text-gray-500';
      case 'On Hold': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  const divisionMatList = useMemo(() => {
    if (!event.divisions) return [];

    const divisionMatMap = new Map<string, string>();
    if (event.mat_assignments) {
      for (const matName in event.mat_assignments) {
        event.mat_assignments[matName].forEach(divisionId => {
          divisionMatMap.set(divisionId, matName);
        });
      }
    }

    const athletesByDivision = new Map<string, number>();
    (event.athletes || [])
      .filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in' && a._division)
      .forEach(athlete => {
        const divisionId = athlete._division!.id;
        athletesByDivision.set(divisionId, (athletesByDivision.get(divisionId) || 0) + 1);
      });

    const list: DivisionMatInfo[] = event.divisions
      .map(div => {
        const athleteCount = athletesByDivision.get(div.id) || 0;
        return {
          division: div,
          matName: divisionMatMap.get(div.id) || 'Não Atribuído',
          athleteCount: athleteCount,
          bracketStatus: getBracketStatus(div, athleteCount),
        };
      })
      .filter(info => info.bracketStatus !== 'No Athletes'); // Filter out divisions with < 2 athletes

    // Sort by Mat name, then by division name
    list.sort((a, b) => {
      const matA = parseInt(a.matName.replace('Mat ', ''), 10) || 999;
      const matB = parseInt(b.matName.replace('Mat ', ''), 10) || 999;
      if (matA !== matB) return matA - matB;
      return a.division.name.localeCompare(b.division.name);
    });

    return list;
  }, [event]);

  if (divisionMatList.length === 0) {
    return <p className="text-muted-foreground">Nenhuma categoria com atletas suficientes ou brackets gerados encontrada.</p>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Mat</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Atletas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisionMatList.map(({ division, matName, athleteCount, bracketStatus }) => (
              <TableRow
                key={division.id}
                onClick={() => onDivisionSelect(division)}
                className={cn(
                  "cursor-pointer hover:bg-muted/50", 
                  bracketStatus === 'No Athletes' && 'opacity-50 pointer-events-none'
                )}
              >
                <TableCell className="font-medium">{matName}</TableCell>
                <TableCell>{division.name}</TableCell>
                <TableCell className="text-center">
                  <span className={cn("font-semibold text-sm", getStatusColor(bracketStatus))}>
                    {bracketStatus}
                  </span>
                </TableCell>
                <TableCell className="text-right">{athleteCount}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default FightOverview;