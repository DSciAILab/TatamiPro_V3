"use client";

import { Bracket, Event, Division } from '@/types/index';

/**
 * Check if a division has any bracket (including split variants like divisionId-A)
 * 
 * @param event - The event containing brackets
 * @param divisionId - The division ID to check
 * @returns true if the division has at least one bracket
 */
export const hasBracketForDivision = (event: Event, divisionId: string): boolean => {
  if (!event.brackets) return false;
  
  // Check exact match
  if (event.brackets[divisionId]) return true;
  
  // Check for split bracket variants (divisionId-A, divisionId-B, etc.)
  return Object.keys(event.brackets).some(key => 
    key.startsWith(`${divisionId}-`) && key.length === divisionId.length + 2
  );
};

/**
 * Get all brackets for a division (including split variants)
 * 
 * @param event - The event containing brackets
 * @param divisionId - The division ID to get brackets for
 * @returns Array of bracket info with bracketId, bracket data, and optional group name
 */
export interface BracketInfo {
  bracketId: string;
  bracket: Bracket;
  groupName?: string;
}

export const getBracketsForDivision = (
  event: Event, 
  divisionId: string
): BracketInfo[] => {
  if (!event.brackets) return [];
  
  const results: BracketInfo[] = [];
  
  // Check exact match
  if (event.brackets[divisionId]) {
    results.push({
      bracketId: divisionId,
      bracket: event.brackets[divisionId],
    });
  }
  
  // Check for split bracket variants (divisionId-A, divisionId-B, etc.)
  const groupLetterPattern = /^[A-Z]$/;
  Object.entries(event.brackets).forEach(([key, bracket]) => {
    if (key.startsWith(`${divisionId}-`)) {
      const suffix = key.slice(divisionId.length + 1);
      if (groupLetterPattern.test(suffix)) {
        results.push({
          bracketId: key,
          bracket,
          groupName: bracket.group_name || `Group ${suffix}`,
        });
      }
    }
  });
  
  // Sort by group name (A, B, C...)
  results.sort((a, b) => {
    if (!a.groupName && !b.groupName) return 0;
    if (!a.groupName) return -1;
    if (!b.groupName) return 1;
    return a.groupName.localeCompare(b.groupName);
  });
  
  return results;
};

/**
 * Get the display name for a bracket (with group suffix if split)
 * 
 * @param division - The division
 * @param groupName - Optional group name for split brackets
 * @returns The display name like "Division Name" or "Division Name - Group A"
 */
export const getBracketDisplayName = (
  division: Division,
  groupName?: string
): string => {
  if (groupName) {
    return `${division.name} - ${groupName}`;
  }
  return division.name;
};

/**
 * Determine if a bracket is finished (has a declared winner)
 */
export const isBracketFinished = (bracket: Bracket): boolean => {
  return !!bracket.winner_id;
};

/**
 * Determine if a bracket is in progress (has at least one completed match but no winner)
 */
export const isBracketInProgress = (bracket: Bracket): boolean => {
  if (bracket.winner_id) return false;
  return bracket.rounds?.flat().some(m => m.winner_id !== undefined) ?? false;
};

/**
 * Get the status of a bracket
 */
export type BracketStatus = 'not_generated' | 'generated' | 'in_progress' | 'finished';

export const getBracketStatus = (bracket: Bracket | undefined): BracketStatus => {
  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return 'not_generated';
  }
  if (isBracketFinished(bracket)) {
    return 'finished';
  }
  if (isBracketInProgress(bracket)) {
    return 'in_progress';
  }
  return 'generated';
};

/**
 * Count athletes in a bracket (excluding BYEs)
 */
export const countBracketAthletes = (bracket: Bracket): number => {
  if (!bracket.participants) return 0;
  return bracket.participants.filter(p => p !== 'BYE').length;
};

/**
 * Count remaining fights in a bracket
 */
export const countRemainingFights = (bracket: Bracket): number => {
  if (!bracket.rounds) return 0;
  
  let remaining = 0;
  bracket.rounds.flat().forEach(match => {
    // Skip BYE matches
    if (match.fighter1_id === 'BYE' || match.fighter2_id === 'BYE') return;
    // Count if no winner
    if (!match.winner_id) remaining++;
  });
  
  return remaining;
};

/**
 * Count total fights in a bracket (excluding BYE matches)
 */
export const countTotalFights = (bracket: Bracket): number => {
  if (!bracket.rounds) return 0;
  
  let total = 0;
  bracket.rounds.flat().forEach(match => {
    // Skip BYE matches
    if (match.fighter1_id === 'BYE' || match.fighter2_id === 'BYE') return;
    total++;
  });
  
  return total;
};
