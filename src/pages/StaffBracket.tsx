"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { supabase } from '@/integrations/supabase/client';
import { connectionManager } from '@/lib/connection-manager';
import { db } from '@/lib/local-db';
import { Event, Division, Bracket, Athlete } from '@/types/index';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Loader2,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import MatControlCenter from '@/components/MatControlCenter';
import DivisionDetailView from '@/features/events/components/DivisionDetailView';
import { processAthleteData } from '@/utils/athlete-utils';

/**
 * Staff Bracket Page
 * Full Mat Control interface for mat/bracket staff to manage fights
 */
const StaffBracket: React.FC = () => {
  const { eventId, token } = useParams<{ eventId: string; token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoading: authLoading } = useStaffAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(connectionManager.mode !== 'offline');
  const [selectedDivision, setSelectedDivision] = useState<Division | null>(null);

  // Verify authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token && eventId) {
      navigate(`/staff/${eventId}/${token}`);
    }
  }, [authLoading, isAuthenticated, token, eventId, navigate]);

  // Load event data
  const loadData = useCallback(async () => {
    if (!eventId) return;
    setIsLoading(true);

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
        const { data: eData } = await supabase
          .from('sjjp_events')
          .select('*')
          .eq('id', eventId)
          .single();

        const { data: dData } = await supabase
          .from('sjjp_divisions')
          .select('*')
          .eq('event_id', eventId);

        const { data: aData } = await supabase
          .from('sjjp_athletes')
          .select('*')
          .eq('event_id', eventId);

        if (eData) {
          eventData = eData as unknown as Event;
          await db.events.put(eventData);
        }
        if (dData) {
          divisionsData = dData as unknown as Division[];
          await db.divisions.bulkPut(divisionsData);
        }
        if (aData) {
          athletesData = aData as unknown as Athlete[];
          await db.athletes.bulkPut(athletesData);
        }
      }

      if (eventData) {
        // Process athletes with division data
        const processedAthletes = athletesData.map(a => processAthleteData(a, divisionsData));
        
        const fullEvent: Event = {
          ...eventData,
          athletes: processedAthletes,
          divisions: divisionsData,
        };
        setEvent(fullEvent);
      }
    } catch (error) {
      console.error('[StaffBracket] Data load error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId, loadData]);

  // Listen for connection changes
  useEffect(() => {
    const unsubscribe = connectionManager.onModeChange((mode) => {
      setIsOnline(mode !== 'offline');
    });
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Evento não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b px-4 py-3">
        <div className="flex items-center justify-between">
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

      {/* Main Content */}
      <main className="p-4">
        {selectedDivision ? (
          <DivisionDetailView
            event={event}
            division={selectedDivision}
            onBack={() => setSelectedDivision(null)}
            baseFightPath={`/staff/${eventId}/bracket/${token}/fight`}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Mat Control</CardTitle>
              <CardDescription>
                Selecione uma divisão para gerenciar as lutas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MatControlCenter
                event={event}
                onDivisionSelect={(division) => setSelectedDivision(division)}
              />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default StaffBracket;
