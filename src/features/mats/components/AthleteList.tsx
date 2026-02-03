import { Athlete, Bracket, Event, Division } from "@/types/index";
import { getAthleteStatusInBracket } from "../utils/mat-utils";
import { cn } from "@/lib/utils";
import { Trophy, Medal, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AthleteListProps {
  athletes: Athlete[];
  bracket: Bracket;
  event: Event;
  division: Division;
  onDivisionSelect?: (division: Division) => void;
}

export const AthleteList = ({ athletes, bracket, event, division, onDivisionSelect }: AthleteListProps) => {
  return (
    <div className="px-6 py-3 space-y-2">
      {athletes.map((athlete) => {
        const status = getAthleteStatusInBracket(athlete.id, bracket, event);
        
        return (
          <div
            key={athlete.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-md",
              status.placing === '1st' && "bg-warning/20",
              status.placing === '2nd' && "bg-muted",
              status.placing === '3rd' && "bg-pending/20",
              status.placing === 'eliminated' && "bg-destructive/10",
              status.placing === 'active' && "bg-info/20"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                {status.placing === '1st' ? (
                  <Trophy className="h-4 w-4 text-yellow-600" />
                ) : status.placing === '2nd' ? (
                  <Medal className="h-4 w-4 text-gray-500" />
                ) : status.placing === '3rd' ? (
                  <Medal className="h-4 w-4 text-orange-500" />
                ) : (
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className={cn(
                  "font-medium",
                  status.placing === 'eliminated' && "line-through text-destructive"
                )}>
                  {athlete.first_name} {athlete.last_name}
                </p>
                <p className="text-xs text-muted-foreground">{athlete.club}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {status.placing === '1st' && (
                <Badge variant="warning">🥇 1º Lugar</Badge>
              )}
              {status.placing === '2nd' && (
                <Badge variant="secondary">🥈 2º Lugar</Badge>
              )}
              {status.placing === '3rd' && (
                <Badge variant="pending">🥉 3º Lugar</Badge>
              )}
              {status.placing === 'eliminated' && (
                <Badge variant="destructive">
                  Eliminado {status.eliminatedInFight ? `(Luta #${status.eliminatedInFight})` : ''}
                </Badge>
              )}
              {status.placing === 'active' && (
                <Badge variant="info">
                  Em Competição
                </Badge>
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
            onDivisionSelect(division);
          }}
          className="w-full mt-2 py-2 text-sm text-center text-primary hover:underline"
        >
          Ver detalhes da divisão →
        </button>
      )}
    </div>
  );
};
