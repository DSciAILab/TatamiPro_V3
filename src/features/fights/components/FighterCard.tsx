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
        "flex flex-col items-center p-4 border rounded-md transition-colors relative overflow-hidden",
        isWinner ? 'border-green-500 bg-green-50 dark:bg-green-950' : 
        isLoser ? 'border-red-500 bg-red-50 dark:bg-red-950' :
        (isSelected && isRecordable ? 'border-blue-600 bg-blue-50 dark:bg-blue-950' : 'border-gray-200 dark:border-gray-700'),
        isRecordable ? 'cursor-pointer hover:bg-accent' : 'cursor-not-allowed opacity-70'
      )}
      onClick={isRecordable ? onClick : undefined}
    >
      {cornerColor && (
        <div className={cn(
          "absolute left-0 top-0 bottom-0 w-2",
          cornerColor === 'red' ? "bg-red-600" : "bg-blue-600"
        )} />
      )}
      
      {getFighterPhoto(fighter)}
      <span className="text-xl font-medium mt-2 text-center">{getFighterDisplayName(fighter)}</span>
    </div>
  );
};

const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
  if (fighter === 'BYE' || !fighter) {
    return (
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }
  return fighter.photo_url ? (
    <img src={fighter.photo_url} alt={fighter.first_name} className="w-12 h-12 rounded-full object-cover" />
  ) : (
    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
      <UserRound className="h-6 w-6 text-muted-foreground" />
    </div>
  );
};
