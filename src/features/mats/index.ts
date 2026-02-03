/**
 * Mats Feature Module
 * 
 * This module handles mat management and dashboard:
 * - Grouping divisions by mat
 * - Showing fight statistics and time estimates
 * - Filtering and searching mats
 * 
 * @module features/mats
 */

export { MatControlCenter, type MatControlCenterProps } from './components/MatControlCenter';
export { useMatData } from './hooks/use-mat-data';
export type { DivisionInfo, MatGroup, AthleteStatusInBracket } from './utils/mat-utils';
export { formatTime, getAthleteStatusInBracket } from './utils/mat-utils';
