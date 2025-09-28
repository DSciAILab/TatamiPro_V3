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
import { Event } from '@/types/index'; // Importar o tipo Event
import { showSuccess } from '@/utils/toast'; // 'showError' removido, pois não é utilizado neste arquivo

const Events: React.FC = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]); // Mudar para Event[]
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null); // Armazena o evento completo

  useEffect(() => {
    const loadedEvents = getEvents();
    setEvents(loadedEvents);
  }, []);

  const getEvents = (): Event[] => {
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
    const storedEventIds = new Set<string>();

    // Prioriza eventos do localStorage, carregando os detalhes completos
    storedEventsList.forEach(eventSummary => {
      const fullEventDataRaw = localStorage.getItem(`event_${eventSummary.id}`);
      if (fullEventDataRaw) {
        try {
          const fullEvent: Event = JSON.parse(fullEventDataRaw);
          finalEvents.push(fullEvent);
          storedEventIds.add(fullEvent.id);
        } catch (e) {
          console.error(`Failed to parse full event data for ${eventSummary.id}`, e);
        }
      }
    });

    // Adiciona eventos base que não estão no localStorage
    baseEvents.forEach(baseEvent => {
      if (!storedEventIds.has(baseEvent.id)) {
        finalEvents.push(baseEvent);
      }
    });

    // Sort events for consistent display, e.g., by name
    finalEvents.sort((a, b) => a.name.localeCompare(b.name));

    return finalEvents;
  };

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
  };

  const handleConfirmDelete = (eventId: string) => {
    // Remove o evento do localStorage
    localStorage.removeItem(`event_${eventId}`);

    // Atualiza a lista de eventos no localStorage
    const updatedEventsList = events.filter(e => e.id !== eventId).map(e => ({
      id: e.id,
      name: e.name,
      status: e.status,
      date: e.date,
      isActive: e.isActive,
    }));
    localStorage.setItem('events', JSON.stringify(updatedEventsList));

    // Atualiza o estado local para re-renderizar
    setEvents(prevEvents => prevEvents.filter(e => e.id !== eventId));
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