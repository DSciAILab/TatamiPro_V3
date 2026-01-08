"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Athlete, Division } from '@/types/index';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useTranslations } from '@/hooks/use-translations';
import { Download } from 'lucide-react';
import AttendanceTable from './AttendanceTable';
import { TableToolbar } from '@/components/ui/table-toolbar';
import { generateAttendancePdf } from '@/utils/pdf-attendance-generator';

interface AttendanceManagementProps {
  eventDivisions: Division[];
  eventName: string;
  onUpdateAthleteAttendance: (athleteId: string, status: Athlete['attendance_status']) => void;
  isAttendanceMandatory: boolean;
  userRole?: string;
  athletes: Athlete[]; 
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ 
  eventDivisions,
  eventName,
  onUpdateAthleteAttendance, 
  isAttendanceMandatory, 
  userRole,
  athletes: propAthletes 
}) => {
  const [localAthletes, setLocalAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'private_transportation' | 'pending'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  const { profile } = useAuth();
  const userClub = profile?.club;
  const { t } = useTranslations();

  useEffect(() => {
    if (!isAttendanceMandatory) {
      setLocalAthletes([]);
      return;
    }

    // Filter athletes based on role
    const filtered = userRole === 'admin' || userRole === 'staff' || userRole === 'checkin'
      ? propAthletes.filter(a => a.registration_status === 'approved')
      : propAthletes.filter(
          a => a.club === userClub && a.registration_status === 'approved'
        );
    
    setLocalAthletes(filtered);
  }, [propAthletes, isAttendanceMandatory, userRole, userClub]);

  const handleAttendanceChange = (athleteId: string, status: Athlete['attendance_status']) => {
    onUpdateAthleteAttendance(athleteId, status);
    // Optimistic update
    setLocalAthletes(prev => prev.map(a => a.id === athleteId ? { ...a, attendance_status: status } : a));
    showSuccess(`Status updated to ${status}.`);
  };

  const filteredAthletes = useMemo(() => {
    let current = localAthletes;

    if (searchTerm) {
      // Split by comma for multi-term OR search
      const searchTerms = searchTerm.split(',').map(term => term.trim().toLowerCase()).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        current = current.filter(a => {
          const searchableText = `${a.first_name} ${a.last_name} ${a.club} ${a.emirates_id || ''} ${a.school_id || ''}`.toLowerCase();
          // Match if ANY search term is found (OR logic)
          return searchTerms.some(term => searchableText.includes(term));
        });
      }
    }

    if (attendanceFilter !== 'all') {
      current = current.filter(a => a.attendance_status === attendanceFilter);
    }

    return current;
  }, [localAthletes, searchTerm, attendanceFilter]);

  const getCount = (status: Athlete['attendance_status']) => localAthletes.filter(a => a.attendance_status === status).length;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Attendance Management {userRole !== 'admin' && userClub ? `(${userClub})` : ''}</span>
          <Button 
            onClick={() => generateAttendancePdf({ eventName, divisions: eventDivisions, athletes: filteredAthletes })}
            variant="outline" 
            size="sm" 
            className="gap-2 no-print"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </CardTitle>
        <CardDescription>Manage event attendance.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isAttendanceMandatory ? (
          <div className="text-center p-4 text-muted-foreground">Attendance tracking is disabled for this event.</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    attendanceFilter === 'present' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
                    'hover:bg-green-100 dark:hover:bg-green-900'
                  )}
                  onClick={() => setAttendanceFilter(prev => prev === 'present' ? 'all' : 'present')}
                >
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{getCount('present')}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    attendanceFilter === 'absent' ? 'bg-red-200 dark:bg-red-800 border-red-500' : 'bg-red-50 dark:bg-red-950',
                    'hover:bg-red-300 dark:hover:bg-red-700'
                  )}
                  onClick={() => setAttendanceFilter(prev => prev === 'absent' ? 'all' : 'absent')}
                >
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{getCount('absent')}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    attendanceFilter === 'private_transportation' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
                    'hover:bg-blue-300 dark:hover:bg-blue-700'
                  )}
                  onClick={() => setAttendanceFilter(prev => prev === 'private_transportation' ? 'all' : 'private_transportation')}
                >
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getCount('private_transportation')}</p>
                  <p className="text-sm text-muted-foreground">Private</p>
                </div>
                <div
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    attendanceFilter === 'pending' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
                    'hover:bg-orange-300 dark:hover:bg-orange-700'
                  )}
                  onClick={() => setAttendanceFilter(prev => prev === 'pending' ? 'all' : 'pending')}
                >
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{getCount('pending')}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>

            <TableToolbar
                 searchTerm={searchTerm}
                 onSearchChange={setSearchTerm}
                 viewMode={viewMode}
                 onViewModeChange={setViewMode}
                 placeholder="Search (use comma for multiple terms)..."
            />

            {filteredAthletes.length === 0 ? (
              <p className="text-muted-foreground text-center">No athletes found.</p>
            ) : (
                <AttendanceTable 
                  athletes={filteredAthletes} 
                  onUpdateStatus={handleAttendanceChange}
                  eventDivisions={eventDivisions}
                  viewMode={viewMode}
                />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;
