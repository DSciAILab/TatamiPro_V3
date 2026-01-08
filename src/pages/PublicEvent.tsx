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

const PublicEvent: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('brackets');
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>('');

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
    return <PublicLayout><div className="text-center text-xl mt-8">Loading event...</div></PublicLayout>;
  }

  if (error || !event) {
    return <PublicLayout><div className="text-center text-xl mt-8 text-red-500">{error || "Event not found."}</div></PublicLayout>;
  }

  const divisionsWithBrackets = event.divisions?.filter(div => event.brackets?.[div.id]) || [];

  return (
    <PublicLayout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          <TabsTrigger value="fights">Fight Order</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

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