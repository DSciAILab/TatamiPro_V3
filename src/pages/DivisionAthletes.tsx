"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, UserRound } from 'lucide-react';
import { Athlete, Division } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { processAthleteData } from '@/utils/athlete-utils';
import { showError } from '@/utils/toast';

const DivisionAthletes: React.FC = () => {
  const { eventId, divisionId } = useParams<{ eventId: string; divisionId: string }>();
  const navigate = useNavigate();
  const [division, setDivision] = useState<Division | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId || !divisionId) return;
      setLoading(true);
      try {
        // Fetch event to get age settings
        const { data: eventData, error: eventError } = await supabase.from('events').select('age_division_settings').eq('id', eventId).single();
        if (eventError) throw eventError;

        // Fetch all divisions for the event to process athletes correctly
        const { data: divisionsData, error: divisionsError } = await supabase.from('divisions').select('*').eq('event_id', eventId);
        if (divisionsError) throw divisionsError;

        const currentDivision = divisionsData.find(d => d.id === divisionId);
        if (!currentDivision) throw new Error("Division not found.");
        setDivision(currentDivision);

        // Fetch all athletes for the event
        const { data: athletesData, error: athletesError } = await supabase.from('athletes').select('*').eq('event_id', eventId);
        if (athletesError) throw athletesError;

        // Process and filter athletes for the current division
        const processedAthletes = athletesData.map(a => processAthleteData(a, divisionsData, eventData?.age_division_settings || []));
        const divisionAthletes = processedAthletes.filter(a => a._division?.id === divisionId);
        
        setAthletes(divisionAthletes);

      } catch (error: any) {
        showError(`Failed to load data: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [eventId, divisionId]);

  if (loading) {
    return <Layout><div className="text-center text-xl mt-8">Loading athletes...</div></Layout>;
  }

  if (!division) {
    return <Layout><div className="text-center text-xl mt-8">Division not found.</div></Layout>;
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Athletes in {division.name}</h1>
          <p className="text-muted-foreground">{athletes.length} athletes registered.</p>
        </div>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registered Athletes</CardTitle>
          <CardDescription>List of all athletes registered in this division.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Club</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead>Belt</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {athletes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No athletes found in this division.</TableCell>
                </TableRow>
              ) : (
                athletes.map(athlete => (
                  <TableRow key={athlete.id}>
                    <TableCell className="font-medium flex items-center">
                      {athlete.photo_url ? (
                        <img src={athlete.photo_url} alt={athlete.first_name} className="w-8 h-8 rounded-full object-cover mr-3" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
                          <UserRound className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      {athlete.first_name} {athlete.last_name}
                    </TableCell>
                    <TableCell>{athlete.club}</TableCell>
                    <TableCell>{athlete.age}</TableCell>
                    <TableCell>{athlete.weight}kg</TableCell>
                    <TableCell>{athlete.belt}</TableCell>
                    <TableCell>{athlete.registration_status}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default DivisionAthletes;