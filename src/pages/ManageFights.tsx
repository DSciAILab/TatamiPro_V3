"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Swords } from 'lucide-react';
import { Event, Bracket } from '@/types/index';
import { showError } from '@/utils/toast';
import MatCategoryList from '@/components/MatCategoryList'; // Novo componente
import FightList from '@/components/FightList'; // Novo componente
import { generateMatFightOrder } from '@/utils/fight-order-generator'; // Importar a nova função

const ManageFights: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedMat, setSelectedMat] = useState<string | null>(null);
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string | null>(null); // Chave da categoria (e.g., "Masculino/Adult/Preta")
  const [selectedDivisionId, setSelectedDivisionId] = useState<string | null>(null); // NOVO: ID da divisão selecionada

  // Load selected mat/category from localStorage on mount
  useEffect(() => {
    const storedMat = localStorage.getItem(`manageFights_selectedMat_${eventId}`);
    const storedCategoryKey = localStorage.getItem(`manageFights_selectedCategoryKey_${eventId}`);
    const storedDivisionId = localStorage.getItem(`manageFights_selectedDivisionId_${eventId}`);

    if (storedMat) setSelectedMat(storedMat);
    if (storedCategoryKey) setSelectedCategoryKey(storedCategoryKey);
    if (storedDivisionId) setSelectedDivisionId(storedDivisionId);
  }, [eventId]);

  // Save selected mat/category to localStorage whenever they change
  useEffect(() => {
    if (selectedMat) localStorage.setItem(`manageFights_selectedMat_${eventId}`, selectedMat);
    else localStorage.removeItem(`manageFights_selectedMat_${eventId}`);

    if (selectedCategoryKey) localStorage.setItem(`manageFights_selectedCategoryKey_${eventId}`, selectedCategoryKey);
    else localStorage.removeItem(`manageFights_selectedCategoryKey_${eventId}`);

    if (selectedDivisionId) localStorage.setItem(`manageFights_selectedDivisionId_${eventId}`, selectedDivisionId);
    else localStorage.removeItem(`manageFights_selectedDivisionId_${eventId}`);
  }, [selectedMat, selectedCategoryKey, selectedDivisionId, eventId]);


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
        } catch (e) {
          console.error("Failed to parse event data from localStorage", e);
          showError("Error loading event data.");
        }
      }
    }
  }, [eventId]);

  const matNames = useMemo(() => {
    if (!event?.numFightAreas) return [];
    return Array.from({ length: event.numFightAreas }, (_, i) => `Mat ${i + 1}`);
  }, [event?.numFightAreas]);

  const handleUpdateBracket = (divisionId: string, updatedBracket: Bracket) => {
    setEvent(prevEvent => {
      if (!prevEvent) return null;
      const updatedBrackets = {
        ...prevEvent.brackets,
        [divisionId]: updatedBracket,
      };
      // Recalculate mat fight order after a bracket is updated
      const { updatedBrackets: finalBrackets, matFightOrder: newMatFightOrder } = generateMatFightOrder({
        ...prevEvent,
        brackets: updatedBrackets,
      });

      const updatedEvent = { ...prevEvent, brackets: finalBrackets, matFightOrder: newMatFightOrder };
      localStorage.setItem(`event_${eventId}`, JSON.stringify(updatedEvent));
      return updatedEvent;
    });
  };

  const handleSelectCategory = (categoryKey: string, divisionId: string) => {
    setSelectedCategoryKey(categoryKey);
    setSelectedDivisionId(divisionId);
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
        <h1 className="text-3xl font-bold">Gerenciar Lutas para {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para o Evento
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Seleção de Mat e Categoria</CardTitle>
          <CardDescription>Selecione uma área de luta e uma categoria para gerenciar as lutas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="mat-select">Área de Luta (Mat)</Label>
            <Select value={selectedMat || ''} onValueChange={(value) => { setSelectedMat(value); setSelectedCategoryKey(null); setSelectedDivisionId(null); }}>
              <SelectTrigger id="mat-select">
                <SelectValue placeholder="Selecione um Mat" />
              </SelectTrigger>
              <SelectContent>
                {matNames.map(mat => (
                  <SelectItem key={mat} value={mat}>{mat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMat && (
            <MatCategoryList
              event={event}
              selectedMat={selectedMat}
              selectedCategoryKey={selectedCategoryKey}
              onSelectCategory={handleSelectCategory}
            />
          )}
        </CardContent>
      </Card>

      {selectedMat && selectedCategoryKey && selectedDivisionId && event.brackets && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Swords className="mr-2 h-6 w-6" /> Lutas da Categoria: {selectedCategoryKey}
            </CardTitle>
            <CardDescription>Clique em uma luta para registrar o resultado.</CardDescription>
          </CardHeader>
          <CardContent>
            <FightList
              event={event}
              selectedMat={selectedMat} // Passar o mat selecionado
              selectedCategoryKey={selectedCategoryKey}
              selectedDivisionId={selectedDivisionId} // Passa o ID da divisão
              onUpdateBracket={handleUpdateBracket}
            />
          </CardContent>
        </Card>
      )}
    </Layout>
  );
};

export default ManageFights;