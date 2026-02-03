/**
 * Fights Feature Module
 * 
 * This module handles fight-related functionality:
 * - Fight details and result recording
 * - Fight navigation within brackets
 * - Fight status checks
 * 
 * @module features/fights
 */

// Utils - Fight Helpers
export {
  getRoundName,
  getFighterDisplayName,
  isByeFight,
  isPendingFight,
  isCompletedFight,
  isRecordableFight,
  findNextIncompleteFight,
  isBracketComplete,
  getFightNumberDisplay,
  findMatchInBracket,
  getAllMatchesFromBracket,
  countRemainingFightsInBracket,
  countCompletedFightsInBracket,
  FIGHT_RESULT_TYPES,
} from './utils/fight-utils';

// Hooks (to be extracted from FightDetail.tsx)
// export { useFightResult } from './hooks/use-fight-result';
// export { useFightNavigation } from './hooks/use-fight-navigation';

// Components (to be extracted from FightDetail.tsx)
// export { FighterCard } from './components/FighterCard';
// export { ResultSelector } from './components/ResultSelector';
// export { FightDialogs } from './components/FightDialogs';
