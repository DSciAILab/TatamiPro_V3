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
      <Label>Tipo de Resultado</Label>
      <ToggleGroup 
        type="single" 
        value={value} 
        onValueChange={(val) => {
          if (val) onChange(val as FightResultType);
        }} 
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2"
        disabled={disabled}
      >
        {FIGHT_RESULT_TYPES.map(type => (
          <ToggleGroupItem 
            key={type.value} 
            value={type.value} 
            aria-label={type.label} 
            variant="outline" 
            className={cn(value === type.value && 'bg-blue-600 text-white hover:bg-blue-700')}
          >
            {type.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
};
