"use client";

import React, { useMemo } from 'react';
import { Event, DivisionGender, AgeCategory, DivisionBelt, Athlete } from '@/types/index';
import { cn } from '@/lib/utils';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface MatCategoryListProps {
  event: Event;
  selectedMat: string | 'all-mats';
  selectedCategoryKey: string | null;
  onSelectCategory: (categoryKey: string, divisionId: string) => void;
  hasOngoingFights: (divisionId: string) => boolean;
}

interface CategoryGroup {
  key: string;
  display: string;
  gender: DivisionGender;
  ageCategoryName: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
  bracketStatus: 'Não Gerado' | 'Gerado' | 'Em Andamento' | 'Sem Atletas';
}

const MatCategoryList: React.FC<MatCategoryListProps> = ({ event, selectedMat, selectedCategoryKey, onSelectCategory, hasOngoingFights }) => {
  const categoriesOnSelectedMat = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();

    const processAthlete = (athlete: Athlete) => {
      const division = athlete._division;
      if (!division) return;

      let key: string;
      let display: string;
      let belt: DivisionBelt | undefined;

      if (event.is_belt_grouping_enabled) {
        key = `${division.gender}/${division.age_category_name}/${division.belt}`;
        display = `${division.gender} / ${division.age_category_name} / ${division.belt}`;
        belt = division.belt;
      } else {
        key = `${division.gender}/${division.age_category_name}`;
        display = `${division.gender} / ${division.age_category_name}`;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          display,
          gender: division.gender,
          ageCategoryName: division.age_category_name,
          belt,
          athleteCount: 0,
          divisionIds: [],
          bracketStatus: 'Não Gerado', // Default
        });
      }
      const group = groupsMap.get(key)!;
      group.athleteCount++;
      if (!group.divisionIds.includes(division.id)) {
        group.divisionIds.push(division.id);
      }
    };

    (event.athletes || []).filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in').forEach(processAthlete);

    const finalGroups: CategoryGroup[] = [];
    groupsMap.forEach(group => {
      const isAssignedToSelectedMat = selectedMat === 'all-mats' || event.mat_assignments?.[selectedMat]?.includes(group.key);

      if (isAssignedToSelectedMat) {
        let status: CategoryGroup['bracketStatus'];
        const firstDivisionId = group.divisionIds[0];

        if (group.athleteCount < 2) {
          status = 'Sem Atletas';
        } else if (!event.brackets?.[firstDivisionId]) {
          status = 'Não Gerado';
        } else if (hasOngoingFights(firstDivisionId)) {
          status = 'Em Andamento';
        } else {
          status = 'Gerado';
        }
        finalGroups.push({ ...group, bracketStatus: status });
      }
    });

    return finalGroups.sort((a, b) => a.display.localeCompare(b.display));
  }, [event.mat_assignments, selectedMat, event.athletes, event.is_belt_grouping_enabled, event.brackets, hasOngoingFights]);

  const getStatusColor = (status: CategoryGroup['bracketStatus']) => {
    switch (status) {
      case 'Gerado': return 'text-green-600';
      case 'Em Andamento': return 'text-blue-600';
      case 'Sem Atletas': return 'text-gray-500';
      case 'Não Gerado': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-md font-semibold">Categorias {selectedMat === 'all-mats' ? 'em todas as áreas' : `no ${selectedMat}`}</h4>
      {categoriesOnSelectedMat.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhuma categoria encontrada para esta seleção.</p>
      ) : (
        <ToggleGroup
          type="single"
          value={selectedCategoryKey || ''}
          onValueChange={(value) => {
            if (value) {
              const group = categoriesOnSelectedMat.find(g => g.key === value);
              if (group) {
                onSelectCategory(group.key, group.divisionIds[0]);
              }
            }
          }}
          className="flex flex-wrap justify-start gap-2"
        >
          {categoriesOnSelectedMat.map(group => (
            <ToggleGroupItem
              key={group.key}
              value={group.key}
              className="h-auto py-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              disabled={group.bracketStatus === 'Sem Atletas' || group.bracketStatus === 'Não Gerado'}
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{group.display} ({group.athleteCount} atletas)</span>
                <span className={cn("text-xs", getStatusColor(group.bracketStatus))}>
                  Status: {group.bracketStatus}
                </span>
              </div>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
    </div>
  );
};

export default MatCategoryList;