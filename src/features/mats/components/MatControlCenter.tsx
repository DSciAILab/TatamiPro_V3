import React from 'react';
import { Event, Division, Bracket } from '@/types/index';
import { useMatData } from '../hooks/use-mat-data';
import { MatStatsToolbar } from './MatStatsToolbar';
import { MatGroupCard } from './MatGroupCard';

export interface MatControlCenterProps {
  event: Event;
  onDivisionSelect?: (division: Division, bracketId?: string) => void;
  onUpdateBracket?: (divisionId: string, updatedBracket: Bracket) => void;
}

export const MatControlCenter = ({ event, onDivisionSelect, onUpdateBracket }: MatControlCenterProps) => {
  const {
    filteredGroups,
    matGroups,
    totals,
    filterState
  } = useMatData(event);
  
  const {
    searchTerm, setSearchTerm,
    statusFilter, updateStatusFilter,
    expandedMats, toggleMat, expandAll, collapseAll,
    expandedDivisions, toggleDivisionExpansion,
    handleSort
  } = filterState;

  if (matGroups.length === 0) {
    return <p className="text-muted-foreground text-center py-8">No brackets generated yet.</p>;
  }

  return (
    <div className="space-y-4">
      <MatStatsToolbar 
        totals={totals}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onFilterChange={updateStatusFilter}
        allExpanded={expandedMats.size === matGroups.length}
        onToggleAll={() => expandedMats.size === matGroups.length ? collapseAll() : expandAll()}
      />
      
      <div className="space-y-4">
        {filteredGroups.map(group => (
          <MatGroupCard
            key={group.matName}
            group={group}
            isExpanded={expandedMats.has(group.matName)}
            onToggle={() => toggleMat(group.matName)}
            event={event}
            expandedDivisions={expandedDivisions}
            onToggleDivisionExpansion={toggleDivisionExpansion}
            onSort={handleSort}
            onDivisionSelect={onDivisionSelect}
            onUpdateBracket={onUpdateBracket}
          />
        ))}
      </div>
    </div>
  );
};
