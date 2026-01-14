"use client";

import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRound, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Athlete, Division } from '@/types/index';
import { Badge } from '@/components/ui/badge';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { getAthleteDisplayString } from '@/utils/athlete-utils';

interface AthleteListTableProps {
  athletes: Athlete[];
  divisions?: Division[];
  sortConfig?: SortConfig;
  onSort?: (key: SortKey) => void;
}

type SortKey = keyof Athlete | 'status';

interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const AthleteListTable: React.FC<AthleteListTableProps> = ({ 
  athletes, 
  divisions = [],
  sortConfig: externalSortConfig,
  onSort: externalOnSort
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [internalSortConfig, setInternalSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });

  const sortConfig = externalSortConfig || internalSortConfig;

  const handleSort = (key: SortKey) => {
    if (externalOnSort) {
      externalOnSort(key);
    } else {
      let direction: 'asc' | 'desc' = 'asc';
      if (internalSortConfig.key === key && internalSortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setInternalSortConfig({ key, direction });
    }
  };

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="ml-2 h-4 w-4 inline text-muted-foreground opacity-50" />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="ml-2 h-4 w-4 inline" /> : <ArrowDown className="ml-2 h-4 w-4 inline" />;
  };

  const filteredAndSortedAthletes = useMemo(() => {
    let filtered = athletes;
    
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = athletes.filter(a => 
        a.first_name.toLowerCase().includes(lowerTerm) ||
        a.last_name.toLowerCase().includes(lowerTerm) ||
        a.club.toLowerCase().includes(lowerTerm) ||
        (a.emirates_id || '').toLowerCase().includes(lowerTerm) ||
        (a.school_id || '').toLowerCase().includes(lowerTerm)
      );
    }

    const sortableItems = [...filtered];
    sortableItems.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Athlete];
      let bValue: any = b[sortConfig.key as keyof Athlete];

      if (sortConfig.key === 'status') {
         aValue = a.registration_status || '';
         bValue = b.registration_status || '';
      }

      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
           // numeric sort
      } else {
           // fallback string sort
           aValue = String(aValue);
           bValue = String(bValue);
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return sortableItems;
  }, [athletes, searchTerm, sortConfig]);

  const getStatusBadge = (athlete: Athlete) => {
    // 1. Check-in Status (High Priority)
    if (athlete.check_in_status === 'checked_in') {
      return <Badge variant="success" className="whitespace-nowrap">Checked In</Badge>;
    }

    // 2. Overweight
    if (athlete.check_in_status === 'overweight') {
      return <Badge variant="destructive" className="whitespace-nowrap">Pesagem Incorreta</Badge>;
    }

    // 3. Moved to another division (Only if not checked in)
    if (athlete.moved_to_division_id) {
      return <Badge variant="secondary" className="whitespace-nowrap">Changed Category</Badge>;
    }

    // 4. Absent
    if (athlete.attendance_status === 'absent') {
      return <Badge variant="destructive" className="whitespace-nowrap">Absent</Badge>;
    }

    // 5. Registration Status
    switch (athlete.registration_status) {
      case 'approved': 
        return <Badge variant="outline" className="border-success text-success whitespace-nowrap">Registered</Badge>;
      case 'under_approval': 
        return <Badge variant="pending" className="whitespace-nowrap">Pending</Badge>;
      case 'rejected': 
        return <Badge variant="destructive" className="whitespace-nowrap">Rejected</Badge>;
      default: 
        return <Badge variant="outline" className="whitespace-nowrap">-</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <TableToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder="Search athlete in division..."
      />

      {viewMode === 'list' ? (
        <div className="rounded-md border">
            <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="cursor-pointer" onClick={() => handleSort('first_name')}>
                    Nome {getSortIcon('first_name')}
                </TableHead>
                <TableHead>ID</TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('club')}>
                    Club {getSortIcon('club')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('age')}>
                    Age {getSortIcon('age')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('weight')}>
                   Weight {getSortIcon('weight')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('belt')}>
                   Belt {getSortIcon('belt')}
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => handleSort('status')}>
                   Status {getSortIcon('status')}
                </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {filteredAndSortedAthletes.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={7} className="text-center h-24 text-muted-foreground">
                        {searchTerm ? 'No athletes found with this filter.' : 'No athletes in this division.'}
                    </TableCell>
                </TableRow>
                ) : (
                filteredAndSortedAthletes.map(athlete => (
                    <TableRow key={athlete.id}>
                    <TableCell className="font-medium flex items-center">
                        {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.first_name} className="w-8 h-8 rounded-full object-cover mr-3" />
                        ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                            <UserRound className="h-4 w-4 text-muted-foreground" />
                        </div>
                        )}
                        {athlete.first_name} {athlete.last_name}
                    </TableCell>
                    <TableCell>
                        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                            {athlete.emirates_id || athlete.school_id || '-'}
                        </span>
                    </TableCell>
                    <TableCell>{athlete.club}</TableCell>
                    <TableCell>{athlete.age}</TableCell>
                    <TableCell>{athlete.weight}kg</TableCell>
                    <TableCell>{athlete.belt}</TableCell>
                    <TableCell>{getStatusBadge(athlete)}</TableCell>
                    </TableRow>
                ))
                )}
            </TableBody>
            </Table>
        </div>
      ) : (
        <ul className="space-y-4">
             {filteredAndSortedAthletes.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">
                     {searchTerm ? 'No athletes found with this filter.' : 'No athletes in this division.'}
                 </p>
             ) : (
                filteredAndSortedAthletes.map((athlete) => (
                    <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                        <div className="flex items-center space-x-4">
                            {athlete.photo_url ? (
                                <img src={athlete.photo_url} alt={athlete.first_name} className="w-12 h-12 rounded-full object-cover" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                                <UserRound className="h-6 w-6 text-muted-foreground" />
                                </div>
                            )}
                            <div>
                                <p className="font-medium text-lg">{athlete.first_name} {athlete.last_name}</p>
                                <p className="text-sm text-muted-foreground font-semibold">{athlete.club}</p>
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-1">
                                    <span className="bg-secondary px-1.5 py-0.5 rounded">{athlete.belt}</span>
                                    <span className="bg-secondary px-1.5 py-0.5 rounded">{athlete.age}</span>
                                    <span className="bg-secondary px-1.5 py-0.5 rounded">{athlete.weight}kg</span>
                                </div>
                            </div>
                        </div>
                         <div className="flex items-center space-x-2">
                             {getStatusBadge(athlete)}
                         </div>
                    </li>
                ))
             )}
        </ul>
      )}
    </div>
  );
};

export default AthleteListTable;