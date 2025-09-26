"use client";

import React, { useMemo, useState } from 'react';
import { Event, Bracket, Match, Athlete, FightResultType } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserRound, CheckCircle, XCircle, Trophy } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { Link } from 'react-router-dom'; // Importar Link
import { cn } from '@/lib/utils'; // Importar cn

interface FightListProps {
  event: Event;
  selectedMat: string; // NOVO: Mat selecionado
  selectedCategoryKey: string; // e.g., "Masculino/Adult/Preta"
  selectedDivisionId: string; // ID da divisão
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
}

const FightList: React.FC<FightListProps> = ({ event, selectedMat, selectedCategoryKey, selectedDivisionId, onUpdateBracket }) => {
  const { athletes, brackets, matFightOrder } = event;

  const allMatchesMap = useMemo(() => {
    const map = new Map<string, Match>();
    if (brackets) {
      Object.values(brackets).forEach(bracket => {
        bracket.rounds.flat().forEach(match => map.set(match.id, match));
        if (bracket.thirdPlaceMatch) {
          map.set(bracket.thirdPlaceMatch.id, bracket.thirdPlaceMatch);
        }
      });
    }
    return map;
  }, [brackets]);

  const athletesMap = useMemo(() => {
    return new Map(athletes.map(athlete => [athlete.id, athlete]));
  }, [athletes]);

  const getFighterDisplay = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE') return 'BYE';
    if (!fighterId) return 'Aguardando';
    const fighter = athletesMap.get(fighterId);
    return fighter ? `${fighter.firstName} ${fighter.lastName}` : 'Atleta Desconhecido';
  };

  const getFighterPhoto = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE' || !fighterId) {
      return (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
      );
    }
    const fighter = athletesMap.get(fighterId);
    return fighter?.photoUrl ? (
      <img src={fighter.photoUrl} alt={fighter.firstName} className="w-8 h-8 rounded-full object-cover" />
    ) : (
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <UserRound className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  };

  const getFighterStatusIndicator = (fighterId: string | 'BYE' | undefined) => {
    if (fighterId === 'BYE' || !fighterId) return null;
    const fighter = athletesMap.get(fighterId);
    if (fighter && fighter.attendanceStatus === 'present') {
      return <span className="h-2 w-2 rounded-full bg-green-500 ml-1 inline-block" title="Presente"></span>;
    }
    return null;
  };

  const fightsForSelectedMatAndCategory = useMemo(() => {
    if (!matFightOrder || !selectedMat || !brackets) return [];

    const matMatchesIds = matFightOrder[selectedMat] || [];
    const fights: Match[] = [];

    matMatchesIds.forEach(matchId => {
      const match = allMatchesMap.get(matchId);
      // Filter by selected division AND hide BYE vs BYE fights
      if (match && match._divisionId === selectedDivisionId && !(match.fighter1Id === 'BYE' && match.fighter2Id === 'BYE')) {
        fights.push(match);
      }
    });
    return fights;
  }, [matFightOrder, selectedMat, selectedDivisionId, allMatchesMap, brackets]);


  if (fightsForSelectedMatAndCategory.length === 0) {
    return <p className="text-muted-foreground">Nenhuma luta encontrada para esta categoria no {selectedMat}.</p>;
  }

  const renderMatchCard = (match: Match) => {
    const isByeFight = (match.fighter1Id === 'BYE' || match.fighter2Id === 'BYE');
    const isPendingFight = (!match.fighter1Id || !match.fighter2Id);
    const isFightRecordable = !isByeFight && !isPendingFight;

    const fighter1 = match.fighter1Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter1Id || '');
    const fighter2 = match.fighter2Id === 'BYE' ? 'BYE' : athletesMap.get(match.fighter2Id || '');

    const fighter1Display = fighter1 === 'BYE' ? 'BYE' : (fighter1 ? `${fighter1.firstName} ${fighter1.lastName}` : 'Aguardando');
    const fighter2Display = fighter2 === 'BYE' ? 'BYE' : (fighter2 ? `${fighter2.firstName} ${fighter2.lastName}` : 'Aguardando');

    const fighter1Club = fighter1 !== 'BYE' && fighter1 ? fighter1.club : '';
    const fighter2Club = fighter2 !== 'BYE' && fighter2 ? fighter2.club : '';

    const resultText = match.result?.details || (match.winnerId && match.result?.type ? match.result.type : '');
    const resultTime = "XX:XX"; // Placeholder for now, as no match start/end time is stored.

    const matNumber = selectedMat.replace('Mat ', '');

    const cardContent = (
      <div className="flex items-center p-4">
        {/* Left: Fight Number */}
        <div className="flex-shrink-0 w-16 text-center">
          <span className="text-4xl font-extrabold text-primary">{matNumber}-{match.matFightNumber}</span> {/* NOVO: Número sequencial */}
        </div>

        {/* Middle: Fighter Details */}
        <div className="flex-grow ml-4 space-y-2">
          <div className={`flex items-center ${match.winnerId === match.fighter1Id ? 'font-semibold' : ''}`}>
            {getFighterPhoto(match.fighter1Id)}
            <div className="ml-2">
              <p className="text-base flex items-center">
                {fighter1Display}
                {getFighterStatusIndicator(match.fighter1Id)}
              </p>
              {fighter1Club && <p className="text-xs text-muted-foreground">{fighter1Club}</p>}
            </div>
          </div>
          <div className={`flex items-center ${match.winnerId === match.fighter2Id ? 'font-semibold' : ''}`}>
            {getFighterPhoto(match.fighter2Id)}
            <div className="ml-2">
              <p className="text-base flex items-center">
                {fighter2Display}
                {getFighterStatusIndicator(match.fighter2Id)}
              </p>
              {fighter2Club && <p className="text-xs text-muted-foreground">{fighter2Club}</p>}
            </div>
          </div>
        </div>

        {/* Right: Result/Time */}
        <div className="flex-shrink-0 ml-4 text-right">
          {match.winnerId && match.winnerId !== 'BYE' ? (
            <>
              <p className="text-lg font-bold text-green-600">{resultText}</p>
              <p className="text-sm text-muted-foreground">{resultTime}</p>
            </>
          ) : isByeFight ? (
            <p className="text-sm text-blue-500">BYE</p>
          ) : (
            <p className="text-sm text-muted-foreground">{resultTime}</p>
          )}
        </div>
      </div>
    );

    const cardClasses = cn(
      "block border-2 rounded-md transition-colors",
      match.winnerId ? 'border-green-500' : 'border-gray-200 dark:border-gray-700',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {fightsForSelectedMatAndCategory.map(match => renderMatchCard(match))}
      </div>
    </div>
  );
};

export default FightList;