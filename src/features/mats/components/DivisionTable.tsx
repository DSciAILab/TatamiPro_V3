import React from 'react';
import { DivisionInfo, formatTime } from '../utils/mat-utils';
import { SortKey } from '../hooks/use-mat-data';
import { Event, Division } from "@/types/index";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from "@/lib/utils";
import { BracketStatusBadge } from './BracketStatusBadge';
import { AthleteList } from './AthleteList';
import { getAthletesForDivision } from '@/utils/athlete-utils';

interface DivisionTableProps {
  divisions: DivisionInfo[];
  event: Event;
  expandedDivisions: Set<string>;
  onToggleExpansion: (id: string) => void;
  onSort: (key: SortKey) => void;
  onDivisionSelect?: (division: Division) => void;
}

export const DivisionTable = ({ 
  divisions, 
  event, 
  expandedDivisions, 
  onToggleExpansion, 
  onSort,
  onDivisionSelect 
}: DivisionTableProps) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('category')}
          >
            <div className="flex items-center gap-1">
              Category
              <ArrowUpDown className="h-3 w-3" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('athletes')}
          >
            <div className="flex items-center justify-center gap-1">
              Athletes
              <ArrowUpDown className="h-3 w-3" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('remaining')}
          >
            <div className="flex items-center justify-center gap-1">
              Fights Left
              <ArrowUpDown className="h-3 w-3" />
            </div>
          </TableHead>
          <TableHead className="text-center">Est. Time</TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center justify-end gap-1">
              Status
              <ArrowUpDown className="h-3 w-3" />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {divisions.map(divInfo => {
          const isExpanded = expandedDivisions.has(divInfo.division.id);
          const bracket = event.brackets?.[divInfo.division.id];
          const athletes = getAthletesForDivision(event.athletes || [], divInfo.division.id);
          
          return (
            <React.Fragment key={divInfo.division.id}>
              <TableRow
                className={cn(
                  "cursor-pointer hover:bg-muted/50",
                  divInfo.status === 'Finished' && "text-green-600 line-through decoration-green-600 opacity-80",
                  divInfo.status === 'In Progress' && "text-blue-600 font-bold",
                  isExpanded && "bg-muted/30"
                )}
                onClick={() => onToggleExpansion(divInfo.division.id)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    {divInfo.division.name}
                  </div>
                </TableCell>
                <TableCell className="text-center">{divInfo.athleteCount}</TableCell>
                <TableCell className="text-center">
                  {divInfo.remainingFights} / {divInfo.totalFights}
                </TableCell>
                <TableCell className="text-center">
                  {formatTime(divInfo.remainingFights * divInfo.fightDuration)}
                </TableCell>
                <TableCell className="text-right">
                  <BracketStatusBadge status={divInfo.status} />
                </TableCell>
              </TableRow>
              
              {/* Expanded Athletes List */}
              {isExpanded && bracket && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={5} className="p-0">
                    <AthleteList 
                      athletes={athletes}
                      bracket={bracket}
                      event={event}
                      division={divInfo.division}
                      onDivisionSelect={onDivisionSelect}
                    />
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          );
        })}
      </TableBody>
    </Table>
  );
};
