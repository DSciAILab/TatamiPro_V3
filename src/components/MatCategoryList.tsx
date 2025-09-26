"use client";

import React, { useMemo } from 'react';
import { Event, DivisionGender, AgeCategory, DivisionBelt } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MatCategoryListProps {
  event: Event;
  selectedMat: string;
  selectedCategoryKey: string | null;
  onSelectCategory: (categoryKey: string, divisionId: string) => void; // Adicionado divisionId
}

interface CategoryGroup {
  key: string; // e.g., "Masculino/Adult/Preta" or "Masculino/Adult"
  display: string; // e.g., "Masculino / Adult / Preta"
  gender: DivisionGender;
  ageCategoryName: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
}

const MatCategoryList: React.FC<MatCategoryListProps> = ({ event, selectedMat, selectedCategoryKey, onSelectCategory }) => {
  const categoriesOnSelectedMat = useMemo(() => {
    if (!event.matAssignments || !event.matAssignments[selectedMat]) return [];

    const assignedCategoryKeys = event.matAssignments[selectedMat];
    const groupsMap = new Map<string, CategoryGroup>();

    event.athletes.filter(a => a.registrationStatus === 'approved' && a.checkInStatus === 'checked_in').forEach(athlete => {
      const division = athlete._division;
      if (!division) return;

      let key: string;
      let display: string;
      let belt: DivisionBelt | undefined;

      if (event.isBeltGroupingEnabled) {
        key = `${division.gender}/${division.ageCategoryName}/${division.belt}`;
        display = `${division.gender} / ${division.ageCategoryName} / ${division.belt}`;
        belt = division.belt;
      } else {
        key = `${division.gender}/${division.ageCategoryName}`;
        display = `${division.gender} / ${division.ageCategoryName}`;
      }

      if (assignedCategoryKeys.includes(key)) { // Only include categories assigned to this mat
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            display,
            gender: division.gender,
            ageCategoryName: division.ageCategoryName,
            belt,
            athleteCount: 0,
            divisionIds: [],
          });
        }
        const group = groupsMap.get(key)!;
        group.athleteCount++;
        if (!group.divisionIds.includes(division.id)) {
          group.divisionIds.push(division.id);
        }
      }
    });

    // Sort categories by display name for consistent order
    return Array.from(groupsMap.values()).sort((a, b) => a.display.localeCompare(b.display));
  }, [event.matAssignments, selectedMat, event.athletes, event.isBeltGroupingEnabled]);

  return (
    <div className="space-y-2">
      <h4 className="text-md font-semibold">Categorias no {selectedMat}</h4>
      {categoriesOnSelectedMat.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma categoria atribuída a este Mat.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {categoriesOnSelectedMat.map(group => (
            <Button
              key={group.key}
              // Usar classes Tailwind para um azul escuro consistente para o estado selecionado
              className={cn(
                "justify-start",
                selectedCategoryKey === group.key
                  ? "bg-blue-900 text-white hover:bg-blue-800 dark:bg-blue-900 dark:text-white dark:hover:bg-blue-800" // Azul escuro para seleção
                  : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground" // Estilo padrão
              )}
              onClick={() => onSelectCategory(group.key, group.divisionIds[0])} // Passa o primeiro divisionId
            >
              {group.display} ({group.athleteCount} atletas)
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatCategoryList;