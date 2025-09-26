"use client";

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const Events: React.FC = () => {
  // Base mock data for events
  const baseEvents = [
    { id: '1', name: 'Campeonato Aberto de Verão', status: 'Aberto', date: '2024-12-01', isActive: true },
    { id: '2', name: 'Copa TatamiPro Inverno', status: 'Fechado', date: '2024-07-15', isActive: true },
    { id: '3', name: 'Desafio de Faixas Coloridas', status: 'Aberto', date: '2025-03-10', isActive: false },
  ];

  const [events, setEvents] = useState(baseEvents);

  useEffect(() => {
    const updatedEvents = baseEvents.map(baseEvent => {
      const storedEventData = localStorage.getItem(`event_${baseEvent.id}`);
      if (storedEventData) {
        try {
          const storedEvent = JSON.parse(storedEventData);
          // Return a new object with merged properties, giving precedence to stored data
          return { ...baseEvent, ...storedEvent };
        } catch (e) {
          console.error(`Failed to parse event data for event ${baseEvent.id}`, e);
          return baseEvent; // Fallback to base event on parsing error
        }
      }
      return baseEvent;
    });
    setEvents(updatedEvents);
  }, []); // Empty dependency array means this runs once on mount

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        {localStorage.getItem('userRole') === 'admin' && (
          <Button>Criar Novo Evento</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => (
          <Card key={event.id} className={cn({ 'opacity-50 grayscale': !event.isActive })}>
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>Status: {event.status} | Data: {event.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={`/events/${event.id}`}>
                <Button className="w-full" disabled={!event.isActive}>Ver Detalhes</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </Layout>
  );
};

export default Events;