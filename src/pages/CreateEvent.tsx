"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Event } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (!eventName || !eventDescription || !eventDate) {
      showError('Por favor, preencha todos os campos.');
      return;
    }

    const newEventId = `event-${Date.now()}`;
    const newEvent: Event = {
      id: newEventId,
      name: eventName,
      description: eventDescription,
      status: 'Aberto', // Default status
      date: format(eventDate, 'yyyy-MM-dd'),
      athletes: [],
      divisions: [],
      isActive: true,
      championPoints: 9,
      runnerUpPoints: 3,
      thirdPlacePoints: 1,
      countSingleClubCategories: true,
      countWalkoverSingleFightCategories: true,
      checkInStartTime: undefined,
      checkInEndTime: undefined,
      numFightAreas: 1,
      isAttendanceMandatoryBeforeCheckIn: false,
      isWeightCheckEnabled: true,
      matAssignments: {},
      isBeltGroupingEnabled: true,
      isOverweightAutoMoveEnabled: false,
      brackets: {},
      matFightOrder: {},
      includeThirdPlace: false,
    };

    // Load existing events from localStorage
    const existingEventsRaw = localStorage.getItem('events');
    let existingEvents: { id: string; name: string; status: string; date: string; isActive: boolean }[] = [];
    if (existingEventsRaw) {
      try {
        existingEvents = JSON.parse(existingEventsRaw);
      } catch (e) {
        console.error("Failed to parse existing events from localStorage", e);
      }
    }

    // Add the new event to the list of events
    const updatedEventsList = [...existingEvents, {
      id: newEvent.id,
      name: newEvent.name,
      status: newEvent.status,
      date: newEvent.date,
      isActive: newEvent.isActive,
    }];
    localStorage.setItem('events', JSON.stringify(updatedEventsList));

    // Save the full new event object separately
    localStorage.setItem(`event_${newEvent.id}`, JSON.stringify(newEvent));

    showSuccess(`Evento "${eventName}" criado com sucesso!`);
    navigate('/events');
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Criar Novo Evento</h1>
        <Button onClick={() => navigate('/events')} variant="outline">Voltar para Eventos</Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Detalhes do Novo Evento</CardTitle>
          <CardDescription>Preencha as informações para criar um novo campeonato.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label htmlFor="eventName">Nome do Evento</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Ex: Campeonato Aberto de Verão"
                required
              />
            </div>
            <div>
              <Label htmlFor="eventDescription">Descrição</Label>
              <Textarea
                id="eventDescription"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Uma breve descrição do evento..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="eventDate">Data do Evento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button type="submit" className="w-full">Criar Evento</Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default CreateEvent;