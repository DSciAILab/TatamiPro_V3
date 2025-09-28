"use client";

import React, { useMemo } from 'react';
import { Event, DivisionGender, AgeCategory, DivisionBelt } from '@/types/index'; // CORREÇÃO: 'Division' removido
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MatCategoryListProps {
  event: Event;
  selectedMat: string | 'all-mats'; // Atualizado para 'all-mats'
  selectedCategoryKey: string | null;
  onSelectCategory: (categoryKey: string, divisionId: string) => void;
  hasOngoingFights: (divisionId: string) => boolean; // Receber a função
}

interface CategoryGroup {
  key: string; // e.g., "Masculino/Adult/Preta" or "Masculino/Adult"
  display: string; // e.g., "Masculino / Adult / Preta"
  gender: DivisionGender;
  ageCategoryName: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
  bracketStatus: 'Não Gerado' | 'Gerado' | 'Em Andamento' | 'Sem Atletas'; // NOVO: Status do bracket
}

const MatCategoryList: React.FC<MatCategoryListProps> = ({ event, selectedMat, selectedCategoryKey, onSelectCategory, hasOngoingFights }) => {
  const categoriesOnSelectedMat = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();

    const processAthlete = (athlete: Event['athletes'][0]) => {
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

    // Filtrar atletas que fizeram check-in com sucesso e estão aprovados
    event.athletes.filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in').forEach(processAthlete);

    // Agora, filtrar e adicionar status de bracket
    const finalGroups: CategoryGroup[] = [];
    groupsMap.forEach(group => {
      // Verificar se a categoria está atribuída ao mat selecionado ou se é 'all-mats'
      const isAssignedToSelectedMat = selectedMat === 'all-mats' || event.mat_assignments?.[selectedMat]?.includes(group.key);

      if (isAssignedToSelectedMat) {
        // Determinar o status do bracket
        let status: CategoryGroup['bracketStatus'];
        const firstDivisionId = group.divisionIds[0]; // Usar o primeiro ID para verificar o bracket

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

    // Sort categories by display name for consistent order
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {categoriesOnSelectedMat.map(group => (
            <Button
              key={group.key}
              className={cn(
                "justify-start h-auto py-2", // Ajuste de altura e padding
                selectedCategoryKey === group.key
                  ? "bg-blue-900 text-white hover:bg-blue-800 dark:bg-blue-900 dark:text-white dark:hover:bg-blue-800"
                  : "bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => onSelectCategory(group.key, group.divisionIds[0])}
              disabled={group.bracketStatus === 'Sem Atletas' || group.bracketStatus === 'Não Gerado'} // Desabilitar se não houver bracket ou atletas
            >
              <div className="flex flex-col items-start">
                <span className="font-medium">{group.display} ({group.athleteCount} atletas)</span>
                <span className={cn("text-xs", getStatusColor(group.bracketStatus))}>
                  Status: {group.bracketStatus}
                </span>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatCategoryList;