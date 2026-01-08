"use client";

import React from 'react';
import { Match, Athlete } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { UserRound, Trophy, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTranslations } from '@/hooks/use-translations';

interface BracketMatchCardProps {
  match: Match;
  athletesMap: Map<string, Athlete>;
  isFinal?: boolean;
  bracketWinnerId?: string;
  bracketRunnerUpId?: string;
  bracketThirdPlaceWinnerId?: string;
  eventId: string;
  divisionId: string;
  isPublic?: boolean;
  basePath?: string;
}

const getShortMatchIdentifier = (fullMatchId: string): string => {
  const mMatch = fullMatchId.match(/-M(\d+)$/);
  if (mMatch && mMatch[1]) {
    return mMatch[1];
  }
  return fullMatchId;
};

const BracketMatchCard: React.FC<BracketMatchCardProps> = ({
  match,
  athletesMap,
  isFinal,
  bracketWinnerId,
  bracketRunnerUpId,
  bracketThirdPlaceWinnerId,
  eventId,
  divisionId,
  isPublic = false,
  basePath,
}) => {
  const { t } = useTranslations();
  const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
  const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

  const getFighterDisplay = (fighter: Athlete | 'BYE' | undefined, fighterSlot: 1 | 2) => {
    const nameLine1 = (fighter !== 'BYE' && fighter) ? fighter.first_name : '';
    const nameLine2 = (fighter !== 'BYE' && fighter) ? fighter.last_name : '';
    const clubLine = (fighter !== 'BYE' && fighter) ? fighter.club : '';

    let statusText = '';
    if (!fighter) {
      const prevMatchId = fighterSlot === 1 ? match.prev_match_ids?.[0] : match.prev_match_ids?.[1];
      statusText = `${t('waitingFor')} ${prevMatchId ? getShortMatchIdentifier(prevMatchId) : t('previousFight')}`;
    } else if (fighter === 'BYE') {
      statusText = 'BYE';
    }

    return (
      <div className="flex flex-col items-start min-h-[56px] justify-center">
        {statusText ? (
          <span className="font-medium text-sm text-muted-foreground">{statusText}</span>
        ) : (
          <>
            <span className="font-medium text-sm flex items-center">
              {nameLine1} {nameLine2}
              {match.winner_id === (fighter as Athlete)?.id && <CheckCircle className="ml-1 h-3 w-3 text-green-500" />}
            </span>
            <span className="text-xs text-muted-foreground">{clubLine}</span>
          </>
        )}
      </div>
    );
  };

  const getFighterPhoto = (fighter: Athlete | 'BYE' | undefined) => {
    if (fighter === 'BYE' || !fighter) {
      return (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-3 w-3 text-muted-foreground" />
        </div>
      );
    }
    return fighter.photo_url ? (
      <img src={fighter.photo_url} alt={fighter.first_name} className="w-6 h-6 rounded-full object-cover" />
    ) : (
      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-3 w-3 text-muted-foreground" />
      </div>
    );
  };

  const getRankingIndicator = (fighterId: string | undefined) => {
    if (fighterId === bracketWinnerId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-yellow-500 text-white">1</span>;
    if (fighterId === bracketRunnerUpId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-gray-400 text-white">2</span>;
    if (fighterId === bracketThirdPlaceWinnerId) return <span className="ml-2 px-2 py-1 text-xs font-bold rounded bg-orange-500 text-white">3</span>;
    return null;
  };

  const matchNumberDisplay = match.mat_fight_number ? `${match._mat_name?.replace('Mat ', '') || ''}-${match.mat_fight_number}` : `${getShortMatchIdentifier(match.id)}`;

  const cardContent = (
    <Card className={cn("w-full min-w-[300px] max-w-[375px] border-2 bg-card text-foreground transition-colors", !isPublic && "hover:border-primary")}>
      <CardContent className="p-2 text-sm">
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold text-xs text-muted-foreground">{matchNumberDisplay}</span>
          {isFinal && match.winner_id && <Trophy className="h-4 w-4 text-yellow-500" />}
        </div>
        <div className="space-y-1">
          <div className={cn(
            "flex items-center space-x-2 p-1 rounded-md",
            match.winner_id === (fighter1 !== 'BYE' ? fighter1?.id : undefined) ? 'bg-green-100 dark:bg-green-900' :
            (match.winner_id && match.winner_id !== 'BYE' && match.winner_id !== (fighter1 !== 'BYE' ? fighter1?.id : undefined)) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(fighter1)}
            <div className="flex-1 flex items-center justify-between">
              {getFighterDisplay(fighter1, 1)}
              {isFinal && getRankingIndicator(fighter1 !== 'BYE' ? fighter1?.id : undefined)}
            </div>
          </div>
          <div className={cn(
            "flex items-center space-x-2 p-1 rounded-md",
            match.winner_id === (fighter2 !== 'BYE' ? fighter2?.id : undefined) ? 'bg-green-100 dark:bg-green-900' :
            (match.winner_id && match.winner_id !== 'BYE' && match.winner_id !== (fighter2 !== 'BYE' ? fighter2?.id : undefined)) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(fighter2)}
            <div className="flex-1 flex items-center justify-between">
              {getFighterDisplay(fighter2, 2)}
              {isFinal && getRankingIndicator(fighter2 !== 'BYE' ? fighter2?.id : undefined)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (isPublic) {
    return <div className="block cursor-default">{cardContent}</div>;
  }

  const linkPath = basePath 
    ? `${basePath}/${divisionId}/${match.id}`
    : `/events/${eventId}/fights/${divisionId}/${match.id}`;

  return (
    <Link to={linkPath} className="block">
      {cardContent}
    </Link>
  );
};

export default BracketMatchCard;