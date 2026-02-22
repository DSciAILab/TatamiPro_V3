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
              "flex items-center justify-between p-4 border-b-4 border-border transition-none",
              status.placing === '1st' && "bg-warning/20 border-warning",
              status.placing === '2nd' && "bg-muted",
              status.placing === '3rd' && "bg-info/20",
              status.placing === 'eliminated' && "bg-destructive/10",
              status.placing === 'active' && !isOnHold && "bg-primary text-primary-foreground",
              isOnHold && "bg-warning/10 border-warning"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-muted flex items-center justify-center relative border-2 border-border">
                {status.placing === '1st' ? (
                  <Trophy className="h-6 w-6 text-warning" />
                ) : status.placing === '2nd' ? (
                  <Medal className="h-6 w-6 text-muted-foreground" />
                ) : status.placing === '3rd' ? (
                  <Medal className="h-6 w-6 text-info" />
                ) : (
                  <UserRound className="h-6 w-6 text-muted-foreground" />
                )}
                 {isOnHold && <span className="absolute -top-2 -right-2 w-4 h-4 bg-warning rounded-none border-2 border-border" />}
                 {isMissing && <span className="absolute -top-2 -right-2 w-4 h-4 bg-destructive rounded-none border-2 border-border" />}
              </div>
              <div>
                <div className="flex items-center gap-3">
                    <p className={cn(
                    "text-xl font-heading uppercase tracking-widest",
                    status.placing === 'eliminated' && "line-through text-destructive opacity-80",
                    isOnHold && "text-warning"
                    )}>
                    {athlete.first_name} {athlete.last_name}
                    </p>
                    {isOnHold && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-none bg-warning/20 text-warning border-warning font-mono uppercase text-xs px-2 py-1">On Hold</Badge>
                          {attendance?.last_updated && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(attendance.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                    )}
                     {isMissing && (
                        <Badge variant="outline" className="rounded-none bg-destructive/20 text-destructive border-destructive font-mono uppercase text-xs px-2 py-1">Missing</Badge>
                    )}
                </div>
                <p className="text-sm font-mono text-muted-foreground uppercase">{athlete.club}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Competition Result Badges */}
              {status.placing === '1st' && <Badge variant="warning" className="rounded-none font-mono uppercase border-2 text-sm">🥇 1º Lugar</Badge>}
              {status.placing === '2nd' && <Badge variant="secondary" className="rounded-none font-mono uppercase border-2 text-sm">🥈 2º Lugar</Badge>}
              {status.placing === '3rd' && <Badge variant="outline" className="rounded-none font-mono uppercase border-2 border-info text-info text-sm">🥉 3º Lugar</Badge>}
              {status.placing === 'eliminated' && (
                <Badge variant="destructive" className="rounded-none font-mono uppercase border-2 text-sm">
                  Eliminado {status.eliminatedInFight ? `(#${status.eliminatedInFight})` : ''}
                </Badge>
              )}
              
              {/* Attendance Controls */}
              {showAttendanceControls && status.placing !== 'eliminated' && status.placing !== '1st' && status.placing !== '2nd' && status.placing !== '3rd' && (
                  <div className="flex items-center gap-2 ml-4">
                       <Button
                            size="sm"
                            variant={isPresent ? "default" : "outline"}
                            className={cn(
                                "rounded-none border-2 font-mono uppercase h-8 px-4",
                                isPresent ? "bg-success border-success text-success-foreground" : "border-border text-muted-foreground hover:bg-muted"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isPresent ? 'missing' : 'present', e)}
                            title="Mark Present"
                       >
                           <CheckCircle2 className="w-4 h-4 mr-2" />
                           {isPresent ? "Present" : "Mark Present"}
                       </Button>

                       <Button
                            size="sm"
                            variant={isOnHold ? "default" : "outline"}
                            className={cn(
                                "rounded-none border-2 font-mono uppercase h-8 px-4",
                                isOnHold ? "bg-warning border-warning text-warning-foreground" : "border-border text-muted-foreground hover:bg-warning/20 hover:text-warning"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isOnHold ? 'present' : 'on_hold', e)}
                            title="Put On Hold"
                       >
                           <Clock className="w-4 h-4 mr-2" />
                           {isOnHold ? "On Hold" : "Hold"}
                       </Button>
                  </div>
              )}
               {/* Fallback Badge if Active & No Controls or Just Showing Status */}
              {status.placing === 'active' && !onUpdateBracket && (
                <Badge variant="outline" className="rounded-none font-mono uppercase border-2 text-sm border-primary">Em Competição</Badge>
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
