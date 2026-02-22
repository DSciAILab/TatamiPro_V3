"use client";

import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";
import { Athlete } from "@/types/index";
import { getFighterDisplayName } from "../utils/fight-utils";

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
        "flex flex-col items-center p-6 border rounded-2xl shadow-sm hover:shadow-md transition-all relative overflow-hidden bg-card",
        isWinner ? 'border-success bg-success/5' : 
        isLoser ? 'border-destructive bg-destructive/5' :
        (isSelected && isRecordable ? 'border-primary bg-primary/5' : 'border-border/50'),
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
      <span className="text-2xl font-serif mt-4 text-center tracking-tight text-foreground">{getFighterDisplayName(fighter)}</span>
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
