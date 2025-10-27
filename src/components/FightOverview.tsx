"use client";

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Event, Division } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface FightOverviewProps {
  event: Event;
}

interface DivisionMatInfo {
  division: Division;
  matName: string;
  athleteCount: number;
}

const FightOverview: React.FC<FightOverviewProps> = ({ event }) => {
  const navigate = useNavigate();

  const divisionMatList = useMemo(() => {
    if (!event.divisions || !event.brackets) return [];

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
      .filter(div => event.brackets?.[div.id]) // Only divisions with brackets
      .map(div => ({
        division: div,
        matName: divisionMatMap.get(div.id) || 'Não Atribuído',
        athleteCount: athletesByDivision.get(div.id) || 0,
      }));

    // Sort by Mat name, then by division name
    list.sort((a, b) => {
      const matA = parseInt(a.matName.replace('Mat ', ''), 10) || 0;
      const matB = parseInt(b.matName.replace('Mat ', ''), 10) || 0;
      if (matA !== matB) return matA - matB;
      return a.division.name.localeCompare(b.division.name);
    });

    return list;
  }, [event]);

  const handleRowClick = (divisionId: string) => {
    navigate(`/events/${event.id}/divisions/${divisionId}/athletes`);
  };

  if (divisionMatList.length === 0) {
    return <p className="text-muted-foreground">Nenhuma categoria com bracket gerado encontrada.</p>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Mat</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Atletas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisionMatList.map(({ division, matName, athleteCount }) => (
              <TableRow
                key={division.id}
                onClick={() => handleRowClick(division.id)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium">{matName}</TableCell>
                <TableCell>{division.name}</TableCell>
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