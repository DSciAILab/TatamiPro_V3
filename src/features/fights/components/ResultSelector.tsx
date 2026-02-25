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
    <div className="grid gap-3">
      <Label className="font-sans font-bold text-xl text-foreground">Tipo de Resultado</Label>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(val) => {
          if (val) onChange(val as FightResultType);
        }} 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 bg-muted/20 p-2 rounded-2xl border border-border/30"
        disabled={disabled}
      >
        {FIGHT_RESULT_TYPES.map(type => (
          <ToggleGroupItem 
            key={type.value} 
            value={type.value} 
            aria-label={type.label} 
            variant="outline" 
            className={cn(
              "rounded-xl border border-border/50 font-medium transition-all hover:bg-primary/10",
              value === type.value && 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90'
            )}
          >
            {type.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
