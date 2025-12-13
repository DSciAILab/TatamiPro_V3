"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Athlete, Division } from '@/types/index';
import { UserRound, CheckCircle, XCircle, Car, Search, Clock, Edit } from 'lucide-react';
import { showSuccess } from '@/utils/toast';
import { findAthleteDivision, getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { useTranslations } from '@/hooks/use-translations';

interface AttendanceManagementProps {
  eventDivisions: Division[];
  onUpdateAthleteAttendance: (athleteId: string, status: Athlete['attendance_status']) => void;
  isAttendanceMandatory: boolean;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  athletes: Athlete[]; 
}

const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ 
  eventDivisions, 
  onUpdateAthleteAttendance, 
  isAttendanceMandatory, 
  userRole,
  athletes: propAthletes 
}) => {
  const [localAthletes, setLocalAthletes] = useState<Athlete[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent' | 'private_transportation' | 'pending'>('all');
  const [editingAthleteId, setEditingAthleteId] = useState<string | null>(null);
  const { profile } = useAuth();
  const userClub = profile?.club;
  const { t } = useTranslations();

  useEffect(() => {
    if (!isAttendanceMandatory) {
      setLocalAthletes([]);
      return;
    }

    // Filter athletes based on role
    const filtered = userRole === 'admin' || userRole === 'staff'
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
    setEditingAthleteId(null);
  };

  const filteredAthletes = useMemo(() => {
    let current = localAthletes;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      current = current.filter(a =>
        a.first_name.toLowerCase().includes(lower) ||
        a.last_name.toLowerCase().includes(lower) ||
        a.club.toLowerCase().includes(lower)
      );
    }

    if (attendanceFilter !== 'all') {
      current = current.filter(a => a.attendance_status === attendanceFilter);
    }

    return current;
  }, [localAthletes, searchTerm, attendanceFilter]);

  const getCount = (status: Athlete['attendance_status']) => localAthletes.filter(a => a.attendance_status === status).length;

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
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Attendance Management {userRole !== 'admin' && userClub ? `(${userClub})` : ''}</CardTitle>
        <CardDescription>Manage event attendance.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isAttendanceMandatory ? (
          <div className="text-center p-4 text-muted-foreground">Attendance tracking is disabled for this event.</div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { key: 'present', label: 'Present', color: 'green', count: getCount('present') },
                { key: 'absent', label: 'Absent', color: 'red', count: getCount('absent') },
                { key: 'private_transportation', label: 'Private', color: 'blue', count: getCount('private_transportation') },
                { key: 'pending', label: 'Pending', color: 'orange', count: getCount('pending') },
              ].map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "p-3 border rounded-md cursor-pointer transition-colors",
                    attendanceFilter === item.key ? `bg-${item.color}-200 border-${item.color}-500` : `hover:bg-${item.color}-100`
                  )}
                  onClick={() => setAttendanceFilter(prev => prev === item.key ? 'all' : item.key as any)}
                >
                  <p className={`text-2xl font-bold text-${item.color}-600`}>{item.count}</p>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="relative mb-6">
              <Input
                placeholder="Search athlete..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>

            {filteredAthletes.length === 0 ? (
              <p className="text-muted-foreground text-center">No athletes found.</p>
            ) : (
              <ul className="space-y-4">
                {filteredAthletes.map((athlete) => (
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
                        <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, findAthleteDivision(athlete, eventDivisions), t)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {athlete.attendance_status !== 'pending' && editingAthleteId !== athlete.id ? (
                        <>
                          {getAttendanceStatusDisplay(athlete.attendance_status)}
                          <Button variant="ghost" size="sm" onClick={() => setEditingAthleteId(athlete.id)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50" onClick={() => handleAttendanceChange(athlete.id, 'present')}>Present</Button>
                          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleAttendanceChange(athlete.id, 'absent')}>Absent</Button>
                          <Button size="sm" variant="outline" className="text-blue-600 hover:bg-blue-50" onClick={() => handleAttendanceChange(athlete.id, 'private_transportation')}>Private</Button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceManagement;