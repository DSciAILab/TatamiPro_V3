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

const PublicEvent: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('brackets');
  const [searchTerm, setSearchTerm] = useState('');
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

  if (loading) {
    return <PublicLayout><div className="text-center text-xl mt-8">{t('loadingEvent')}</div></PublicLayout>;
  }

  if (error || !event) {
    return <PublicLayout><div className="text-center text-xl mt-8 text-red-500">{error || t('eventNotFound')}</div></PublicLayout>;
  }

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
              <div className="relative mb-4">
                <Input
                  placeholder="Buscar por nome, clube ou divisão..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
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
              {event.brackets && Object.keys(event.brackets).length > 0 ? (
                <PublicBrackets event={event} />
              ) : (
                <p>{t('noBracketsGeneratedYet')}</p>
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