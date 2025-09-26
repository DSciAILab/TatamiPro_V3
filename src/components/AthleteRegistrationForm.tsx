"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Athlete, AthleteBelt, Gender } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { Checkbox } from '@/components/ui/checkbox';

// Esquema de validação para o formulário de registro de atleta
const athleteSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  dateOfBirth: z.date({ required_error: "Data de nascimento é obrigatória" }),
  gender: z.enum(['Masculino', 'Feminino'], { required_error: "Gênero é obrigatório" }),
  nationality: z.string().min(1, "Nacionalidade é obrigatória"),
  belt: z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: "Faixa é obrigatória" }),
  weight: z.preprocess(
    (val) => Number(val),
    z.number().min(1, "Peso é obrigatório e deve ser maior que 0")
  ),
  club: z.string().min(1, "Clube é obrigatório"),
  email: z.string().email("Email inválido").min(1, "Email é obrigatório"),
  phone: z.string().min(1, "Telefone é obrigatório"),
  idNumber: z.string().min(1, "Número de identificação é obrigatório"),
  photo: z.any().optional(), // Para upload de arquivo
  emiratesIdFront: z.any().optional(),
  emiratesIdBack: z.any().optional(),
  paymentProof: z.any().optional(),
  consent: z.boolean().refine(val => val === true, { message: "Você deve concordar com os termos" }),
});

type AthleteFormData = z.infer<typeof athleteSchema>;

interface AthleteRegistrationFormProps {
  onRegister: (athlete: Athlete) => void;
  // eventDivisions: Event['divisions']; // Removido, pois não é usado diretamente aqui
  mandatoryFieldsConfig: { [key: string]: boolean };
}

const AthleteRegistrationForm: React.FC<AthleteRegistrationFormProps> = ({ onRegister, mandatoryFieldsConfig }) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<AthleteFormData>({
    resolver: zodResolver(athleteSchema),
    defaultValues: {
      gender: 'Masculino',
      belt: 'Branca',
      consent: false,
    }
  });

  const dateOfBirth = watch('dateOfBirth');
  const gender = watch('gender');
  const belt = watch('belt');
  const weight = watch('weight');
  const photo = watch('photo');
  const emiratesIdFront = watch('emiratesIdFront');
  const emiratesIdBack = watch('emiratesIdBack');
  const paymentProof = watch('paymentProof');

  const onSubmit = (values: AthleteFormData) => {
    try {
      const age = new Date().getFullYear() - values.dateOfBirth.getFullYear();
      const ageDivision = getAgeDivision(age);
      const weightDivision = getWeightDivision(values.weight);

      // Mock de upload de arquivo: apenas cria uma URL temporária
      const generateMockUrl = (file: File) => URL.createObjectURL(file);

      const newAthlete: Athlete = {
        id: uuidv4(),
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        age,
        gender: values.gender,
        nationality: values.nationality,
        belt: values.belt,
        weight: values.weight,
        club: values.club!,
        email: values.email,
        phone: values.phone,
        idNumber: values.idNumber,
        photoUrl: photo && photo.length > 0 ? generateMockUrl(photo[0]) : undefined,
        emiratesIdFrontUrl: emiratesIdFront && emiratesIdFront.length > 0 ? generateMockUrl(emiratesIdFront[0]) : undefined,
        emiratesIdBackUrl: emiratesIdBack && emiratesIdBack.length > 0 ? generateMockUrl(emiratesIdBack[0]) : undefined,
        paymentProofUrl: paymentProof && paymentProof.length > 0 ? generateMockUrl(paymentProof[0]) : undefined,
        consentDate: new Date(),
        ageDivision,
        weightDivision,
        registrationStatus: 'under_approval', // Todos os novos registros aguardam aprovação
        checkInStatus: 'pending',
        weightAttempts: [],
        attendanceStatus: 'pending',
      };

      onRegister(newAthlete);
    } catch (error) {
      showError("Erro ao registrar atleta. Verifique os dados.");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-lg shadow-sm">
      <h3 className="text-2xl font-semibold mb-4">Dados do Atleta</h3>

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                captionLayout="dropdown-buttons"
                fromYear={1900}
                toYear={new Date().getFullYear()}
              />
            </PopoverContent>
          </Popover>
          {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth.message}</p>}
        </div>
        <div>
          <Label htmlFor="gender">Gênero</Label>
          <Select value={gender} onValueChange={(value: Gender) => setValue('gender', value)}>
            <SelectTrigger id="gender">
              <SelectValue placeholder="Selecione o gênero" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Masculino">Masculino</SelectItem>
              <SelectItem value="Feminino">Feminino</SelectItem>
            </SelectContent>
          </Select>
          {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nationality">Nacionalidade</Label>
          <Input id="nationality" {...register('nationality')} />
          {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>}
        </div>
        <div>
          <Label htmlFor="belt">Faixa</Label>
          <Select value={belt} onValueChange={(value: AthleteBelt) => setValue('belt', value)}>
            <SelectTrigger id="belt">
              <SelectValue placeholder="Selecione a faixa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Branca">Branca</SelectItem>
              <SelectItem value="Cinza">Cinza</SelectItem>
              <SelectItem value="Amarela">Amarela</SelectItem>
              <SelectItem value="Laranja">Laranja</SelectItem>
              <SelectItem value="Verde">Verde</SelectItem>
              <SelectItem value="Azul">Azul</SelectItem>
              <SelectItem value="Roxa">Roxa</SelectItem>
              <SelectItem value="Marrom">Marrom</SelectItem>
              <SelectItem value="Preta">Preta</SelectItem>
            </SelectContent>
          </Select>
          {errors.belt && <p className="text-red-500 text-sm mt-1">{errors.belt.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="weight">Peso (kg)</Label>
          <Input id="weight" type="number" step="0.1" {...register('weight')} />
          {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
        </div>
        <div>
          <Label htmlFor="club">Clube</Label>
          <Input id="club" {...register('club')} />
          {errors.club && <p className="text-red-500 text-sm mt-1">{errors.club.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <Label htmlFor="phone">Telefone</Label>
          <Input id="phone" type="tel" {...register('phone')} />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="idNumber">Número de Identificação (Emirates ID / School ID)</Label>
        <Input id="idNumber" {...register('idNumber')} />
        {errors.idNumber && <p className="text-red-500 text-sm mt-1">{errors.idNumber.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mandatoryFieldsConfig.photo && (
          <div>
            <Label htmlFor="photo" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Foto do Atleta
            </Label>
            <Input id="photo" type="file" accept="image/*" {...register('photo')} />
            {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo.message as string}</p>}
            {photo && photo.length > 0 && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {photo[0].name}</p>}
          </div>
        )}
        {mandatoryFieldsConfig.emiratesIdFront && (
          <div>
            <Label htmlFor="emiratesIdFront" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Emirates ID (Frente)
            </Label>
            <Input id="emiratesIdFront" type="file" accept="image/*,application/pdf" {...register('emiratesIdFront')} />
            {errors.emiratesIdFront && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdFront.message as string}</p>}
            {emiratesIdFront && emiratesIdFront.length > 0 && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {emiratesIdFront[0].name}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mandatoryFieldsConfig.emiratesIdBack && (
          <div>
            <Label htmlFor="emiratesIdBack" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Emirates ID (Verso)
            </Label>
            <Input id="emiratesIdBack" type="file" accept="image/*,application/pdf" {...register('emiratesIdBack')} />
            {errors.emiratesIdBack && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdBack.message as string}</p>}
            {emiratesIdBack && emiratesIdBack.length > 0 && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {emiratesIdBack[0].name}</p>}
          </div>
        )}
        {mandatoryFieldsConfig.paymentProof && (
          <div>
            <Label htmlFor="paymentProof" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Comprovante de Pagamento
            </Label>
            <Input id="paymentProof" type="file" accept="image/*,application/pdf" {...register('paymentProof')} />
            {errors.paymentProof && <p className="text-red-500 text-sm mt-1">{errors.paymentProof.message as string}</p>}
            {paymentProof && paymentProof.length > 0 && <p className="text-sm text-muted-foreground mt-1">Arquivo selecionado: {paymentProof[0].name}</p>}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox id="consent" checked={watch('consent')} onCheckedChange={(checked) => setValue('consent', checked as boolean)} />
        <Label htmlFor="consent">Eu concordo com os termos e condições.</Label>
      </div>
      {errors.consent && <p className="text-red-500 text-sm mt-1">{errors.consent.message}</p>}

      <Button type="submit" className="w-full">Registrar Atleta</Button>
    </form>
  );
};

export default AthleteRegistrationForm;