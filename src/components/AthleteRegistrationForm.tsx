"use client";

import React, { useMemo } from 'react';
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
import { Athlete, Belt, Gender, Event } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { useParams, useNavigate } from 'react-router-dom';

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

  // Configuração de campos obrigatórios para check-in
  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      belt: true,
      weight: true,
      idNumber: true, // Representa Emirates ID ou School ID
      gender: true,
      nationality: true,
      email: true,
      phone: true,
      photo: false,
      emiratesIdFront: false,
      emiratesIdBack: false,
      paymentProof: false,
    };
  }, [eventId]);

  // Função para criar o esquema dinamicamente
  const createDynamicSchema = (config: Record<string, boolean>) => {
    const schemaDefinition = {
      firstName: firstNameSchema,
      lastName: lastNameSchema,
      dateOfBirth: dateOfBirthSchema,
      club: clubSchema,
      gender: genderSchema,
      belt: beltSchema,
      weight: weightSchema,
      nationality: nationalitySchema,
      email: emailSchema,
      phone: phoneSchema,
      consentAccepted: consentAcceptedSchema,
      emiratesId: emiratesIdOptionalSchema,
      schoolId: schoolIdOptionalSchema,
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

    return z.object(schemaDefinition).refine(data => data.emiratesId || data.schoolId, {
      message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
      path: ['emiratesId'],
    });
  };

  const currentSchema = useMemo(() => createDynamicSchema(mandatoryFieldsConfig), [mandatoryFieldsConfig]);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof currentSchema>>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      club: '',
      gender: 'Outro',
      belt: 'Branca',
      weight: 0,
      nationality: '',
      email: '',
      phone: '',
      consentAccepted: false,
    },
  });

  const dateOfBirth = watch('dateOfBirth');

  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
    if (!eventId) {
      showError('ID do evento não encontrado.');
      return;
    }

    try {
      const age = new Date().getFullYear() - values.dateOfBirth!.getFullYear(); // dateOfBirth é obrigatório
      const ageDivision = getAgeDivision(age);
      const weightDivision = getWeightDivision(values.weight!); // weight é obrigatório

      let paymentProofUrl: string | undefined;
      if (values.paymentProof && values.paymentProof.length > 0) {
        paymentProofUrl = `mock-payment-proof-url/${values.paymentProof[0].name}`;
        showSuccess(`Comprovante de pagamento ${values.paymentProof[0].name} anexado.`);
      }

      let photoUrl: string | undefined;
      if (values.photo && values.photo.length > 0) {
        photoUrl = `mock-photo-url/${values.photo[0].name}`;
        showSuccess(`Foto de perfil ${values.photo[0].name} anexada.`);
      }

      let emiratesIdFrontUrl: string | undefined;
      if (values.emiratesIdFront && values.emiratesIdFront.length > 0) {
        emiratesIdFrontUrl = `mock-eid-front-url/${values.emiratesIdFront[0].name}`;
        showSuccess(`Foto da frente do EID ${values.emiratesIdFront[0].name} anexada.`);
      }

      let emiratesIdBackUrl: string | undefined;
      if (values.emiratesIdBack && values.emiratesIdBack.length > 0) {
        emiratesIdBackUrl = `mock-eid-back-url/${values.emiratesIdBack[0].name}`;
        showSuccess(`Foto do verso do EID ${values.emiratesIdBack[0].name} anexada.`);
      }

      const athleteId = `ath-${Date.now()}`; // Gerar um ID de atleta único
      const registrationQrCodeId = `EV_${eventId}_ATH_${athleteId}`; // Gerar o ID do QR Code

      const newAthlete: Athlete = {
        id: athleteId,
        eventId,
        registrationQrCodeId, // Adicionar o ID do QR Code
        firstName: values.firstName!,
        lastName: values.lastName!,
        dateOfBirth: values.dateOfBirth!,
        age,
        club: values.club!,
        gender: values.gender!,
        belt: values.belt!,
        weight: values.weight!,
        nationality: values.nationality!,
        ageDivision,
        weightDivision,
        email: values.email!,
        phone: values.phone!,
        emiratesId: values.emiratesId,
        schoolId: values.schoolId,
        photoUrl,
        emiratesIdFrontUrl,
        emiratesIdBackUrl,
        consentAccepted: values.consentAccepted!,
        consentDate: new Date(),
        consentVersion: '1.0',
        paymentProofUrl,
        registrationStatus: 'under_approval',
        checkInStatus: 'pending',
        registeredWeight: undefined,
        weightAttempts: [],
        attendanceStatus: 'pending', // Default attendance status
      };

      // Load existing event data to add the new athlete
      const existingEventData = localStorage.getItem(`event_${eventId}`);
      let currentEvent: Event = {
        id: eventId,
        name: `Evento #${eventId}`,
        description: '',
        status: 'Aberto',
        date: new Date().toISOString().split('T')[0],
        athletes: [],
        divisions: [],
        isActive: true, // Default value
        championPoints: 9, // Default value
        runnerUpPoints: 3, // Default value
        thirdPlacePoints: 1, // Default value
        countSingleClubCategories: true, // Default value
        countWalkoverSingleFightCategories: true, // Default value
      };
      if (existingEventData) {
        try {
          currentEvent = JSON.parse(existingEventData);
        } catch (e) {
          console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
        }
      }

      const updatedAthletes = [...(currentEvent.athletes || []), newAthlete];
      localStorage.setItem(`event_${eventId}`, JSON.stringify({ ...currentEvent, athletes: updatedAthletes }));

      showSuccess('Inscrição enviada para aprovação!');
      navigate(`/events/${eventId}`); // Redirect back to event details
    } catch (error: any) {
      showError('Erro ao registrar atleta: ' + error.message);
    }
  };

  const isFieldMandatory = (fieldName: string) => {
    // Campos sempre obrigatórios
    const alwaysMandatory = ['firstName', 'lastName', 'dateOfBirth', 'club', 'gender', 'belt', 'weight', 'nationality', 'email', 'phone', 'consentAccepted'];
    if (alwaysMandatory.includes(fieldName)) return true;
    // Campos configuráveis
    return mandatoryFieldsConfig?.[fieldName] === true;
  };

  return (
    <div className="p-4 border rounded-md">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold">Registrar Novo Atleta</h3>
        <Button onClick={() => navigate(`/events/${eventId}/registration-options`)} variant="outline">Voltar para Opções</Button>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Nome {isFieldMandatory('firstName') && <span className="text-red-500">*</span>}</Label>
            <Input id="firstName" {...register('firstName')} />
            {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Sobrenome {isFieldMandatory('lastName') && <span className="text-red-500">*</span>}</Label>
            <Input id="lastName" {...register('lastName')} />
            {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="dateOfBirth">Data de Nascimento {isFieldMandatory('dateOfBirth') && <span className="text-red-500">*</span>}</Label>
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
            id="consentAccepted"
            checked={watch('consentAccepted')}
            onCheckedChange={(checked) => setValue('consentAccepted', checked as boolean)}
          />
          <Label htmlFor="consentAccepted">Eu aceito os termos e condições. {isFieldMandatory('consentAccepted') && <span className="text-red-500">*</span>}</Label>
        </div>
        {errors.consentAccepted && <p className="text-red-500 text-sm mt-1">{errors.consentAccepted.message}</p>}

        <Button type="submit" className="w-full">Registrar Atleta</Button>
      </form>
    </div>
  );
};

export default AthleteRegistrationForm;