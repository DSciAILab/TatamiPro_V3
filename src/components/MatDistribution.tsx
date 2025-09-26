"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event, Athlete, Division, AgeCategory, Belt, Gender } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { GripVertical, Trash2 } from 'lucide-react';

interface MatDistributionProps {
  event: Event;
  onUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  isBeltGroupingEnabled: boolean;
}

interface CategoryGroup {
  key: string; // e.g., "Masculino/Adult/Preta" or "Masculino/Adult"
  display: string; // e.g., "Masculino / Adult / Preta"
  gender: Gender;
  ageCategoryName: AgeCategory;
  belt?: Belt; // Optional if belt grouping is disabled
  athleteCount: number;
  divisionIds: string[]; // IDs of divisions that match this group
}

const MatDistribution: React.FC<MatDistributionProps> = ({ event, onUpdateMatAssignments, isBeltGroupingEnabled }) => {
  const numMats = event.numFightAreas || 1;
  const matNames = useMemo(() => Array.from({ length: numMats }, (_, i) => `Mat ${i + 1}`), [numMats]);

  const [matAssignments, setMatAssignments] = useState<Record<string, string[]>>(() => {
    const initialAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => {
      initialAssignments[mat] = event.matAssignments?.[mat] || [];
    });
    return initialAssignments;
  });

  const allCategoryGroups = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();

    event.athletes.filter(a => a.registrationStatus === 'approved').forEach(athlete => {
      const division = findAthleteDivision(athlete, event.divisions);
      if (!division) return;

      let key: string;
      let display: string;
      let belt: Belt | undefined;

      if (isBeltGroupingEnabled) {
        key = `${athlete.gender}/${athlete.ageDivision}/${athlete.belt}`;
        display = `${athlete.gender} / ${athlete.ageDivision} / ${athlete.belt}`;
        belt = athlete.belt;
      } else {
        key = `${athlete.gender}/${athlete.ageDivision}`;
        display = `${athlete.gender} / ${athlete.ageDivision}`;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          display,
          gender: athlete.gender,
          ageCategoryName: athlete.ageDivision,
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
    });

    // Sort order: Gender (Masculino, Feminino, Outro), AgeCategory, Belt
    const genderOrder: Gender[] = ['Masculino', 'Feminino', 'Outro'];
    const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];
    const beltOrder: Belt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

    return Array.from(groupsMap.values()).sort((a, b) => {
      const genderDiff = genderOrder.indexOf(a.gender) - genderOrder.indexOf(b.gender);
      if (genderDiff !== 0) return genderDiff;

      const ageDiff = ageCategoryOrder.indexOf(a.ageCategoryName) - ageCategoryOrder.indexOf(b.ageCategoryName);
      if (ageDiff !== 0) return ageDiff;

      if (isBeltGroupingEnabled && a.belt && b.belt) {
        const beltDiff = beltOrder.indexOf(a.belt) - beltOrder.indexOf(b.belt);
        if (beltDiff !== 0) return beltDiff;
      }

      return 0;
    });
  }, [event.athletes, event.divisions, isBeltGroupingEnabled]);

  const unassignedCategories = useMemo(() => {
    const assignedKeys = new Set<string>();
    Object.values(matAssignments).forEach(categories => {
      categories.forEach(key => assignedKeys.add(key));
    });
    return allCategoryGroups.filter(group => !assignedKeys.has(group.key));
  }, [allCategoryGroups, matAssignments]);

  useEffect(() => {
    // Ensure matAssignments state is in sync with event.matAssignments on initial load or event change
    const initialAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => {
      initialAssignments[mat] = event.matAssignments?.[mat] || [];
    });
    setMatAssignments(initialAssignments);
  }, [event.matAssignments, matNames]);

  const handleDragStart = (e: React.DragEvent, categoryKey: string) => {
    e.dataTransfer.setData('text/plain', categoryKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, targetMat: string) => {
    e.preventDefault();
    const categoryKey = e.dataTransfer.getData('text/plain');

    // Remove from previous mat if assigned
    const newAssignments = { ...matAssignments };
    for (const mat in newAssignments) {
      newAssignments[mat] = newAssignments[mat].filter(key => key !== categoryKey);
    }

    // Add to target mat
    newAssignments[targetMat] = [...(newAssignments[targetMat] || []), categoryKey];
    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess(`Categoria ${categoryKey} movida para ${targetMat}.`);
  };

  const handleRemoveFromMat = (matName: string, categoryKey: string) => {
    const newAssignments = { ...matAssignments };
    newAssignments[matName] = newAssignments[matName].filter(key => key !== categoryKey);
    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess(`Categoria ${categoryKey} removida do ${matName}.`);
  };

  const handleAutoDistribute = () => {
    const newAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => (newAssignments[mat] = []));

    // Create a list of all categories, including those already assigned
    const allCategoriesToDistribute = [...allCategoryGroups];

    // Sort categories by athlete count (descending) to try and balance larger groups first
    allCategoriesToDistribute.sort((a, b) => b.athleteCount - a.athleteCount);

    // Initialize mat loads (e.g., total athletes assigned to each mat)
    const matLoads = new Map<string, number>();
    matNames.forEach(mat => matLoads.set(mat, 0));

    allCategoriesToDistribute.forEach(category => {
      // Find the mat with the minimum current load
      let minLoad = Infinity;
      let targetMat = matNames[0]; // Default to first mat

      for (const mat of matNames) {
        const currentLoad = matLoads.get(mat) || 0;
        if (currentLoad < minLoad) {
          minLoad = currentLoad;
          targetMat = mat;
        }
      }

      // Assign category to targetMat
      newAssignments[targetMat].push(category.key);
      matLoads.set(targetMat, (matLoads.get(targetMat) || 0) + category.athleteCount);
    });

    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess('Categorias distribuídas automaticamente entre os mats.');
  };

  const getTotalAthletesOnMat = (matName: string) => {
    return matAssignments[matName].reduce((total, categoryKey) => {
      const group = allCategoryGroups.find(g => g.key === categoryKey);
      return total + (group?.athleteCount || 0);
    }, 0);
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Distribuição dos Mats</h2>
      <p className="text-muted-foreground">Arraste e solte as categorias para os mats ou use a auto-distribuição.</p>

      <div className="flex justify-end space-x-2">
        <Button onClick={handleAutoDistribute}>Auto Distribuição dos Mats</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {matNames.map(matName => (
          <Card
            key={matName}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, matName)}
            className="min-h-[200px] flex flex-col"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg font-medium">{matName}</CardTitle>
              <span className="text-sm text-muted-foreground">Atletas: {getTotalAthletesOnMat(matName)}</span>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              {matAssignments[matName].length === 0 ? (
                <p className="text-muted-foreground text-sm">Arraste categorias para cá.</p>
              ) : (
                <ul className="space-y-2">
                  {matAssignments[matName].map(categoryKey => {
                    const group = allCategoryGroups.find(g => g.key === categoryKey);
                    return (
                      <li key={categoryKey} className="flex items-center justify-between p-2 border rounded-md bg-secondary/50">
                        <span className="text-sm">{group?.display} ({group?.athleteCount || 0} atletas)</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromMat(matName, categoryKey)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <h3 className="text-xl font-semibold mt-8 mb-4">Categorias Não Atribuídas ({unassignedCategories.length})</h3>
      {unassignedCategories.length === 0 ? (
        <p className="text-muted-foreground">Todas as categorias foram atribuídas aos mats.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {unassignedCategories.map(group => (
            <Card
              key={group.key}
              draggable
              onDragStart={(e) => handleDragStart(e, group.key)}
              className="p-3 flex items-center justify-between bg-card hover:bg-accent cursor-grab"
            >
              <span className="font-medium">{group.display} ({group.athleteCount} atletas)</span>
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatDistribution;