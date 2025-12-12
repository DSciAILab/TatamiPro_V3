"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer } from 'lucide-react';
import { Event } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { processAthleteData } from '@/utils/athlete-utils';
import { generateBracketPdf } from '@/utils/pdf-bracket-generator';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';

const PrintBrackets: React.FC = () => {
  // CORREÇÃO: O parâmetro na rota é definido como :eventId, não :id
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: eventData, error: eventError } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;

        const { data: athletesData, error: athletesError } = await supabase.from('athletes').select('*').eq('event_id', eventId);
        if (athletesError) throw athletesError;
        
        const { data: divisionsData, error: divisionsError } = await supabase.from('divisions').select('*').eq('event_id', eventId);
        if (divisionsError) throw divisionsError;

        const processedAthletes = (athletesData || []).map(a => processAthleteData(a, divisionsData || []));
        
        const fullEventData: Event = {
          ...eventData,
          athletes: processedAthletes,
          divisions: divisionsData || [],
          check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
          check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
        };
        setEvent(fullEventData);
      } catch (error: any) {
        console.error("Erro ao carregar evento:", error);
        showError(`Failed to load event data: ${error.message}`);
        setEvent(null);
      } finally {
        setLoading(false);
      }
    };
    fetchEventData();
  }, [eventId]);

  const availableDivisions = useMemo(() => {
    if (!event || !event.brackets) return [];
    return (event.divisions || []).filter(div => event.brackets?.[div.id]);
  }, [event]);

  const athletesMap = useMemo(() => {
    return new Map((event?.athletes || []).map(athlete => [athlete.id, athlete]));
  }, [event?.athletes]);

  const handleToggleDivision = (divisionId: string, checked: boolean) => {
    setSelectedDivisions(prev =>
      checked ? [...prev, divisionId] : prev.filter(id => id !== divisionId)
    );
  };

  const handleSelectAllDivisions = (checked: boolean) => {
    if (checked) {
      setSelectedDivisions(availableDivisions.map(div => div.id));
    } else {
      setSelectedDivisions([]);
    }
  };

  const handleGeneratePdf = async () => {
    if (selectedDivisions.length === 0) {
      showError('Por favor, selecione pelo menos uma divisão para imprimir.');
      return;
    }
    if (!event || !event.brackets || !event.divisions) {
      showError('Dados do evento ou brackets não disponíveis.');
      return;
    }

    const loadingToastId = showLoading('Gerando PDF dos brackets...');
    
    // Pequeno timeout para permitir que a UI atualize antes do trabalho pesado do PDF
    setTimeout(() => {
      try {
        console.log("Iniciando geração de PDF para as divisões:", selectedDivisions);
        // Use default empty array to satisfy TypeScript if event.divisions is undefined
        const divisionsToPrint = (event.divisions || []).filter(d => selectedDivisions.includes(d.id));
        
        if (divisionsToPrint.length === 0) {
            throw new Error("Nenhuma divisão válida encontrada para imprimir.");
        }

        generateBracketPdf(event, divisionsToPrint, athletesMap);
        
        dismissToast(loadingToastId);
        showSuccess('PDF dos brackets gerado com sucesso!');
      } catch (error: any) {
        console.error("Erro na geração do PDF:", error);
        dismissToast(loadingToastId);
        showError(`Falha ao gerar PDF: ${error.message}`);
      }
    }, 100);
  };

  if (loading) {
    return <Layout><div className="text-center text-xl mt-8">Carregando evento...</div></Layout>;
  }

  if (!event) {
    return <Layout><div className="text-center text-xl mt-8">Evento não encontrado ou ID inválido.</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Imprimir Brackets para {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`, { state: { activeTab: 'brackets' } })} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Gerar Brackets
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Selecionar Divisões para Impressão</CardTitle>
          <CardDescription>Escolha quais brackets você deseja imprimir. Cada divisão será uma página A4.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableDivisions.length === 0 ? (
            <p className="text-muted-foreground">Nenhum bracket gerado ainda para este evento.</p>
          ) : (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="selectAllDivisions"
                  checked={selectedDivisions.length === availableDivisions.length && availableDivisions.length > 0}
                  onCheckedChange={(checked: boolean) => handleSelectAllDivisions(checked as boolean)}
                />
                <Label htmlFor="selectAllDivisions">Selecionar Todas as Divisões</Label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableDivisions.map(div => (
                  <div key={div.id} className="flex items-center space-x-2 p-2 border rounded-md">
                    <Checkbox
                      id={`division-${div.id}`}
                      checked={selectedDivisions.includes(div.id)}
                      onCheckedChange={(checked: boolean) => handleToggleDivision(div.id, checked)}
                    />
                    <Label htmlFor={`division-${div.id}`}>{div.name}</Label>
                  </div>
                ))}
              </div>
              <Button onClick={handleGeneratePdf} className="w-full mt-6" disabled={selectedDivisions.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Gerar PDF para Impressão
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PrintBrackets;