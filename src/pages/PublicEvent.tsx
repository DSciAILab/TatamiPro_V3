"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Event } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import BracketView from '@/components/BracketView';
import ResultsTab from '@/components/ResultsTab';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicFightOrder from '@/components/PublicFightOrder';
import AthleteListTable from '@/components/AthleteListTable';
import { useTranslations } from '@/hooks/use-translations';

const PublicEvent: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('brackets');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');
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
        .from('events')
        .select('*')
        .eq('id', eventId)
        .eq('is_active', true)
        .single();

      if (eventError || !eventData) {
        throw new Error("Event not found or is not active.");
      }

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
      if (isInitialLoad) {
        const firstDivisionWithBracket = fullEventData.divisions?.find(div => fullEventData.brackets?.[div.id]);
        if (firstDivisionWithBracket) {
          setSelectedDivisionId(firstDivisionWithBracket.id);
        }
      }
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

  if (loading) {
    return <PublicLayout><div className="text-center text-xl mt-8">{t('loadingEvent')}</div></PublicLayout>;
  }

  if (error || !event) {
    return <PublicLayout><div className="text-center text-xl mt-8 text-red-500">{error || t('eventNotFound')}</div></PublicLayout>;
  }

  const divisionsWithBrackets = event.divisions?.filter(div => event.brackets?.[div.id]) || [];
  const approvedAthletes = (event.athletes || []).filter(a => a.registration_status === 'approved');

  return (
    <PublicLayout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registrations">{t('publicRegistrations')}</TabsTrigger>
          <TabsTrigger value="brackets">{t('publicBrackets')}</TabsTrigger>
          <TabsTrigger value="fights">{t('publicFightOrder')}</TabsTrigger>
          <TabsTrigger value="results">{t('publicResults')}</TabsTrigger>
        </TabsList>

        <TabsContent value="registrations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('registeredAthletes')}</CardTitle>
              <CardDescription>{t('officialListOfConfirmedAthletes')}</CardDescription>
            </CardHeader>
            <CardContent>
              <AthleteListTable athletes={approvedAthletes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brackets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('eventBrackets')}</CardTitle>
              <CardDescription>{t('selectDivisionToViewBracket')}</CardDescription>
            </CardHeader>
            <CardContent>
              {divisionsWithBrackets.length === 0 ? (
                <p>{t('noBracketsGeneratedYet')}</p>
              ) : (
                <>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger className="w-full md:w-[300px] mb-4">
                      <SelectValue placeholder={t('placeholderSelect')} />
                    </SelectTrigger>
                    <SelectContent>
                      {divisionsWithBrackets.map(div => (
                        <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDivisionId && event.brackets?.[selectedDivisionId] && (
                    <BracketView
                      bracket={event.brackets[selectedDivisionId]}
                      allAthletes={event.athletes || []}
                      division={divisionsWithBrackets.find(d => d.id === selectedDivisionId)!}
                      eventId={event.id}
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
              <CardTitle>{t('publicFightOrder')}</CardTitle>
              <CardDescription>{t('trackFightSequence')}</CardDescription>
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