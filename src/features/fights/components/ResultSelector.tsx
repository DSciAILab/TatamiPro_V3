"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FightResultType } from "@/types/index";
import { FIGHT_RESULT_TYPES } from "../utils/fight-utils";

interface ResultSelectorProps {
  value: FightResultType | undefined;
  onChange: (value: FightResultType) => void;
  disabled?: boolean;
}

export const ResultSelector = ({ value, onChange, disabled }: ResultSelectorProps) => {
  return (
    <div className="grid gap-2">
      <Label className="font-heading uppercase text-xl text-muted-foreground tracking-wide">Tipo de Resultado</Label>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(val) => {
          if (val) onChange(val as FightResultType);
        }} 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-0 border-2 border-border"
        disabled={disabled}
      >
        {FIGHT_RESULT_TYPES.map(type => (
          <ToggleGroupItem 
            key={type.value} 
            value={type.value} 
            aria-label={type.label} 
            variant="outline" 
            className={cn(
              "rounded-none border-0 border-r-2 border-b-2 border-border last:border-r-0 font-mono text-sm uppercase transition-none",
              value === type.value && 'bg-primary text-primary-foreground font-bold'
            )}
          >
            {type.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
