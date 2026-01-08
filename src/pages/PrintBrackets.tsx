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
import { generateBracketPdf, BracketPdfOptions } from '@/utils/pdf-bracket-generator';
import { supabase } from '@/integrations/supabase/client';
import { parseISO } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const PrintBrackets: React.FC = () => {
  // CORREÇÃO: O parâmetro na rota é definido como :eventId, não :id
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [matStaffName, setMatStaffName] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && user.email) {
            setCurrentUserEmail(user.email);
        }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: eventData, error: eventError } = await supabase.from('sjjp_events').select('*').eq('id', eventId).single();
        if (eventError) throw eventError;

        const { data: athletesData, error: athletesError } = await supabase.from('sjjp_athletes').select('*').eq('event_id', eventId);
        if (athletesError) throw athletesError;
        
        const { data: divisionsData, error: divisionsError } = await supabase.from('sjjp_divisions').select('*').eq('event_id', eventId);
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
        console.error("Error loading event:", error);
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
      showError('Please select at least one division to print.');
      return;
    }
    if (!event || !event.brackets || !event.divisions) {
      showError('Event data or brackets not available.');
      return;
    }

    const loadingToastId = showLoading('Generating PDF brackets...');
    
    // Pequeno timeout para permitir que a UI atualize antes do trabalho pesado do PDF
    setTimeout(() => {
      try {
        console.log("Iniciando geração de PDF para as divisões:", selectedDivisions);
        // Use default empty array to satisfy TypeScript if event.divisions is undefined
        const divisionsToPrint = (event.divisions || []).filter(d => selectedDivisions.includes(d.id));
        
        if (divisionsToPrint.length === 0) {
            throw new Error("No valid divisions found to print.");
        }

        const pdfOptions: BracketPdfOptions = {
            fontSize,
            userName: currentUserEmail,
            matStaffName: matStaffName || undefined
        };

        generateBracketPdf(event, divisionsToPrint, athletesMap, pdfOptions);
        
        dismissToast(loadingToastId);
        showSuccess('Bracket PDF generated successfully!');
      } catch (error: any) {
        console.error("Error generating PDF:", error);
        dismissToast(loadingToastId);
        showError(`Failed to generate PDF: ${error.message}`);
      }
    }, 100);
  };

  if (loading) {
    return <Layout><div className="text-center text-xl mt-8">Loading event...</div></Layout>;
  }

  if (!event) {
    return <Layout><div className="text-center text-xl mt-8">Event not found or invalid ID.</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Print Brackets for {event.name}</h1>
        <Button onClick={() => navigate(`/events/${eventId}`, { state: { activeTab: 'brackets' } })} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Generate Brackets
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Divisions for Printing</CardTitle>
          <CardDescription>Choose which brackets you want to print. Each division will be an A4 page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableDivisions.length === 0 ? (
            <p className="text-muted-foreground">No brackets generated for this event yet.</p>
          ) : (
            <>
              {/* Configuration Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-4 border rounded-md bg-muted/20">
                <div className="space-y-2">
                    <Label htmlFor="font-size-select">Bracket Font Size</Label>
                    <Select value={fontSize} onValueChange={(v: 'small' | 'medium' | 'large') => setFontSize(v)}>
                        <SelectTrigger id="font-size-select">
                            <SelectValue placeholder="Select font size" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="small">Small (More compact)</SelectItem>
                            <SelectItem value="medium">Medium (Default)</SelectItem>
                            <SelectItem value="large">Large (Better visibility)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mat-staff-input">Mat Staff / Coordinator Name</Label>
                    <Input 
                        id="mat-staff-input" 
                        placeholder="Optional: Name of staff assigned to mat"
                        value={matStaffName}
                        onChange={(e) => setMatStaffName(e.target.value)}
                    />
                </div>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="selectAllDivisions"
                  checked={selectedDivisions.length === availableDivisions.length && availableDivisions.length > 0}
                  onCheckedChange={(checked: boolean) => handleSelectAllDivisions(checked as boolean)}
                />
                <Label htmlFor="selectAllDivisions">Select All Divisions</Label>
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
                <Printer className="mr-2 h-4 w-4" /> Generate PDF for Printing
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default PrintBrackets;