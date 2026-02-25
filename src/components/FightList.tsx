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
  if (totalRounds === 0) return `Round ${roundIndex + 1}`;
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semifinal';
    case 3: return 'Quarterfinal';
    case 4: return 'Round of 16';
    default: return `Round ${roundIndex + 1}`;
  }
};

const FightList: React.FC<FightListProps> = ({ event, selectedMat, selectedDivisionId, bracketId, fightViewMode, baseFightPath, isPublic = false, source, showAllMatFights = false, groupBy = 'order' }) => {
  const { athletes, brackets, mat_fight_order } = event;
  const navigate = useNavigate();
  const [warningState, setWarningState] = React.useState<{ isOpen: boolean; url: string; athleteNames: string[] } | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'pending' | 'finished'>('all');

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
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border border-border/50 shadow-sm">
            <UserRound className="h-6 w-6 text-muted-foreground/50" />
          </div>
        );
      }
      const fighter = athletesMap.get(fighterId);
      return fighter?.photo_url ? (
        <img src={fighter.photo_url} alt={fighter.first_name} className="w-12 h-12 rounded-full object-cover border border-border/50 shadow-sm" />
      ) : (
        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center border border-border/50 shadow-sm">
          <UserRound className="h-6 w-6 text-muted-foreground/50" />
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

    const fighter1Display = fighter1 === 'BYE' ? 'BYE' : (fighter1 ? `${fighter1.first_name} ${fighter1.last_name}` : 'Pending');
    const fighter2Display = fighter2 === 'BYE' ? 'BYE' : (fighter2 ? `${fighter2.first_name} ${fighter2.last_name}` : 'Pending');

    const fighter1Club = fighter1 !== 'BYE' && fighter1 ? fighter1.club : '';
    const fighter2Club = fighter2 !== 'BYE' && fighter2 ? fighter2.club : '';

    const p1Status = match.fighter1_id && match.fighter1_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter1_id) : null;
    const p2Status = match.fighter2_id && match.fighter2_id !== 'BYE' ? athleteAttendanceStatus.get(match.fighter2_id) : null;
    const isMatchOnHold = p1Status === 'on_hold' || p2Status === 'on_hold';

    const resultTime = "XX:XX";

    const matNumberDisplay = match._mat_name ? match._mat_name.replace('Mat ', '') : 'N/A';
    const fightNumberDisplay = match.mat_fight_number !== undefined 
      ? `${matNumberDisplay}-${match.mat_fight_number}` 
      : `${matNumberDisplay}-M${match.match_number || '?'}`;
    
    // REDO render to accommodate header nicely
    
    const divisionId = match._division_id;
    const matchDivision = event.divisions?.find(d => d.id === divisionId);
    const matchBracket = event.brackets?.[divisionId || ''];
    let headerInfo = null;

    if (showAllMatFights && matchDivision) {
        const totalRounds = matchBracket?.rounds.length || 0;
        const roundName = getRoundName((match.round || 1) - 1, totalRounds); 
        
        headerInfo = (
             <div className="px-6 pt-5 pb-3 text-sm font-sans font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border/30 bg-muted/10">
                 <span className="text-foreground">{matchDivision.name}</span> <span className="mx-2 text-primary/40">•</span> {roundName}
             </div>
        );
    }

    const hasWinner = !!match.winner_id;
    const isFighter1Winner = hasWinner && match.winner_id === match.fighter1_id;
    const isFighter2Winner = hasWinner && match.winner_id === match.fighter2_id;

    const innerContent = (
      <div className="relative flex p-6 bg-transparent">
        {isMatchOnHold && (
            <div className="absolute top-6 right-6 z-10">
                <Badge variant="outline" className="bg-warning/10 text-warning-foreground border-warning/30 rounded-full font-medium text-xs flex items-center gap-1 shadow-sm px-3 py-1">
                    <Clock className="w-3 h-3" />
                    On Hold
                </Badge>
            </div>
        )}
        <div className="flex-shrink-0 w-24 text-center absolute top-10 left-6 border-r border-border/50 pr-4">
          <span className="text-3xl font-sans font-bold tracking-tighter text-primary/80">{fightNumberDisplay}</span>
          <p className="text-xs font-semibold text-muted-foreground/70 mt-2 bg-muted/30 p-1.5 rounded-md uppercase">{resultTime}</p>
        </div>
        <div className="flex-grow ml-32 space-y-4">
          <div className={cn(
            "flex items-center p-3 rounded-2xl border-2 relative overflow-hidden transition-all",
            isFighter1Winner ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.2)] z-10 scale-[1.02]' :
            (hasWinner && !isFighter1Winner) ? 'bg-card/30 border-border/20 opacity-60 grayscale-[0.5]' : 'bg-card/50 border-border/30',
            p1Status === 'on_hold' && "bg-warning/5 border-warning/30"
          )}>
            <div className={cn("absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl", isFighter1Winner ? "bg-success" : "bg-destructive opacity-80")} />
            <div className="ml-5 flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-4">
                {getFighterPhoto(match.fighter1_id)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xl font-sans font-bold tracking-tight", isFighter1Winner ? "text-foreground" : "text-foreground")}>{fighter1Display}</p>
                     {p1Status === 'on_hold' && <Clock className="w-4 h-4 text-warning opacity-70" />}
                  </div>
                  {fighter1Club && <p className="text-sm font-medium text-muted-foreground">{fighter1Club}</p>}
                </div>
              </div>
              {isFighter1Winner && (
                <div className="pr-4">
                  <Badge className="bg-success text-success-foreground font-bold uppercase tracking-wider px-3 py-1">Winner</Badge>
                </div>
              )}
            </div>
          </div>
          <div className={cn(
            "flex items-center p-3 rounded-2xl border-2 relative overflow-hidden transition-all",
            isFighter2Winner ? 'bg-success/10 border-success shadow-[0_0_15px_rgba(34,197,94,0.2)] z-10 scale-[1.02]' :
            (hasWinner && !isFighter2Winner) ? 'bg-card/30 border-border/20 opacity-60 grayscale-[0.5]' : 'bg-card/50 border-border/30',
             p2Status === 'on_hold' && "bg-warning/5 border-warning/30"
          )}>
             <div className={cn("absolute left-0 top-0 bottom-0 w-2 rounded-l-2xl", isFighter2Winner ? "bg-success" : "bg-blue-600 opacity-80")} />
            <div className="ml-5 flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-4">
                {getFighterPhoto(match.fighter2_id)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className={cn("text-xl font-sans font-bold tracking-tight", isFighter2Winner ? "text-foreground" : "text-foreground")}>{fighter2Display}</p>
                    {p2Status === 'on_hold' && <Clock className="w-4 h-4 text-warning opacity-70" />}
                  </div>
                  {fighter2Club && <p className="text-sm font-medium text-muted-foreground">{fighter2Club}</p>}
                </div>
              </div>
              {isFighter2Winner && (
                <div className="pr-4">
                  <Badge className="bg-success text-success-foreground font-bold uppercase tracking-wider px-3 py-1">Winner</Badge>
                </div>
              )}
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
      "block border rounded-3xl transition-all shadow-sm bg-card hover:shadow-md mb-4 overflow-hidden",
      match.winner_id ? 'border-success/40' : 'border-border/30',
      isFightRecordable && !isPublic ? 'hover:border-primary/50 cursor-pointer' : 'cursor-default'
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

  const { totalFights, pendingFightsCount, finishedFightsCount } = useMemo(() => {
    let total = 0;
    let pending = 0;
    let finished = 0;
    
    groupedFights.forEach(group => {
       group.matches.forEach(match => {
          total++;
          if (match.winner_id) finished++;
          else pending++;
       });
    });

    return { totalFights: total, pendingFightsCount: pending, finishedFightsCount: finished };
  }, [groupedFights]);

  const filteredGroupedFights = useMemo(() => {
    return groupedFights.map(group => {
      return {
        ...group,
        matches: group.matches.filter(match => {
          if (filterStatus === 'all') return true;
          if (filterStatus === 'finished') return !!match.winner_id;
          if (filterStatus === 'pending') return !match.winner_id;
          return true;
        })
      };
    }).filter(group => group.matches.length > 0);
  }, [groupedFights, filterStatus]);

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-4 -mx-2 px-2 scrollbar-hide">
          <Badge 
             className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
               filterStatus === 'all' 
                 ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' 
                 : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
             }`}
            onClick={() => setFilterStatus('all')}
          >
            Todas as Lutas
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-background text-muted-foreground'}`}>
               {totalFights}
            </span>
          </Badge>
          <Badge 
             className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
               filterStatus === 'pending' 
                 ? 'bg-pending text-pending-foreground hover:bg-pending/90 shadow-sm' 
                 : 'bg-pending/10 text-pending hover:bg-pending/20'
             }`}
            onClick={() => setFilterStatus('pending')}
          >
            Pendentes
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === 'pending' ? 'bg-black/20 text-pending-foreground' : 'bg-pending/20 text-pending'}`}>
               {pendingFightsCount}
            </span>
          </Badge>
          <Badge 
             className={`cursor-pointer px-4 py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2 ${
               filterStatus === 'finished' 
                 ? 'bg-success text-success-foreground hover:bg-success/90 shadow-sm' 
                 : 'bg-success/10 text-success hover:bg-success/20'
             }`}
            onClick={() => setFilterStatus('finished')}
          >
            Encerradas
             <span className={`px-1.5 py-0.5 rounded-full text-xs ${filterStatus === 'finished' ? 'bg-black/20 text-success-foreground' : 'bg-success/20 text-success'}`}>
               {finishedFightsCount}
            </span>
          </Badge>
        </div>

      {filteredGroupedFights.length === 0 ? (
          <p className="text-muted-foreground mt-8 text-center bg-card p-8 rounded-2xl border border-border/50">Nenhuma luta encontrada para este filtro.</p>
      ) : (
          filteredGroupedFights.map(({ title, matches }) => (
            <div key={title} className="space-y-6">
              <h3 className="text-3xl font-sans font-bold text-foreground mt-8 mb-6 border-b border-border/50 pb-2 inline-block tracking-tight">
                {title}
              </h3>
              <div className={cn("grid gap-6", gridClasses[fightViewMode])}>
                {matches.map(match => renderMatchCard(match))}
              </div>
            </div>
          ))
      )}

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