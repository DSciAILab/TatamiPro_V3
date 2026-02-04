import React, { useState, useMemo } from 'react';
import { Athlete, Bracket, BracketAttendanceStatus, Division, Event } from '@/types/index';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, Search, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { SortKey } from '../../mats/hooks/use-mat-data';

interface AttendanceTabProps {
  bracket: Bracket;
  event: Event;
  division: Division;
  athletes: Athlete[];
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
}

const AttendanceTab: React.FC<AttendanceTabProps> = ({ 
  bracket, 
  event, 
  division, 
  athletes, 
  onUpdateBracket 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Initialize attendance if missing
  const attendance = useMemo(() => bracket.attendance || {}, [bracket.attendance]);

  // Derived Summary Stats
  const summary = useMemo(() => {
    let present = 0;
    let onHold = 0;
    let missing = 0;
    
    athletes.forEach(a => {
      const status = attendance[a.id]?.status || 'missing';
      if (status === 'present') present++;
      else if (status === 'on_hold') onHold++;
      else missing++;
    });

    return { present, onHold, missing, total: athletes.length };
  }, [athletes, attendance]);

  const handleUpdateStatus = (athleteId: string, newStatus: BracketAttendanceStatus) => {
    // Optimistic update
    const updatedAttendance = {
      ...attendance,
      [athleteId]: {
        status: newStatus,
        last_updated: new Date().toISOString()
      }
    };
    
    // Create updated bracket object
    const updatedBracket: Bracket = {
      ...bracket,
      attendance: updatedAttendance
    };
    
    // Call parent handler
    onUpdateBracket(bracket.division_id, updatedBracket);
  };

  const markAllPresent = () => {
    const updatedAttendance = { ...attendance };
    athletes.forEach(a => {
        // Only mark if currently missing (preserve On Hold?)
        // Or overwrite all? Assuming "Mark All Present" means "Everyone is here now".
        // Let's preserve explicit 'on_hold' unless overwritten? 
        // For mass action, usually we want to set everyone to present.
        if (updatedAttendance[a.id]?.status !== 'present') {
             updatedAttendance[a.id] = {
                status: 'present',
                last_updated: new Date().toISOString()
             };
        }
    });

    const updatedBracket: Bracket = {
      ...bracket,
      attendance: updatedAttendance
    };
    onUpdateBracket(bracket.division_id, updatedBracket);
  };

  const filteredAthletes = useMemo(() => {
     return athletes.filter(a => 
        a.first_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        a.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.club.toLowerCase().includes(searchTerm.toLowerCase())
     );
  }, [athletes, searchTerm]);


  // Helper to calculate time since On Hold
  const getTimeOnHold = (isoString?: string) => {
      if (!isoString) return '';
      const seconds = Math.floor((new Date().getTime() - new Date(isoString).getTime()) / 1000);
      const minutes = Math.floor(seconds / 60);
      return `${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-success/10 border-success/30">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-success">{summary.present}</span>
                <span className="text-sm font-medium text-success-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Present
                </span>
            </CardContent>
         </Card>
         <Card className="bg-orange-500/10 border-orange-500/30">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-orange-600">{summary.onHold}</span>
                <span className="text-sm font-medium text-orange-700 flex items-center gap-1">
                    <Clock className="w-4 h-4" /> On Hold
                </span>
            </CardContent>
         </Card>
         <Card className="bg-muted/50">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-muted-foreground">{summary.missing}</span>
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Missing
                </span>
            </CardContent>
         </Card>
         
         <div className="flex items-center justify-center">
             <Button 
                variant="outline" 
                className="w-full h-full min-h-[80px] border-dashed border-2 hover:bg-success/5 hover:border-success/50 hover:text-success"
                onClick={markAllPresent}
             >
                <CheckCircle2 className="mr-2 h-5 w-5" /> Mark All Present
             </Button>
         </div>
      </div>

      <div className="flex items-center space-x-2">
         <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search athletes..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
         </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Athlete</TableHead>
              <TableHead>Club</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAthletes.map(athlete => {
                const record = attendance[athlete.id];
                const status = record?.status || 'missing';
                const isPresent = status === 'present';
                const isOnHold = status === 'on_hold';
                
                return (
                  <TableRow key={athlete.id} className={cn(
                      isOnHold ? "bg-orange-500/5 hover:bg-orange-500/10" : "",
                      isPresent ? "bg-success/5 hover:bg-success/10" : ""
                  )}>
                    <TableCell>
                       <div className="flex items-center gap-3">
                         {athlete.photo_url ? (
                              <img src={athlete.photo_url} alt={athlete.first_name} className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                  <UserRound className="h-4 w-4 text-muted-foreground" />
                              </div>
                          )}
                          <div className="font-medium">
                            {athlete.first_name} {athlete.last_name}
                            {isOnHold && record?.last_updated && (
                                <span className="text-xs text-orange-600 block flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> On hold for {getTimeOnHold(record.last_updated)}
                                </span>
                            )}
                          </div>
                       </div>
                    </TableCell>
                    <TableCell>{athlete.club}</TableCell>
                    <TableCell className="text-center">
                        <Badge variant="outline" className={cn(
                            status === 'present' ? "bg-success text-success-foreground border-transparent" :
                            status === 'on_hold' ? "bg-orange-500 text-white border-transparent" :
                            "bg-muted text-muted-foreground"
                        )}>
                            {status === 'present' ? 'Present' : status === 'on_hold' ? 'On Hold' : 'Missing'}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <div className="flex items-center justify-end gap-2">
                           {/* Present Toggle */}
                           <Button
                              size="sm"
                              variant={isPresent ? "default" : "outline"}
                              className={cn(
                                  isPresent ? "bg-success hover:bg-success/90" : "hover:text-success hover:border-success",
                                  "w-24 transition-all"
                              )}
                              onClick={() => handleUpdateStatus(athlete.id, isPresent ? 'missing' : 'present')}
                           >
                              {isPresent ? <CheckCircle2 className="w-4 h-4 mr-1" /> : ""}
                              Present
                           </Button>
                           
                           {/* On Hold Toggle */}
                           <Button
                              size="sm"
                              variant={isOnHold ? "default" : "outline"}
                              className={cn(
                                  isOnHold ? "bg-orange-500 hover:bg-orange-600" : "hover:text-orange-500 hover:border-orange-500",
                                  "w-24 transition-all"
                              )}
                              onClick={() => handleUpdateStatus(athlete.id, isOnHold ? 'missing' : 'on_hold')}
                           >
                              {isOnHold ? <Clock className="w-4 h-4 mr-1" /> : ""}
                              On Hold
                           </Button>
                       </div>
                    </TableCell>
                  </TableRow>
                );
            })}
            
            {filteredAthletes.length === 0 && (
                <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No athletes found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AttendanceTab;
