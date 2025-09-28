"use client";

import React, { useMemo } from 'react';
import { Event, Bracket, Match } from '@/types/index';
import { UserRound } from 'lucide-react';
import { Link } from 'react-router-dom'; // Importar Link
import { cn } from '@/lib/utils'; // Importar cn

interface FightListProps {
  event: Event;
  selectedMat: string | 'all-mats'; // NOVO: Mat selecionado pode ser 'all-mats'
  selectedCategoryKey: string; // e.g., "Masculino/Adult/Preta"
  selectedDivisionId: string; // ID da divisão
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
}

// Helper function for round names (reused from FightDetail and BracketView)
const getRoundName = (roundIndex: number, totalRounds: number): string => {
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-final';
    case 3: return 'Quartas de Final';
    case 4: return 'Oitavas de Final';
    default: return `Rodada ${roundIndex + 1}`;
  }
};

const FightList: React.FC<FightListProps> = ({ event, selectedMat, selectedDivisionId }) => {
  const { athletes, brackets, mat_fight_order } = event;

  const allMatchesMap = useMemo(() => {
    const map = new Map<string, Match>();
    if (brackets) {
      Object.values(brackets).forEach(bracket => {
        bracket.rounds.flat().forEach(match => map.set(match.id, match));
        if (bracket.third_place_match) {
          map.set(bracket.third_place_match.id, bracket.third_place_match);
        }
      });
    }
    return map;
  }, [brackets]);

  const athletesMap = useMemo(() => {
    return new Map(athletes.map(athlete => [athlete.id, athlete]));
  }, [athletes]);

  const getFighterPhoto = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE' || !fighterId) {
      return (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    const fighter = athletesMap.get(fighterId);
    return fighter?.photo_url ? (
      <img src={fighter.photo_url} alt={fighter.first_name} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  const fightsForSelectedMatAndCategory = useMemo(() => {
    if (!mat_fight_order || !brackets) return [];

    const fights: Match[] = [];

    if (selectedMat === 'all-mats') {
      // Coletar lutas de todas as áreas para a divisão selecionada
      Object.values(mat_fight_order).forEach((matMatchesIds: any) => {
        matMatchesIds.forEach((matchId: string) => {
          const match = allMatchesMap.get(matchId);
          if (match && match._division_id === selectedDivisionId && !(match.fighter1_id === 'BYE' && match.fighter2_id === 'BYE')) {
            fights.push(match);
          }
        });
      });
    } else if (selectedMat) {
      // Coletar lutas apenas para o mat selecionado
      const matMatchesIds = mat_fight_order[selectedMat] || [];
      matMatchesIds.forEach((matchId: string) => {
        const match = allMatchesMap.get(matchId);
        if (match && match._division_id === selectedDivisionId && !(match.fighter1_id === 'BYE' && match.fighter2_id === 'BYE')) {
          fights.push(match);
        }
      });
    }
    
    // Ordenar as lutas: primeiro por mat (se 'all-mats'), depois por round, depois por mat_fight_number
    return fights.sort((a, b) => {
      if (selectedMat === 'all-mats') {
        // Ordenar por nome do mat primeiro
        const matNameA = a._mat_name || '';
        const matNameB = b._mat_name || '';
        if (matNameA !== matNameB) {
          return matNameA.localeCompare(matNameB);
        }
      }
      // Depois por round e mat_fight_number
      if (a.round !== b.round) return a.round - b.round;
      return (a.mat_fight_number || 0) - (b.mat_fight_number || 0);
    });
  }, [mat_fight_order, selectedMat, selectedDivisionId, allMatchesMap, brackets]);

  // NOVO: Agrupar lutas por rodada
  const groupedFightsByRound = useMemo(() => {
    const groups: Record<number, Match[]> = {};
    fightsForSelectedMatAndCategory.forEach(fight => {
      if (!groups[fight.round]) {
        groups[fight.round] = [];
      }
      groups[fight.round].push(fight);
    });

    // Ordenar as rodadas pelo número da rodada (crescente)
    return Object.entries(groups)
      .sort(([roundNumA], [roundNumB]) => Number(roundNumA) - Number(roundNumB))
      .map(([roundNum, matches]) => ({
        roundNumber: Number(roundNum),
        matches: matches.sort((a, b) => (a.mat_fight_number || 0) - (b.mat_fight_number || 0)), // Ordenar lutas dentro da rodada pelo mat_fight_number
      }));
  }, [fightsForSelectedMatAndCategory]);

  const currentBracket = brackets?.[selectedDivisionId];
  const totalRoundsInBracket = currentBracket?.rounds.length || 0;


  if (fightsForSelectedMatAndCategory.length === 0) {
    return <p className="text-muted-foreground">Nenhuma luta encontrada para esta categoria no {selectedMat === 'all-mats' ? 'todas as áreas' : selectedMat}.</p>;
  }

  const renderMatchCard = (match: Match) => {
    const isByeFight = (match.fighter1_id === 'BYE' || match.fighter2_id === 'BYE');
    const isPendingFight = (!match.fighter1_id || !match.fighter2_id);
    const isFightRecordable = !isByeFight && !isPendingFight;

    const fighter1 = match.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1_id || '');
    const fighter2 = match.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2_id || '');

    const fighter1Display = fighter1 === 'BYE' ? 'BYE' : (fighter1 ? `${fighter1.first_name} ${fighter1.last_name}` : 'Aguardando');
    const fighter2Display = fighter2 === 'BYE' ? 'BYE' : (fighter2 ? `${fighter2.first_name} ${fighter2.last_name}` : 'Aguardando');

    const fighter1Club = fighter1 !== 'BYE' && fighter1 ? fighter1.club : '';
    const fighter2Club = fighter2 !== 'BYE' && fighter2 ? fighter2.club : '';

    const resultTime = "XX:XX"; // Placeholder for now, as no match start/end time is stored.

    const matNumberDisplay = match._mat_name ? match._mat_name.replace('Mat ', '') : 'N/A'; // Usar _mat_name
    const fightNumberDisplay = `${matNumberDisplay}-${match.mat_fight_number}`;

    const cardContent = (
      <div className="relative flex p-4">
        {/* Left: Fight Number and Time */}
        <div className="flex-shrink-0 w-16 text-center absolute top-4 left-4">
          <span className="text-2xl font-extrabold text-primary">{fightNumberDisplay}</span>
          <p className="text-xs text-muted-foreground mt-1">{resultTime}</p>
        </div>

        {/* Middle: Fighter Details */}
        <div className="flex-grow ml-24 space-y-2"> {/* Adjusted ml to make space for fight number */}
          <div className={cn(
            "flex items-center p-1 rounded-md",
            match.winner_id === match.fighter1_id ? 'bg-green-100 dark:bg-green-900' :
            (match.winner_id && match.winner_id !== match.fighter1_id) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(match.fighter1_id)}
            <div className="ml-2">
              <p className="text-base flex items-center">
                {fighter1Display}
              </p>
              {fighter1Club && <p className="text-xs text-muted-foreground">{fighter1Club}</p>}
            </div>
          </div>
          <div className={cn(
            "flex items-center p-1 rounded-md",
            match.winner_id === match.fighter2_id ? 'bg-green-100 dark:bg-green-900' :
            (match.winner_id && match.winner_id !== match.fighter2_id) ? 'bg-red-100 dark:bg-red-950' : ''
          )}>
            {getFighterPhoto(match.fighter2_id)}
            <div className="ml-2">
              <p className="text-base flex items-center">
                {fighter2Display}
              </p>
              {fighter2Club && <p className="text-xs text-muted-foreground">{fighter2Club}</p>}
            </div>
          </div>
        </div>
      </div>
    );

    const cardClasses = cn(
      "block border-2 rounded-md transition-colors",
      match.winner_id ? 'border-green-500' : 'border-gray-200 dark:border-gray-700',
      isFightRecordable ? 'hover:border-primary' : 'opacity-70 cursor-not-allowed'
    );

    if (isFightRecordable) {
      return (
        <Link
          key={match.id}
          to={`/events/${event.id}/fights/${selectedDivisionId}/${match.id}`}
          className={cardClasses}
        >
          {cardContent}
        </Link>
      );
    } else {
      return (
        <div key={match.id} className={cardClasses}>
          {cardContent}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {groupedFightsByRound.map(({ roundNumber, matches }) => (
        <div key={roundNumber} className="space-y-4">
          <h3 className="text-xl font-semibold mt-6 mb-2">
            {getRoundName(roundNumber - 1, totalRoundsInBracket)} {/* roundNumber é 1-indexed, getRoundName espera 0-indexed */}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map(match => renderMatchCard(match))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default FightList;