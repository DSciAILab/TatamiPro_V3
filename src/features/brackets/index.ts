/**
 * Brackets Feature Module
 * 
 * This module handles all bracket-related functionality:
 * - Bracket generation (single elimination, double elimination for 3 athletes)
 * - Bracket splitting (Group A, B, C for large divisions)
 * - Bracket display and management
 * 
 * @module features/brackets
 */

// Utils - Bracket Generation
export { generateBracketForDivision } from './utils/bracket-generator';

// Utils - Bracket Helpers
export { 
  hasBracketForDivision,
  getBracketsForDivision,
  getBracketDisplayName,
  isBracketFinished,
  isBracketInProgress,
  getBracketStatus,
  countBracketAthletes,
  countRemainingFights,
  countTotalFights,
  type BracketInfo,
  type BracketStatus,
} from './utils/bracket-utils';

// Hooks (to be extracted from BracketsTab.tsx)
// export { useBracketGeneration } from './hooks/use-bracket-generation';
// export { useBracketFilters } from './hooks/use-bracket-filters';

// Components (to be extracted from BracketsTab.tsx)
// export { BracketsList } from './components/BracketsList';
// export { BracketGenerator } from './components/BracketGenerator';
// export { BracketFilters } from './components/BracketFilters';
// export { SingleAthleteChampions } from './components/SingleAthleteChampions';
