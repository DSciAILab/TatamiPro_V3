"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Match, Athlete, Bracket, FightResultType, Event, Division } from '@/types/index';
import { UserRound, Trophy, ArrowLeft, ArrowRight, List, RotateCcw } from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { cn } from '@/lib/utils';
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
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { supabase } from '@/integrations/supabase/client';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import { useOffline } from '@/context/offline-context'; // Import offline context
import { db } from '@/lib/local-db'; // Import local DB
import { useUpdateMatchResult } from '@/features/events/hooks/use-event-mutations';
import { getRoundName, getFighterDisplayName, FIGHT_RESULT_TYPES, useFightResult, FighterCard, ResultSelector } from '@/features/fights';



const FightDetail: React.FC = () => {
  const { eventId, divisionId, matchId } = useParams<{ eventId: string; divisionId: string; matchId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  // const { isOfflineMode, trackChange } = useOffline(); // Use offline hook
  const isOfflineMode = false;
  const trackChange = async (table: string, action: 'create' | 'update' | 'delete', data: any) => {};
  
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentBracket, setCurrentBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);

  const [showRevertDialog, setShowRevertDialog] = useState(false);
  
  // Use extracted fight result logic
  const {
    selectedWinnerId, setSelectedWinnerId,
    selectedResultType, setSelectedResultType,
    resultDetails, setResultDetails,
    recordResult: handleRecordResult,
    revertResult,
    showDivisionCompleteDialog, setShowDivisionCompleteDialog,
    showRoundEndDialog, setShowRoundEndDialog
  } = useFightResult({
    event,
    eventId,
    divisionId,
    currentMatch,
    currentBracket,
    isOfflineMode,
    trackChange,
    onSuccess: async () => {
      await loadFightData();
    }
  });

  const [showPostFightOptions, setShowPostFightOptions] = useState(false);

  const handleRevertResult = async () => {
    await revertResult();
    setShowRevertDialog(false);
    setShowPostFightOptions(false);
  };

  // Update showPostFightOptions when currentMatch changes
  useEffect(() => {
    if (currentMatch) {
      setShowPostFightOptions(!!currentMatch.winner_id);
    }
  }, [currentMatch]);

  const loadFightData = useCallback(async () => {
    if (!eventId || !divisionId || !matchId) return;
    setLoading(true);
    try {
      let eventData: Event;
      let athletesData: Athlete[] = [];
      let divisionsData: Division[] = [];

      if (isOfflineMode) {
        // FETCH FROM LOCAL DB (OPTIMIZED)
        const eData = await db.events.get(eventId);
        if (!eData) throw new Error("Event not found locally. Please sync online first.");
        eventData = eData;

        // Extract match first to know which athletes to fetch
        const bracket = eData.brackets?.[divisionId];
        if (!bracket) throw new Error("Bracket não encontrado para esta divisão.");
        
        const match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
        if (!match) throw new Error("Luta não encontrada.");
        
        const fighterIds = [match.fighter1_id, match.fighter2_id].filter(id => id && id !== 'BYE') as string[];
        
        if (fighterIds.length > 0) {
          athletesData = await db.athletes.where('id').anyOf(fighterIds).toArray();
        }
        
        const dData = await db.divisions.get(divisionId);
        if (dData) divisionsData = [dData];
      } else {
        // FETCH FROM SUPABASE (OPTIMIZED)
        // 1. Fetch Event first to get brackets
        const { data: eData, error: eventError } = await supabase.from('sjjp_events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;
        eventData = eData;

        if (eventError) throw eventError;
        eventData = eData;

        let bracket = eventData.brackets?.[divisionId];
        
        // Handling for Split Brackets (Group A/B)
        // If direct lookup fails, try finding a bracket that *contains* this matchId
        if (!bracket && eventData.brackets) {
            const foundKey = Object.keys(eventData.brackets).find(key => {
                const b = eventData.brackets![key];
                const hasMatch = b.rounds.flat().some(m => m.id === matchId) || b.third_place_match?.id === matchId;
                return hasMatch;
            });
            
            if (foundKey) {
                bracket = eventData.brackets[foundKey];
            }
        }

        if (!bracket) throw new Error("Bracket não encontrado para esta divisão.");

        let match = bracket.rounds.flat().find(m => m.id === matchId) || (bracket.third_place_match?.id === matchId ? bracket.third_place_match : null);
        
        // Navigation State Fallback/Override logic
        // If we have match data in navigation state (from BracketView), use it if:
        // 1. Match not found in DB bracket
        // 2. DB match is missing fighters that are present in state match (sync lag)
        const stateMatch = location.state?.match as Match | undefined;
        if (stateMatch && stateMatch.id === matchId) {
           if (!match || 
               (!match.fighter1_id && stateMatch.fighter1_id) || 
               (!match.fighter2_id && stateMatch.fighter2_id)) {
               console.log('[FightDetail] Using match data from navigation state (sync lag compensation)');
               match = stateMatch;
           }
        }
        
        if (!match) throw new Error("Luta não encontrada.");

        // 2. Determine necessary fighter IDs
        const fighterIds = [match.fighter1_id, match.fighter2_id].filter(id => id && id !== 'BYE') as string[];

        // 3. Fetch ONLY involved athletes
        if (fighterIds.length > 0) {
          const { data: aData, error: athletesError } = await supabase.from('sjjp_athletes').select('*').in('id', fighterIds);
          if (athletesError) throw athletesError;
          athletesData = aData;
        }
        
        // 4. Fetch ONLY the relevant division (optional context)
        const { data: dData, error: divisionsError } = await supabase.from('sjjp_divisions').select('*').eq('id', divisionId);
        if (divisionsError) throw divisionsError;
        divisionsData = dData;
      }

      // No need to process ALL athletes against ALL divisions anymore.
      // We process only the fetched athletes.
      const processedAthletes = athletesData.map(a => processAthleteData(a, divisionsData));

      const fullEventData: Event = {
        ...eventData,
        athletes: processedAthletes, // Now contains only relevant athletes
        divisions: divisionsData,    // Now contains only relevant division
        check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time as unknown as string) : undefined,
        check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time as unknown as string) : undefined,
      };
      setEvent(fullEventData);

      const bracket = fullEventData.brackets?.[divisionId];
      if (bracket) {
        setCurrentBracket(bracket);
        console.log('[FightDetail] Searching for matchId:', matchId, 'in division:', divisionId);
        const allMatches = bracket.rounds.flat();
        if (bracket.third_place_match) allMatches.push(bracket.third_place_match);
        
        const match = allMatches.find(m => m.id === matchId);
        
        console.log('[FightDetail] Match found?', match ? 'Yes' : 'No', match?.id);
        
        if (match) {
          setCurrentMatch(match);
          setSelectedWinnerId(match.winner_id);
          setSelectedResultType(match.result?.type);
          setResultDetails(match.result?.details);
          setShowPostFightOptions(!!match.winner_id);
        } else {
            console.error('[FightDetail] Match NOT FOUND. Available IDs:', allMatches.map(m => m.id));
        }
      }
    } catch (error: any) {
      showError(error.message);
      navigate(`/events/${eventId}`);
    } finally {
      setLoading(false);
    }
  }, [eventId, divisionId, matchId, navigate, isOfflineMode]);

  useEffect(() => {
    loadFightData();
  }, [loadFightData]);

  // Realtime Subscription for Live Updates
  useEffect(() => {
    if (!eventId || isOfflineMode) return;
    
    console.log('[FightDetail] Subscribing to realtime updates...');
    const channel = supabase
      .channel(`fight-detail-${eventId}`)
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'sjjp_events', filter: `id=eq.${eventId}` }, 
        () => {
             console.log('[FightDetail] Event update detected, reloading data...');
             loadFightData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, isOfflineMode, loadFightData]);

  const athletesMap = useMemo(() => {
    return new Map<string, Athlete>(event?.athletes?.map(athlete => [athlete.id, athlete]) || []);
  }, [event?.athletes]);





  // Find next fight in the SAME DIVISION (not mat)
  const findNextFightInDivision = (): Match | undefined => {
    if (!currentBracket || !currentMatch) return undefined;
    
    // Collect all matches in the bracket
    const allMatches = currentBracket.rounds.flat();
    if (currentBracket.third_place_match) {
      allMatches.push(currentBracket.third_place_match);
    }
    
    // Find incomplete matches (no winner yet)
    const incompleteMatches = allMatches.filter(m => 
      !m.winner_id && 
      m.id !== currentMatch.id &&
      m.fighter1_id && m.fighter1_id !== 'BYE' &&
      m.fighter2_id && m.fighter2_id !== 'BYE'
    );
    
    return incompleteMatches[0];
  };

  const handleNextFightInDivision = () => {
    const nextFight = findNextFightInDivision();
    if (nextFight) {
      navigate(`/events/${eventId}/fights/${divisionId}/${nextFight.id}`);
    }
  };

  // Read source from navigation state to decide where "Back" button goes
  const navigationSource = (location.state as any)?.source;

  const handleGoBack = () => {
    // If we came from 'division-fight-order', go back to Division Details (Fight Order tab)
    if (navigationSource === 'division-fight-order') {
       navigate(`/events/${eventId}`, { 
        state: { 
          activeTab: 'brackets',
          bracketsSubTab: 'fight-overview', // IMPORTANT: Show division detail
          navSelectedDivisionId: divisionId,
          navDivisionDetailTab: 'fight_order' // Specific tab in DivisionDetail
        } 
      });
      return;
    }

    // If we came from 'division-bracket-view', go back to Division Details (Bracket tab)
    if (navigationSource === 'division-bracket-view') {
       navigate(`/events/${eventId}`, { 
        state: { 
          activeTab: 'brackets',
          bracketsSubTab: 'fight-overview', // IMPORTANT: Show division detail
          navSelectedDivisionId: divisionId,
          navDivisionDetailTab: 'bracket' // Specific tab in DivisionDetail
        } 
      });
      return;
    }

    // If we came specificallly from 'mat-control' (main list)
    if (navigationSource === 'mat-control') {
      navigate(`/events/${eventId}`, { 
        state: { 
          activeTab: 'brackets',
          bracketsSubTab: 'mat-control',
          // Try to preserve the selected match/division context if possible (optional improvement)
          navSelectedMat: currentMatch?._mat_name, // Optional: if MatControl supports this
          navSelectedDivisionId: divisionId
        } 
      });
      return;
    }

    // If we came from 'brackets', go back to general brackets tab
    if (navigationSource === 'brackets') {
       navigate(`/events/${eventId}`, { 
        state: { 
          activeTab: 'brackets',
          bracketsSubTab: 'generate-brackets', // Or whatever default brackets view
          navSelectedDivisionId: divisionId 
        } 
      });
      return;
    }


    // Default fallback (existing logic improved)
    navigate(`/events/${eventId}`, { state: { activeTab: 'brackets' } });
  };

  const handleAdvanceToNextRound = () => {
    setShowRoundEndDialog(false);
    const nextFight = findNextFightInDivision();
    if (nextFight) {
      navigate(`/events/${eventId}/fights/${divisionId}/${nextFight.id}`);
    } else {
      handleGoBack();
    }
  };

  if (loading || !event || !currentMatch || !currentBracket) {
    return <Layout><div className="text-center text-xl mt-8">Carregando detalhes da luta...</div></Layout>;
  }

  const fighter1Athlete = currentMatch.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter1_id || '');
  const fighter2Athlete = currentMatch.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter2_id || '');
  const isFightCompleted = !!currentMatch.winner_id;
  const isByeFight = (currentMatch.fighter1_id === 'BYE' || currentMatch.fighter2_id === 'BYE');
  const isPendingFight = (!currentMatch.fighter1_id || !currentMatch.fighter2_id);
  const isFightRecordable = !isByeFight && !isPendingFight;

  const mainCardBorderClass = isFightCompleted ? 'border-green-500' : isByeFight ? 'border-blue-500' : 'border-gray-300 dark:border-gray-700';
  const matNumber = currentMatch._mat_name?.replace('Mat ', '') || 'N/A';
  const fightNumberDisplay = `${matNumber}-${currentMatch.mat_fight_number}`;
  const currentRoundName = getRoundName(currentMatch.round - 1, currentBracket.rounds.length, currentMatch.round === -1);

  const getDivisionName = () => {
    // Try to find division in the loaded divisions list
    const division = event?.divisions?.find(d => d.id === divisionId);
    return division ? division.name : '';
  };

  return (
    <Layout>
      <div className={`theme-${event.theme || 'default'} min-h-screen bg-background text-foreground p-8`}>
        <div className="flex flex-col mb-8 pb-4">
          <div className="flex justify-between items-end">
             <div>
                 <h2 className="text-lg font-sans font-bold italic text-muted-foreground tracking-wide mb-2">{getDivisionName()}</h2>
                 <h1 className="text-4xl font-sans font-bold text-foreground tracking-tight"><span className="text-primary/70">{currentMatch._mat_name}</span> <span className="text-muted-foreground ml-2">Luta {fightNumberDisplay}</span></h1>
             </div>
           <Button onClick={handleGoBack} variant="outline" className="border border-border/50 font-medium rounded-full shadow-sm hover:bg-muted/30 transition-all">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
           </Button>
        </div>
      </div>

      <Card className={`mb-8 border rounded-3xl shadow-sm bg-card transition-all ${isFightCompleted ? 'border-success/50' : isByeFight ? 'border-primary/50' : 'border-border/50'}`}>
        <CardHeader className="border-b border-border/30 bg-transparent pb-6">
          <CardTitle className="text-3xl font-sans font-bold tracking-tight text-foreground">Detalhes da Luta <span className="text-muted-foreground font-medium text-lg ml-2">({currentRoundName})</span></CardTitle>
          <CardDescription className="text-base font-medium mt-2">Registre o resultado desta luta.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FighterCard
              fighter={fighter1Athlete}
              isSelected={selectedWinnerId === currentMatch.fighter1_id}
              isWinner={isFightCompleted && currentMatch.winner_id === currentMatch.fighter1_id}
              isLoser={isFightCompleted && currentMatch.winner_id !== currentMatch.fighter1_id && currentMatch.winner_id !== undefined}
              isRecordable={!!(isFightRecordable && !isFightCompleted)}
              onClick={() => setSelectedWinnerId(currentMatch.fighter1_id)}
              cornerColor="red"
            />
            <FighterCard
              fighter={fighter2Athlete}
              isSelected={selectedWinnerId === currentMatch.fighter2_id}
              isWinner={isFightCompleted && currentMatch.winner_id === currentMatch.fighter2_id}
              isLoser={isFightCompleted && currentMatch.winner_id !== currentMatch.fighter2_id && currentMatch.winner_id !== undefined}
              isRecordable={!!(isFightRecordable && !isFightCompleted)}
              onClick={() => setSelectedWinnerId(currentMatch.fighter2_id)}
              cornerColor="blue"
            />
          </div>

          {isByeFight ? (
            <div className="text-center mt-4">
               <p className="text-muted-foreground text-lg mb-4">Esta luta envolve um BYE. O atleta deve avançar automaticamente.</p>
               {!isFightCompleted && (
                  <Button onClick={() => {
                   const winner = currentMatch.fighter1_id === 'BYE' ? currentMatch.fighter2_id : currentMatch.fighter1_id;
                   if (winner) {
                     setSelectedWinnerId(winner);
                     setSelectedResultType('walkover');
                     setTimeout(handleRecordResult, 100);
                   }
                 }} className="font-medium text-lg rounded-full border border-primary/50 hover:bg-primary/10 shadow-sm transition-all px-8 py-6">
                   Confirmar Avanço Automático
                 </Button>
               )}
            </div>
          )
          : isPendingFight ? <p className="text-center font-medium text-muted-foreground mt-8 text-lg italic">Aguardando adversário(s) para esta luta.</p>
          : isFightCompleted ? (
            <div className="text-center mt-8 p-8 bg-success/5 border border-success/30 rounded-3xl shadow-sm">
              <p className="text-4xl font-sans font-bold text-success tracking-tight">Vencedor: {getFighterDisplayName(athletesMap.get(currentMatch.winner_id!))} <Trophy className="inline-block ml-4 h-10 w-10 text-success opacity-80" /></p>
              <div className="flex gap-4 justify-center mt-6">
                <span className="px-6 py-2 bg-background border border-border/50 rounded-full font-medium text-lg text-foreground shadow-sm">{currentMatch.result?.type}</span>
                {currentMatch.result?.details && <span className="px-6 py-2 bg-background border border-border/50 rounded-full font-medium text-lg text-foreground shadow-sm">{currentMatch.result.details}</span>}
              </div>
              
              {/* Revert Result Button */}
              <Button 
                variant="outline" 
                className="mt-8 text-destructive border border-destructive/30 rounded-full font-medium hover:bg-destructive/10 transition-all px-6 py-6"
                onClick={() => setShowRevertDialog(true)}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reverter Resultado
              </Button>
            </div>
          ) : (
            <>
              <ResultSelector
                value={selectedResultType}
                onChange={setSelectedResultType}
                disabled={!isFightRecordable || isFightCompleted}
              />
              <div className="grid gap-3 mt-6">
                <Label htmlFor="resultDetails" className="font-sans font-bold text-xl text-foreground">Detalhes (Opcional)</Label>
                <Input id="resultDetails" className="border border-border/50 rounded-2xl font-medium text-lg p-6 bg-background shadow-inner transition-colors focus-visible:ring-primary/50" placeholder="Ex: Armlock, 6-2, Decisão Unânime" value={resultDetails || ''} onChange={(e) => setResultDetails(e.target.value)} />
              </div>
              <Button onClick={handleRecordResult} className="w-full mt-8 py-8 font-sans font-bold text-2xl rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-md transition-all" disabled={!selectedWinnerId || !selectedResultType}>Registrar Resultado</Button>
            </>
          )}

          {showPostFightOptions && !showRoundEndDialog && (
            <div className="flex gap-4 mt-8 pt-8 border-t border-border/30">
              {findNextFightInDivision() && (
                <Button onClick={handleNextFightInDivision} className="flex-1 py-8 font-sans font-bold text-2xl rounded-2xl border border-primary/20 hover:bg-primary/10 hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                  <ArrowRight className="mr-4 h-6 w-6" /> Próxima Luta
                </Button>
              )}
              <Button variant="outline" onClick={handleGoBack} className="flex-1 py-8 font-sans font-bold text-2xl rounded-2xl border border-border/50 hover:bg-muted/50 transition-all shadow-sm hover:shadow-md">
                <ArrowLeft className="mr-4 h-6 w-6" /> Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revert Result Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent className={`theme-${event.theme || 'default'} bg-background text-foreground`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-destructive" />
              Reverter Resultado
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">
                Tem certeza que deseja reverter o resultado desta luta?
              </p>
              <p className="text-sm">
                Esta ação irá:
              </p>
              <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                <li>Remover o vencedor e perdedor desta luta</li>
                <li>Remover o atleta avançado da próxima luta (se houver)</li>
                <li>Permitir o registro de um novo resultado</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRevertResult}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Reversão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRoundEndDialog} onOpenChange={setShowRoundEndDialog}>
        <AlertDialogContent className={`theme-${event.theme || 'default'} bg-background text-foreground`}>
          <AlertDialogHeader>
            <AlertDialogTitle>Fim da {currentRoundName}</AlertDialogTitle>
            <AlertDialogDescription>Todas as lutas da {currentRoundName} foram concluídas. O que você gostaria de fazer a seguir?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleGoBack}>Voltar</AlertDialogCancel>
            {findNextFightInDivision() && (
              <AlertDialogAction onClick={handleAdvanceToNextRound}>Próxima Luta</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Division Complete Dialog */}
      <AlertDialog open={showDivisionCompleteDialog} onOpenChange={setShowDivisionCompleteDialog}>
        <AlertDialogContent className={`theme-${event.theme || 'default'} bg-background text-foreground text-center`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Divisão Concluída!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-lg">
                Todas as lutas desta divisão foram finalizadas.
              </p>
              {currentBracket?.winner_id && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-muted-foreground mb-1">Campeão</p>
                  <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    🥇 {athletesMap.get(currentBracket.winner_id)?.first_name} {athletesMap.get(currentBracket.winner_id)?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {athletesMap.get(currentBracket.winner_id)?.club}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogAction 
              onClick={handleGoBack} 
              className="min-w-32"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </Layout>
  );
};

export default FightDetail;