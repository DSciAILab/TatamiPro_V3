import React from 'react';
import { DivisionInfo, formatTime } from '../utils/mat-utils';
import { SortKey } from '../hooks/use-mat-data';
import { Event, Division, Bracket } from "@/types/index";
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
  onDivisionSelect?: (division: Division, bracketId?: string) => void;
  onUpdateBracket?: (divisionId: string, updatedBracket: Bracket) => void;
}

export const DivisionTable = ({ 
  divisions, 
  event, 
  expandedDivisions, 
  onToggleExpansion, 
  onSort,
  onDivisionSelect,
  onUpdateBracket
}: DivisionTableProps) => {
  return (
    <Table>
      <TableHeader className="border-b-4 border-border bg-muted/20">
        <TableRow className="border-none hover:bg-transparent">
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 font-heading uppercase tracking-widest text-lg"
            onClick={() => onSort('category')}
          >
            <div className="flex items-center gap-2">
              Categoria
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50 font-heading uppercase tracking-widest text-lg"
            onClick={() => onSort('athletes')}
          >
            <div className="flex items-center justify-center gap-2">
              Atletas
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50 font-heading uppercase tracking-widest text-lg"
            onClick={() => onSort('remaining')}
          >
            <div className="flex items-center justify-center gap-2">
              Lutas Rest.
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead className="text-center font-heading uppercase tracking-widest text-lg">Tempo Est.</TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 font-heading uppercase tracking-widest text-lg"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center justify-end gap-2">
              Status
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {divisions.map(divInfo => {
          const isExpanded = expandedDivisions.has(divInfo.division.id);
          // Use specific bracket ID if available (for splits), otherwise fallback to division ID
          const bracketId = divInfo._bracketId || divInfo.division.id;
          const bracket = event.brackets?.[bracketId];
          
          const allDivisionAthletes = getAthletesForDivision(event.athletes || [], divInfo.division.id, { requireApproved: true, requireCheckedIn: true });
          
          // Filter athletes to only show those in this specific bracket (for splits)
          const athletes = bracket 
            ? allDivisionAthletes.filter(a => bracket.participants.some(p => p !== 'BYE' && p.id === a.id))
            : allDivisionAthletes;
          
          return (
            <React.Fragment key={divInfo._bracketId || divInfo.division.id}>
              <TableRow
                className={cn(
                  "cursor-pointer hover:bg-primary hover:text-primary-foreground border-b-2 border-border transition-none",
                  divInfo.status === 'Finished' && "text-muted-foreground line-through opacity-80",
                  divInfo.status === 'In Progress' && "font-bold text-info",
                  isExpanded && "bg-muted/10 border-l-4 border-l-primary"
                )}
                // Use bracket ID for toggling expansion if possible
                onClick={() => onToggleExpansion(bracketId)}
              >
                <TableCell className="font-heading uppercase text-xl">
                  <div className="flex items-center gap-4">
                    {expandedDivisions.has(bracketId) ? (
                      <ChevronDown className="h-6 w-6 text-foreground" />
                    ) : (
                      <ChevronRight className="h-6 w-6 text-foreground" />
                    )}
                    {divInfo.division.name}
                  </div>
                </TableCell>
                <TableCell className="text-center font-mono text-xl">{divInfo.athleteCount}</TableCell>
                <TableCell className="text-center font-mono text-xl">
                  {divInfo.remainingFights} / {divInfo.totalFights}
                </TableCell>
                <TableCell className="text-center font-mono text-xl">
                  {formatTime(divInfo.remainingFights * (divInfo.fightDuration || 0))}
                </TableCell>
                <TableCell className="text-right">
                  <BracketStatusBadge status={divInfo.status} />
                </TableCell>
              </TableRow>
              
              {/* Expanded Athletes List */}
              {expandedDivisions.has(bracketId) && bracket && (
                <TableRow className="bg-muted/5 border-b-4 border-border">
                  <TableCell colSpan={5} className="p-0 border-t-2 border-border">
                    <AthleteList 
                      athletes={athletes}
                      bracket={bracket}
                      event={event}
                      division={divInfo.division}
                      onDivisionSelect={onDivisionSelect}
                      onUpdateBracket={onUpdateBracket}
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
