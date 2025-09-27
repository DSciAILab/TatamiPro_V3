"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';
import { baseEvents } from '@/data/base-events';

const Events: React.FC = () => {
  const { profile } = useAuth();

  const getEvents = () => {
    const storedEventsListRaw = localStorage.getItem('events');
    let storedEventsList: { id: string; name: string; status: string; date: string; isActive: boolean }[] = [];
    if (storedEventsListRaw) {
      try {
        storedEventsList = JSON.parse(storedEventsListRaw);
      } catch (e) {
        console.error("Failed to parse events list from localStorage", e);
      }
    }

    const combinedEventsMap = new Map<string, { id: string; name: string; status: string; date: string; isActive: boolean }>();
    
    baseEvents.forEach(event => combinedEventsMap.set(event.id, {
      id: event.id,
      name: event.name,
      status: event.status,
      date: event.date,
      isActive: event.isActive,
    }));

    storedEventsList.forEach(event => combinedEventsMap.set(event.id, event));

    return Array.from(combinedEventsMap.values());
  };

  const events = getEvents();

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
          <Link
            to={`/events/${event.id}`}
            key={event.id}
            className={cn({ 'pointer-events-none': !event.isActive })}
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
        ))}
      </div>
    </Layout>
  );
};

export default Events;