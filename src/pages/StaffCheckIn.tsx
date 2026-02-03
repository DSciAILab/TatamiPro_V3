"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStaffAuth } from '@/hooks/use-staff-auth';
import { supabase } from '@/integrations/supabase/client';
import { connectionManager } from '@/lib/connection-manager';
import { db } from '@/lib/local-db';
import { Athlete, Event } from '@/types/index';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Search, 
  CheckCircle, 
  Scale, 
  UserRound,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

/**
 * Staff Check-in Page
 * Simplified mobile interface for check-in staff
 */
const StaffCheckIn: React.FC = () => {
  const { eventId, token } = useParams<{ eventId: string; token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, logout, isLoading: authLoading } = useStaffAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOnline, setIsOnline] = useState(connectionManager.mode !== 'offline');
  const [pendingCount, setPendingCount] = useState(0);

  // Verify authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated && token && eventId) {
      navigate(`/staff/${eventId}/${token}`);
    }
  }, [authLoading, isAuthenticated, token, eventId, navigate]);

  // Load event and athletes
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

  // Update pending count
  useEffect(() => {
    const updatePending = async () => {
      const count = await db.getPendingCount();
      setPendingCount(count);
    };
    updatePending();
    const interval = setInterval(updatePending, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    if (!eventId) return;
    setIsLoading(true);

    try {
      // Try local first
      const localEvent = await db.events.get(eventId);
      const localAthletes = await db.athletes.where('event_id').equals(eventId).toArray();

      if (localEvent) {
        setEvent(localEvent);
        setAthletes(localAthletes);
      }

      // If online, fetch fresh data
      if (connectionManager.mode === 'cloud') {
        const { data: eventData } = await supabase
          .from('sjjp_events')
          .select('*')
          .eq('id', eventId)
          .single();

        const { data: athleteData } = await supabase
          .from('sjjp_athletes')
          .select('*')
          .eq('event_id', eventId)
          .eq('registration_status', 'approved');

        if (eventData) {
          setEvent(eventData as unknown as Event);
          await db.events.put(eventData as unknown as Event);
        }
        if (athleteData) {
          setAthletes(athleteData as unknown as Athlete[]);
          await db.athletes.bulkPut(athleteData as unknown as Athlete[]);
        }
      }
    } catch (error) {
      console.error('[StaffCheckIn] Data load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter athletes by search term
  const filteredAthletes = useMemo(() => {
    if (!searchTerm.trim()) return athletes;
    
    const term = searchTerm.toLowerCase();
    return athletes.filter(a => 
      a.first_name.toLowerCase().includes(term) ||
      a.last_name.toLowerCase().includes(term) ||
      a.club?.toLowerCase().includes(term) ||
      a.emirates_id?.toLowerCase().includes(term) ||
      a.school_id?.toLowerCase().includes(term)
    );
  }, [athletes, searchTerm]);

  // Handle check-in (optimistic update)
  const handleCheckIn = async (athlete: Athlete) => {
    const newStatus = athlete.check_in_status === 'checked_in' ? 'pending' : 'checked_in';

    // 1. Optimistic update - UI updates immediately
    setAthletes(prev => 
      prev.map(a => a.id === athlete.id ? { ...a, check_in_status: newStatus } : a)
    );

    // 2. Update local DB
    await db.athletes.update(athlete.id, { check_in_status: newStatus });

    // 3. Queue for sync
    await db.pendingChanges.add({
      table: 'athletes',
      action: 'update',
      data: { id: athlete.id, check_in_status: newStatus },
      timestamp: Date.now(),
      synced: false,
    });

    // 4. Notify via WebSocket if connected
    if (connectionManager.socket?.connected) {
      connectionManager.emit('checkin:update', {
        eventId,
        athleteId: athlete.id,
        status: newStatus,
      });
    }

    // 5. If online, sync immediately
    if (connectionManager.mode === 'cloud') {
      try {
        await supabase
          .from('sjjp_athletes')
          .update({ check_in_status: newStatus })
          .eq('id', athlete.id);
        
        showSuccess(`${athlete.first_name} ${athlete.last_name} - ${newStatus === 'checked_in' ? 'Check-in realizado!' : 'Check-in removido'}`);
      } catch (error) {
        console.error('[StaffCheckIn] Sync error:', error);
        showError('Check-in salvo localmente. Sincronizará quando online.');
      }
    } else {
      showSuccess(`${athlete.first_name} - Salvo localmente`);
    }

    setPendingCount(await db.getPendingCount());
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'bg-green-500';
      case 'overweight': return 'bg-red-500';
      default: return 'bg-orange-500';
    }
  };

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
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} pendentes
                </Badge>
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
      <div className="grid grid-cols-3 gap-2 p-4">
        <Card className="text-center">
          <CardContent className="py-3">
            <p className="text-2xl font-bold">{athletes.length}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-green-500/10">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-green-500">
              {athletes.filter(a => a.check_in_status === 'checked_in').length}
            </p>
            <p className="text-xs text-muted-foreground">Check-in</p>
          </CardContent>
        </Card>
        <Card className="text-center bg-orange-500/10">
          <CardContent className="py-3">
            <p className="text-2xl font-bold text-orange-500">
              {athletes.filter(a => a.check_in_status === 'pending').length}
            </p>
            <p className="text-xs text-muted-foreground">Pendente</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar atleta (nome, clube, ID...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Athletes List */}
      <div className="px-4 pb-4 space-y-2">
        {filteredAthletes.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum atleta encontrado
          </p>
        ) : (
          filteredAthletes.map((athlete) => (
            <Card 
              key={athlete.id}
              className={`cursor-pointer transition-all active:scale-[0.98] ${
                athlete.check_in_status === 'checked_in' ? 'border-green-500/50 bg-green-500/5' : ''
              }`}
              onClick={() => handleCheckIn(athlete)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {athlete.photo_url ? (
                    <img 
                      src={athlete.photo_url} 
                      alt={athlete.first_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <UserRound className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">
                      {athlete.first_name} {athlete.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground">{athlete.club}</p>
                    <p className="text-xs text-muted-foreground">
                      {athlete.age_division} • {athlete.weight_division}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {athlete.check_in_status === 'checked_in' ? (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  ) : athlete.check_in_status === 'overweight' ? (
                    <Scale className="h-8 w-8 text-red-500" />
                  ) : (
                    <div className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground/50" />
                  )}
                  {athlete.emirates_id && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {athlete.emirates_id}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default StaffCheckIn;
