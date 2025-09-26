"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Printer } from 'lucide-react';
import { Event, Division } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import PrintableBracket from '@/components/PrintableBracket'; // Importar o novo componente

const PrintBrackets: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const printableRefs = useRef<Record<string, HTMLDivElement | null>>({});

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
          showError("Erro ao carregar dados do evento.");
        }
      }
    }
  }, [eventId]);

  const availableDivisions = useMemo(() => {
    if (!event || !event.brackets) return [];
    // Filter divisions that have generated brackets
    return event.divisions.filter(div => event.brackets?.[div.id]);
  }, [event]);

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

  const generatePdf = async () => {
    if (selectedDivisions.length === 0) {
      showError('Por favor, selecione pelo menos uma divisão para imprimir.');
      return;
    }

    if (!event || !event.brackets) {
      showError('Dados do evento ou brackets não disponíveis.');
      return;
    }

    const loadingToastId = showLoading('Gerando PDF dos brackets...');

    const pdf = new jsPDF('p', 'mm', 'a4'); // 'p' for portrait, 'mm' for millimeters, 'a4' for A4 size
    const imgWidth = 210; // A4 width in mm
    const imgHeight = 297; // A4 height in mm

    for (let i = 0; i < selectedDivisions.length; i++) {
      const divisionId = selectedDivisions[i];
      const divRef = printableRefs.current[divisionId];

      if (divRef) {
        try {
          const canvas = await html2canvas(divRef, {
            scale: 2, // Increase scale for better resolution
            useCORS: true, // Important for images from external URLs
            windowWidth: divRef.scrollWidth, // Capture full width
            windowHeight: divRef.scrollHeight, // Capture full height
          });
          const imgData = canvas.toDataURL('image/jpeg', 1.0); // Use JPEG for smaller file size

          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        } catch (error) {
          console.error(`Erro ao gerar imagem para a divisão ${divisionId}:`, error);
          showError(`Falha ao gerar PDF para a divisão ${divisionId}.`);
          dismissToast(loadingToastId);
          return;
        }
      } else {
        showError(`Referência de impressão não encontrada para a divisão ${divisionId}.`);
        dismissToast(loadingToastId);
        return;
      }
    }

    pdf.save(`brackets_evento_${eventId}.pdf`);
    dismissToast(loadingToastId);
    showSuccess('PDF dos brackets gerado com sucesso!');
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
        <h1 className="text-3xl font-bold">Imprimir Brackets para {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}/generate-brackets`)} variant="outline">
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
                  onCheckedChange={(checked: boolean) => handleSelectAllDivisions(checked)}
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
              <Button onClick={generatePdf} className="w-full mt-6" disabled={selectedDivisions.length === 0}>
                <Printer className="mr-2 h-4 w-4" /> Gerar PDF para Impressão
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Hidden container for rendering brackets for PDF generation */}
      <div className="absolute left-[-9999px] top-[-9999px]">
        {selectedDivisions.map(divisionId => {
          const division = event?.divisions.find(d => d.id === divisionId);
          const bracket = event?.brackets?.[divisionId];
          if (division && bracket) {
            return (
              <div key={divisionId} ref={el => (printableRefs.current[divisionId] = el)}>
                <PrintableBracket
                  bracket={bracket}
                  allAthletes={event.athletes}
                  division={division}
                />
              </div>
            );
          }
          return null;
        })}
      </div>
    </Layout>
  );
};

export default PrintBrackets;