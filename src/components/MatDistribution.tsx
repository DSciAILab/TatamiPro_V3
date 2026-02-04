"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Event, AgeCategory, DivisionGender, DivisionBelt } from '@/types/index';
import { showSuccess } from '@/utils/toast';
import { GripVertical, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MatDistributionProps {
  event: Event;
  onUpdateMatAssignments: (assignments: Record<string, string[]>) => void;
  isBeltGroupingEnabled: boolean;
}

interface CategoryGroup {
  key: string;
  display: string;
  gender: DivisionGender;
  ageCategoryName: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
  totalFightTime: number;
}

const MatDistribution: React.FC<MatDistributionProps> = ({ event, onUpdateMatAssignments, isBeltGroupingEnabled }) => {
  const numMats = event.num_fight_areas || 1;
  const matNames = useMemo(() => Array.from({ length: numMats }, (_, i) => `Mat ${i + 1}`), [numMats]);

  const [matAssignments, setMatAssignments] = useState<Record<string, string[]>>(() => {
    const initialAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => {
      initialAssignments[mat] = event.mat_assignments?.[mat] || [];
    });
    return initialAssignments;
  });

  const [expandedMats, setExpandedMats] = useState<Set<string>>(() => new Set(matNames));

    // Update expandedMats when matNames changes if needed (optional reset or merge)
    useEffect(() => {
        setExpandedMats(prev => {
            const newSet = new Set(prev);
            matNames.forEach(m => newSet.add(m)); // Ensure new mats are expanded by default
            return newSet;
        });
    }, [matNames]);

    const toggleMatExpansion = (matName: string) => {
        setExpandedMats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(matName)) {
                newSet.delete(matName);
            } else {
                newSet.add(matName);
            }
            return newSet;
        });
    };

  // Ensure mat assignments are migrated (Parent -> Splits)
  useEffect(() => {
    let hasChanges = false;
    const newAssignments = { ...matAssignments };
    
    // Check if we have any "orphan" parent IDs that have split keys
    for (const mat in newAssignments) {
        const ids = newAssignments[mat];
        const newIds: string[] = [];
        let matChanged = false;

        ids.forEach(id => {
            // If explicit bracket exists, keep it
            if (event.brackets?.[id]) {
                newIds.push(id);
                return;
            }
            // If split keys exist for this ID, use THEM instead
            const splitKeys = Object.keys(event.brackets || {}).filter(k => k.startsWith(`${id}-`));
            if (splitKeys.length > 0) {
                // It was a parent ID, but updated to splits. Replace.
                newIds.push(...splitKeys);
                matChanged = true;
            } else {
                // Keep original (might be ungenerated division)
                newIds.push(id);
            }
        });

        if (matChanged) {
            newAssignments[mat] = Array.from(new Set(newIds)); // Dedupe
            hasChanges = true;
        }
    }

    if (hasChanges) {
        setMatAssignments(newAssignments);
        onUpdateMatAssignments(newAssignments);
    }
  }, [event.brackets]); // Run when brackets change (e.g. after generation)

  const allCategoryGroups = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();
    const ageSettingsMap = new Map(event.age_division_settings?.map(s => [s.name, s]));
    
    // Helper to add group
    const addGroup = (key: string, division: any, sourceBracket?: any) => {
        if (groupsMap.has(key)) return;
        
        // Count athletes
        let athleteCount = 0;
        if (sourceBracket && sourceBracket.participants) {
            // Filter valid participants
            athleteCount = sourceBracket.participants.filter((p: any) => p && p !== 'BYE').length;
        } else {
            // Fallback to division count (filtered)
            const athletes = (event.athletes || []).filter(a => {
                if (a.registration_status !== 'approved' || a.check_in_status !== 'checked_in') return false;
                return (a.moved_to_division_id || a._division?.id) === division.id;
            });
            athleteCount = athletes.length;
        }

        const display = sourceBracket?.group_name ? `${division.name} - ${sourceBracket.group_name}` : division.name;

        groupsMap.set(key, {
            key,
            display,
            gender: division.gender,
            ageCategoryName: division.age_category_name,
            belt: division.belt,
            athleteCount,
            divisionIds: [division.id],
            totalFightTime: 0,
        });
    };

    // 1. Process Existing Brackets
    if (event.brackets) {
        Object.values(event.brackets).forEach(bracket => {
            const division = event.divisions?.find(d => d.id === bracket.division_id);
            if (division) {
                addGroup(bracket.id, division, bracket);
            }
        });
    }

    // 2. Process Ungenerated Divisions (Fallbacks)
    if (event.divisions) {
        event.divisions.forEach(division => {
            // Check if covered by any bracket (Parent or Splits)
            const hasBracket = event.brackets?.[division.id] || Object.keys(event.brackets || {}).some(k => k.startsWith(`${division.id}-`));
            
            if (!hasBracket) {
                // Must verify if it has athletes to be worth listing
                 const athletes = (event.athletes || []).filter(a => {
                    if (a.registration_status !== 'approved' || a.check_in_status !== 'checked_in') return false;
                    return (a.moved_to_division_id || a._division?.id) === division.id;
                });
                if (athletes.length > 0) {
                    addGroup(division.id, division);
                }
            }
        });
    }

    // Calculate Fight Times
    groupsMap.forEach(group => {
      // Logic: n-1 fights for single elimination, roughly. 
      // Or bracket size based. 
      // MatDistribution logic was: athleteCount >= 2 ? count - 1 : 0. Approximation.
      const numFights = group.athleteCount >= 2 ? group.athleteCount - 1 : 0;
      const ageSetting = ageSettingsMap.get(group.ageCategoryName);
      const fightDuration = ageSetting?.fight_duration || 5;
      group.totalFightTime = numFights * fightDuration;
    });

    const genderOrder: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];
    const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];
    const beltOrder: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];

    return Array.from(groupsMap.values()).sort((a, b) => {
      const genderDiff = genderOrder.indexOf(a.gender) - genderOrder.indexOf(b.gender);
      if (genderDiff !== 0) return genderDiff;

      const ageDiff = ageCategoryOrder.indexOf(a.ageCategoryName) - ageCategoryOrder.indexOf(b.ageCategoryName);
      if (ageDiff !== 0) return ageDiff;

      if (isBeltGroupingEnabled && a.belt && b.belt) {
        const beltAIndex = beltOrder.indexOf(a.belt);
        const beltBIndex = beltOrder.indexOf(b.belt);
        if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;
      }

      return a.display.localeCompare(b.display);
    });
  }, [event.athletes, event.brackets, event.divisions, event.age_division_settings, isBeltGroupingEnabled]);

  const unassignedCategories = useMemo(() => {
    const assignedKeys = new Set<string>();
    Object.values(matAssignments).forEach(categories => {
      categories.forEach(key => assignedKeys.add(key));
    });
    return allCategoryGroups.filter(group => !assignedKeys.has(group.key));
  }, [allCategoryGroups, matAssignments]);

  useEffect(() => {
    const initialAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => {
      initialAssignments[mat] = event.mat_assignments?.[mat] || [];
    });
    setMatAssignments(initialAssignments);
  }, [event.mat_assignments, matNames]);

  const handleDragStart = (e: React.DragEvent, categoryKey: string) => {
    e.dataTransfer.setData('text/plain', categoryKey);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetMat: string) => {
    e.preventDefault();
    const categoryKey = e.dataTransfer.getData('text/plain');

    const newAssignments = { ...matAssignments };
    for (const mat in newAssignments) {
      newAssignments[mat] = newAssignments[mat].filter(key => key !== categoryKey);
    }

    newAssignments[targetMat] = [...(newAssignments[targetMat] || []), categoryKey];
    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess(`Categoria movida para ${targetMat}.`);
  };

  const handleRemoveFromMat = (matName: string, categoryKey: string) => {
    const newAssignments = { ...matAssignments };
    newAssignments[matName] = newAssignments[matName].filter(key => key !== categoryKey);
    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess(`Categoria removida do ${matName}.`);
  };

  const handleAutoDistribute = () => {
    const newAssignments: Record<string, string[]> = {};
    matNames.forEach(mat => (newAssignments[mat] = []));

    const allCategoriesToDistribute = [...allCategoryGroups];
    allCategoriesToDistribute.sort((a, b) => b.totalFightTime - a.totalFightTime);

    const matLoads = new Map<string, number>();
    matNames.forEach(mat => matLoads.set(mat, 0));

    allCategoriesToDistribute.forEach(category => {
      let minLoad = Infinity;
      let targetMat = matNames[0];

      for (const mat of matNames) {
        const currentLoad = matLoads.get(mat) || 0;
        if (currentLoad < minLoad) {
          minLoad = currentLoad;
          targetMat = mat;
        }
      }

      newAssignments[targetMat].push(category.key);
      matLoads.set(targetMat, (matLoads.get(targetMat) || 0) + category.totalFightTime);
    });

    setMatAssignments(newAssignments);
    onUpdateMatAssignments(newAssignments);
    showSuccess('Categorias distribuídas automaticamente entre os mats.');
  };

  const getTotalFightTimeOnMat = (matName: string) => {
    return matAssignments[matName].reduce((total, categoryKey) => {
      const group = allCategoryGroups.find(g => g.key === categoryKey);
      return total + (group?.totalFightTime || 0);
    }, 0);
  };

  return (
    <div className="space-y-6 p-4">
      <p className="text-muted-foreground text-center">Arraste e solte as categorias para os mats ou use a auto-distribuição.</p>

      <div className="flex justify-end space-x-2">
        <Button onClick={handleAutoDistribute}>Auto Distribuição dos Mats</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {matNames.map(matName => (
          <Card
            key={matName}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, matName)}
            className="flex flex-col"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleMatExpansion(matName)}>
              <div className="flex flex-col">
                  <CardTitle className="text-lg font-medium">{matName}</CardTitle>
                  <span className="text-sm text-muted-foreground">Tempo: {getTotalFightTimeOnMat(matName)} min</span>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); toggleMatExpansion(matName); }}>
                 <ChevronDown className={cn("h-4 w-4 transition-transform", expandedMats.has(matName) ? "rotate-180" : "")} /> 
              </Button>
            </CardHeader>
            {expandedMats.has(matName) && (
            <CardContent className="flex-1 pt-4">
              {matAssignments[matName].length === 0 ? (
                <p className="text-muted-foreground text-sm">Arraste categorias para cá.</p>
              ) : (
                <ul className="space-y-2">
                  {matAssignments[matName].map(categoryKey => {
                    const group = allCategoryGroups.find(g => g.key === categoryKey);
                    return (
                      <li
                        key={categoryKey}
                        draggable
                        onDragStart={(e) => handleDragStart(e, categoryKey)}
                        className="flex items-center justify-between p-2 border rounded-md bg-secondary/50 cursor-grab"
                      >
                        <span className="text-sm">{group?.display} ({group?.athleteCount || 0} / {group?.totalFightTime || 0}m)</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveFromMat(matName, categoryKey)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
            )}
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
              <span className="font-medium">{group.display} ({group.athleteCount} / {group.totalFightTime}m)</span>
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MatDistribution;