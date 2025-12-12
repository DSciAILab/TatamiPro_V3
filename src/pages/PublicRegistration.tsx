"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { Division } from '@/types/index';

// Schema de validação
const registrationSchema = z.object({
  first_name: z.string().min(2, "Nome é obrigatório"),
  last_name: z.string().min(2, "Sobrenome é obrigatório"),
  email: z.string().email("Email inválido"),
  phone: z.string().min(8, "Telefone inválido"),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), "Data inválida"),
  club: z.string().min(2, "Equipe/Clube é obrigatório"),
  division_id: z.string().min(1, "Selecione uma divisão"),
  weight: z.coerce.number().min(1, "Informe seu peso aproximado"),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const PublicRegistration: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [eventName, setEventName] = useState('');
  const [loadingPage, setLoadingPage] = useState(true);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!eventId) return;
      try {
        // Buscar Evento
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('name, is_active')
          .eq('id', eventId)
          .single();
        
        if (eventError || !event) throw new Error("Evento não encontrado.");
        if (!event.is_active) throw new Error("As inscrições para este evento estão encerradas.");
        
        setEventName(event.name);

        // Buscar Divisões
        const { data: divs, error: divError } = await supabase
          .from('divisions')
          .select('*')
          .eq('event_id', eventId)
          .eq('is_enabled', true);

        if (divError) throw divError;
        setDivisions(divs || []);

      } catch (err: any) {
        showError(err.message);
      } finally {
        setLoadingPage(false);
      }
    };
    fetchData();
  }, [eventId]);

  const onSubmit = async (data: RegistrationFormValues) => {
    const toastId = showLoading('Enviando inscrição...');
    try {
      const selectedDivision = divisions.find(d => d.id === data.division_id);
      
      const payload = {
        eventId,
        firstName: data.first_name,
        lastName: data.last_name,
        email: data.email,
        phone: data.phone,
        dateOfBirth: data.date_of_birth,
        divisionId: data.division_id,
        club: data.club,
        weight: data.weight,
        // Passamos dados da divisão para ajudar a Edge Function
        gender: selectedDivision?.gender,
        belt: selectedDivision?.belt
      };

      const { data: result, error } = await supabase.functions.invoke('public-register-athlete', {
        body: payload
      });

      if (error) throw new Error(error.message);
      if (result?.error) throw new Error(result.error);

      dismissToast(toastId);
      setSuccess(true);
      showSuccess("Inscrição realizada com sucesso!");
    } catch (err: any) {
      dismissToast(toastId);
      showError(err.message || "Erro ao realizar inscrição.");
    }
  };

  if (loadingPage) {
    return <PublicLayout><div className="flex justify-center mt-10"><Loader2 className="animate-spin h-8 w-8" /></div></PublicLayout>;
  }

  if (success) {
    return (
      <PublicLayout>
        <div className="max-w-md mx-auto mt-10">
          <Card className="text-center border-green-500 bg-green-50 dark:bg-green-900/20">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-2xl text-green-700 dark:text-green-400">Inscrição Recebida!</CardTitle>
              <CardDescription className="text-lg">
                Seus dados foram enviados para a organização do <strong>{eventName}</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Você receberá uma confirmação por e-mail assim que sua inscrição for aprovada.</p>
            </CardContent>
            <CardFooter className="justify-center">
              <Button onClick={() => navigate(`/public/events/${eventId}`)}>Ver Detalhes do Evento</Button>
            </CardFooter>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold">{eventName}</h1>
          <p className="text-muted-foreground">Formulário de Inscrição de Atleta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seus Dados</CardTitle>
            <CardDescription>Preencha os campos abaixo para solicitar sua inscrição.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">Nome</Label>
                  <Input id="first_name" {...register('first_name')} placeholder="Seu nome" />
                  {errors.first_name && <span className="text-red-500 text-xs">{errors.first_name.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Sobrenome</Label>
                  <Input id="last_name" {...register('last_name')} placeholder="Seu sobrenome" />
                  {errors.last_name && <span className="text-red-500 text-xs">{errors.last_name.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" {...register('email')} placeholder="seu@email.com" />
                  {errors.email && <span className="text-red-500 text-xs">{errors.email.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input id="phone" {...register('phone')} placeholder="(XX) XXXXX-XXXX" />
                  {errors.phone && <span className="text-red-500 text-xs">{errors.phone.message}</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                  <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
                  {errors.date_of_birth && <span className="text-red-500 text-xs">{errors.date_of_birth.message}</span>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="club">Equipe / Clube</Label>
                  <Input id="club" {...register('club')} placeholder="Nome da sua equipe" />
                  {errors.club && <span className="text-red-500 text-xs">{errors.club.message}</span>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="division">Categoria / Divisão</Label>
                <Select onValueChange={(val) => setValue('division_id', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione sua categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.length === 0 ? (
                      <SelectItem value="none" disabled>Nenhuma divisão disponível</SelectItem>
                    ) : (
                      divisions.map(div => (
                        <SelectItem key={div.id} value={div.id}>
                          {div.name} ({div.gender} - {div.belt} - {div.age_category_name} - {div.max_weight}kg)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {errors.division_id && <span className="text-red-500 text-xs">{errors.division_id.message}</span>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Seu Peso Aproximado (kg)</Label>
                <Input id="weight" type="number" step="0.1" {...register('weight')} placeholder="Ex: 75.5" />
                <p className="text-xs text-muted-foreground">O peso oficial será conferido no dia do evento.</p>
                {errors.weight && <span className="text-red-500 text-xs">{errors.weight.message}</span>}
              </div>

              <Button type="submit" className="w-full mt-6" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enviando...</> : "Confirmar Inscrição"}
              </Button>

            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default PublicRegistration;