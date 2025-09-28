"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { baseEvents } from '@/data/base-events';
import { Trash2 } from 'lucide-react';
import DeleteEventDialog from '@/components/DeleteEventDialog';
import { Event } from '@/types/index';
import { showSuccess } from '@/utils/toast';

const Events: React.FC = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  useEffect(() => {
    initializeAndLoadEvents();
  }, []);

  const initializeAndLoadEvents = () => {
    const isInitialized = localStorage.getItem('events_initialized');

    if (!isInitialized) {
      // Seed base events into localStorage if not already initialized
      const initialEventsList: { id: string; name: string; status: string; date: string; isActive: boolean }[] = [];
      baseEvents.forEach(baseEvent => {
        // Ensure dates are converted to ISO strings for storage
        const eventToStore = {
          ...baseEvent,
          checkInStartTime: baseEvent.checkInStartTime instanceof Date ? baseEvent.checkInStartTime.toISOString() : baseEvent.checkInStartTime,
          checkInEndTime: baseEvent.checkInEndTime instanceof Date ? baseEvent.checkInEndTime.toISOString() : baseEvent.checkInEndTime,
          athletes: baseEvent.athletes.map(a => ({
            ...a,
            dateOfBirth: a.dateOfBirth instanceof Date ? a.dateOfBirth.toISOString() : a.dateOfBirth,
            consentDate: a.consentDate instanceof Date ? a.consentDate.toISOString() : a.consentDate,
          })),
        };
        localStorage.setItem(`event_${baseEvent.id}`, JSON.stringify(eventToStore));
        initialEventsList.push({
          id: baseEvent.id,
          name: baseEvent.name,
          status: baseEvent.status,
          date: baseEvent.date,
          isActive: baseEvent.isActive,
        });
      });
      localStorage.setItem('events', JSON.stringify(initialEventsList));
      localStorage.setItem('events_initialized', 'true');
    }

    // Always load from localStorage after initialization
    loadEventsFromLocalStorage();
  };

  const loadEventsFromLocalStorage = () => {
    const storedEventsListRaw = localStorage.getItem('events');
    let storedEventsList: { id: string; name: string; status: string; date: string; isActive: boolean }[] = [];
    if (storedEventsListRaw) {
      try {
        storedEventsList = JSON.parse(storedEventsListRaw);
      } catch (e) {
        console.error("Failed to parse events list from localStorage", e);
      }
    }

    const finalEvents: Event[] = [];
    storedEventsList.forEach(eventSummary => {
      const fullEventDataRaw = localStorage.getItem(`event_${eventSummary.id}`);
      if (fullEventDataRaw) {
        try {
          const fullEvent: Event = JSON.parse(fullEventDataRaw);
          // Ensure dates are parsed correctly from ISO strings for display/use
          fullEvent.checkInStartTime = fullEvent.checkInStartTime ? new Date(fullEvent.checkInStartTime) : undefined;
          fullEvent.checkInEndTime = fullEvent.checkInEndTime ? new Date(fullEvent.checkInEndTime) : undefined;
          fullEvent.athletes = fullEvent.athletes.map(a => ({
            ...a,
            dateOfBirth: new Date(a.dateOfBirth),
            consentDate: new Date(a.consentDate),
          }));
          finalEvents.push(fullEvent);
        } catch (e) {
          console.error(`Failed to parse full event data for ${eventSummary.id}`, e);
        }
      }
    });

    finalEvents.sort((a, b) => a.name.localeCompare(b.name));
    setEvents(finalEvents);
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
  };

  const handleConfirmDelete = (eventId: string) => {
    localStorage.removeItem(`event_${eventId}`);

    // Filter the current events state to get the updated list
    const updatedEventsList = events.filter(e => e.id !== eventId).map(e => ({
      id: e.id,
      name: e.name,
      status: e.status,
      date: e.date,
      isActive: e.isActive,
    }));
    localStorage.setItem('events', JSON.stringify(updatedEventsList));

    // After deleting, reload the events from localStorage to ensure consistency
    loadEventsFromLocalStorage();
    setEventToDelete(null);
    showSuccess(`Evento "${eventToDelete?.name}" deletado com sucesso.`);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        {profile?.role === 'admin' && (
          <Link to="/events/create">
            <Button>Criar Novo Evento</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <div key={event.id} className="relative">
            <Link
              to={`/events/${event.id}`}
              className={cn("block", { 'pointer-events-none': !event.isActive })}
              aria-disabled={!event.isActive}
            >
              <Card
                className={cn(
                  "h-full transition-colors",
                  { 'opacity-50 grayscale': !event.isActive },
                  event.isActive && "hover:bg-accent"
                )}
              >
                <CardHeader>
                  <CardTitle>{event.name}</CardTitle>
                  <CardDescription>Status: {event.status} | Data: {event.date}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {event.isActive ? "Clique para ver os detalhes" : "Este evento está inativo"}
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
                aria-label={`Deletar evento ${event.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

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