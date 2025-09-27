"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import MatDistribution from '@/components/MatDistribution';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Event } from '@/types/index';
import { showError } from '@/utils/toast';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { processAthleteData } from '@/utils/athlete-utils';
import { baseEvents } from '@/data/base-events';

const MatDistributionPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (!eventId) {
      showError("ID do evento não encontrado.");
      navigate('/events');
      return;
    }

    let eventData: Event | null = null;
    const existingEventData = localStorage.getItem(`event_${eventId}`);
    
    if (existingEventData) {
      try {
        const parsedEvent = JSON.parse(existingEventData);
        const processedAthletes = parsedEvent.athletes.map((a: any) => processAthleteData(a, parsedEvent.divisions || []));
        eventData = { ...parsedEvent, athletes: processedAthletes };
      } catch (e) {
        console.error("Failed to parse event data", e);
      }
    }

    if (!eventData) {
      const baseEvent = baseEvents.find(e => e.id === eventId);
      if (baseEvent) {
        localStorage.setItem(`event_${eventId}`, JSON.stringify(baseEvent));
        eventData = baseEvent;
      }
    }

    if (eventData) {
      setEvent(eventData);
    } else {
      showError("Evento não encontrado.");
      navigate('/events');
    }
  }, [eventId, navigate]);

  const handleUpdateMatAssignments = (assignments: Record<string, string[]>) => {
    setEvent(prev => {
      if (!prev) return null;
      const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...prev, matAssignments: assignments });
      const updatedEvent = { ...prev, matAssignments: assignments, brackets: updatedBrackets, matFightOrder };
      localStorage.setItem(`event_${eventId}`, JSON.stringify(updatedEvent));
      return updatedEvent;
    });
  };

  if (!event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Carregando evento...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Distribuição dos Mats para {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Evento
        </Button>
      </div>
      <MatDistribution
        event={event}
        onUpdateMatAssignments={handleUpdateMatAssignments}
        isBeltGroupingEnabled={event.isBeltGroupingEnabled ?? true}
      />
    </Layout>
  );
};

export default MatDistributionPage;