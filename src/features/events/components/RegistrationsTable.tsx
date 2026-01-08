"use client";

import React, { useState, useMemo } from 'react';
import { Athlete } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, Edit, Trash2, QrCodeIcon, UserRound } from 'lucide-react';
import { getAthleteDisplayString, formatMoveReason } from '@/utils/athlete-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import QrCodeGenerator from '@/components/QrCodeGenerator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Division } from '@/types/index';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { Checkbox } from '@/components/ui/checkbox';

export type SortKey = keyof Athlete | 'division_name' | 'id_number';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface RegistrationsTableProps {
  athletes: Athlete[];
  onEdit: (athlete: Athlete) => void;
  onDelete: (athleteId: string) => void;
  userRole?: string;
  divisions?: Division[];
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  viewMode?: 'list' | 'grid';
  onViewModeChange?: (mode: 'list' | 'grid') => void;
  selectedAthletes?: string[];
  onToggleSelection?: (id: string) => void;
}

const RegistrationsTable: React.FC<RegistrationsTableProps> = ({
  athletes,
  onEdit,
  onDelete,
  userRole,
  divisions = [],
  searchTerm = '',
  onSearchChange,
  viewMode = 'list',
  onViewModeChange,
  selectedAthletes = [],
  onToggleSelection,
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });

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
    // 1. Check-in Status (High Priority)
    if (athlete.check_in_status === 'checked_in') {
      return <Badge className="bg-green-600 hover:bg-green-700 whitespace-nowrap">Checked In</Badge>;
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
        return <Badge variant="outline" className="border-green-600 text-green-600 whitespace-nowrap">Registered</Badge>;
      case 'under_approval': 
        return <Badge variant="outline" className="text-orange-500 border-orange-500 whitespace-nowrap">Pending</Badge>;
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
        onSearchChange={onSearchChange || (() => {})}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange || (() => {})}
        placeholder="Search by name, category or team..."
      />

      {viewMode === 'list' ? (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
              <TableHead className="cursor-pointer" onClick={() => handleSort('registration_status')}>
                Status {getSortIcon('registration_status')}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAthletes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                  No athletes found.
                </TableCell>
              </TableRow>
            ) : (
              sortedAthletes.map((athlete) => (
                <TableRow key={athlete.id}>
                  <TableCell>
                    <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                      {athlete.emirates_id || athlete.school_id || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">
                    {athlete.first_name} {athlete.last_name}
                    <div className="text-xs text-muted-foreground">({athlete.nationality})</div>
                  </TableCell>
                  <TableCell>{athlete.club}</TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground">
                      {athlete.moved_to_division_id || athlete.move_reason ? (
                        <>
                          <span className="font-semibold text-foreground">
                            {athlete.move_reason 
                              ? formatMoveReason(athlete.move_reason) 
                              : divisions.find(d => d.id === athlete.moved_to_division_id)?.name || 'New Division'}
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
                    <div className="flex justify-end gap-1">
                      {athlete.registration_qr_code_id && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="h-8 w-8">
                              <QrCodeIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-2">
                            <QrCodeGenerator value={athlete.registration_qr_code_id} size={100} />
                            <p className="text-xs text-center mt-1 text-muted-foreground">ID: {athlete.registration_qr_code_id}</p>
                          </PopoverContent>
                        </Popover>
                      )}
                      {userRole && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(athlete)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.first_name} {athlete.last_name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(athlete.id)}>Remove</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      ) : (
        <ul className="space-y-4">
            {sortedAthletes.length === 0 ? (
                 <p className="text-muted-foreground text-center py-8">No athletes found.</p>
             ) : (
                sortedAthletes.map((athlete) => (
                <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                    <div className="flex items-center space-x-4">
                    {userRole && onToggleSelection ? (
                        <Checkbox
                        checked={selectedAthletes.includes(athlete.id)}
                        onCheckedChange={() => onToggleSelection(athlete.id)}
                        className={athlete.registration_status !== 'under_approval' ? 'invisible' : ''}
                        />
                    ) : null}
                    {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.first_name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium">{athlete.first_name} {athlete.last_name} ({athlete.nationality})</p>
                        <p className="text-sm text-muted-foreground font-semibold">{athlete.club}</p>
                        <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                        <p className="text-xs text-gray-500">Status: <span className={`font-semibold ${athlete.registration_status === 'approved' ? 'text-green-600' : athlete.registration_status === 'under_approval' ? 'text-orange-500' : 'text-red-600'}`}>{athlete.registration_status === 'under_approval' ? 'Pending Approval' : athlete.registration_status === 'approved' ? 'Approved' : 'Rejected'}</span></p>
                        {athlete.move_reason && (
                        <p className="text-xs text-blue-500">
                            <span className="font-semibold">Moved:</span> {athlete.move_reason}
                        </p>
                        )}
                    </div>
                    </div>
                    <div className="flex items-center space-x-2">
                    {athlete.registration_qr_code_id && (
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon">
                            <QrCodeIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-2">
                            <QrCodeGenerator value={athlete.registration_qr_code_id} size={100} />
                            <p className="text-xs text-center mt-1 text-muted-foreground">ID: {athlete.registration_qr_code_id}</p>
                        </PopoverContent>
                        </Popover>
                    )}
                    {userRole && (
                        <>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(athlete)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.first_name} {athlete.last_name}.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(athlete.id)}>Remove</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                            </AlertDialog>
                        </>
                    )}
                    </div>
                </li>
                ))
            )}
        </ul>
      )}
    </div>
  );
};

export default RegistrationsTable;
