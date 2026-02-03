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

        const bracket = eventData.brackets?.[divisionId];
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
    return new Map(event?.athletes?.map(athlete => [athlete.id, athlete]) || []);
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
      <div className="flex flex-col mb-6">
        <div className="flex justify-between items-start">
           <div>
               <h2 className="text-lg text-muted-foreground mb-1">{getDivisionName()}</h2>
               <h1 className="text-3xl font-bold">{currentMatch._mat_name} - Luta {fightNumberDisplay}</h1>
           </div>
           <Button onClick={handleGoBack} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
           </Button>
        </div>
      </div>

      <Card className={`mb-6 border-2 ${mainCardBorderClass}`}>
        <CardHeader>
          <CardTitle className="text-2xl">Detalhes da Luta ({currentRoundName})</CardTitle>
          <CardDescription>Registre o resultado desta luta.</CardDescription>
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
                 }}>
                   Confirmar Avanço Automático
                 </Button>
               )}
            </div>
          )
          : isPendingFight ? <p className="text-center text-muted-foreground mt-4 text-lg">Aguardando adversário(s) para esta luta.</p>
          : isFightCompleted ? (
            <div className="text-center mt-4">
              <p className="text-2xl font-bold text-green-600">Vencedor: {getFighterDisplayName(athletesMap.get(currentMatch.winner_id!))} <Trophy className="inline-block ml-2 h-6 w-6 text-yellow-500" /></p>
              <p className="text-lg text-muted-foreground mt-2">Tipo de Resultado: {currentMatch.result?.type}</p>
              {currentMatch.result?.details && <p className="text-md text-muted-foreground">{currentMatch.result.details}</p>}
              
              {/* Revert Result Button */}
              <Button 
                variant="outline" 
                className="mt-4 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
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
              <div className="grid gap-2">
                <Label htmlFor="resultDetails">Detalhes (Opcional)</Label>
                <Input id="resultDetails" placeholder="Ex: Armlock, 6-2, Decisão Unânime" value={resultDetails || ''} onChange={(e) => setResultDetails(e.target.value)} />
              </div>
              <Button onClick={handleRecordResult} className="w-full mt-4" disabled={!selectedWinnerId || !selectedResultType}>Registrar Resultado</Button>
            </>
          )}

          {showPostFightOptions && !showRoundEndDialog && (
            <div className="flex gap-4 mt-4">
              {findNextFightInDivision() && (
                <Button onClick={handleNextFightInDivision} className="flex-1">
                  <ArrowRight className="mr-2 h-4 w-4" /> Próxima Luta
                </Button>
              )}
              <Button variant="outline" onClick={handleGoBack} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revert Result Confirmation Dialog */}
      <AlertDialog open={showRevertDialog} onOpenChange={setShowRevertDialog}>
        <AlertDialogContent>
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
        <AlertDialogContent>
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
        <AlertDialogContent className="text-center">
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
    </Layout>
  );
};

export default FightDetail;