"use client";

import { Match, Bracket, Athlete } from '@/types/index';

/**
 * Get the display name for a round in a bracket
 * 
 * @param roundIndex - 0-indexed round number
 * @param totalRounds - Total number of rounds in the bracket
 * @param isThirdPlaceMatch - Whether this is the third place match
 * @returns Human-readable round name
 */
export const getRoundName = (
  roundIndex: number, 
  totalRounds: number, 
  isThirdPlaceMatch: boolean = false
): string => {
  if (isThirdPlaceMatch) return 'Luta pelo 3º Lugar';
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-final';
    case 3: return 'Quartas de Final';
    case 4: return 'Oitavas de Final';
    default: return `Rodada ${roundIndex + 1}`;
  }
};

/**
 * Get the display string for a fighter
 */
export const getFighterDisplayName = (fighter: Athlete | 'BYE' | undefined): string => {
  if (fighter === 'BYE') return 'BYE';
  if (!fighter) return 'Aguardando';
  return `${fighter.first_name} ${fighter.last_name} (${fighter.club})`;
};

/**
 * Check if a fight is a BYE fight
 */
export const isByeFight = (match: Match): boolean => {
  return match.fighter1_id === 'BYE' || match.fighter2_id === 'BYE';
};

/**
 * Check if a fight is pending (missing one or both fighters)
 */
export const isPendingFight = (match: Match): boolean => {
  return !match.fighter1_id || !match.fighter2_id;
};

/**
 * Check if a fight is completed (has a winner)
 */
export const isCompletedFight = (match: Match): boolean => {
  return !!match.winner_id;
};

/**
 * Check if a fight can have a result recorded
 */
export const isRecordableFight = (match: Match): boolean => {
  return !isByeFight(match) && !isPendingFight(match);
};

/**
 * Find the next incomplete fight in a bracket
 * 
 * @param bracket - The bracket to search
 * @param currentMatchId - Current match to exclude
 * @returns Next incomplete match or undefined
 */
export const findNextIncompleteFight = (
  bracket: Bracket,
  currentMatchId?: string
): Match | undefined => {
  // Collect all matches
  const allMatches = bracket.rounds.flat();
  if (bracket.third_place_match) {
    allMatches.push(bracket.third_place_match);
  }
  
  // Find incomplete matches with both fighters present
  const incompleteMatches = allMatches.filter(m => 
    !m.winner_id && 
    m.id !== currentMatchId &&
    m.fighter1_id && m.fighter1_id !== 'BYE' &&
    m.fighter2_id && m.fighter2_id !== 'BYE'
  );
  
  return incompleteMatches[0];
};

/**
 * Check if a bracket is complete (all matches have results)
 */
export const isBracketComplete = (bracket: Bracket): boolean => {
  const allMatches = bracket.rounds.flat();
  if (bracket.third_place_match) {
    allMatches.push(bracket.third_place_match);
  }
  
  const hasRemainingFights = allMatches.some(m => 
    !m.winner_id && 
    m.fighter1_id && m.fighter1_id !== 'BYE' &&
    m.fighter2_id && m.fighter2_id !== 'BYE'
  );
  
  return !hasRemainingFights && !!bracket.winner_id;
};

/**
 * Get fight number display string (e.g., "1-5" for Mat 1, Fight 5)
 */
export const getFightNumberDisplay = (match: Match): string => {
  const matNumber = match._mat_name?.replace('Mat ', '') || 'N/A';
  return `${matNumber}-${match.mat_fight_number}`;
};

/**
 * Find a match in a bracket by ID
 */
export const findMatchInBracket = (
  bracket: Bracket,
  matchId: string
): Match | undefined => {
  // Check regular rounds
  for (const round of bracket.rounds) {
    const match = round.find(m => m.id === matchId);
    if (match) return match;
  }
  
  // Check third place match
  if (bracket.third_place_match?.id === matchId) {
    return bracket.third_place_match;
  }
  
  return undefined;
};

/**
 * Get all matches from a bracket as a flat array
 */
export const getAllMatchesFromBracket = (bracket: Bracket): Match[] => {
  const allMatches = bracket.rounds.flat();
  if (bracket.third_place_match) {
    allMatches.push(bracket.third_place_match);
  }
  return allMatches;
};

/**
 * Count remaining fights in a bracket
 */
export const countRemainingFightsInBracket = (bracket: Bracket): number => {
  const allMatches = getAllMatchesFromBracket(bracket);
  return allMatches.filter(m => 
    !m.winner_id && 
    m.fighter1_id && m.fighter1_id !== 'BYE' &&
    m.fighter2_id && m.fighter2_id !== 'BYE'
  ).length;
};

/**
 * Count completed fights in a bracket
 */
export const countCompletedFightsInBracket = (bracket: Bracket): number => {
  const allMatches = getAllMatchesFromBracket(bracket);
  return allMatches.filter(m => !!m.winner_id).length;
};

/**
 * Fight result types with labels
 */
export const FIGHT_RESULT_TYPES = [
  { value: 'submission' as const, label: 'Finalização' },
  { value: 'points' as const, label: 'Pontos' },
  { value: 'decision' as const, label: 'Decisão' },
  { value: 'disqualification' as const, label: 'Desclassificação' },
  { value: 'walkover' as const, label: 'W.O.' },
] as const;
