"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Match, Athlete, Bracket, FightResultType, Event, Division } from '@/types/index';
import { UserRound, Trophy, ArrowLeft, ArrowRight, Wifi, WifiOff, RefreshCw, LogOut } from 'lucide-react';
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
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { connectionManager } from '@/lib/connection-manager';
import { db } from '@/lib/local-db';

const getRoundName = (roundIndex: number, totalRounds: number, isThirdPlaceMatch: boolean = false): string => {
  if (isThirdPlaceMatch) return 'Luta pelo 3º Lugar';
  const roundFromEnd = totalRounds - roundIndex;
  switch (roundFromEnd) {
    case 1: return 'Final';
    case 2: return 'Semi-final';
    case 3: return 'Quartas de Final';
    case 4: return 'Oitavas de Final';
    default: return `Rodada ${roundIndex + 1}`;
  }
};

/**
 * Staff Fight Detail Page
 * Version without full app Layout for staff bracket users
 */
const StaffFightDetail: React.FC = () => {
  const { eventId, divisionId, matchId, token } = useParams<{ 
    eventId: string; 
    divisionId: string; 
    matchId: string;
    token: string;
  }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoading: authLoading } = useStaffAuth();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [currentBracket, setCurrentBracket] = useState<Bracket | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(connectionManager.mode !== 'offline');

  const [selectedWinnerId, setSelectedWinnerId] = useState<string | undefined>(undefined);
  const [selectedResultType, setSelectedResultType] = useState<FightResultType | undefined>(undefined);
  const [resultDetails, setResultDetails] = useState<string | undefined>(undefined);
  const [showPostFightOptions, setShowPostFightOptions] = useState(false);
  const [showRoundEndDialog, setShowRoundEndDialog] = useState(false);
  const [showDivisionCompleteDialog, setShowDivisionCompleteDialog] = useState(false);

  // Verify authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token && eventId) {
      navigate(`/staff/${eventId}/${token}`);
    }
  }, [authLoading, isAuthenticated, token, eventId, navigate]);

  // Listen for connection changes
  useEffect(() => {
    const unsubscribe = connectionManager.onModeChange((mode) => {
      setIsOnline(mode !== 'offline');
    });
    return unsubscribe;
  }, []);

  const loadFightData = useCallback(async () => {
    if (!eventId || !divisionId || !matchId) return;
    setLoading(true);
    try {
      let eventData: Event | null = null;
      let athletesData: Athlete[] = [];
      let divisionsData: Division[] = [];

      // Try local first
      const localEvent = await db.events.get(eventId);
      const localDivisions = await db.divisions.where('event_id').equals(eventId).toArray();
      const localAthletes = await db.athletes.where('event_id').equals(eventId).toArray();

      if (localEvent) {
        eventData = localEvent;
        divisionsData = localDivisions;
        athletesData = localAthletes;
      }

      // If online, fetch fresh data
      if (connectionManager.mode === 'cloud') {
        const { data: eData } = await supabase.from('sjjp_events').select('*').eq('id', eventId).single();
        const { data: dData } = await supabase.from('sjjp_divisions').select('*').eq('event_id', eventId);
        const { data: aData } = await supabase.from('sjjp_athletes').select('*').eq('event_id', eventId);

        if (eData) eventData = eData as unknown as Event;
        if (dData) divisionsData = dData as unknown as Division[];
        if (aData) athletesData = aData as unknown as Athlete[];
      }

      if (eventData) {
        const processedAthletes = athletesData.map(a => processAthleteData(a, divisionsData));
        const fullEvent: Event = { ...eventData, athletes: processedAthletes, divisions: divisionsData };
        setEvent(fullEvent);

        const bracket = fullEvent.brackets?.[divisionId];
        if (bracket) {
          setCurrentBracket(bracket);
          // Find match
          for (const round of bracket.rounds) {
            for (const match of round) {
              if (match.id === matchId) {
                setCurrentMatch(match);
                if (match.winner_id) {
                  setSelectedWinnerId(match.winner_id);
                  setSelectedResultType(match.result?.type as FightResultType);
                  setResultDetails(match.result?.details);
                }
                break;
              }
            }
          }
          // Check third place match
          if (bracket.third_place_match?.id === matchId) {
            setCurrentMatch(bracket.third_place_match);
          }
        }
      }
    } catch (error) {
      console.error('[StaffFightDetail] Error loading data:', error);
      showError('Erro ao carregar dados da luta.');
    } finally {
      setLoading(false);
    }
  }, [eventId, divisionId, matchId]);

  useEffect(() => {
    loadFightData();
  }, [loadFightData]);

  const athletesMap = useMemo(() => {
    const map = new Map<string, Athlete>();
    event?.athletes?.forEach(a => map.set(a.id, a));
    return map;
  }, [event?.athletes]);

  const currentRoundName = useMemo(() => {
    if (!currentMatch || !currentBracket) return '';
    return getRoundName(
      currentMatch.round - 1,
      currentBracket.rounds.length,
      currentMatch.id === currentBracket.third_place_match?.id
    );
  }, [currentMatch, currentBracket]);

  const handleUpdateBracket = async (updatedBracket: Bracket) => {
    if (!event || !divisionId) return;
    const toastId = showLoading('Salvando resultado...');
    try {
      const updatedBrackets = { ...event.brackets, [divisionId]: updatedBracket };
      
      // Create a temporary event object to generate fight order
      const tempEvent = { ...event, brackets: updatedBrackets };
      const { matFightOrder } = generateMatFightOrder(tempEvent);
      
      const { error } = await supabase
        .from('sjjp_events')
        .update({ brackets: updatedBrackets, mat_fight_order: matFightOrder })
        .eq('id', event.id);

      if (error) throw error;

      setEvent({ ...event, brackets: updatedBrackets, mat_fight_order: matFightOrder });
      setCurrentBracket(updatedBracket);
      dismissToast(toastId);
      showSuccess('Resultado salvo!');
      setShowPostFightOptions(true);
    } catch (err) {
      dismissToast(toastId);
      showError('Erro ao salvar resultado.');
      console.error(err);
    }
  };

  const handleRecordResult = async (winnerId: string) => {
    if (!currentMatch || !currentBracket || !selectedResultType) {
      showError('Selecione o tipo de resultado.');
      return;
    }
    
    const loserId = currentMatch.fighter1_id === winnerId ? currentMatch.fighter2_id : currentMatch.fighter1_id;
    const updatedBracket = JSON.parse(JSON.stringify(currentBracket)) as Bracket;
    let matchFound = false;

    for (const round of updatedBracket.rounds) {
      for (const match of round) {
        if (match.id === currentMatch.id) {
          match.winner_id = winnerId;
          match.loser_id = loserId;
          match.result = { type: selectedResultType, winner_id: winnerId, loser_id: loserId || '', details: resultDetails };
          matchFound = true;
          // Advance winner to next match
          if (match.next_match_id) {
            for (const nextRound of updatedBracket.rounds) {
              for (const nextMatch of nextRound) {
                if (nextMatch.id === match.next_match_id) {
                  if (nextMatch.prev_match_ids?.[0] === match.id) nextMatch.fighter1_id = winnerId;
                  else if (nextMatch.prev_match_ids?.[1] === match.id) nextMatch.fighter2_id = winnerId;
                }
              }
            }
          }
          break;
        }
      }
    }

    // Third place match
    if (updatedBracket.third_place_match && currentMatch.round > 0 && currentMatch.round === updatedBracket.rounds.length - 1) {
      if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[0]) updatedBracket.third_place_match.fighter1_id = loserId;
      else if (currentMatch.id === updatedBracket.third_place_match.prev_match_ids?.[1]) updatedBracket.third_place_match.fighter2_id = loserId;
    }

    if (matchFound) {
      const finalRound = updatedBracket.rounds[updatedBracket.rounds.length - 1];
      if (finalRound?.[0]?.winner_id) {
        updatedBracket.winner_id = finalRound[0].winner_id;
        updatedBracket.runner_up_id = finalRound[0].loser_id;
      }
      await handleUpdateBracket(updatedBracket);
      
      // Check if division is complete
      const allMatches = updatedBracket.rounds.flat();
      if (updatedBracket.third_place_match) allMatches.push(updatedBracket.third_place_match);
      const hasRemainingFights = allMatches.some(m => 
        !m.winner_id && m.fighter1_id && m.fighter1_id !== 'BYE' && m.fighter2_id && m.fighter2_id !== 'BYE'
      );
      
      if (!hasRemainingFights && updatedBracket.winner_id) {
        setShowDivisionCompleteDialog(true);
      }
    } else {
      showError("Luta não encontrada no bracket.");
    }
  };

  const findNextFightInDivision = (): Match | undefined => {
    if (!currentBracket) return undefined;
    const allMatches = currentBracket.rounds.flat();
    if (currentBracket.third_place_match) allMatches.push(currentBracket.third_place_match);
    const incompleteMatches = allMatches.filter(m =>
      m.id !== currentMatch?.id && !m.winner_id &&
      m.fighter1_id && m.fighter1_id !== 'BYE' &&
      m.fighter2_id && m.fighter2_id !== 'BYE'
    );
    return incompleteMatches[0];
  };

  const handleNextFightInDivision = () => {
    const nextFight = findNextFightInDivision();
    if (nextFight) {
      navigate(`/staff/${eventId}/bracket/${token}/fight/${divisionId}/${nextFight.id}`);
    }
  };

  const handleGoBack = () => {
    navigate(`/staff/${eventId}/bracket/${token}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (authLoading || loading || !event || !currentMatch || !currentBracket) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  const fighter1Athlete = currentMatch.fighter1_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter1_id || '');
  const fighter2Athlete = currentMatch.fighter2_id === 'BYE' ? 'BYE' : athletesMap.get(currentMatch.fighter2_id || '');
  const isFightCompleted = !!currentMatch.winner_id;
  const division = event.divisions?.find(d => d.id === divisionId);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleGoBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold truncate">{event.name}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {isOnline ? (
                  <span className="flex items-center text-green-500">
                    <Wifi className="h-3 w-3 mr-1" /> Online
                  </span>
                ) : (
                  <span className="flex items-center text-orange-500">
                    <WifiOff className="h-3 w-3 mr-1" /> Offline
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadFightData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-center">{currentRoundName}</CardTitle>
            <CardDescription className="text-center">
              {division?.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Fighters */}
            <div className="space-y-4">
              {/* Fighter 1 */}
              <Card 
                className={cn(
                  "cursor-pointer transition-all",
                  selectedWinnerId === currentMatch.fighter1_id && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20",
                  isFightCompleted && selectedWinnerId !== currentMatch.fighter1_id && "opacity-50"
                )}
                onClick={() => !isFightCompleted && setSelectedWinnerId(currentMatch.fighter1_id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-red-500">1</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {fighter1Athlete === 'BYE' ? 'BYE' : `${(fighter1Athlete as Athlete)?.first_name} ${(fighter1Athlete as Athlete)?.last_name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fighter1Athlete !== 'BYE' && (fighter1Athlete as Athlete)?.club}
                    </p>
                  </div>
                  {selectedWinnerId === currentMatch.fighter1_id && (
                    <Trophy className="h-6 w-6 text-green-500" />
                  )}
                </CardContent>
              </Card>

              <div className="text-center text-muted-foreground font-bold">VS</div>

              {/* Fighter 2 */}
              <Card 
                className={cn(
                  "cursor-pointer transition-all",
                  selectedWinnerId === currentMatch.fighter2_id && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20",
                  isFightCompleted && selectedWinnerId !== currentMatch.fighter2_id && "opacity-50"
                )}
                onClick={() => !isFightCompleted && setSelectedWinnerId(currentMatch.fighter2_id)}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-blue-500">2</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">
                      {fighter2Athlete === 'BYE' ? 'BYE' : `${(fighter2Athlete as Athlete)?.first_name} ${(fighter2Athlete as Athlete)?.last_name}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fighter2Athlete !== 'BYE' && (fighter2Athlete as Athlete)?.club}
                    </p>
                  </div>
                  {selectedWinnerId === currentMatch.fighter2_id && (
                    <Trophy className="h-6 w-6 text-green-500" />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Result Type Selection */}
            {!isFightCompleted && selectedWinnerId && (
              <div className="space-y-4">
                <Label>Tipo de Resultado</Label>
                <ToggleGroup type="single" value={selectedResultType} onValueChange={(v) => setSelectedResultType(v as FightResultType)}>
                  <ToggleGroupItem value="points" className="flex-1">Pontos</ToggleGroupItem>
                  <ToggleGroupItem value="submission" className="flex-1">Finalização</ToggleGroupItem>
                  <ToggleGroupItem value="wo" className="flex-1">WO</ToggleGroupItem>
                  <ToggleGroupItem value="dq" className="flex-1">DQ</ToggleGroupItem>
                </ToggleGroup>

                {(selectedResultType === 'submission' || selectedResultType === 'points') && (
                  <div>
                    <Label>Detalhes</Label>
                    <Input 
                      placeholder={selectedResultType === 'submission' ? 'Ex: Armlock' : 'Ex: 4x2'}
                      value={resultDetails || ''}
                      onChange={(e) => setResultDetails(e.target.value)}
                    />
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={() => handleRecordResult(selectedWinnerId)}
                  disabled={!selectedResultType}
                >
                  <Trophy className="mr-2 h-5 w-5" />
                  Confirmar Resultado
                </Button>
              </div>
            )}

            {/* Post Fight Options */}
            {showPostFightOptions && (
              <div className="flex gap-2">
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
      </main>

      {/* Division Complete Dialog */}
      <AlertDialog open={showDivisionCompleteDialog} onOpenChange={setShowDivisionCompleteDialog}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Divisão Concluída!
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-lg">Todas as lutas desta divisão foram finalizadas.</p>
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
            <AlertDialogAction onClick={handleGoBack} className="min-w-32">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StaffFightDetail;
