"use client";

import React, { useState, useMemo } from 'react';
import { Athlete, Division } from '@/types/index';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, XCircle, Car, Clock, Edit, UserRound } from 'lucide-react';
import { getAthleteDisplayString, formatMoveReason, findAthleteDivision } from '@/utils/athlete-utils';
import { useTranslations } from '@/hooks/use-translations';

export type SortKey = keyof Athlete | 'division_name' | 'id_number';

export interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

interface AttendanceTableProps {
  athletes: Athlete[];
  onUpdateStatus: (athleteId: string, status: Athlete['attendance_status']) => void;
  eventDivisions?: Division[];
  viewMode?: 'list' | 'grid';
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({
  athletes,
  onUpdateStatus,
  eventDivisions = [],
  viewMode = 'list',
}) => {
  const { t } = useTranslations();
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const getStatusBadge = (status: Athlete['attendance_status']) => {
    switch (status) {
      case 'present': return <Badge className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Present</Badge>;
      case 'absent': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Absent</Badge>;
      case 'private_transportation': return <Badge className="bg-blue-600"><Car className="w-3 h-3 mr-1" /> Private Transport</Badge>;
      default: return <Badge variant="outline" className="text-orange-500 border-orange-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const getAttendanceStatusDisplay = (status: Athlete['attendance_status']) => {
       switch (status) {
         case 'present': return <span className="flex items-center text-green-600 font-semibold text-sm"><CheckCircle className="h-4 w-4 mr-1" /> Present</span>;
         case 'absent': return <span className="flex items-center text-red-600 font-semibold text-sm"><XCircle className="h-4 w-4 mr-1" /> Absent</span>;
         case 'private_transportation': return <span className="flex items-center text-blue-600 font-semibold text-sm"><Car className="h-4 w-4 mr-1" /> Private Transport</span>;
         case 'pending': return <span className="flex items-center text-orange-500 font-semibold text-sm"><Clock className="h-4 w-4 mr-1" /> Pending</span>;
         default: return <span className="text-muted-foreground text-sm">Unknown</span>;
       }
   };

  return (
    <div>
        {viewMode === 'list' ? (
            <div className="rounded-md border bg-card">
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
                    <TableHead className="cursor-pointer" onClick={() => handleSort('attendance_status')}>
                    Status {getSortIcon('attendance_status')}
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
                        </TableCell>
                        <TableCell>{athlete.club}</TableCell>
                        <TableCell>
                        <div className="flex flex-col text-xs text-muted-foreground">
                            {athlete.move_reason ? (
                            <>
                                <span className="font-semibold text-foreground">{formatMoveReason(athlete.move_reason)}</span>
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
                        {getStatusBadge(athlete.attendance_status)}
                        </TableCell>
                        <TableCell className="text-right">
                        {athlete.attendance_status !== 'pending' && editingId !== athlete.id ? (
                            <Button variant="ghost" size="sm" onClick={() => setEditingId(athlete.id)}>
                            <Edit className="h-4 w-4" />
                            </Button>
                        ) : (
                            <div className="flex justify-end gap-1">
                            <Button size="icon" variant="outline" className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => { onUpdateStatus(athlete.id, 'present'); setEditingId(null); }} title="Present">
                                <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => { onUpdateStatus(athlete.id, 'private_transportation'); setEditingId(null); }} title="Private Transport">
                                <Car className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="outline" className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => { onUpdateStatus(athlete.id, 'absent'); setEditingId(null); }} title="Absent">
                                <XCircle className="h-4 w-4" />
                            </Button>
                            </div>
                        )}
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
            </div>
        ) : (
            <ul className="space-y-4">
                {sortedAthletes.map((athlete) => (
                <li key={athlete.id} className="flex flex-col md:flex-row items-center justify-between p-3 border rounded-md">
                    <div className="flex items-center space-x-3 w-full md:w-auto mb-3 md:mb-0">
                    {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt="Profile" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <p className="font-medium">{athlete.first_name} {athlete.last_name}</p>
                        <p className="text-xs font-mono bg-muted px-1.5 rounded w-fit my-0.5">
                        {athlete.emirates_id || athlete.school_id || 'No ID'}
                        </p>
                        <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, findAthleteDivision(athlete, eventDivisions))}</p>
                    </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                    {athlete.attendance_status !== 'pending' && editingId !== athlete.id ? (
                        <>
                        {getAttendanceStatusDisplay(athlete.attendance_status)}
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(athlete.id)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        </>
                    ) : (
                        <>
                        <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => { onUpdateStatus(athlete.id, 'present'); setEditingId(null); }}>Present</Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { onUpdateStatus(athlete.id, 'absent'); setEditingId(null); }}>Absent</Button>
                        <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => { onUpdateStatus(athlete.id, 'private_transportation'); setEditingId(null); }}>Private</Button>
                        </>
                    )}
                    </div>
                </li>
                ))}
            </ul>
        )}
    </div>
  );
};

export default AttendanceTable;
