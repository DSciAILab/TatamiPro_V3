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
        "flex flex-col items-center p-6 border-4 transition-all relative overflow-hidden",
        isWinner ? 'border-success bg-success/10' : 
        isLoser ? 'border-destructive bg-destructive/10' :
        (isSelected && isRecordable ? 'border-info bg-info/10' : 'border-border'),
        isRecordable ? 'cursor-pointer hover:bg-accent hover:border-accent hover:text-accent-foreground' : 'cursor-not-allowed opacity-50'
      )}
      onClick={isRecordable ? onClick : undefined}
    >
      {cornerColor && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-4",
          cornerColor === 'red' ? "bg-destructive" : "bg-info"
        )} />
      )}
      
      {getFighterPhoto(fighter)}
      <span className="text-3xl font-heading uppercase mt-4 text-center tracking-tight">{getFighterDisplayName(fighter)}</span>
    </div>
  );
};

const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
  if (fighter === 'BYE' || !fighter) {
    return (
      <div className="w-16 h-16 bg-muted flex items-center justify-center border-2 border-border">
        <UserRound className="h-8 w-8 text-muted-foreground" />
      </div>
    );
  }
  return fighter.photo_url ? (
    <img src={fighter.photo_url} alt={fighter.first_name} className="w-16 h-16 object-cover border-2 border-border" />
  ) : (
    <div className="w-16 h-16 bg-muted flex items-center justify-center border-2 border-border">
      <UserRound className="h-8 w-8 text-muted-foreground" />
    </div>
  );
};
