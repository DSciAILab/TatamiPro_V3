"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import ResultsTab from '@/components/ResultsTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import PublicFightOrder from '@/components/PublicFightOrder';
import AthleteListTable from '@/components/AthleteListTable';
import { useTranslations } from '@/hooks/use-translations';
import PublicBrackets from './PublicBrackets';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BracketView from '@/components/BracketView';
import LeadCaptureModal, { hasSubmittedLead, markLeadSubmitted } from '@/components/LeadCaptureModal';

import DivisionSummaryTab from '@/features/events/components/DivisionSummaryTab';

const PublicEvent: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('brackets');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
  const [hasLeadAccess, setHasLeadAccess] = useState(false);
  const { t } = useTranslations();

  const fetchEventData = useCallback(async (isInitialLoad = false) => {
    if (!eventId) {
      setError("Event ID is missing.");
      setLoading(false);
      return;
    }
    if (isInitialLoad) setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('sjjp_events')
        .select('*')
        .eq('id', eventId)
        .eq('is_active', true)
        .single();

      if (eventError || !eventData) {
        throw new Error("Event not found or is not active.");
      }

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventData(true);
  }, [fetchEventData]);

  useEffect(() => {
    if (!eventId) return;

    const channel = supabase
      .channel(`public-event-${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'events',
          filter: `id=eq.${eventId}`,
        },
        (payload) => {
          console.log('Realtime event update received:', payload);
          fetchEventData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchEventData]);

  const approvedAthletes = useMemo(() => {
    let athletes = (event?.athletes || []).filter(a => a.registration_status === 'approved');
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => 
        `${a.first_name} ${a.last_name}`.toLowerCase().includes(lower) ||
        a.club.toLowerCase().includes(lower) ||
        (a._division?.name || '').toLowerCase().includes(lower)
      );
    }
    return athletes;
  }, [event?.athletes, searchTerm]);

  const divisionsWithBrackets = useMemo(() => {
    if (!event?.divisions || !event?.brackets) return [];
    return event.divisions.filter(d => event.brackets?.[d.id]);
  }, [event?.divisions, event?.brackets]);

  // Set default selected division when divisions load
  useEffect(() => {
    if (divisionsWithBrackets.length > 0 && !selectedDivisionId) {
      setSelectedDivisionId(divisionsWithBrackets[0].id);
    }
  }, [divisionsWithBrackets, selectedDivisionId]);

  if (loading) {
    return <PublicLayout><div className="text-center text-xl mt-8">Loading event...</div></PublicLayout>;
  }

  if (error || !event) {
    return <PublicLayout><div className="text-center text-xl mt-8 text-red-500">{error || "Event not found."}</div></PublicLayout>;
  }

  // Check if lead capture is required
  const needsLeadCapture = event.is_lead_capture_enabled && !hasLeadAccess && !hasSubmittedLead(eventId || '');

  // Block access if lead not submitted
  if (needsLeadCapture) {
    return (
      <PublicLayout className={`theme-${event.theme || 'default'}`}>
        <LeadCaptureModal
          eventId={eventId!}
          isOpen={true}
          onSuccess={() => setHasLeadAccess(true)}
        />
        <div className="text-center mt-8">
          <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
          <p className="text-lg text-muted-foreground">Complete o cadastro para acessar o evento.</p>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout className={`theme-${event.theme || 'default'}`}>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="brackets">{t('brackets')}</TabsTrigger>
          <TabsTrigger value="fights">{t('fightOrder')}</TabsTrigger>
          <TabsTrigger value="registrations">{t('registrations')}</TabsTrigger>
          <TabsTrigger value="results">{t('results')}</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="mt-6">
          <DivisionSummaryTab
            athletes={event.athletes || []}
            divisions={event.divisions || []}
          />
        </TabsContent>

        <TabsContent value="brackets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Brackets</CardTitle>
              <CardDescription>Select a division to view the bracket.</CardDescription>
            </CardHeader>
            <CardContent>
              {divisionsWithBrackets.length === 0 ? (
                <p>No brackets generated for this event yet.</p>
              ) : (
                <>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-full md:w-[300px] mb-4">
                      <SelectValue placeholder="Select a division" />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionsWithBrackets.map(div => (
                        <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDivisionId && event?.brackets?.[selectedDivisionId] && (
                    <BracketView
                      bracket={event.brackets[selectedDivisionId]}
                      allAthletes={event.athletes || []}
                      division={divisionsWithBrackets.find(d => d.id === selectedDivisionId)!}
                      eventId={event.id}
                      isPublic={true}
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fights" className="mt-6">
           <Card>
            <CardHeader>
              <CardTitle>Fight Order</CardTitle>
              <CardDescription>Follow the fight sequence in real-time.</CardDescription>
            </CardHeader>
            <CardContent>
              <PublicFightOrder event={event} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <ResultsTab event={event} />
        </TabsContent>
      </Tabs>
    </PublicLayout>
  );
};

export default PublicEvent;