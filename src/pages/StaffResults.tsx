"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/useStaffAuth';
import { supabase } from '@/integrations/supabase/client';
import { connectionManager } from '@/lib/connection-manager';
import { db } from '@/lib/local-db';
import { Event, Division, Athlete } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  Trophy,
  Medal,
  Users,
} from 'lucide-react';

/**
 * Staff Results Page
 * Read-only view of competition results
 */
const StaffResults: React.FC = () => {
  const { eventId, token } = useParams<{ eventId: string; token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoading: authLoading } = useStaffAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [athletes, setAthletes] = useState<Map<string, Athlete>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(connectionManager.mode !== 'offline');

  // Verify authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token && eventId) {
      navigate(`/staff/${eventId}/${token}`);
    }
  }, [authLoading, isAuthenticated, token, eventId, navigate]);

  // Load event data
  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  // Listen for connection changes
  useEffect(() => {
    const unsubscribe = connectionManager.onModeChange((mode) => {
      setIsOnline(mode !== 'offline');
    });
    return unsubscribe;
  }, []);

  // Listen for real-time updates
  useEffect(() => {
    const socket = connectionManager.socket;
    if (!socket || !eventId) return;

    socket.on('bracket:updated', () => {
      loadData();
    });

    socket.on('fight:result:updated', () => {
      loadData();
    });

    return () => {
      socket.off('bracket:updated');
      socket.off('fight:result:updated');
    };
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;
    setIsLoading(true);

    try {
      // Try local first
      const localEvent = await db.events.get(eventId);
      const localDivisions = await db.divisions.where('event_id').equals(eventId).toArray();
      const localAthletes = await db.athletes.where('event_id').equals(eventId).toArray();

      if (localEvent) {
        setEvent(localEvent);
        setDivisions(localDivisions);
        
        const athleteMap = new Map<string, Athlete>();
        localAthletes.forEach(a => athleteMap.set(a.id, a));
        setAthletes(athleteMap);
      }

      // If online, fetch fresh data
      if (connectionManager.mode === 'cloud') {
        const { data: eventData } = await supabase
          .from('sjjp_events')
          .select('*')
          .eq('id', eventId)
          .single();

        const { data: divisionData } = await supabase
          .from('sjjp_divisions')
          .select('*')
          .eq('event_id', eventId);

        const { data: athleteData } = await supabase
          .from('sjjp_athletes')
          .select('*')
          .eq('event_id', eventId);

        if (eventData) {
          setEvent(eventData as unknown as Event);
          await db.events.put(eventData as unknown as Event);
        }
        if (divisionData) {
          setDivisions(divisionData as unknown as Division[]);
        }
        if (athleteData) {
          const athleteMap = new Map<string, Athlete>();
          (athleteData as unknown as Athlete[]).forEach(a => athleteMap.set(a.id, a));
          setAthletes(athleteMap);
        }
      }
    } catch (error) {
      console.error('[StaffResults] Data load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getAthleteName = (id: string | undefined): string => {
    if (!id || id === 'BYE') return '-';
    const athlete = athletes.get(id);
    return athlete ? `${athlete.first_name} ${athlete.last_name}` : 'Desconhecido';
  };

  const getAthleteClub = (id: string | undefined): string => {
    if (!id || id === 'BYE') return '';
    const athlete = athletes.get(id);
    return athlete?.club || '';
  };

  // Get completed divisions
  const completedDivisions = divisions.filter(d => {
    const bracket = event?.brackets?.[d.id];
    return bracket?.winner_id;
  });

  // Get in-progress divisions
  const inProgressDivisions = divisions.filter(d => {
    const bracket = event?.brackets?.[d.id];
    return bracket && !bracket.winner_id;
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold truncate">{event?.name || 'Evento'}</h1>
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4">
        <Card className="text-center bg-green-500/10">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-green-500">
              {completedDivisions.length}
            </p>
            <p className="text-xs text-muted-foreground">Finalizadas</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-orange-500/10">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-orange-500">
              {inProgressDivisions.length}
            </p>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Results */}
      <div className="px-4 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">
          RESULTADOS FINAIS
        </h2>

        {completedDivisions.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">
                Nenhuma categoria finalizada ainda
              </p>
            </CardContent>
          </Card>
        ) : (
          completedDivisions.map(division => {
            const bracket = event?.brackets?.[division.id];
            if (!bracket) return null;

            return (
              <Card key={division.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{division.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Champion */}
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-yellow-500/10">
                    <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <Trophy className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{getAthleteName(bracket.winner_id)}</p>
                      <p className="text-xs text-muted-foreground">{getAthleteClub(bracket.winner_id)}</p>
                    </div>
                    <Badge className="bg-yellow-500">1º</Badge>
                  </div>

                  {/* Runner-up */}
                  {bracket.runner_up_id && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-500/10">
                      <div className="h-10 w-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                        <Medal className="h-5 w-5 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{getAthleteName(bracket.runner_up_id)}</p>
                        <p className="text-xs text-muted-foreground">{getAthleteClub(bracket.runner_up_id)}</p>
                      </div>
                      <Badge variant="secondary">2º</Badge>
                    </div>
                  )}

                  {/* Third place */}
                  {bracket.third_place_winner_id && (
                    <div className="flex items-center gap-3 p-2 rounded-lg bg-orange-500/10">
                      <div className="h-10 w-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Medal className="h-5 w-5 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{getAthleteName(bracket.third_place_winner_id)}</p>
                        <p className="text-xs text-muted-foreground">{getAthleteClub(bracket.third_place_winner_id)}</p>
                      </div>
                      <Badge variant="outline" className="border-orange-500 text-orange-500">3º</Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}

        {/* In Progress */}
        {inProgressDivisions.length > 0 && (
          <>
            <h2 className="text-sm font-semibold text-muted-foreground mt-6">
              EM ANDAMENTO
            </h2>

            {inProgressDivisions.map(division => {
              const bracket = event?.brackets?.[division.id];
              if (!bracket) return null;

              const totalMatches = bracket.rounds.flat().length;
              const completedMatches = bracket.rounds.flat().filter(m => m.result).length;

              return (
                <Card key={division.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{division.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {bracket.bracket_size} atletas
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {completedMatches}/{totalMatches} lutas
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

export default StaffResults;
