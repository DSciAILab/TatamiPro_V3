"use client";

import React, { useMemo } from 'react';
import { Event, Bracket, Match } from '@/types/index';
import { UserRound, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import BracketView from './BracketView';
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FightListProps {
  event: Event;
  selectedMat: string | 'all-mats';
  selectedCategoryKey: string;
  selectedDivisionId: string;
  bracketId?: string; // Optional specific bracket ID
  onUpdateBracket: (divisionId: string, updatedBracket: Bracket) => void;
  fightViewMode: 'grid3' | 'grid2' | 'grid1' | 'bracket' | 'list';
  /** Custom base path for fight navigation (for staff pages) */
  baseFightPath?: string;
  isPublic?: boolean;
  source?: 'brackets' | 'mat-control' | 'division-fight-order';
  showAllMatFights?: boolean;
  groupBy?: 'stage' | 'division' | 'order';
}

const getRoundName = (roundIndex: number, totalRounds: number): string => {
  if (totalRounds === 0) return `Rodada ${roundIndex + 1}`;
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-final';
    case 3: return 'Quartas de Final';
    case 4: return 'Oitavas de Final';
    default: return `Rodada ${roundIndex + 1}`;
  }
};

const FightList: React.FC<FightListProps> = ({ event, selectedMat, selectedDivisionId, bracketId, fightViewMode, baseFightPath, isPublic = false, source, showAllMatFights = false, groupBy = 'order' }) => {
  const { athletes, brackets, mat_fight_order } = event;
  const navigate = useNavigate();
  const [warningState, setWarningState] = React.useState<{ isOpen: boolean; url: string; athleteNames: string[] } | null>(null);

  // Build map of athlete ID -> Attendance Status
  const athleteAttendanceStatus = useMemo(() => {
    const map = new Map<string, string>();
    if (brackets) {
       Object.values(brackets).forEach(b => {
           if (b.attendance) {
               Object.entries(b.attendance).forEach(([id, record]) => {
                   map.set(id, record.status);
               });
           }
       });
    }
    return map;
  }, [brackets]);
  
  // Build fight URL based on baseFightPath or default
  const buildFightUrl = (divisionId: string, matchId: string) => {
    if (baseFightPath) {
      return `${baseFightPath}/${divisionId}/${matchId}`;
    }
    return `/events/${event.id}/fights/${divisionId}/${matchId}`;
  };

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
    return new Map((athletes || []).map(athlete => [athlete.id, athlete]));
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
    // 1. Try to get fights from explicit order first
    let fights: Match[] = [];

    // Valid Match IDs for specific bracket (if provided)
    const validMatchIds = new Set<string>();
    if (bracketId && brackets?.[bracketId]) {
         brackets[bracketId].rounds.flat().forEach(m => validMatchIds.add(m.id));
         if (brackets[bracketId].third_place_match) validMatchIds.add(brackets[bracketId].third_place_match.id);
    }

    if (mat_fight_order && Object.keys(mat_fight_order).length > 0) {
      if (selectedMat === 'all-mats') {
        Object.values(mat_fight_order).forEach((matMatchesIds: any) => {
          if (Array.isArray(matMatchesIds)) {
            matMatchesIds.forEach((matchId: string) => {
              const match = allMatchesMap.get(matchId);
              if (match && !(match.fighter1_id === 'BYE' && match.fighter2_id === 'BYE')) {
                 const isMatchInDivision = match._division_id === selectedDivisionId;
                 const isMatchInBracket = validMatchIds.size > 0 ? validMatchIds.has(match.id) : isMatchInDivision;

                 if (showAllMatFights || isMatchInBracket) {
                     fights.push(match);
                 }
              }
            });
          }
        });
      } else if (selectedMat) {
        const matMatchesIds = mat_fight_order[selectedMat] || [];
        if (Array.isArray(matMatchesIds)) {
          matMatchesIds.forEach((matchId: string) => {
            const match = allMatchesMap.get(matchId);
            if (match && !(match.fighter1_id === 'BYE' && match.fighter2_id === 'BYE')) {
               const isMatchInDivision = match._division_id === selectedDivisionId;
               const isMatchInBracket = validMatchIds.size > 0 ? validMatchIds.has(match.id) : isMatchInDivision;

               if (showAllMatFights || isMatchInBracket) {
                   fights.push(match);
               }
            }
          });
        }
      }
    }

    // 2. FALLBACK: If map-based approach yielded NO fights, try getting from bracket directly
    // Only use fallback if we are NOT in showAllMatFights mode (because fallback is division-specific)
    if (fights.length === 0 && !showAllMatFights) {
      // Use bracketId if present, otherwise divisionId
      const targetBracketId = bracketId || selectedDivisionId;
      const currentBracket = brackets?.[targetBracketId];
      
      if (currentBracket) {
         if (currentBracket.rounds) {
             currentBracket.rounds.flat().forEach(m => {
                 if (!(m.fighter1_id === 'BYE' && m.fighter2_id === 'BYE')) {
                    fights.push(m);
                 }
             });
         }
         if (currentBracket.third_place_match) {
             fights.push(currentBracket.third_place_match);
         }
      }
      
      // Explicitly sort for bracket view: Early rounds first
      return fights.sort((a, b) => {
         if (a.round !== b.round) return a.round - b.round;
         return (a.match_number || 0) - (b.match_number || 0);
      });
    }
    
    // Deduplicate fights by ID
    const uniqueFights = Array.from(new Map(fights.map(f => [f.id, f])).values());

    // Sort logic for standard view (Mat Order)
    return uniqueFights.sort((a, b) => {
      if (selectedMat === 'all-mats') {
        const matNameA = a._mat_name || '';
        const matNameB = b._mat_name || '';
        if (matNameA !== matNameB) {
          return matNameA.localeCompare(matNameB);
        }
      }
      
      if (a.mat_fight_number !== undefined && b.mat_fight_number !== undefined && a.mat_fight_number !== b.mat_fight_number) {
          return a.mat_fight_number - b.mat_fight_number;
      }
      
      if (a.round !== b.round) return a.round - b.round;
      return (a.match_number || 0) - (b.match_number || 0);
    });
  }, [mat_fight_order, selectedMat, selectedDivisionId, bracketId, allMatchesMap, brackets, showAllMatFights]);

  const groupedFights = useMemo(() => {
    // If 'order' selected (or default for showAll), we can still wrap in a single group or just return listed
    if (groupBy === 'order') {
        const title = showAllMatFights ? `Schedule Order` : 'Fight Order';
        return [{
            title,
            matches: fightsForSelectedMatAndCategory
        }];
    }

    const groups: Record<string, Match[]> = {};
    const groupTitles: Record<string, string> = {}; 

    fightsForSelectedMatAndCategory.forEach(fight => {
      let groupKey = '';
      
      if (groupBy === 'division') {
          groupKey = fight._division_id || 'Unknown';
          if (!groupTitles[groupKey]) {
             const div = event.divisions?.find(d => d.id === groupKey);
             groupTitles[groupKey] = div ? div.name : 'Unknown Division';
          }
      } else if (groupBy === 'stage') {
          // Robust stage naming
          const divId = fight._division_id;
          const bracket = event.brackets?.[divId || ''];
          const totalRounds = bracket?.rounds.length || 0;
          // Use a key that sorts correctly? roundIndex. 
          // But purely by name grouping might split same stage if total rounds differ?
          // E.g. "Final" is always Final. "Semi-final" always Semi.
          const rName = getRoundName((fight.round || 1) - 1, totalRounds);
          groupKey = rName;
          groupTitles[groupKey] = rName;
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(fight);
    });

    return Object.entries(groups).map(([key, matches]) => {
        return {
            title: groupTitles[key] || key,
            matches: matches.sort((a, b) => (a.mat_fight_number || 0) - (b.mat_fight_number || 0))
        };
    }).sort((a, b) => {
        if (groupBy === 'stage') {
             // Heuristic sort for stages: "Octavas" < "Quartas" < "Semi" < "Final" ?
             // Or just use the first match's round index if consistent?
             // Actually, alphabetical might be bad.
             // Let's try to map back to a sort heuristic.
             // Simplest: use round number of first match? 
             // But "Final" (round 3) > "Semi" (round 2). We want Order of occurrence usually.
             // Existing logic sorted by roundIndex ascending.
             const roundA = a.matches[0]?.round || 0;
             const roundB = b.matches[0]?.round || 0;
             return roundA - roundB;
        }
        return a.title.localeCompare(b.title);
    });

  }, [fightsForSelectedMatAndCategory, groupBy, event.divisions, event.brackets, showAllMatFights]);

  const targetBracketId = bracketId || selectedDivisionId;
  const currentBracket = brackets?.[targetBracketId];
  const totalRoundsInBracket = currentBracket?.rounds.length || 0;
  const division = event.divisions?.find(d => d.id === selectedDivisionId);

  if (fightViewMode === 'bracket') {
    if (currentBracket && division) {
      return (
        <BracketView
          bracket={currentBracket}
          allAthletes={athletes || []}
          division={division}
          eventId={event.id}
          isPublic={isPublic}
        />
      );
    }
    return <p className="text-muted-foreground">Bracket não disponível para esta visão.</p>;
  }

  if (fightsForSelectedMatAndCategory.length === 0) {
    return <p className="text-muted-foreground">No fights found for this category in {selectedMat === 'all-mats' ? 'all areas' : selectedMat}.</p>;
  }

  const gridClasses: Record<string, string> = {
    grid3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    grid2: 'grid-cols-1 md:grid-cols-2',
    grid1: 'grid-cols-1',
    list: 'grid-cols-1',
    bracket: 'grid-cols-1', // Should not be reached but safekeeping
  };

  const handleMatchClick = (match: Match, url: string) => {
      const p1Status = match.fighter1_id && match.fighter1_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter1_id) : null;
      const p2Status = match.fighter2_id && match.fighter2_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter2_id) : null;
      
      const onHoldNames: string[] = [];
      if (p1Status === 'on_hold') {
          const f1 = athletesMap.get(match.fighter1_id!);
          if (f1) onHoldNames.push(`${f1.first_name} ${f1.last_name}`);
      }
      if (p2Status === 'on_hold') {
          const f2 = athletesMap.get(match.fighter2_id!);
          if (f2) onHoldNames.push(`${f2.first_name} ${f2.last_name}`);
      }

      if (onHoldNames.length > 0) {
          setWarningState({ isOpen: true, url, athleteNames: onHoldNames });
      } else {
          // Pass the source to location state like the Link did
          navigate(url, { state: { source } });
      }
  };

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

    const p1Status = match.fighter1_id && match.fighter1_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter1_id) : null;
    const p2Status = match.fighter2_id && match.fighter2_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter2_id) : null;
    const isMatchOnHold = p1Status === 'on_hold' || p2Status === 'on_hold';

    const resultTime = "XX:XX";

    const matNumberDisplay = match._mat_name ? match._mat_name.replace('Mat ', '') : 'N/A';
    const fightNumberDisplay = `${matNumberDisplay}-${match.mat_fight_number}`;
    
    // REDO render to accommodate header nicely
    
    const divisionId = match._division_id;
    const matchDivision = event.divisions?.find(d => d.id === divisionId);
    const matchBracket = event.brackets?.[divisionId || ''];
    let headerInfo = null;

    if (showAllMatFights && matchDivision) {
        const totalRounds = matchBracket?.rounds.length || 0;
        const roundName = getRoundName((match.round || 1) - 1, totalRounds); 
        
        headerInfo = (
             <div className="px-4 pt-2 text-xs text-muted-foreground mb-1">
                 <span className="font-semibold text-muted-foreground/80">{matchDivision.name}</span> <span className="mx-1">|</span> {roundName}
             </div>
        );
    }

    const innerContent = (
      <div className="relative flex p-4 pt-2">
        {isMatchOnHold && (
            <div className="absolute top-4 right-4 z-10">
                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200 flex items-center gap-1 shadow-sm">
                    <Clock className="w-3 h-3" />
                    On Hold
                </Badge>
            </div>
        )}
        <div className="flex-shrink-0 w-16 text-center absolute top-4 left-4">
          <span className="text-2xl font-extrabold text-primary">{fightNumberDisplay}</span>
          <p className="text-xs text-muted-foreground mt-1">{resultTime}</p>
        </div>
        <div className="flex-grow ml-24 space-y-2">
          <div className={cn(
            "flex items-center p-1 rounded-md relative overflow-hidden",
            match.winner_id === match.fighter1_id ? 'bg-success/20' :
            (match.winner_id && match.winner_id !== match.fighter1_id) ? 'bg-destructive/20' : '',
            p1Status === 'on_hold' && "bg-orange-50 border border-orange-200"
          )}>
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600" />
            {getFighterPhoto(match.fighter1_id)}
            <div className="ml-2">
              <div className="flex items-center gap-2">
                <p className="text-base flex items-center">{fighter1Display}</p>
                 {p1Status === 'on_hold' && <Clock className="w-3 h-3 text-orange-500" />}
              </div>
              {fighter1Club && <p className="text-xs text-muted-foreground">{fighter1Club}</p>}
            </div>
          </div>
          <div className={cn(
            "flex items-center p-1 rounded-md relative overflow-hidden",
            match.winner_id === match.fighter2_id ? 'bg-success/20' :
            (match.winner_id && match.winner_id !== match.fighter2_id) ? 'bg-destructive/20' : '',
             p2Status === 'on_hold' && "bg-orange-50 border border-orange-200"
          )}>
             <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
            {getFighterPhoto(match.fighter2_id)}
            <div className="ml-2">
              <div className="flex items-center gap-2">
                <p className="text-base flex items-center">{fighter2Display}</p>
                {p2Status === 'on_hold' && <Clock className="w-3 h-3 text-orange-500" />}
              </div>
              {fighter2Club && <p className="text-xs text-muted-foreground">{fighter2Club}</p>}
            </div>
          </div>
        </div>
      </div>
    );

    const fullCardContent = (
        <div>
            {headerInfo}
            {innerContent}
        </div>
    );


    const cardClasses = cn(
      "block border-2 rounded-md transition-colors",
      match.winner_id ? 'border-success' : 'border-border',
      isFightRecordable && !isPublic ? 'hover:border-primary' : 'cursor-default'
    );

    if (isFightRecordable && !isPublic) {
      if (!match.id) {
          console.error('[FightList] Match ID is missing for match:', match);
          return (
            <div key={match.id || `unknown-${Math.random()}`} className={cardClasses}>
              {fullCardContent}
            </div>
          );
      }

      const url = buildFightUrl(selectedDivisionId, match.id);
      
      return (
        <div
          key={match.id}
          onClick={() => handleMatchClick(match, url)}
          className={cn(cardClasses, "cursor-pointer")}
        >
          {fullCardContent}
        </div>
      );
    } else {
      return (
        <div key={match.id} className={cardClasses}>
          {fullCardContent}
        </div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {groupedFights.map(({ title, matches }) => (
        <div key={title} className="space-y-4">
          <h3 className="text-xl font-semibold mt-6 mb-2">
            {title}
          </h3>
          <div className={cn("grid gap-4", gridClasses[fightViewMode])}>
            {matches.map(match => renderMatchCard(match))}
          </div>
        </div>
      ))}

      <AlertDialog open={!!warningState?.isOpen} onOpenChange={(open) => !open && setWarningState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Athlete On Hold</AlertDialogTitle>
            <AlertDialogDescription>
              The following athlete(s) are currently marked as <strong>On Hold</strong>:
              <ul className="list-disc pl-5 mt-2 mb-2">
                  {warningState?.athleteNames.map(name => <li key={name}>{name}</li>)}
              </ul>
              Do you want to proceed with starting this fight?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                if (warningState) {
                    navigate(warningState.url, { state: { source } });
                    setWarningState(null);
                }
            }} className="bg-orange-600 hover:bg-orange-700 text-white">
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FightList;