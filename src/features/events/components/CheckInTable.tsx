"use client";

import React, { useState, useMemo } from 'react';
import { Athlete, Event, Division } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, UserRound, CheckCircle, XCircle, Scale, LayoutGrid, LayoutList } from 'lucide-react';
import { getAthleteDisplayString, formatMoveReason } from '@/utils/athlete-utils';
import CheckInForm from '@/components/CheckInForm';
import WeightHistory from '@/features/events/components/WeightHistory';
import { TableToolbar } from '@/components/ui/table-toolbar';

export type SortKey = keyof Athlete | 'division_name' | 'id_number' | 'status';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

import { Checkbox } from '@/components/ui/checkbox';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface CheckInTableProps {
  athletes: Athlete[];
  event: Event;
  isCheckInAllowedGlobally: boolean;
  onCheckIn: (athlete: Athlete) => void;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  selectedAthleteIds?: string[];
  onToggleSelectAthlete?: (athleteId: string) => void;
  onSelectAll?: (checked: boolean) => void;
  isBatchSelectionEnabled?: boolean;
  hideSearch?: boolean;
}

const CheckInTable: React.FC<CheckInTableProps> = ({
  athletes,
  event,
  isCheckInAllowedGlobally,
  onCheckIn,
  searchTerm = '',
  onSearchChange,
  selectedAthleteIds = [],
  onToggleSelectAthlete,
  onSelectAll,
  isBatchSelectionEnabled = false,
  hideSearch = false,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  
  // Reset page when search or sort changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const sortedAthletes = useMemo(() => {
    const sortableItems = [...athletes];
    sortableItems.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Athlete];
      let bValue: any = b[sortConfig.key as keyof Athlete];

      if (sortConfig.key === 'division_name') {
        aValue = a._division?.name || '';
        bValue = b._division?.name || '';
      } else if (sortConfig.key === 'id_number') {
        aValue = a.emirates_id || a.school_id || '';
        bValue = b.emirates_id || b.school_id || '';
      } else if (sortConfig.key === 'status') {
         aValue = a.check_in_status || '';
         bValue = b.check_in_status || '';
      }

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sortableItems;
  }, [athletes, sortConfig]);

  const getStatusBadge = (athlete: Athlete) => {
     if (athlete.check_in_status === 'checked_in') {
      return <Badge variant="success" className="whitespace-nowrap">Checked In</Badge>;
    }
    if (athlete.check_in_status === 'overweight') {
        return (
            <div className="flex flex-col items-start gap-1">
                 <Badge variant="destructive" className="whitespace-nowrap">Pesagem Incorreta</Badge>
                 <span className="text-xs text-muted-foreground font-mono">
                    {athlete.registered_weight ? `${athlete.registered_weight}kg` : '-'}
                 </span>
            </div>
        );
    }
    if (athlete.moved_to_division_id) {
       return <Badge variant="secondary" className="whitespace-nowrap">Changed Category</Badge>;
    }
    if (athlete.attendance_status === 'absent') {
      return <Badge variant="destructive" className="whitespace-nowrap">Absent</Badge>;
    }
    
    // Default PENDENTE
    return <Badge variant="pending" className="whitespace-nowrap">Pending</Badge>;
  };
  
  const totalPages = Math.ceil(sortedAthletes.length / itemsPerPage);
  const paginatedAthletes = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedAthletes.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedAthletes, currentPage]);

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <Pagination className="mt-4">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          
          {/* Simple pagination logic: show first, last, and current window */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => 
              page === 1 || 
              page === totalPages || 
              (page >= currentPage - 1 && page <= currentPage + 1)
            )
            .map((page, index, array) => {
              // Add ellipsis if gap
              const prevPage = array[index - 1];
              const showEllipsis = prevPage && page - prevPage > 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )}
                  <PaginationItem>
                    <PaginationLink
                      isActive={currentPage === page}
                      onClick={() => setCurrentPage(page)}
                      className="cursor-pointer"
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </React.Fragment>
              );
            })}

          <PaginationItem>
            <PaginationNext 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  };
  
  const allSelectionCandidates = useMemo(() => sortedAthletes.filter(a => a.check_in_status === 'pending'), [sortedAthletes]);
  const isAllSelected = allSelectionCandidates.length > 0 && allSelectionCandidates.every(a => selectedAthleteIds.includes(a.id));
  const isIndeterminate = selectedAthleteIds.length > 0 && !isAllSelected;

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange || (() => {})}
        placeholder="Search athlete (name, club, division...)"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {isBatchSelectionEnabled && (
                <TableHead className="w-[50px]">
                  <Checkbox 
                    checked={isAllSelected}
                    onCheckedChange={(checked) => onSelectAll?.(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead className="w-[100px] cursor-pointer" onClick={() => handleSort('id_number')}>
                ID {getSortIcon('id_number')}
              </TableHead>
              <TableHead className="w-[250px] cursor-pointer" onClick={() => handleSort('first_name')}>
                Athlete {getSortIcon('first_name')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('club')}>
                Club {getSortIcon('club')}
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('division_name')}>
                Division {getSortIcon('division_name')}
              </TableHead>
               <TableHead className="cursor-pointer w-[180px]" onClick={() => handleSort('status')}>
                Status {getSortIcon('status')}
              </TableHead>
              <TableHead className="text-right w-[200px]">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAthletes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isBatchSelectionEnabled ? 7 : 6} className="text-center h-24 text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            ) : (
              paginatedAthletes.map((athlete) => (
                <TableRow key={athlete.id}>
                  {isBatchSelectionEnabled && (
                    <TableCell>
                      <Checkbox 
                        checked={selectedAthleteIds.includes(athlete.id)}
                        onCheckedChange={() => onToggleSelectAthlete?.(athlete.id)}
                        disabled={athlete.check_in_status === 'checked_in'} // Only allow selecting pending
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {athlete.emirates_id || athlete.school_id || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                     <div className="flex items-center space-x-2">
                        {athlete.photo_url ? (
                            <img src={athlete.photo_url} alt={athlete.first_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                             <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <UserRound className="h-4 w-4 text-muted-foreground" />
                            </div>
                        )}
                        <div>
                             {athlete.first_name} {athlete.last_name}
                             <div className="text-xs text-muted-foreground">({athlete.nationality})</div>
                        </div>
                     </div>
                  </TableCell>
                  <TableCell>{athlete.club}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                       {athlete.moved_to_division_id || athlete.move_reason ? (
                          <>
                             <span className="font-semibold text-foreground">
                               {athlete.move_reason 
                                 ? formatMoveReason(athlete.move_reason) 
                                 : event.divisions?.find(d => d.id === athlete.moved_to_division_id)?.name || 'New Division'}
                             </span>
                             <span className="line-through text-muted-foreground opacity-70">
                               {getAthleteDisplayString(athlete, athlete._division)}
                             </span>
                          </>
                       ) : (
                          <span>{getAthleteDisplayString(athlete, athlete._division)}</span>
                       )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(athlete)}
                  </TableCell>
                  <TableCell className="text-right">
                     <CheckInForm
                        athlete={athlete}
                        onCheckIn={onCheckIn}
                        isCheckInAllowed={!!(isCheckInAllowedGlobally && (event.is_attendance_mandatory_before_check_in ? athlete.attendance_status === 'present' : true))}
                        divisionMaxWeight={athlete._division?.max_weight}
                        isWeightCheckEnabled={event.is_weight_check_enabled ?? true}
                        isOverweightAutoMoveEnabled={event.is_overweight_auto_move_enabled ?? false}
                        eventDivisions={event.divisions || []}
                        isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true}
                      />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {renderPagination()}
    </div>
  );
};

export default CheckInTable;
