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
  divisionStatusFilter?: 'all' | 'active' | 'finished';
}

interface CategoryGroup {
  key: string;
  display: string;
  gender: DivisionGender;
  ageCategoryName: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
  bracketStatus: 'Not Generated' | 'Generated' | 'In Progress' | 'Finished' | 'No Athletes';
}

const MatCategoryList: React.FC<MatCategoryListProps> = ({ event, selectedMat, selectedCategoryKey, onSelectCategory, divisionStatusFilter = 'all' }) => {
  const categoriesOnSelectedMat = useMemo(() => {
    const groupsMap = new Map<string, CategoryGroup>();

    const processAthlete = (athlete: Athlete) => {
      // Get effective division - if athlete was moved, use the new division
      let effectiveDivisionId = athlete.moved_to_division_id || athlete._division?.id;
      let division = effectiveDivisionId 
        ? (event.divisions || []).find(d => d.id === effectiveDivisionId) 
        : athlete._division;
      
      if (!division) return;

      const key = division.id;
      const display = division.name;

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          display,
          gender: division.gender,
          ageCategoryName: division.age_category_name,
          belt: division.belt,
          athleteCount: 0,
          divisionIds: [division.id],
          bracketStatus: 'Not Generated', // Default
        });
      }
      const group = groupsMap.get(key)!;
      group.athleteCount++;
    };

    (event.athletes || []).filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in').forEach(processAthlete);

    const finalGroups: CategoryGroup[] = [];
    groupsMap.forEach(group => {
      const isAssignedToSelectedMat = selectedMat === 'all-mats' || event.mat_assignments?.[selectedMat]?.includes(group.key);

      if (isAssignedToSelectedMat) {
        let status: CategoryGroup['bracketStatus'];
        const firstDivisionId = group.divisionIds[0];
        const bracket = event.brackets?.[firstDivisionId];

        if (group.athleteCount < 2) {
          status = 'No Athletes';
        } else if (!bracket) {
          status = 'Not Generated';
        } else if (bracket.winner_id) {
          status = 'Finished';
        } else if (bracket.rounds.flat().some(match => match.winner_id !== undefined)) {
          status = 'In Progress';
        } else {
          status = 'Generated';
        }
        finalGroups.push({ ...group, bracketStatus: status });
      }
    });

    // Apply status filter
    let filtered = finalGroups;
    if (divisionStatusFilter === 'finished') {
      filtered = finalGroups.filter(g => g.bracketStatus === 'Finished');
    } else if (divisionStatusFilter === 'active') {
      filtered = finalGroups.filter(g => g.bracketStatus !== 'Finished');
    }

    return filtered.sort((a, b) => a.display.localeCompare(b.display));
  }, [event.mat_assignments, selectedMat, event.athletes, event.is_belt_grouping_enabled, event.brackets, divisionStatusFilter]);

  const getStatusColor = (status: CategoryGroup['bracketStatus']) => {
    switch (status) {
      case 'Finished': return 'text-purple-600';
      case 'Generated': return 'text-green-600';
      case 'In Progress': return 'text-blue-600';
      case 'No Athletes': return 'text-gray-500';
      case 'Not Generated': return 'text-orange-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-2">
      <h4 className="text-md font-semibold">Categories {selectedMat === 'all-mats' ? 'in all areas' : `in ${selectedMat}`}</h4>
      {categoriesOnSelectedMat.length === 0 ? (
        <p className="text-muted-foreground text-sm">No categories found for this selection.</p>
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
              disabled={group.bracketStatus === 'No Athletes' || group.bracketStatus === 'Not Generated'}
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">{group.display} ({group.athleteCount} athletes)</span>
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