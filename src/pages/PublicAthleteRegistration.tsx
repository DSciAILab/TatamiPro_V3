"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { getAppId } from '@/lib/app-id';
import { v4 as uuidv4 } from 'uuid';

import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { Event, Division, Belt, Gender } from '@/types/index';
import { DatePicker } from '@/components/ui/date-picker';

const registrationSchema = z.object({
  first_name: z.string().min(2, 'Nome é obrigatório.'),
  last_name: z.string().min(2, 'Sobrenome é obrigatório.'),
  date_of_birth: z.date({ required_error: 'Data de nascimento é obrigatória.' }),
  gender: z.enum(['Masculino', 'Feminino', 'Outro'], { required_error: 'Gênero é obrigatório.' }),
  belt: z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: 'Faixa é obrigatória.' }),
  phone: z.string().min(8, 'Telefone é obrigatório.'),
  club: z.string().min(2, 'Clube é obrigatório.'),
  divisionId: z.string().min(1, 'Por favor, selecione uma divisão.'),
});

type RegistrationFormValues = z.infer<typeof registrationSchema>;

const PublicAthleteRegistration: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filteredDivisions, setFilteredDivisions] = useState<Division[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationSchema),
  });

  const dob = watch('date_of_birth');
  const gender = watch('gender');
  const belt = watch('belt');

  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('id, name, description, divisions(*), age_division_settings, is_auto_approve_registrations_enabled')
        .eq('id', eventId)
        .single();

      if (error || !data) {
        showError('Evento não encontrado ou não está ativo.');
        navigate('/');
      } else {
        setEvent(data as Event);
      }
      setLoading(false);
    };
    fetchEvent();
  }, [eventId, navigate]);

  useEffect(() => {
    if (!dob || !gender || !belt || !event?.divisions) {
      setFilteredDivisions([]);
      return;
    }

    const age = new Date().getFullYear() - dob.getFullYear();
    
    const matchingDivisions = event.divisions.filter(div => {
      const genderMatch = div.gender === gender || div.gender === 'Ambos';
      const beltMatch = div.belt === belt || div.belt === 'Todas';
      const ageMatch = age >= div.min_age && age <= div.max_age;
      return genderMatch && beltMatch && ageMatch && div.is_enabled;
    });

    setFilteredDivisions(matchingDivisions);
    setValue('divisionId', ''); // Reset division selection when filters change
  }, [dob, gender, belt, event?.divisions, setValue]);

  const onSubmit = async (data: RegistrationFormValues) => {
    if (!eventId) return;
    setIsSubmitting(true);

    const selectedDivision = event?.divisions?.find(d => d.id === data.divisionId);
    if (!selectedDivision) {
      showError("Divisão selecionada é inválida.");
      setIsSubmitting(false);
      return;
    }

    const appId = await getAppId();
    const athleteId = uuidv4();
    const age = new Date().getFullYear() - data.date_of_birth.getFullYear();

    let generatedIdSuffix = '';
    const phoneDigits = data.phone.replace(/\D/g, '');
    if (phoneDigits.length >= 4) {
        generatedIdSuffix = phoneDigits.slice(-4);
    } else {
        const namePart = data.first_name.substring(0, 4).toLowerCase();
        const datePart = format(data.date_of_birth, 'ddMMyyyy');
        generatedIdSuffix = `${namePart}_${datePart}`;
    }
    const registration_qr_code_id = `EV_${eventId}_ATH_${generatedIdSuffix}`;

    const newAthleteData = {
      id: athleteId,
      event_id: eventId,
      app_id: appId,
      registration_qr_code_id,
      first_name: data.first_name,
      last_name: data.last_name,
      date_of_birth: data.date_of_birth.toISOString(),
      gender: data.gender,
      belt: data.belt,
      phone: data.phone,
      club: data.club,
      age: age,
      weight: selectedDivision.max_weight, // Use max weight as placeholder
      nationality: 'N/A',
      email: `${uuidv4()}@placeholder.com`, // Placeholder
      age_division: selectedDivision.age_category_name,
      weight_division: selectedDivision.name,
      registration_status: (event as any)?.is_auto_approve_registrations_enabled ? 'approved' as const : 'under_approval' as const,
      check_in_status: 'pending' as const,
      attendance_status: 'pending' as const,
      consent_accepted: true,
      consent_date: new Date().toISOString(),
      consent_version: 'public_form_1.0',
    };

    try {
      const { error } = await supabase.from('athletes').insert(newAthleteData);
      if (error) throw error;
      showSuccess('Inscrição enviada com sucesso! Aguarde a aprovação do organizador.');
      navigate(`/`);
    } catch (error: any) {
      showError(`Erro ao enviar inscrição: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <PublicLayout><p>Carregando evento...</p></PublicLayout>;
  }

  return (
    <PublicLayout>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Inscrição de Última Hora</CardTitle>
          <CardDescription>Inscreva-se no evento "{event?.name}"</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Nome</Label>
                <Input id="first_name" {...register('first_name')} />
                {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="last_name">Sobrenome</Label>
                <Input id="last_name" {...register('last_name')} />
                {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
              </div>
            </div>

            <div>
              <Label>Data de Nascimento</Label>
              <DatePicker
                value={watch('date_of_birth')}
                onChange={(date) => setValue('date_of_birth', date!, { shouldValidate: true })}
              />
              {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gênero</Label>
                <Select onValueChange={(v: Gender) => setValue('gender', v)}><SelectTrigger><SelectValue placeholder="Selecione o gênero" /></SelectTrigger>
                  <SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent>
                </Select>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
              </div>
              <div>
                <Label>Faixa</Label>
                <Select onValueChange={(v: Belt) => setValue('belt', v)}><SelectTrigger><SelectValue placeholder="Selecione a faixa" /></SelectTrigger>
                  <SelectContent>
                    {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.belt && <p className="text-red-500 text-sm mt-1">{errors.belt.message}</p>}
              </div>
            </div>

            <div>
              <Label>Divisão</Label>
              <Select onValueChange={(v) => setValue('divisionId', v)} disabled={filteredDivisions.length === 0}>
                <SelectTrigger><SelectValue placeholder={filteredDivisions.length > 0 ? "Selecione a divisão de peso" : "Preencha os campos acima"} /></SelectTrigger>
                <SelectContent>
                  {filteredDivisions.map(div => <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.divisionId && <p className="text-red-500 text-sm mt-1">{errors.divisionId.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...register('phone')} />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <Label htmlFor="club">Clube</Label>
                <Input id="club" {...register('club')} />
                {errors.club && <p className="text-red-500 text-sm mt-1">{errors.club.message}</p>}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar Inscrição
            </Button>
          </form>
        </CardContent>
      </Card>
    </PublicLayout>
  );
};

export default PublicAthleteRegistration;