"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Athlete } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';

interface AthleteRegistrationFormProps {
  eventId: string;
  onRegister: (athlete: Athlete) => void;
}

const formSchema = z.object({
  firstName: z.string().min(2, { message: 'Nome é obrigatório.' }),
  lastName: z.string().min(2, { message: 'Sobrenome é obrigatório.' }),
  dateOfBirth: z.date({ required_error: 'Data de nascimento é obrigatória.' }),
  club: z.string().min(1, { message: 'Clube é obrigatório.' }),
  gender: z.enum(['Masculino', 'Feminino', 'Outro'], { required_error: 'Gênero é obrigatório.' }),
  belt: z.enum(['Branca', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: 'Faixa é obrigatória.' }),
  weight: z.coerce.number().min(20, { message: 'Peso deve ser no mínimo 20kg.' }).max(200, { message: 'Peso deve ser no máximo 200kg.' }),
  email: z.string().email({ message: 'Email inválido.' }),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido (formato E.164, ex: +5511987654321).' }),
  emiratesId: z.string().optional(),
  schoolId: z.string().optional(),
  consentAccepted: z.boolean().refine(val => val === true, { message: 'Você deve aceitar os termos e condições.' }),
  paymentProof: typeof window === 'undefined' ? z.any().optional() : z.instanceof(FileList).optional(), // FileList for client-side
}).refine(data => data.emiratesId || data.schoolId, {
  message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
  path: ['emiratesId'],
});

const AthleteRegistrationForm: React.FC<AthleteRegistrationFormProps> = ({ eventId, onRegister }) => {
  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      club: '',
      gender: 'Outro',
      belt: 'Branca',
      weight: 0,
      email: '',
      phone: '',
      consentAccepted: false,
    },
  });

  const dateOfBirth = watch('dateOfBirth');
  const paymentProof = watch('paymentProof');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      const age = new Date().getFullYear() - values.dateOfBirth.getFullYear();

      let paymentProofUrl: string | undefined;
      if (paymentProof && paymentProof.length > 0) {
        // In a real application, you would upload this file to a storage service (e.g., S3, Cloudinary)
        // and get a URL back. For this MVP, we'll just use a mock URL or file name.
        paymentProofUrl = `mock-payment-proof-url/${paymentProof[0].name}`;
        showSuccess(`Comprovante de pagamento ${paymentProof[0].name} anexado.`);
      }

      const newAthlete: Athlete = {
        id: `athlete-${Date.now()}`,
        eventId,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        age,
        club: values.club,
        gender: values.gender,
        belt: values.belt,
        weight: values.weight,
        email: values.email,
        phone: values.phone,
        emiratesId: values.emiratesId,
        schoolId: values.schoolId,
        consentAccepted: values.consentAccepted,
        consentDate: new Date(),
        consentVersion: '1.0',
        paymentProofUrl,
        registrationStatus: 'under_approval', // Default status for new registrations
      };

      onRegister(newAthlete);
      showSuccess('Inscrição enviada para aprovação!');
      // Optionally reset form here
    } catch (error: any) {
      showError('Erro ao registrar atleta: ' + error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md">
      <h3 className="text-xl font-semibold mb-4">Registrar Novo Atleta</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">Nome</Label>
          <Input id="firstName" {...register('firstName')} />
          {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
        </div>
        <div>
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input id="lastName" {...register('lastName')} />
          {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="dateOfBirth">Data de Nascimento</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal",
                !dateOfBirth && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateOfBirth ? format(dateOfBirth, "PPP") : <span>Selecione uma data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateOfBirth}
              onSelect={(date) => setValue('dateOfBirth', date!)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
      </div>

      <div>
        <Label htmlFor="club">Clube</Label>
        <Input id="club" {...register('club')} />
        {errors.club && <p className="text-red-500 text-sm mt-1">{errors.club.message}</p>}
      </div>

      <div>
        <Label>Gênero</Label>
        <RadioGroup
          onValueChange={(value: 'Masculino' | 'Feminino' | 'Outro') => setValue('gender', value)}
          defaultValue={watch('gender')}
          className="flex space-x-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Masculino" id="gender-male" />
            <Label htmlFor="gender-male">Masculino</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Feminino" id="gender-female" />
            <Label htmlFor="gender-female">Feminino</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Outro" id="gender-other" />
            <Label htmlFor="gender-other">Outro</Label>
          </div>
        </RadioGroup>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
      </div>

      <div>
        <Label htmlFor="belt">Faixa</Label>
        <Select onValueChange={(value: 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta') => setValue('belt', value)} defaultValue={watch('belt')}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a faixa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Branca">Branca</SelectItem>
            <SelectItem value="Azul">Azul</SelectItem>
            <SelectItem value="Roxa">Roxa</SelectItem>
            <SelectItem value="Marrom">Marrom</SelectItem>
            <SelectItem value="Preta">Preta</SelectItem>
          </SelectContent>
        </Select>
        {errors.belt && <p className="text-red-500 text-sm mt-1">{errors.belt.message}</p>}
      </div>

      <div>
        <Label htmlFor="weight">Peso (kg)</Label>
        <Input id="weight" type="number" step="0.1" {...register('weight')} />
        {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="phone">Telefone (E.164, ex: +5511987654321)</Label>
        <Input id="phone" type="tel" {...register('phone')} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emiratesId">Emirates ID (Opcional)</Label>
          <Input id="emiratesId" {...register('emiratesId')} />
          {errors.emiratesId && <p className="text-red-500 text-sm mt-1">{errors.emiratesId.message}</p>}
        </div>
        <div>
          <Label htmlFor="schoolId">School ID (Opcional)</Label>
          <Input id="schoolId" {...register('schoolId')} />
          {errors.schoolId && <p className="text-red-500 text-sm mt-1">{errors.schoolId.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="paymentProof">Comprovante de Pagamento (PDF, Imagem)</Label>
        <Input id="paymentProof" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('paymentProof')} />
        {errors.paymentProof?.message && <p className="text-red-500 text-sm mt-1">{errors.paymentProof.message as string}</p>} {/* Corrigido: acesso seguro e cast */}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="consentAccepted"
          checked={watch('consentAccepted')}
          onCheckedChange={(checked) => setValue('consentAccepted', checked as boolean)}
        />
        <Label htmlFor="consentAccepted">Eu aceito os termos e condições.</Label>
      </div>
      {errors.consentAccepted && <p className="text-red-500 text-sm mt-1">{errors.consentAccepted.message}</p>}

      <Button type="submit" className="w-full">Registrar Atleta</Button>
    </form>
  );
};

export default AthleteRegistrationForm;