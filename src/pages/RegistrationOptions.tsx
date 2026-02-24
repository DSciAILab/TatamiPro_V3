"use client";

import React from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Upload } from 'lucide-react';

const RegistrationOptions: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState<string>('default');

  React.useEffect(() => {
    const fetchTheme = async () => {
      if (!eventId) return;
      const { data, error } = await supabase
        .from('sjjp_events')
        .select('theme')
        .eq('id', eventId)
        .single();
      
      if (!error && data?.theme) {
        setTheme(data.theme);
      }
    };
    fetchTheme();
  }, [eventId]);

  return (
    <Layout className={`theme-${theme}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Registration Options</h1>
        <Button onClick={() => navigate(`/events/${eventId}`)} variant="outline">Back to Event</Button>
      </div>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-128px)] text-center">
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
          Select how you would like to register athletes for event {eventId ? `#${eventId}` : 'selected'}.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <UserPlus className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Individual Registration</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Register one athlete at a time, filling in all details manually.
              </CardDescription>
              <Link to={`/events/${eventId}/register-athlete`}>
                <Button size="lg">
                  <UserPlus className="mr-2 h-5 w-5" /> Individual Registration
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="flex flex-col items-center p-6">
            <CardHeader>
              <Upload className="h-16 w-16 text-primary mb-4" />
              <CardTitle className="text-2xl">Batch Import</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <CardDescription className="mb-6 text-center">
                Upload a CSV file to register multiple athletes at once.
              </CardDescription>
              <Link to={`/events/${eventId}/import-athletes`}>
                <Button size="lg" variant="secondary">
                  <Upload className="mr-2 h-5 w-5" /> Batch Import
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default RegistrationOptions;