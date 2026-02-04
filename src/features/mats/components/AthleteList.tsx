import { Athlete, Bracket, Event, Division, BracketAttendanceStatus } from "@/types/index";
import { getAthleteStatusInBracket } from "../utils/mat-utils";
import { cn } from "@/lib/utils";
import { Trophy, Medal, UserRound, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AthleteListProps {
  athletes: Athlete[];
  bracket: Bracket;
  event: Event;
  division: Division;
  onDivisionSelect?: (division: Division, bracketId?: string) => void;
  onUpdateBracket?: (divisionId: string, updatedBracket: Bracket) => void;
}

export const AthleteList = ({ athletes, bracket, event, division, onDivisionSelect, onUpdateBracket }: AthleteListProps) => {

  const handleUpdateStatus = (athleteId: string, newStatus: BracketAttendanceStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onUpdateBracket) return;
    
    const currentAttendance = bracket.attendance || {};
    const updatedAttendance = {
      ...currentAttendance,
      [athleteId]: {
        status: newStatus,
        last_updated: new Date().toISOString()
      }
    };
    const updatedBracket: Bracket = { ...bracket, attendance: updatedAttendance };
    onUpdateBracket(bracket.division_id, updatedBracket);
  };

  return (
    <div className="px-6 py-3 space-y-2">
      {athletes.map((athlete) => {
        const status = getAthleteStatusInBracket(athlete.id, bracket, event);
        const attendance = bracket.attendance?.[athlete.id];
        const attendanceStatus = attendance?.status;
        const isPresent = attendanceStatus === 'present';
        const isOnHold = attendanceStatus === 'on_hold';
        const isMissing = attendanceStatus === 'missing';
        
        // Define if attendance controls should be shown. 
        // Generally yes, unless maybe tournament is over? 
        // But even then, history. Let's show always if updater provided.
        const showAttendanceControls = !!onUpdateBracket;

        return (
          <div
            key={athlete.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-md",
              status.placing === '1st' && "bg-warning/20",
              status.placing === '2nd' && "bg-muted",
              status.placing === '3rd' && "bg-pending/20",
              status.placing === 'eliminated' && "bg-destructive/10",
              status.placing === 'active' && !isOnHold && "bg-info/20", // Default active color
              isOnHold && "bg-orange-500/10 border border-orange-200 dark:border-orange-800" // On Hold highlight
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center relative">
                {status.placing === '1st' ? (
                  <Trophy className="h-4 w-4 text-yellow-600" />
                ) : status.placing === '2nd' ? (
                  <Medal className="h-4 w-4 text-gray-500" />
                ) : status.placing === '3rd' ? (
                  <Medal className="h-4 w-4 text-orange-500" />
                ) : (
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                )}
                {/* Visual indicator dot for status on avatar */}
                 {isOnHold && <span className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-background" />}
                 {isMissing && <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                    <p className={cn(
                    "font-medium",
                    status.placing === 'eliminated' && "line-through text-destructive",
                    isOnHold && "text-orange-700 dark:text-orange-400"
                    )}>
                    {athlete.first_name} {athlete.last_name}
                    </p>
                    {isOnHold && (
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 text-xs px-1 py-0 h-5">On Hold</Badge>
                          {attendance?.last_updated && (
                            <span className="text-[10px] text-orange-600/70 font-mono">
                              {new Date(attendance.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                    )}
                     {isMissing && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-xs px-1 py-0 h-5">Missing</Badge>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{athlete.club}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Competition Result Badges */}
              {status.placing === '1st' && <Badge variant="warning">🥇 1º Lugar</Badge>}
              {status.placing === '2nd' && <Badge variant="secondary">🥈 2º Lugar</Badge>}
              {status.placing === '3rd' && <Badge variant="pending">🥉 3º Lugar</Badge>}
              {status.placing === 'eliminated' && (
                <Badge variant="destructive">
                  Eliminado {status.eliminatedInFight ? `(#${status.eliminatedInFight})` : ''}
                </Badge>
              )}
              
              {/* Attendance Controls */}
              {showAttendanceControls && status.placing !== 'eliminated' && status.placing !== '1st' && status.placing !== '2nd' && status.placing !== '3rd' && (
                  <div className="flex items-center gap-1 ml-2">
                       <Button
                            size="sm"
                            variant={isPresent ? "default" : "ghost"}
                            className={cn(
                                "h-7 px-2 text-xs",
                                isPresent ? "bg-success hover:bg-success/90 text-white" : "text-muted-foreground hover:bg-muted"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isPresent ? 'missing' : 'present', e)}
                            title="Mark Present"
                       >
                           <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                           {isPresent ? "Present" : "Mark Present"}
                       </Button>

                       <Button
                            size="sm"
                            variant={isOnHold ? "default" : "ghost"}
                            className={cn(
                                "h-7 px-2 text-xs",
                                isOnHold ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-muted-foreground hover:bg-orange-500/10 hover:text-orange-600"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isOnHold ? 'present' : 'on_hold', e)}
                            title="Put On Hold"
                       >
                           <Clock className="w-3.5 h-3.5 mr-1" />
                           {isOnHold ? "On Hold" : "Hold"}
                       </Button>
                  </div>
              )}
               {/* Fallback Badge if Active & No Controls or Just Showing Status */}
              {status.placing === 'active' && !onUpdateBracket && (
                <Badge variant="info">Em Competição</Badge>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Action button to go to details */}
      {onDivisionSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDivisionSelect(division, bracket.id);
          }}
          className="w-full mt-2 py-2 text-sm text-center text-primary hover:underline"
        >
          Ver detalhes da divisão →
        </button>
      )}
    </div>
  );
};
