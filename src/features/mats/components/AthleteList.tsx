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
              "flex items-center justify-between p-4 border-b border-border/30 transition-all hover:bg-muted/5",
              status.placing === '1st' && "bg-warning/10 border-warning/30",
              status.placing === '2nd' && "bg-muted/30",
              status.placing === '3rd' && "bg-info/10",
              status.placing === 'eliminated' && "bg-destructive/5 opacity-80",
              status.placing === 'active' && !isOnHold && "bg-background",
              isOnHold && "bg-warning/5 border-warning/30"
            )}
          >
            <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center relative border border-border/50 shadow-sm">
                {status.placing === '1st' ? (
                  <Trophy className="h-6 w-6 text-warning" />
                ) : status.placing === '2nd' ? (
                  <Medal className="h-6 w-6 text-muted-foreground" />
                ) : status.placing === '3rd' ? (
                  <Medal className="h-6 w-6 text-info" />
                ) : (
                  <UserRound className="h-6 w-6 text-muted-foreground" />
                )}
                 {isOnHold && <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full border-2 border-background shadow-sm" />}
                 {isMissing && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background shadow-sm" />}
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                    <p className={cn(
                    "text-xl font-serif text-foreground tracking-tight",
                    status.placing === 'eliminated' && "line-through text-destructive/80",
                    isOnHold && "text-warning"
                    )}>
                    {athlete.first_name} {athlete.last_name}
                    </p>
                    {isOnHold && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="rounded-full bg-warning/10 text-warning border-warning/30 font-medium text-xs px-3 py-0.5 shadow-sm">Em Espera</Badge>
                          {attendance?.last_updated && (
                            <span className="text-xs text-muted-foreground font-medium">
                              {new Date(attendance.last_updated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                    )}
                     {isMissing && (
                        <Badge variant="outline" className="rounded-full bg-destructive/10 text-destructive border-destructive/30 font-medium text-xs px-3 py-0.5 shadow-sm">Faltando</Badge>
                    )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">{athlete.club}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Competition Result Badges */}
              {status.placing === '1st' && <Badge variant="warning" className="rounded-full font-medium border border-warning/30 text-sm shadow-sm px-4 py-1">🥇 1º Lugar</Badge>}
              {status.placing === '2nd' && <Badge variant="secondary" className="rounded-full font-medium border border-border/30 text-sm shadow-sm px-4 py-1">🥈 2º Lugar</Badge>}
              {status.placing === '3rd' && <Badge variant="outline" className="rounded-full font-medium border border-info/30 text-info text-sm shadow-sm px-4 py-1">🥉 3º Lugar</Badge>}
              {status.placing === 'eliminated' && (
                <Badge variant="destructive" className="rounded-full font-medium border border-destructive/30 text-sm shadow-sm px-4 py-1">
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
                                "rounded-full border font-medium h-9 px-5 transition-all shadow-sm",
                                isPresent ? "bg-success border-success text-success-foreground" : "border-border/50 text-muted-foreground hover:bg-muted/50"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isPresent ? 'missing' : 'present', e)}
                            title="Em Competição"
                       >
                           <CheckCircle2 className="w-4 h-4 mr-2" />
                           {isPresent ? "Pronto" : "Marcar Pronto"}
                       </Button>

                       <Button
                            size="sm"
                            variant={isOnHold ? "default" : "outline"}
                            className={cn(
                                "rounded-full border font-medium h-9 px-5 transition-all shadow-sm",
                                isOnHold ? "bg-warning border-warning text-warning-foreground" : "border-border/50 text-muted-foreground hover:bg-warning/10 hover:text-warning"
                            )}
                            onClick={(e) => handleUpdateStatus(athlete.id, isOnHold ? 'present' : 'on_hold', e)}
                            title="Aguardar"
                       >
                           <Clock className="w-4 h-4 mr-2" />
                           {isOnHold ? "Habilitar" : "Pausar"}
                       </Button>
                  </div>
              )}
               {/* Fallback Badge if Active & No Controls or Just Showing Status */}
              {status.placing === 'active' && !onUpdateBracket && (
                <Badge variant="outline" className="rounded-full font-medium border border-primary/30 text-primary text-sm shadow-sm px-4 py-1">Em Competição</Badge>
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
