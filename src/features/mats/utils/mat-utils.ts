import { Division, Bracket, Match, Athlete, Event } from '@/types/index';

export interface DivisionInfo {
  division: Division;
  matName: string;
  athleteCount: number;
  totalFights: number;
  remainingFights: number;
  status: 'Not Generated' | 'In Progress' | 'Finished';
  fightDuration: number; // in minutes
  _bracketId?: string;
}

export interface MatGroup {
  matName: string;
  divisions: DivisionInfo[];
  totalFights: number;
  remainingFights: number;
  estimatedRemainingTime: number; // in minutes
}

export interface AthleteStatusInBracket {
  placing: '1st' | '2nd' | '3rd' | 'eliminated' | 'active';
  eliminatedInFight?: number;
  eliminatedByName?: string;
}

export const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
};

export const getAthleteStatusInBracket = (athleteId: string, bracket: Bracket, event: Event): AthleteStatusInBracket => {
  // Check if winner
  if (bracket.winner_id === athleteId) {
    return { placing: '1st' };
  }
  // Check if runner-up
  if (bracket.runner_up_id === athleteId) {
    return { placing: '2nd' };
  }
  // Check if third place
  if (bracket.third_place_winner_id === athleteId) {
    return { placing: '3rd' };
  }
  
  // Check if eliminated - find the match where they lost
  const allMatches: Match[] = [];
  if (bracket.rounds) {
    bracket.rounds.forEach(round => allMatches.push(...round));
  }
  
  if (bracket.third_place_match) {
    allMatches.push(bracket.third_place_match);
  }

  // Handle 3-person bracket specific logic where loser of M2 is 3rd place
  if (bracket.bracket_size === 3 && bracket.rounds?.length >= 2) {
      const match2 = bracket.rounds[1]?.[0];
      if (match2 && match2.loser_id === athleteId && match2.winner_id) {
          return { placing: '3rd' };
      }
  }
  
  for (const match of allMatches) {
    if (match.loser_id === athleteId && match.winner_id) {
      const winnerAthlete = event.athletes?.find(a => a.id === match.winner_id);
      return {
        placing: 'eliminated',
        eliminatedInFight: match.mat_fight_number,
        eliminatedByName: winnerAthlete ? `${winnerAthlete.first_name} ${winnerAthlete.last_name}` : undefined
      };
    }
  }
  
  return { placing: 'active' };
};
