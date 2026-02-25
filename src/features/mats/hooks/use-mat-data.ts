import { useState, useMemo } from 'react';
import { Event, Division } from '@/types/index';
import { DivisionInfo, MatGroup, getAthleteStatusInBracket } from '../utils/mat-utils';

export type SortKey = 'category' | 'athletes' | 'remaining' | 'status';
export type SortDirection = 'asc' | 'desc';

export const useMatData = (event: Event) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Persist expanded mats state in localStorage
  const [expandedMats, setExpandedMats] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`matControl_expanded_${event.id}`);
      if (saved) {
        try {
          return new Set(JSON.parse(saved));
        } catch {
          return new Set();
        }
      }
    }
    return new Set();
  });
  
  const [sortKey, setSortKey] = useState<SortKey>('category');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // State for expanded divisions (to show athletes inline)
  const [expandedDivisions, setExpandedDivisions] = useState<Set<string>>(new Set());
  
  // Persist status filter in localStorage
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'pending' | 'finished' | 'ready'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`matControl_filter_${event.id}`);
      if (saved && ['all', 'in_progress', 'pending', 'finished', 'ready'].includes(saved)) {
        return saved as 'all' | 'in_progress' | 'pending' | 'finished' | 'ready';
      }
    }
    return 'all';
  });

  const [selectedMatFilter, setSelectedMatFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`matControl_selectedMat_${event.id}`);
      if (saved) return saved;
    }
    return 'all';
  });

  // Save expanded mats to localStorage whenever it changes
  const updateExpandedMats = (newExpanded: Set<string>) => {
    setExpandedMats(newExpanded);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`matControl_expanded_${event.id}`, JSON.stringify([...newExpanded]));
    }
  };

  // Save status filter to localStorage whenever it changes
  const updateStatusFilter = (newFilter: 'all' | 'in_progress' | 'pending' | 'finished' | 'ready') => {
    setStatusFilter(newFilter);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`matControl_filter_${event.id}`, newFilter);
    }
  };

  const updateSelectedMatFilter = (newMat: string) => {
    setSelectedMatFilter(newMat);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`matControl_selectedMat_${event.id}`, newMat);
    }
  };

  // Toggle division expansion
  const toggleDivisionExpansion = (divisionId: string) => {
    const newExpanded = new Set(expandedDivisions);
    if (newExpanded.has(divisionId)) {
      newExpanded.delete(divisionId);
    } else {
      newExpanded.add(divisionId);
    }
    setExpandedDivisions(newExpanded);
  };

  // Build mat groups with fight data
  const matGroups = useMemo(() => {
    if (!event.divisions || !event.brackets) return [];

    // Map divisions to mats
    const divisionMatMap = new Map<string, string>();
    if (event.mat_assignments) {
      for (const matName in event.mat_assignments) {
        event.mat_assignments[matName].forEach(divisionId => {
          divisionMatMap.set(divisionId, matName);
        });
      }
    }

    // Build division info
    // Iterate over BRACKETS to support split brackets
    const divisionsInfo: DivisionInfo[] = Object.values(event.brackets || []).map((bracket): DivisionInfo | null => {
        const division = event.divisions?.find(d => d.id === bracket.division_id);
        if (!division) return null;

        // Lookup by Bracket ID first (for splits), then Division ID (legacy/parent)
        const matName = divisionMatMap.get(bracket.id) || divisionMatMap.get(division.id) || 'Unassigned';
        
        // Count total and remaining fights
        let totalFights = 0;
        let remainingFights = 0;
        
        if (bracket.rounds) {
          bracket.rounds.forEach(round => {
            round.forEach(match => {
              // Only count real matches (not BYE matches)
              if (match.fighter1_id && match.fighter1_id !== 'BYE' && 
                  match.fighter2_id && match.fighter2_id !== 'BYE') {
                totalFights++;
                if (!match.winner_id) {
                  remainingFights++;
                }
              }
            });
          });
        }
        
        // Third place match
        if (bracket.third_place_match) {
          const tpm = bracket.third_place_match;
          if (tpm.fighter1_id && tpm.fighter1_id !== 'BYE' && 
              tpm.fighter2_id && tpm.fighter2_id !== 'BYE') {
            totalFights++;
            if (!tpm.winner_id) {
              remainingFights++;
            }
          }
        }

        // Get fight duration from age_division_settings
        const ageSetting = event.age_division_settings?.find(s => s.name === division.age_category_name);
        const fightDuration = ageSetting?.fight_duration || 5; // default 5 minutes
        
        // Evaluate if "Ready"
        // Use bracket participants for count (filtering BYEs)
        const participantCount = bracket.participants.filter(p => p !== 'BYE').length;
        
        // Only get valid athletes
        const validAthleteIds = bracket.participants.filter(p => p !== 'BYE').map(p => typeof p === 'string' ? p : p.id);
        const athletes = event.athletes?.filter(a => validAthleteIds.includes(a.id)) || [];
        
        const isAllReady = athletes.length > 0 && athletes.length === participantCount && athletes.every(a => {
            const statusParams = getAthleteStatusInBracket(a.id, bracket, event);
            if (statusParams.placing !== 'active') return true;
            return bracket.attendance?.[a.id]?.status === 'present';
        });

        // Determine status
        let status: DivisionInfo['status'];
        if (bracket.winner_id || (totalFights > 0 && remainingFights === 0)) {
          status = 'Finished';
        } else if (totalFights > remainingFights) {
          status = 'In Progress';
        } else if (isAllReady) {
          status = 'Ready';
        } else {
          status = 'Not Generated';
        }

        // Clone division to avoid mutating original and append group name
        const displayDivision = { ...division };
        if (bracket.group_name) {
            displayDivision.name = `${division.name} [${bracket.group_name}]`;
        }

        return {
          division: displayDivision, // This "division" object might have a modified name now
          matName,
          athleteCount: participantCount,
          totalFights,
          remainingFights,
          status,
          fightDuration,
          _bracketId: bracket.id // Store bracket ID to distinguish
        };
      }).filter((item): item is DivisionInfo => item !== null);

    // Group by mat
    const groupsMap = new Map<string, MatGroup>();
    
    divisionsInfo.forEach(divInfo => {
      if (!groupsMap.has(divInfo.matName)) {
        groupsMap.set(divInfo.matName, {
          matName: divInfo.matName,
          divisions: [],
          totalFights: 0,
          remainingFights: 0,
          estimatedRemainingTime: 0,
        });
      }
      
      const group = groupsMap.get(divInfo.matName)!;
      group.divisions.push(divInfo);
      group.totalFights += divInfo.totalFights;
      group.remainingFights += divInfo.remainingFights;
      group.estimatedRemainingTime += divInfo.remainingFights * divInfo.fightDuration;
    });

    // Convert to array and sort by mat number
    return Array.from(groupsMap.values()).sort((a, b) => {
      const matA = parseInt(a.matName.replace('Mat ', ''), 10) || 999;
      const matB = parseInt(b.matName.replace('Mat ', ''), 10) || 999;
      return matA - matB;
    });
  }, [event]);

  // Filter and search
  const filteredGroups = useMemo(() => {
    const searchTerms = searchTerm.toLowerCase().split(',').map(t => t.trim()).filter(t => t.length > 0);
    
    return matGroups
      .filter(group => selectedMatFilter === 'all' || group.matName === selectedMatFilter)
      .map(group => {
      let filteredDivisions = group.divisions;
      
      // Apply status filter
      if (statusFilter === 'finished') {
        filteredDivisions = filteredDivisions.filter(d => d.status === 'Finished');
      } else if (statusFilter === 'in_progress') {
        filteredDivisions = filteredDivisions.filter(d => d.status === 'In Progress');
      } else if (statusFilter === 'pending') {
         filteredDivisions = filteredDivisions.filter(d => d.status === 'Not Generated' || d.status === 'Pending' as any); // Handle potential status variance
      }
      
      // Apply search
      if (searchTerms.length > 0) {
        filteredDivisions = filteredDivisions.filter(d => {
          const searchableText = `${d.division.name} ${d.matName} ${d.status}`.toLowerCase();
          return searchTerms.some(term => searchableText.includes(term));
        });
      }
      
      // Sort divisions
      filteredDivisions = [...filteredDivisions].sort((a, b) => {
        let comparison = 0;
        switch (sortKey) {
          case 'category':
            comparison = a.division.name.localeCompare(b.division.name);
            break;
          case 'athletes':
            comparison = a.athleteCount - b.athleteCount;
            break;
          case 'remaining':
            comparison = a.remainingFights - b.remainingFights;
            break;
          case 'status':
            comparison = a.status.localeCompare(b.status);
            break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
      });
      
      // Recalculate totals for filtered divisions
      const remainingFights = filteredDivisions.reduce((sum, d) => sum + d.remainingFights, 0);
      const estimatedTime = filteredDivisions.reduce((sum, d) => sum + d.remainingFights * d.fightDuration, 0);
      
      return {
        ...group,
        divisions: filteredDivisions,
        remainingFights,
        estimatedRemainingTime: estimatedTime,
      };
    }).filter(g => g.divisions.length > 0);
  }, [matGroups, searchTerm, statusFilter, sortKey, sortDirection, selectedMatFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const finished = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'Finished').length, 0);
    const inProgress = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'In Progress').length, 0);
    const pending = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'Not Generated').length, 0); 
    const ready = matGroups.reduce((sum, g) => sum + g.divisions.filter(d => d.status === 'Ready').length, 0); 
    const total = finished + inProgress + pending + ready;
    return { total, finished, inProgress, pending, ready };
  }, [matGroups]);

  const toggleMat = (matName: string) => {
    const newExpanded = new Set(expandedMats);
    if (newExpanded.has(matName)) {
      newExpanded.delete(matName);
    } else {
      newExpanded.add(matName);
    }
    updateExpandedMats(newExpanded);
  };

  const expandAll = () => {
    updateExpandedMats(new Set(filteredGroups.map(g => g.matName)));
  };

  const collapseAll = () => {
    updateExpandedMats(new Set());
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  return {
    filteredGroups,
    matGroups,
    totals,
    availableMats: matGroups.map(g => g.matName),
    filterState: {
      searchTerm,
      setSearchTerm,
      statusFilter,
      updateStatusFilter,
      selectedMatFilter,
      setSelectedMatFilter: updateSelectedMatFilter,
      sortKey,
      sortDirection,
      handleSort,
      expandedMats,
      toggleMat,
      expandAll,
      collapseAll,
      expandedDivisions,
      toggleDivisionExpansion
    }
  };
};
