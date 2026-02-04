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
  onDivisionSelect?: (division: Division, bracketId?: string) => void;
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
                  "cursor-pointer hover:bg-muted/50",
                  divInfo.status === 'Finished' && "text-green-600 line-through decoration-green-600 opacity-80",
                  divInfo.status === 'In Progress' && "text-blue-600 font-bold",
                  isExpanded && "bg-muted/30"
                )}
                // Use bracket ID for toggling expansion if possible to handle unique keys for splits?
                // Actually `expandedDivisions` tracks division IDs. 
                // If we have split groups A and B, they usually share the same division ID in `divInfo.division`.
                // But `expandedDivisions` is a Set of strings.
                // If we use division ID, expanding one expands ALL groups for that division.
                // We should probably toggle using a unique key per row.
                // `divInfo._bracketId` is unique for splits.
                // Let's update `onToggleExpansion` signature/logic upstream?
                // Wait, if I change the key passed to `onToggleExpansion`, I need to make sure `use-mat-data` handles it.
                // `toggleDivisionExpansion` takes `divisionId`.
                // If I pass `bracketId`, it just adds string to set.
                // `isExpanded` checks `expandedDivisions.has(divInfo.division.id)`.
                // If I change to check `bracketId`, it works for splits properly (unique expansion).
                // Let's assume onToggleExpansion accepts any string key.
                onClick={() => onToggleExpansion(bracketId)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {expandedDivisions.has(bracketId) ? (
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
              {expandedDivisions.has(bracketId) && bracket && (
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
