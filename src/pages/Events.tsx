"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Trash2 } from 'lucide-react';
import DeleteEventDialog from '@/features/events/components/DeleteEventDialog';
import { EventCardSkeleton } from '@/components/skeletons';
import { NoEventsEmptyState } from '@/components/empty-states';
import { Event } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isPast, isFuture, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getAppId } from '@/lib/app-id';
import { useTranslations } from '@/hooks/use-translations';

const Events: React.FC = () => {
  const { session, profile } = useAuth();
  const { t } = useTranslations();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  const loadEventsFromSupabase = useCallback(async () => {
    console.log('[EVENTS] Loading events from Supabase...');
    setLoading(true);
    // const appId = await getAppId(); // Temporarily removed
    
    const { data, error } = await supabase
      .from('sjjp_events')
      .select('*') // Note: Partial select breaks Event[] type. Needs EventListItem type for full optimization.
      // .eq('app_id', appId) // Temporarily removed
      .order('event_date', { ascending: false });
    console.log('[EVENTS] Query result:', { data, error, count: data?.length });

    if (error) {
      console.error('[EVENTS] Error loading events:', error);
      showError('Failed to load events: ' + error.message);
    } else {
      console.log('[EVENTS] Events loaded successfully:', data?.length || 0);
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEventsFromSupabase();
  }, [loadEventsFromSupabase]);

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
  };

  const handleConfirmDelete = async (eventId: string) => {
    const loadingToast = showLoading('Deleting event...');
    // const appId = await getAppId(); // Temporarily removed

    const { error } = await supabase
      .from('sjjp_events')
      .delete()
      .eq('id', eventId);
      // .eq('app_id', appId); // Temporarily removed

    dismissToast(loadingToast);

    if (error) {
      showError(`Failed to delete event: ${error.message}`);
    } else {
      showSuccess(`Event "${eventToDelete?.name}" deleted successfully.`);
      setEventToDelete(null);
      loadEventsFromSupabase(); // Refresh the list
    }
  };

  const filterEvents = (filterType: 'past' | 'upcoming' | 'all') => {
    const today = new Date();
    return events.filter(event => {
      const eventDate = parseISO(event.event_date);
      if (filterType === 'past') {
        return isPast(eventDate) && eventDate.toDateString() !== today.toDateString();
      } else if (filterType === 'upcoming') {
        return isFuture(eventDate) || eventDate.toDateString() === today.toDateString();
      }
      return true; // 'all' filter
    });
  };

  const renderEventCards = (eventList: Event[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <>
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </>
      ) : eventList.length === 0 ? (
        <div className="col-span-full">
          <NoEventsEmptyState />
        </div>
      ) : (
        eventList.map((event) => (
          <div key={event.id} className="relative">
            <Link
              to={session ? `/events/${event.id}` : `/p/events/${event.id}`}
              className={cn("block group", { 'pointer-events-none': !event.is_active && profile?.role !== 'admin' })}
              aria-disabled={!event.is_active && profile?.role !== 'admin'}
            >
              <Card
                className={cn(
                  "h-full transition-all duration-300",
                  { 'opacity-50 grayscale': !event.is_active },
                  event.is_active && "gradient-border hover:glow-primary hover:scale-[1.02]"
                )}
              >
                <CardHeader>
                  <CardTitle className="group-hover:text-accent-foreground transition-colors">{event.name}</CardTitle>
                  <CardDescription className="group-hover:text-accent-foreground/80 transition-colors">
                    Status: {event.status} | Data: {event.event_date}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground group-hover:text-accent-foreground/80 transition-colors">
                    {event.is_active ? (session ? "Clique para gerenciar" : "Clique para visualizar") : "Evento inativo"}
                  </p>
                </CardContent>
              </Card>
            </Link>
            {profile?.role === 'admin' && (
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 z-10"
                onClick={() => handleDeleteClick(event)}
                aria-label={`Delete event ${event.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold gradient-text">{t('events')}</h1>
        {profile?.role === 'admin' && (
          <Link to="/events/create">
            <Button>{t('createNewEvent')}</Button>
          </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">{t('upcoming')}</TabsTrigger>
          <TabsTrigger value="all">{t('all')}</TabsTrigger>
          <TabsTrigger value="past">{t('past')}</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {renderEventCards(filterEvents('upcoming'))}
        </TabsContent>
        <TabsContent value="all" className="mt-6">
          {renderEventCards(filterEvents('all'))}
        </TabsContent>
        <TabsContent value="past" className="mt-6">
          {renderEventCards(filterEvents('past'))}
        </TabsContent>
      </Tabs>

      {eventToDelete && (
        <DeleteEventDialog
          isOpen={!!eventToDelete}
          onClose={() => setEventToDelete(null)}
          eventId={eventToDelete.id}
          eventName={eventToDelete.name}
          eventData={eventToDelete}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </Layout>
  );
};

export default Events;