"use client";

import { useMemo, useCallback } from 'react';
import { Event, Division, Bracket, Athlete } from '@/types/index';
import { generateBracketForDivision } from '../utils/bracket-generator';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { showSuccess, showError } from '@/utils/toast';
import { getAthletesForDivision } from '@/utils/athlete-utils';

export interface UseBracketGenerationOptions {
  event: Event;
  onUpdateBrackets: (
    brackets: Record<string, Bracket>, 
    matFightOrder: Record<string, string[]>, 
    shouldSave?: boolean
  ) => void;
}

export interface UseBracketGenerationReturn {
  /** All divisions that can have brackets generated (2+ athletes) */
  availableDivisions: Division[];
  /** Divisions with exactly 1 athlete (for WO champion declaration) */
  singleAthleteDivisions: Array<{
    division: Division;
    athletes: Athlete[];
    hasExistingBracket: boolean;
  }>;
  /** Execute bracket generation for selected divisions */
  /** Execute bracket generation for selected divisions */
  generateBrackets: (divisions: Division[], options?: { specificBracketId?: string }) => void;
  /** Declare champion by WO for single-athlete division */
  declareSingleAthleteChampion: (divisionId: string, athleteId: string) => void;
  /** Check if division has ongoing fights */
  hasOngoingFights: (divisionId: string) => boolean;
  /** Check if division is finished */
  isDivisionFinished: (divisionId: string) => boolean;
  /** Division status counts */
  divisionStatusCounts: {
    total: number;
    finished: number;
    active: number;
    pending: number;
  };
}

/**
 * Hook for bracket generation logic.
 * Extracted from BracketsTab.tsx for reusability.
 */
export const useBracketGeneration = ({
  event,
  onUpdateBrackets,
}: UseBracketGenerationOptions): UseBracketGenerationReturn => {
  
  // Helper to get athletes for division (with required filters)
  const getAthletes = useCallback((divisionId: string) => {
    return getAthletesForDivision(event.athletes || [], divisionId, {
      requireApproved: true,
      requireCheckedIn: true,
    });
  }, [event.athletes]);

  // Available divisions for bracket generation (2+ athletes)
  const availableDivisions = useMemo(() => {
    if (!event) return [];
    return (event.divisions || []).filter(div => {
      const athletesInDivision = getAthletes(div.id);
      return athletesInDivision.length >= 2;
    });
  }, [event, getAthletes]);

  // Divisions with exactly 1 athlete (for WO champion declaration)
  const singleAthleteDivisions = useMemo(() => {
    if (!event) return [];
    return (event.divisions || [])
      .map(div => ({
        division: div,
        athletes: getAthletes(div.id),
        hasExistingBracket: !!event.brackets?.[div.id]
      }))
      .filter(item => item.athletes.length === 1);
  }, [event, getAthletes]);

  // Check if division has ongoing fights
  const hasOngoingFights = useCallback((divisionId: string): boolean => {
    // Check regular bracket
    const bracket = event.brackets?.[divisionId];
    if (bracket && bracket.rounds?.flat().some(match => match.winner_id !== undefined)) {
      return true;
    }
    // Check split variants (divisionId-A, divisionId-B, etc.)
    const splitBrackets = Object.entries(event.brackets || {})
      .filter(([key]) => key.startsWith(`${divisionId}-`))
      .map(([, b]) => b);
    return splitBrackets.some(b => b.rounds?.flat().some(match => match.winner_id !== undefined));
  }, [event.brackets]);

  // Check if division is finished
  const isDivisionFinished = useCallback((divisionId: string): boolean => {
    // Check regular bracket
    const bracket = event.brackets?.[divisionId];
    if (bracket?.winner_id !== undefined) return true;
    // Check split variants - all must be finished
    const splitBrackets = Object.entries(event.brackets || {})
      .filter(([key]) => key.startsWith(`${divisionId}-`))
      .map(([, b]) => b);
    if (splitBrackets.length === 0) return false;
    return splitBrackets.every(b => b.winner_id !== undefined);
  }, [event.brackets]);

  // Division status counts
  const divisionStatusCounts = useMemo(() => {
    const divisionsWithBrackets = (event.divisions || []).filter(div => event.brackets?.[div.id]);
    const finished = divisionsWithBrackets.filter(div => isDivisionFinished(div.id)).length;
    const active = divisionsWithBrackets.filter(div => hasOngoingFights(div.id) && !isDivisionFinished(div.id)).length;
    const pending = divisionsWithBrackets.length - finished - active;
    return {
      total: divisionsWithBrackets.length,
      finished,
      active,
      pending,
    };
  }, [event.brackets, event.divisions, isDivisionFinished, hasOngoingFights]);

  // Shuffle array helper
  const shuffleArray = <T,>(array: T[]): T[] => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  };

  // Execute bracket generation
  const generateBrackets = useCallback((divisionsToGenerate: Division[], options?: { specificBracketId?: string }) => {
    if (!event) {
      showError("Event not loaded.");
      return;
    }
    
    const newBrackets: Record<string, Bracket> = {};
    const includeThirdPlaceFromEvent = event.include_third_place || false;
    
    try {
      // Start with existing brackets
      let cleanedBrackets = { ...event.brackets };
      
      // GRANULAR REGENERATION LOGIC
      if (options?.specificBracketId) {
         const targetId = options.specificBracketId;
         const existingBracket = event.brackets?.[targetId];
         
         if (!existingBracket) {
             throw new Error(`Bracket ${targetId} not found for regeneration.`);
         }

         // Verify if the divisions list matches the bracket's division
         const targetDiv = divisionsToGenerate.find(d => d.id === existingBracket.division_id);
         if (!targetDiv) {
             // This presumably shouldn't happen if UI logic is correct
             console.warn("Target division for specific bracket not in passed list.");
         }

         const division = targetDiv || event.divisions?.find(d => d.id === existingBracket.division_id);
         if (!division) throw new Error("Division not found");

         // Extract ONLY valid athletes from this specific bracket (exclude BYEs/Placeholders)
         // We must use the original participants list to preserve the exact group if possible,
         // but if we want to RE-SHUFFLE just this group, we extract them.
         // Note: stored participants include BYEs. Filter them out.
         const groupAthletes = existingBracket.participants.filter(p => p && p !== 'BYE') as Athlete[];
         
         if (groupAthletes.length < 2) {
             throw new Error("Cannot regenerate a bracket with fewer than 2 athletes.");
         }

         // Remove ONLY this bracket from cleanedBrackets
         delete cleanedBrackets[targetId];

         // Regenerate this specific bracket
         const bracket = generateBracketForDivision(division, event.athletes || [], { 
            thirdPlace: includeThirdPlaceFromEvent,
            explicitAthletes: groupAthletes, // FORCE these athletes
            enableTeamSeparation: event.enable_team_separation
         });

         // Preserve ID and Group Name
         bracket.id = targetId;
         bracket.group_name = existingBracket.group_name;
         
         newBrackets[targetId] = bracket;

      } else {
          // STANDARD FULL REGENERATION LOGIC (Per Division)
          divisionsToGenerate.forEach(div => {
            // Remove all brackets for this division (parent + splits)
            delete cleanedBrackets[div.id];
            Object.keys(cleanedBrackets).forEach(key => {
              if (key.startsWith(`${div.id}-`)) {
                delete cleanedBrackets[key];
              }
            });
          });

          divisionsToGenerate.forEach(div => {
            const athletes = getAthletes(div.id);
            const maxPerBracket = event.max_athletes_per_bracket;
            const splittingEnabled = event.is_bracket_splitting_enabled; // Keep reading from event prop for standard regen

            if (splittingEnabled && maxPerBracket && maxPerBracket > 1 && athletes.length > maxPerBracket) {
              // Splitting logic
              const shuffledAthletes = shuffleArray(athletes);
              const groups: Athlete[][] = [];
              
              for (let i = 0; i < shuffledAthletes.length; i += maxPerBracket) {
                groups.push(shuffledAthletes.slice(i, i + maxPerBracket));
              }

              // If last group has only 1 athlete, merge with previous group
              if (groups.length > 1 && groups[groups.length - 1].length === 1) {
                const lastAthlete = groups.pop()![0];
                groups[groups.length - 1].push(lastAthlete);
              }

              const groupLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
              
              groups.forEach((groupAthletes, index) => {
                const groupSuffix = groupLetters[index] || `${index + 1}`;
                const bracketId = `${div.id}-${groupSuffix}`;
                
                const bracket = generateBracketForDivision(div, event.athletes || [], { 
                  thirdPlace: includeThirdPlaceFromEvent, 
                  explicitAthletes: groupAthletes,
                  enableTeamSeparation: event.enable_team_separation
                });

                bracket.id = bracketId;
                bracket.group_name = `Group ${groupSuffix}`;
                newBrackets[bracketId] = bracket;
              });

            } else {
              // Standard generation
              const bracket = generateBracketForDivision(div, event.athletes || [], { 
                thirdPlace: includeThirdPlaceFromEvent,
                enableTeamSeparation: event.enable_team_separation
              });
              newBrackets[div.id] = bracket;
            }
          });
      }
      
      // Merge cleaned brackets with new brackets
      const mergedBrackets = { ...cleanedBrackets, ...newBrackets };
      
      // Regenerate Fight Order (Global)
      // Note: This updates mat assignments for EVERYONE. 
      // Ideally we should preserve assignments for untouched brackets, but generateMatFightOrder
      // recalculates everything based on current brackets. As long as assignments are stable it's fine.
      // But wait, generateMatFightOrder *assigns* mats if missing?
      // Actually it uses existing assignments if passed. We pass event... event.mat_assignments?
      // We pass `...event`. so it uses event.mat_assignments.
      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      onUpdateBrackets(finalBrackets, newMatFightOrder, true);
      
      if (options?.specificBracketId) {
          showSuccess(`Bracket ${options.specificBracketId} regenerated successfully!`);
      } else {
          showSuccess(`${divisionsToGenerate.length} division(s) regenerated successfully!`);
      }
      
    } catch (error: any) {
      console.error("Error generating brackets:", error);
      showError("Error generating brackets: " + error.message);
    }
  }, [event, getAthletes, onUpdateBrackets]);

  // Declare champion by WO for single-athlete divisions
  const declareSingleAthleteChampion = useCallback((divisionId: string, athleteId: string) => {
    const division = event.divisions?.find(d => d.id === divisionId);
    if (!division) return;

    const woChampionBracket: Bracket = {
      id: divisionId,
      division_id: divisionId,
      rounds: [],
      bracket_size: 1,
      participants: [event.athletes?.find(a => a.id === athleteId)!],
      winner_id: athleteId,
      runner_up_id: undefined,
      third_place_winner_id: undefined,
    };

    const mergedBrackets = { ...event.brackets, [divisionId]: woChampionBracket };
    
    onUpdateBrackets(mergedBrackets, event.mat_fight_order || {}, true);
    showSuccess(`Champion declared by WO for ${division.name}!`);
  }, [event, onUpdateBrackets]);

  return {
    availableDivisions,
    singleAthleteDivisions,
    generateBrackets,
    declareSingleAthleteChampion,
    hasOngoingFights,
    isDivisionFinished,
    divisionStatusCounts,
  };
};
