"use client";

import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";
import { Athlete } from "@/types/index";
import { getFighterDisplayName } from "../utils/fight-utils";
import { Badge } from "@/components/ui/badge";

interface FighterCardProps {
  fighter: Athlete | 'BYE' | undefined;
  isSelected: boolean;
  isWinner: boolean;
  isLoser: boolean;
  isRecordable: boolean;
  onClick: () => void;
  cornerColor?: 'red' | 'blue';
}

export const FighterCard = ({
  fighter,
  isSelected,
  isWinner,
  isLoser,
  isRecordable,
  onClick,
  cornerColor
}: FighterCardProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center p-6 border-2 rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-card",
        isWinner ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.2)] z-10 scale-[1.02]' : 
        isLoser ? 'bg-card/30 border-border/20 opacity-60 grayscale-[0.5]' :
        (isSelected && isRecordable ? 'border-primary bg-primary/5' : 'border-border/30'),
        isRecordable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
      onClick={isRecordable ? onClick : undefined}
    >
      {cornerColor && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl opacity-80",
          cornerColor === 'red' ? "bg-destructive" : "bg-blue-600"
        )} />
      )}
      
      {getFighterPhoto(fighter)}
      <div className="mt-4 flex flex-col items-center text-center">
        {fighter !== 'BYE' && fighter ? (
          <>
            <span className="text-xl font-sans font-bold tracking-tight text-foreground">
              {fighter.first_name} {fighter.last_name}
            </span>
            {fighter.club && (
              <span className="text-sm font-medium text-muted-foreground mt-1">
                {fighter.club}
              </span>
            )}
          </>
        ) : (
          <span className="text-xl font-sans font-bold tracking-tight text-foreground">
            {getFighterDisplayName(fighter)}
          </span>
        )}
      </div>
      
      {isWinner && (
        <Badge className="bg-success text-success-foreground font-bold uppercase tracking-wider px-3 py-1 absolute bottom-4 right-4">
          Winner
        </Badge>
      )}
    </div>
  );
};

const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
  if (fighter === 'BYE' || !fighter) {
    return (
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border border-border/50 shadow-sm">
        <UserRound className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }
  return fighter.photo_url ? (
    <img src={fighter.photo_url} alt={fighter.first_name} className="w-16 h-16 object-cover rounded-full border border-border/50 shadow-sm" />
  ) : (
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center border border-border/50 shadow-sm">
      <UserRound className="h-8 w-8 text-muted-foreground/50" />
    </div>
  );
};
