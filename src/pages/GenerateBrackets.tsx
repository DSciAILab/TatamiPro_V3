"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { showSuccess, showError } from '@/utils/toast';
import { Athlete, Division, Event, Bracket } from '@/types/index';
import { generateBracketForDivision } from '@/utils/bracket-generator';
import BracketView from '@/components/BracketView';
import { ArrowLeft, PlayCircle } from 'lucide-react';
import { generateMatFightOrder } from '@/utils/fight-order-generator'; // Importar a nova função

const GenerateBrackets: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | 'all'>('all');
  const [includeThirdPlace, setIncludeThirdPlace] = useState(false);
  const [generatedBrackets, setGeneratedBrackets] = useState<Record<string, Bracket>>({});

  useEffect(() => {
    if (eventId) {
      const existingEventData = localStorage.getItem(`event_${eventId}`);
      if (existingEventData) {
        try {
          const parsedEvent: Event = JSON.parse(existingEventData);
          // Re-parse dates for Athlete objects
          const processedAthletes = parsedEvent.athletes.map(athlete => ({
            ...athlete,
            dateOfBirth: new Date(athlete.dateOfBirth),
            consentDate: new Date(athlete.consentDate),
          }));
          setEvent({ ...parsedEvent, athletes: processedAthletes });
          // Load existing brackets if any
          if (parsedEvent.brackets) {
            setGeneratedBrackets(parsedEvent.brackets);
          }
        } catch (e) {
          console.error("Failed to parse event data from localStorage", e);
          showError("Error loading event data.");
        }
      }
    }
  }, [eventId]);

  const availableDivisions = useMemo(() => {
    if (!event) return [];
    // Filter divisions that have at least 2 approved and checked-in athletes
    return event.divisions.filter(div => {
      const athletesInDivision = event.athletes.filter(a =>
        a.registrationStatus === 'approved' &&
        a.checkInStatus === 'checked_in' &&
        a._division?.id === div.id
      );
      return athletesInDivision.length >= 2;
    });
  }, [event]);

  const handleGenerateBrackets = () => {
    if (!event) {
      showError("Evento não carregado.");
      return;
    }

    const newBrackets: Record<string, Bracket> = {};
    let divisionsToProcess: Division[] = [];

    if (selectedDivisionId === 'all') {
      divisionsToProcess = availableDivisions;
    } else {
      const division = availableDivisions.find(d => d.id === selectedDivisionId);
      if (division) {
        divisionsToProcess.push(division);
      } else {
        showError("Divisão selecionada não encontrada ou não tem atletas suficientes.");
        return;
      }
    }

    if (divisionsToProcess.length === 0) {
      showError("Nenhuma divisão com atletas suficientes para gerar brackets.");
      return;
    }

    try {
      divisionsToProcess.forEach(div => {
        const bracket = generateBracketForDivision(div, event.athletes, { thirdPlace: includeThirdPlace });
        newBrackets[div.id] = bracket;
      });

      // Merge new brackets with existing ones
      const mergedBrackets = { ...event.brackets, ...newBrackets };

      // Recalculate mat fight order after brackets are generated
      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...event,
        brackets: mergedBrackets,
      });

      setGeneratedBrackets(finalBrackets); // Update state with brackets including matFightNumber
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedEvent = { ...prevEvent, brackets: finalBrackets, matFightOrder: newMatFightOrder };
        localStorage.setItem(`event_${eventId}`, JSON.stringify(updatedEvent));
        return updatedEvent;
      });
      showSuccess(`${divisionsToProcess.length} bracket(s) gerado(s) com sucesso!`);
    } catch (error: any) {
      console.error("Error generating brackets:", error);
      showError("Erro ao gerar brackets: " + error.message);
    }
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
        <h1 className="text-3xl font-bold">Gerar Brackets para {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Evento
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Opções de Geração</CardTitle>
          <CardDescription>Selecione as divisões e opções para gerar os brackets.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="division-select">Divisão</Label>
            <Select value={selectedDivisionId} onValueChange={(value: string | 'all') => setSelectedDivisionId(value)}>
              <SelectTrigger id="division-select">
                <SelectValue placeholder="Selecione uma divisão ou todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Divisões</SelectItem>
                {availableDivisions.map(div => (
                  <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="include-third-place"
              checked={includeThirdPlace}
              onCheckedChange={setIncludeThirdPlace}
            />
            <Label htmlFor="include-third-place">Incluir Luta pelo 3º Lugar</Label>
          </div>
          <Button onClick={handleGenerateBrackets} className="w-full">
            <PlayCircle className="mr-2 h-4 w-4" /> Gerar Bracket(s)
          </Button>
        </CardContent>
      </Card>

      <h2 className="text-2xl font-bold mt-8 mb-4">Brackets Gerados</h2>
      {Object.keys(generatedBrackets).length === 0 ? (
        <p className="text-muted-foreground">Nenhum bracket gerado ainda. Use as opções acima para começar.</p>
      ) : (
        <div className="space-y-8">
          {Object.values(generatedBrackets).map(bracket => {
            const division = event?.divisions.find(d => d.id === bracket.divisionId);
            if (!division) return null;
            return (
              <BracketView
                key={bracket.id}
                bracket={bracket}
                allAthletes={event.athletes}
                division={division}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
};

export default GenerateBrackets;