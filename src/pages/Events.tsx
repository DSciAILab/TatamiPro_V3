"use client";

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, CalendarIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useSession } from '@/components/SessionContextProvider';
import { Event } from '@/types/index';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const eventSchema = z.object({
  name: z.string().min(3, { message: 'O nome do evento deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  date: z.date({ required_error: 'A data do evento é obrigatória.' }),
});

const Events: React.FC = () => {
  const { userRole, isLoading: sessionLoading } = useSession();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<z.infer<typeof eventSchema>>({
    resolver: zodResolver(eventSchema),
  });

  const eventDate = watch('date');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoadingEvents(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        showError('Erro ao carregar eventos: ' + error.message);
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoadingEvents(false);
    };

    fetchEvents();
  }, []);

  const handleCreateEvent = async (values: z.infer<typeof eventSchema>) => {
    const { name, description, date } = values;
    const { data, error } = await supabase
      .from('events')
      .insert({
        name,
        description,
        date: format(date, 'yyyy-MM-dd'), // Store date in ISO format
        status: 'Aberto',
      })
      .select()
      .single();

    if (error) {
      showError('Erro ao criar evento: ' + error.message);
    } else if (data) {
      showSuccess('Evento criado com sucesso!');
      setEvents(prev => [...prev, data]);
      setIsCreatingEvent(false);
      reset(); // Clear form
    }
  };

  if (sessionLoading || loadingEvents) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[calc(100vh-128px)]">
          <p>Carregando eventos...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Eventos</h1>
        {userRole === 'admin' && (
          <Dialog open={isCreatingEvent} onOpenChange={setIsCreatingEvent}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Evento</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Novo Evento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit(handleCreateEvent)} className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome do Evento</Label>
                  <Input id="name" {...register('name')} />
                  {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea id="description" {...register('description')} />
                  {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data do Evento</Label>
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
                        {eventDate ? format(eventDate, "PPP") : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={eventDate}
                        onSelect={(date) => setValue('date', date!)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
                </div>
                <DialogFooter>
                  <Button type="submit">Criar Evento</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.length === 0 ? (
          <p className="text-muted-foreground col-span-full">Nenhum evento encontrado.</p>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>Status: {event.status} | Data: {format(new Date(event.date), 'dd/MM/yyyy')}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to={`/events/${event.id}`}>
                  <Button className="w-full">Ver Detalhes</Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Layout>
  );
};

export default Events;