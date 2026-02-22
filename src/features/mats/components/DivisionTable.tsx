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
      <TableHeader className="border-b border-border/50 bg-transparent">
        <TableRow className="border-none hover:bg-transparent">
          <TableHead 
            className="cursor-pointer hover:bg-muted/50 font-serif text-muted-foreground tracking-wide text-base transition-colors"
            onClick={() => onSort('category')}
          >
            <div className="flex items-center gap-2">
              Categoria
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50 font-serif text-muted-foreground tracking-wide text-base transition-colors"
            onClick={() => onSort('athletes')}
          >
            <div className="flex items-center justify-center gap-2">
              Atletas
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead 
            className="text-center cursor-pointer hover:bg-muted/50 font-serif text-muted-foreground tracking-wide text-base transition-colors"
            onClick={() => onSort('remaining')}
          >
            <div className="flex items-center justify-center gap-2">
              Lutas Rest.
              <ArrowUpDown className="h-4 w-4" />
            </div>
          </TableHead>
          <TableHead className="text-center font-serif text-muted-foreground tracking-wide text-base">Tempo Est.</TableHead>
          <TableHead 
            className="text-right cursor-pointer hover:bg-muted/50 font-serif text-muted-foreground tracking-wide text-base transition-colors"
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
                  "cursor-pointer hover:bg-muted/5 border-b border-border/30 transition-all",
                  divInfo.status === 'Finished' && "text-muted-foreground line-through opacity-80",
                  divInfo.status === 'In Progress' && "font-medium text-info bg-info/5",
                  isExpanded && "bg-muted/5 border-l-4 border-l-primary/50"
                )}
                // Use bracket ID for toggling expansion if possible
                onClick={() => onToggleExpansion(bracketId)}
              >
                <TableCell className="font-serif text-lg text-foreground tracking-tight">
                  <div className="flex items-center gap-3">
                    {expandedDivisions.has(bracketId) ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform" />
                    )}
                    {divInfo.division.name}
                  </div>
                </TableCell>
                <TableCell className="text-center font-medium text-base text-muted-foreground">{divInfo.athleteCount}</TableCell>
                <TableCell className="text-center font-medium text-base text-muted-foreground">
                  {divInfo.remainingFights} / {divInfo.totalFights}
                </TableCell>
                <TableCell className="text-center font-medium text-base text-muted-foreground">
                  {formatTime(divInfo.remainingFights * (divInfo.fightDuration || 0))}
                </TableCell>
                <TableCell className="text-right">
                  <BracketStatusBadge status={divInfo.status} />
                </TableCell>
              </TableRow>
              
              {/* Expanded Athletes List */}
              {expandedDivisions.has(bracketId) && bracket && (
                <TableRow className="bg-muted/5 border-b border-border/30">
                  <TableCell colSpan={5} className="p-0 border-t border-border/30 shadow-inner">
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
