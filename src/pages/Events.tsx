"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { Trash2 } from 'lucide-react';
import DeleteEventDialog from '@/components/DeleteEventDialog';
import { Event } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { isPast, isFuture, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { getAppId } from '@/lib/app-id';

const Events: React.FC = () => {
  const { profile, session, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);

  const loadEventsFromSupabase = useCallback(async () => {
    // Não faz nada se o usuário não estiver logado
    if (!session?.user?.id) {
      setEvents([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const appId = await getAppId();
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('app_id', appId)
      .order('event_date', { ascending: false });

    if (error) {
      showError('Failed to load events: ' + error.message);
      setEvents([]);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, [session?.user?.id]);

  useEffect(() => {
    // Este efeito agora é acionado de forma confiável quando o estado de autenticação muda.
    if (!authLoading) {
      loadEventsFromSupabase();
    }
  }, [authLoading, session, loadEventsFromSupabase]);

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
  };

  const handleConfirmDelete = async (eventId: string) => {
    const loadingToast = showLoading('Deleting event...');
    const appId = await getAppId();

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('app_id', appId);

    dismissToast(loadingToast);

    if (error) {
      showError(`Failed to delete event: ${error.message}`);
    } else {
      showSuccess(`Event "${eventToDelete?.name}" deleted successfully.`);
      setEventToDelete(null);
      loadEventsFromSupabase(); // Recarrega a lista após a exclusão
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
      return true;
    });
  };

  const renderEventCards = (eventList: Event[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        <p className="text-muted-foreground col-span-full">Loading events...</p>
      ) : eventList.length === 0 ? (
        <p className="text-muted-foreground col-span-full">No events found in this category.</p>
      ) : (
        eventList.map((event) => (
          <div key={event.id} className="relative">
            <Link
              to={`/events/${event.id}`}
              className={cn("block", { 'pointer-events-none': !event.is_active })}
              aria-disabled={!event.is_active}
            >
              <Card
                className={cn(
                  "h-full transition-colors",
                  { 'opacity-50 grayscale': !event.is_active },
                  event.is_active && "hover:bg-accent"
                )}
              >
                <CardHeader>
                  <CardTitle>{event.name}</CardTitle>
                  <CardDescription>Status: {event.status} | Data: {event.event_date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {event.is_active ? "Click to see details" : "This event is inactive"}
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
        <h1 className="text-3xl font-bold">Events</h1>
        {profile?.role === 'admin' && (
          <Link to="/events/create">
            <Button>Create New Event</Button>
          </Link>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
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