"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { getAppId } from '@/lib/app-id';

const CreateEvent: React.FC = () => {
  const navigate = useNavigate();
  const [eventName, setEventName] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      showError('You must be logged in to create an event.');
      setLoading(false);
      navigate('/auth');
      return;
    }

    if (!eventName || !eventDescription || !eventDate) {
      showError('Please fill in all fields.');
      setLoading(false);
      return;
    }

    const appId = await getAppId();

    const newEventForDB = {
      id: uuidv4(),
      user_id: user.id,
      app_id: appId, // Add App ID
      name: eventName,
      description: eventDescription,
      status: 'Aberto',
      event_date: format(eventDate, 'yyyy-MM-dd'),
      is_active: true,
      champion_points: 9,
      runner_up_points: 3,
      third_place_points: 1,
      count_single_club_categories: true,
      count_walkover_single_fight_categories: true,
      mat_assignments: {},
      brackets: {},
      mat_fight_order: {},
      is_belt_grouping_enabled: true,
      is_overweight_auto_move_enabled: false,
      include_third_place: false,
      is_attendance_mandatory_before_check_in: false,
      is_weight_check_enabled: true,
      check_in_scan_mode: 'qr',
      num_fight_areas: 1,
    };

    const { error } = await supabase.from('events').insert(newEventForDB);

    if (error) {
      showError(`Failed to create event: ${error.message}`);
    } else {
      showSuccess(`Event "${eventName}" created successfully!`);
      navigate('/events');
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create New Event</h1>
        <Button onClick={() => navigate('/events')} variant="outline">Back to Events</Button>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>New Event Details</CardTitle>
          <CardDescription>Fill in the information to create a new championship.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <Label htmlFor="eventName">Event Name</Label>
              <Input
                id="eventName"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g., Summer Open Championship"
                required
              />
            </div>
            <div>
              <Label htmlFor="eventDescription">Description</Label>
              <Textarea
                id="eventDescription"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="A brief description of the event..."
                rows={3}
                required
              />
            </div>
            <div>
              <Label htmlFor="eventDate">Event Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !eventDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {eventDate ? format(eventDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={eventDate}
                    onSelect={setEventDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Layout>
  );
};

export default CreateEvent;