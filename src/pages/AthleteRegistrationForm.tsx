"use client";

import React, { useMemo, useEffect, useState } from 'react';
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
import { Belt, Gender, AgeDivisionSetting } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from '@/integrations/supabase/storage';

// Define os esquemas base para campos comuns
const firstNameSchema = z.string().min(2, { message: 'Nome é obrigatório.' });
const lastNameSchema = z.string().min(2, { message: 'Sobrenome é obrigatório.' });
const dateOfBirthSchema = z.date({ required_error: 'Data de nascimento é obrigatória.' });
const clubSchema = z.string().min(1, { message: 'Clube é obrigatório.' });
const genderSchema = z.enum(['Masculino', 'Feminino', 'Outro'], { required_error: 'Gênero é obrigatório.' });
const beltSchema = z.enum(['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'], { required_error: 'Faixa é obrigatória.' });
const weightSchema = z.coerce.number().min(20, { message: 'Peso deve ser no mínimo 20kg.' }).max(200, { message: 'Peso deve ser no máximo 200kg.' });
const nationalitySchema = z.string().min(2, { message: 'Nacionalidade é obrigatória.' });
const emailSchema = z.string().email({ message: 'Email inválido.' });
const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, { message: 'Telefone inválido (formato E.164, ex: +5511987654321).' });
const consentAcceptedSchema = z.boolean().refine(val => val === true, { message: 'Você deve aceitar os termos e condições.' });

const emiratesIdOptionalSchema = z.string().optional();
const schoolIdOptionalSchema = z.string().optional();

const fileListSchema = typeof window === 'undefined' ? z.any() : z.instanceof(FileList);

const AthleteRegistrationForm: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ageSettings, setAgeSettings] = useState<AgeDivisionSetting[]>([]);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!eventId) return;
      const { data, error } = await supabase
        .from('events')
        .select('age_division_settings')
        .eq('id', eventId)
        .single();
      
      if (error) {
        showError('Failed to load age division settings.');
      } else if (data && data.age_division_settings) {
        setAgeSettings(data.age_division_settings);
      }
    };
    fetchSettings();
  }, [eventId]);

  // Configuração de campos obrigatórios para check-in
  const mandatoryFieldsConfig = useMemo(() => {
    // Em um app real, isso viria do evento no DB. Por enquanto, usamos localStorage.
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      photo: false,
      emiratesIdFront: false,
      emiratesIdBack: false,
      paymentProof: false,
    };
  }, [eventId]);

  // Função para criar o esquema dinamicamente
  const createDynamicSchema = (config: Record<string, boolean>) => {
    const schemaDefinition = {
      first_name: firstNameSchema,
      last_name: lastNameSchema,
      date_of_birth: dateOfBirthSchema,
      club: clubSchema,
      gender: genderSchema,
      belt: beltSchema,
      weight: weightSchema,
      nationality: nationalitySchema,
      email: emailSchema,
      phone: phoneSchema,
      consent_accepted: consentAcceptedSchema,
      emirates_id: emiratesIdOptionalSchema,
      school_id: schoolIdOptionalSchema,
      photo: config?.photo
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto de perfil é obrigatória.' })
        : fileListSchema.optional(),
      emiratesIdFront: config?.emiratesIdFront
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto da frente do Emirates ID é obrigatória.' })
        : fileListSchema.optional(),
      emiratesIdBack: config?.emiratesIdBack
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto do verso do Emirates ID é obrigatória.' })
        : fileListSchema.optional(),
      paymentProof: config?.paymentProof
        ? fileListSchema.refine(file => file.length > 0, { message: 'Comprovante de pagamento é obrigatório.' })
        : fileListSchema.optional(),
    };

    return z.object(schemaDefinition).refine(data => data.emirates_id || data.school_id, {
      message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
      path: ['emirates_id'],
    });
  };

  const currentSchema = useMemo(() => createDynamicSchema(mandatoryFieldsConfig), [mandatoryFieldsConfig]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      club: '',
      gender: 'Outro',
      belt: 'Branca',
      weight: 0,
      nationality: '',
      email: '',
      phone: '',
      consent_accepted: false,
    },
  });

  const date_of_birth = watch('date_of_birth');

  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
    if (!eventId) {
      showError('ID do evento não encontrado.');
      return;
    }
    const loadingToast = showLoading('Registrando atleta e fazendo upload de arquivos...');

    try {
      const athleteId = uuidv4();
      const storagePath = `${eventId}/${athleteId}`;

      // Upload files in parallel
      const uploadPromises = [
        values.photo?.[0] ? uploadFile(values.photo[0], 'athlete-photos', storagePath) : Promise.resolve(undefined),
        values.emiratesIdFront?.[0] ? uploadFile(values.emiratesIdFront[0], 'athlete-documents', storagePath) : Promise.resolve(undefined),
        values.emiratesIdBack?.[0] ? uploadFile(values.emiratesIdBack[0], 'athlete-documents', storagePath) : Promise.resolve(undefined),
        values.paymentProof?.[0] ? uploadFile(values.paymentProof[0], 'athlete-documents', storagePath) : Promise.resolve(undefined),
      ];

      const [photo_url, emirates_id_front_url, emirates_id_back_url, payment_proof_url] = await Promise.all(uploadPromises);

      const age = new Date().getFullYear() - values.date_of_birth!.getFullYear();
      const age_division = getAgeDivision(age, ageSettings);
      const weight_division = getWeightDivision(values.weight!);
      const registration_qr_code_id = `EV_${eventId}_ATH_${athleteId}`;

      const newAthleteForDb = {
        id: athleteId,
        event_id: eventId,
        registration_qr_code_id,
        first_name: values.first_name!,
        last_name: values.last_name!,
        date_of_birth: values.date_of_birth!.toISOString(),
        age,
        club: values.club!,
        gender: values.gender!,
        belt: values.belt!,
        weight: values.weight!,
        nationality: values.nationality!,
        age_division,
        weight_division,
        email: values.email!,
        phone: values.phone!,
        emirates_id: values.emirates_id,
        school_id: values.school_id,
        photo_url,
        emirates_id_front_url,
        emirates_id_back_url,
        consent_accepted: values.consent_accepted!,
        consent_date: new Date().toISOString(),
        consent_version: '1.0',
        payment_proof_url,
        registration_status: 'under_approval',
        check_in_status: 'pending',
        attendance_status: 'pending',
      };

      const { error } = await supabase.from('athletes').insert(newAthleteForDb);

      if (error) {
        throw error;
      }

      dismissToast(loadingToast);
      showSuccess('Inscrição enviada para aprovação!');
      navigate(`/events/${eventId}`);
    } catch (error: any) {
      dismissToast(loadingToast);
      showError('Erro ao registrar atleta: ' + error.message);
    }
  };

  const isFieldMandatory = (fieldName: string) => {
    const alwaysMandatory = ['first_name', 'last_name', 'date_of_birth', 'club', 'gender', 'belt', 'weight', 'nationality', 'email', 'phone', 'consent_accepted'];
    if (alwaysMandatory.includes(fieldName)) return true;
    return mandatoryFieldsConfig?.[fieldName] === true;
  };

  return (
    <div className="p-4 border rounded-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Registrar Novo Atleta</h3>
        <Button onClick={() => navigate(`/events/${eventId}/registration-options`)} variant="outline">Voltar para Opções</Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Form fields remain the same */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="first_name">Nome {isFieldMandatory('first_name') && <span className="text-red-500">*</span>}</Label>
            <Input id="first_name" {...register('first_name')} />
            {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message}</p>}
          </div>
          <div>
            <Label htmlFor="last_name">Sobrenome {isFieldMandatory('last_name') && <span className="text-red-500">*</span>}</Label>
            <Input id="last_name" {...register('last_name')} />
            {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="date_of_birth">Data de Nascimento {isFieldMandatory('date_of_birth') && <span className="text-red-500">*</span>}</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date_of_birth && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date_of_birth ? format(date_of_birth, "PPP") : <span>Selecione uma data</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={date_of_birth}
                onSelect={(date) => setValue('date_of_birth', date!)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message}</p>}
        </div>

        <div>
          <Label htmlFor="club">Clube {isFieldMandatory('club') && <span className="text-red-500">*</span>}</Label>
          <Input id="club" {...register('club')} />
          {errors.club && <p className="text-red-500 text-sm mt-1">{errors.club.message}</p>}
        </div>

        <div>
          <Label>Gênero {isFieldMandatory('gender') && <span className="text-red-500">*</span>}</Label>
          <RadioGroup
            onValueChange={(value: Gender) => setValue('gender', value)}
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
          <Label htmlFor="belt">Faixa {isFieldMandatory('belt') && <span className="text-red-500">*</span>}</Label>
          <Select onValueChange={(value: Belt) => setValue('belt', value)} defaultValue={watch('belt')}>
            <SelectTrigger>
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

        <div>
          <Label htmlFor="weight">Peso (kg) {isFieldMandatory('weight') && <span className="text-red-500">*</span>}</Label>
          <Input id="weight" type="number" step="0.1" {...register('weight')} />
          {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
        </div>

        <div>
          <Label htmlFor="nationality">Nacionalidade {isFieldMandatory('nationality') && <span className="text-red-500">*</span>}</Label>
          <Input id="nationality" {...register('nationality')} />
          {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message}</p>}
        </div>

        <div>
          <Label htmlFor="email">Email {isFieldMandatory('email') && <span className="text-red-500">*</span>}</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="phone">Telefone (E.164, ex: +5511987654321) {isFieldMandatory('phone') && <span className="text-red-500">*</span>}</Label>
          <Input id="phone" type="tel" {...register('phone')} />
          {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emirates_id">Emirates ID (Opcional)</Label>
            <Input id="emirates_id" {...register('emirates_id')} />
            {errors.emirates_id && <p className="text-red-500 text-sm mt-1">{errors.emirates_id.message}</p>}
          </div>
          <div>
            <Label htmlFor="school_id">School ID (Opcional)</Label>
            <Input id="school_id" {...register('school_id')} />
            {errors.school_id && <p className="text-red-500 text-sm mt-1">{errors.school_id.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="photo">Foto de Perfil {isFieldMandatory('photo') && <span className="text-red-500">*</span>}</Label>
          <Input id="photo" type="file" accept=".jpg,.jpeg,.png" {...register('photo')} />
          {errors.photo?.message && <p className="text-red-500 text-sm mt-1">{errors.photo.message as string}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="emiratesIdFront">Emirates ID (Frente {isFieldMandatory('emiratesIdFront') && <span className="text-red-500">*</span>})</Label>
            <Input id="emiratesIdFront" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdFront')} />
            {errors.emiratesIdFront?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdFront.message as string}</p>}
          </div>
          <div>
            <Label htmlFor="emiratesIdBack">Emirates ID (Verso {isFieldMandatory('emiratesIdBack') && <span className="text-red-500">*</span>})</Label>
            <Input id="emiratesIdBack" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdBack')} />
            {errors.emiratesIdBack?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdBack.message as string}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="paymentProof">Comprovante de Pagamento {isFieldMandatory('paymentProof') && <span className="text-red-500">*</span>}</Label>
          <Input id="paymentProof" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('paymentProof')} />
          {errors.paymentProof?.message && <p className="text-red-500 text-sm mt-1">{errors.paymentProof.message as string}</p>}
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="consent_accepted"
            checked={watch('consent_accepted')}
            onCheckedChange={(checked) => setValue('consent_accepted', checked as boolean)}
          />
          <Label htmlFor="consent_accepted">Eu aceito os termos e condições. {isFieldMandatory('consent_accepted') && <span className="text-red-500">*</span>}</Label>
        </div>
        {errors.consent_accepted && <p className="text-red-500 text-sm mt-1">{errors.consent_accepted.message}</p>}

        <Button type="submit" className="w-full">Registrar Atleta</Button>
      </form>
    </div>
  );
};

export default AthleteRegistrationForm;