"use client";

import React, { useState, useEffect, useMemo } from 'react';
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
import { Athlete, Belt, Gender } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { useParams } from 'react-router-dom'; // Import useParams

interface AthleteRegistrationFormProps {
  eventId: string;
  onRegister: (athlete: Athlete) => void;
  mandatoryFieldsConfig?: Record<string, boolean>; // Nova prop para configuração de campos obrigatórios
}

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

const AthleteRegistrationForm: React.FC<AthleteRegistrationFormProps> = ({ onRegister, mandatoryFieldsConfig }) => {
  const { id: eventIdFromParams } = useParams<{ id: string }>();
  const currentEventId = eventIdFromParams || ''; // Use eventId from params

  // Função para criar o esquema dinamicamente
  const createDynamicSchema = (config?: Record<string, boolean>) => {
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

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<z.infer<typeof currentSchema>>({
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
  const paymentProof = watch('paymentProof');
  const photo = watch('photo');
  const emiratesIdFront = watch('emiratesIdFront');
  const emiratesIdBack = watch('emiratesIdBack');

  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
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

      const newAthlete: Athlete = {
        id: `athlete-${Date.now()}`,
        eventId: currentEventId, // Usar o eventId obtido dos parâmetros da URL
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

      onRegister(newAthlete);
      showSuccess('Inscrição enviada para aprovação!');
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md">
      <h3 className="text-xl font-semibold mb-4">Registrar Novo Atleta</h3>

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
        {errors.phone && <<dyad-problem-report summary="34 problems">
<problem file="src/pages/EventDetail.tsx" line="380" column="30" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="381" column="28" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="382" column="26" code="2304">Cannot find name 'numFightAreas'.</problem>
<problem file="src/pages/EventDetail.tsx" line="391" column="27" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="392" column="25" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="393" column="24" code="2304">Cannot find name 'numFightAreas'.</problem>
<problem file="src/pages/EventDetail.tsx" line="756" column="30" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="756" column="56" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="762" column="39" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="766" column="37" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="767" column="52" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="767" column="81" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="771" column="33" code="2304">Cannot find name 'setCheckInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="779" column="38" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="779" column="64" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="782" column="37" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="783" column="60" code="2304">Cannot find name 'checkInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="785" column="35" code="2304">Cannot find name 'setCheckInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="789" column="35" code="2304">Cannot find name 'setCheckInStartTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="806" column="30" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="806" column="54" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="812" column="39" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="816" column="37" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="817" column="52" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="817" column="79" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="821" column="33" code="2304">Cannot find name 'setCheckInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="829" column="38" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="829" column="62" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="832" column="37" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="833" column="60" code="2304">Cannot find name 'checkInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="835" column="35" code="2304">Cannot find name 'setCheckInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="839" column="35" code="2304">Cannot find name 'setCheckInEndTime'.</problem>
<problem file="src/pages/EventDetail.tsx" line="853" column="32" code="2304">Cannot find name 'numFightAreas'.</problem>
<problem file="src/pages/EventDetail.tsx" line="854" column="42" code="2304">Cannot find name 'setNumFightAreas'.</problem>
</dyad-problem-report><think>**Investigating Type Errors**

I'm currently focused on the `EventDetail.tsx` file.  I've identified 34 TypeScript compile-time errors.  Most of these seem to revolve around missing definitions for variables like `checkInStartTime`, `checkInEndTime`, `numFightAreas`, and their corresponding setters. It looks like type definitions or imports might be missing. I need to track down the sources.


**Debugging Missing State**

I've determined the core issue. The errors are due to undeclared state variables (`checkInStartTime`, `checkInEndTime`, `numFightAreas`) and their setters within `EventDetail.tsx`.  They're likely remnants of an older code version.  My plan is to add `useState` hooks to declare and initialize these, pulling data from the `event` object fetched from Supabase within the `useEffect`.  I will also update the input change handlers to properly update these state variables.


**Resolving Undeclared State**

I've made a crucial breakthrough. The 34 errors stem from undeclared state variables. I'll declare `checkInStartTime`, `checkInEndTime`, and `numFightAreas` using `useState` in `EventDetail.tsx`.  I'll initialize them using data from Supabase within the `useEffect` hook. I will review and update time and area inputs' change handlers to modify these state variables correctly. Finally, I will check the `handleUpdateEventSettings` function to ensure it uses the updated state.


</think>Você está absolutamente certo! Peço desculpas por esses erros. Eles ocorrem porque as variáveis de estado `checkInStartTime`, `checkInEndTime` e `numFightAreas` não foram declaradas no componente `EventDetail.tsx`.

Vou adicionar as declarações `useState` para essas variáveis e inicializá-las com os valores do evento carregado do Supabase.

<dyad-write path="src/pages/EventDetail.tsx" description="Adicionando variáveis de estado para checkInStartTime, checkInEndTime e numFightAreas e inicializando-as.">
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import CheckInForm from '@/components/CheckInForm';
import QrCodeScanner from '@/components/QrCodeScanner';
import DivisionTable from '@/components/DivisionTable';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';
import AttendanceManagement from '@/components/AttendanceManagement';
import { Athlete, Event, WeightAttempt, Division } from '../types/index';
import { UserRound, Edit, CheckCircle, XCircle, Scale, CalendarIcon, Search, Trash2, PlusCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision, getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid, differenceInSeconds } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { userRole, userClub } = useSession();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [event, setEvent] = useState<Event | null>(null);
  const [eventAthletes, setEventAthletes] = useState<Athlete[]>([]);
  const [eventDivisions, setEventDivisions] = useState<Division[]>([]);
  const [loadingEventData, setLoadingEventData] = useState(true);

  // Novas variáveis de estado para as configurações do evento
  const [checkInStartTime, setCheckInStartTime] = useState<Date | undefined>(undefined);
  const [checkInEndTime, setCheckInEndTime] = useState<Date | undefined>(undefined);
  const [numFightAreas, setNumFightAreas] = useState<number>(1);


  // Configuração de campos obrigatórios para check-in
  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true, firstName: true, lastName: true, dateOfBirth: true, belt: true, weight: true,
      idNumber: true, gender: true, nationality: true, email: true, phone: true,
      photo: false, emiratesIdFront: false, emiratesIdBack: false, paymentProof: false,
    };
  }, [eventId]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return;
      setLoadingEventData(true);

      // Fetch Event
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        showError('Erro ao carregar detalhes do evento: ' + eventError.message);
        setEvent(null);
      } else {
        setEvent(eventData);
        // Initialize new state variables from fetched event data
        setCheckInStartTime(eventData.checkInStartTime ? parseISO(eventData.checkInStartTime) : undefined);
        setCheckInEndTime(eventData.checkInEndTime ? parseISO(eventData.checkInEndTime) : undefined);
        setNumFightAreas(eventData.numFightAreas || 1);
      }

      // Fetch Athletes
      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('*')
        .eq('event_id', eventId);

      if (athletesError) {
        showError('Erro ao carregar atletas: ' + athletesError.message);
        setEventAthletes([]);
      } else {
        // Convert date strings to Date objects
        const processedAthletes = (athletesData || []).map(a => ({
          ...a,
          dateOfBirth: parseISO(a.date_of_birth),
          consentDate: parseISO(a.consent_date),
          weightAttempts: a.weight_attempts || [],
        }));
        setEventAthletes(processedAthletes);
      }

      // Fetch Divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('event_id', eventId);

      if (divisionsError) {
        showError('Erro ao carregar divisões: ' + divisionsError.message);
        setEventDivisions([]);
      } else {
        setEventDivisions(divisionsData || []);
      }

      setLoadingEventData(false);
    };

    fetchEventData();

    // Handle imported athletes from localStorage (one-time transfer)
    const storedImportedAthletes = localStorage.getItem(`importedAthletes_${eventId}`);
    if (storedImportedAthletes) {
      try {
        const initialImportedAthletes: Athlete[] = JSON.parse(storedImportedAthletes).map((a: any) => ({
          ...a,
          dateOfBirth: new Date(a.dateOfBirth),
          consentDate: new Date(a.consentDate),
        }));
        if (initialImportedAthletes.length > 0) {
          // Insert into Supabase
          supabase.from('athletes').insert(initialImportedAthletes.map(a => ({
            ...a,
            event_id: a.eventId,
            date_of_birth: format(a.dateOfBirth, 'yyyy-MM-dd'),
            consent_date: a.consentDate.toISOString(),
            weight_attempts: JSON.stringify(a.weightAttempts),
            // Ensure other date/time fields are ISO strings if they exist
          }))).then(({ error }) => {
            if (error) {
              showError('Erro ao importar atletas do CSV para o Supabase: ' + error.message);
            } else {
              showSuccess(`Atletas importados do arquivo CSV carregados para o evento ${eventId}.`);
              setEventAthletes(prev => [...prev, ...initialImportedAthletes]);
              localStorage.removeItem(`importedAthletes_${eventId}`);
            }
          });
        }
      } catch (e) {
        console.error("Falha ao analisar atletas importados do localStorage", e);
        showError("Erro ao carregar atletas importados do armazenamento local.");
      }
    }
  }, [eventId]);

  // Timer for current time and time remaining
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAthleteRegistration = async (newAthlete: Athlete) => {
    if (!eventId) return;

    const { data, error } = await supabase
      .from('athletes')
      .insert({
        ...newAthlete,
        event_id: eventId,
        date_of_birth: format(newAthlete.dateOfBirth, 'yyyy-MM-dd'),
        consent_date: newAthlete.consentDate.toISOString(),
        weight_attempts: JSON.stringify(newAthlete.weightAttempts),
      })
      .select()
      .single();

    if (error) {
      showError('Erro ao registrar atleta: ' + error.message);
    } else if (data) {
      setEventAthletes(prev => [...prev, {
        ...data,
        dateOfBirth: parseISO(data.date_of_birth),
        consentDate: parseISO(data.consent_date),
        weightAttempts: data.weight_attempts || [],
      }]);
      showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso e aguardando aprovação!`);
    }
  };

  const handleAthleteUpdate = async (updatedAthlete: Athlete) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({
        ...updatedAthlete,
        date_of_birth: format(updatedAthlete.dateOfBirth, 'yyyy-MM-dd'),
        consent_date: updatedAthlete.consentDate.toISOString(),
        weight_attempts: JSON.stringify(updatedAthlete.weightAttempts),
      })
      .eq('id', updatedAthlete.id);

    if (error) {
      showError('Erro ao atualizar atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === updatedAthlete.id ? updatedAthlete : athlete
      ));
      setEditingAthlete(null);
      showSuccess('Perfil do atleta atualizado com sucesso!');
    }
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao remover atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.filter(athlete => athlete.id !== athleteId));
      showSuccess('Inscrição do atleta removida com sucesso!');
    }
  };

  const handleCheckInAthlete = async (athleteId: string, registeredWeight: number, status: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({
        registered_weight: registeredWeight,
        check_in_status: status,
        weight_attempts: JSON.stringify(weightAttempts),
      })
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao atualizar check-in do atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === athleteId
          ? { ...athlete, registeredWeight, checkInStatus: status, weightAttempts }
          : athlete
      ));
    }
  };

  const handleUpdateAthleteAttendance = async (athleteId: string, status: Athlete['attendanceStatus']) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({ attendance_status: status })
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao atualizar status de presença: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === athleteId
          ? { ...athlete, attendanceStatus: status }
          : athlete
      ));
    }
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAllAthletes = (checked: boolean) => {
    const athletesUnderApproval = eventAthletes.filter(a => a.registrationStatus === 'under_approval');
    if (checked) {
      setSelectedAthletesForApproval(athletesUnderApproval.map(a => a.id));
    } else {
      setSelectedAthletesForApproval([]);
    }
  };

  const handleApproveSelected = async () => {
    if (!eventId || selectedAthletesForApproval.length === 0) return;

    const { error } = await supabase
      .from('athletes')
      .update({ registration_status: 'approved' })
      .in('id', selectedAthletesForApproval);

    if (error) {
      showError('Erro ao aprovar inscrições: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        selectedAthletesForApproval.includes(athlete.id)
          ? { ...athlete, registrationStatus: 'approved' as const }
          : athlete
      ));
      showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas com sucesso!`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleRejectSelected = async () => {
    if (!eventId || selectedAthletesForApproval.length === 0) return;

    const { error } = await supabase
      .from('athletes')
      .update({ registration_status: 'rejected' })
      .in('id', selectedAthletesForApproval);

    if (error) {
      showError('Erro ao rejeitar inscrições: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        selectedAthletesForApproval.includes(athlete.id)
          ? { ...athlete, registrationStatus: 'rejected' as const }
          : athlete
      ));
      showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleUpdateDivisions = async (updatedDivisions: Division[]) => {
    if (!eventId) return;

    // Separate inserts/updates/deletes
    const existingDivisionIds = new Set(eventDivisions.map(d => d.id));
    const updatedDivisionIds = new Set(updatedDivisions.map(d => d.id));

    const divisionsToInsert = updatedDivisions.filter(d => !existingDivisionIds.has(d.id));
    const divisionsToUpdate = updatedDivisions.filter(d => existingDivisionIds.has(d.id));
    const divisionsToDelete = eventDivisions.filter(d => !updatedDivisionIds.has(d.id));

    let hasError = false;

    // Inserts
    if (divisionsToInsert.length > 0) {
      const { error } = await supabase.from('divisions').insert(divisionsToInsert.map(d => ({
        ...d,
        event_id: eventId,
      })));
      if (error) {
        showError('Erro ao adicionar divisões: ' + error.message);
        hasError = true;
      }
    }

    // Updates
    for (const division of divisionsToUpdate) {
      const { error } = await supabase.from('divisions').update(division).eq('id', division.id);
      if (error) {
        showError(`Erro ao atualizar divisão ${division.name}: ` + error.message);
        hasError = true;
      }
    }

    // Deletes
    if (divisionsToDelete.length > 0) {
      const { error } = await supabase.from('divisions').delete().in('id', divisionsToDelete.map(d => d.id));
      if (error) {
        showError('Erro ao remover divisões: ' + error.message);
        hasError = true;
      }
    }

    if (!hasError) {
      setEventDivisions(updatedDivisions);
      showSuccess('Divisões atualizadas com sucesso!');
    }
  };

  const handleUpdateEventSettings = async () => {
    if (!eventId || !event) return;

    const { error } = await supabase
      .from('events')
      .update({
        check_in_start_time: checkInStartTime?.toISOString() || null,
        check_in_end_time: checkInEndTime?.toISOString() || null,
        num_fight_areas: numFightAreas,
      })
      .eq('id', eventId);

    if (error) {
      showError('Erro ao atualizar configurações do evento: ' + error.message);
    } else {
      setEvent(prev => prev ? {
        ...prev,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas: numFightAreas,
      } : null);
      showSuccess('Configurações do evento atualizadas!');
    }
  };

  if (loadingEventData || !event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Carregando detalhes do evento...</div>
      </Layout>
    );
  }

  const athletesUnderApproval = eventAthletes.filter(a => a.registrationStatus === 'under_approval');
  const approvedAthletes = eventAthletes.filter(a => a.registrationStatus === 'approved');
  const rejectedAthletes = eventAthletes.filter(a => a.registrationStatus === 'rejected');

  // Processar atletas aprovados para incluir informações da divisão
  const processedApprovedAthletes = useMemo(() => {
    return approvedAthletes.map(athlete => {
      const division = findAthleteDivision(athlete, eventDivisions);
      return {
        ...athlete,
        _division: division, // Armazenar a divisão encontrada para uso posterior
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [approvedAthletes, eventDivisions]);

  const sortedAthletesUnderApproval = useMemo(() => {
    return athletesUnderApproval.map(athlete => {
      const division = findAthleteDivision(athlete, eventDivisions);
      return {
        ...athlete,
        _division: division,
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [athletesUnderApproval, eventDivisions]);


  // Lógica para verificar se o check-in é permitido
  const isCheckInTimeValid = () => {
    if (!event.checkInStartTime || !event.checkInEndTime) return false;
    const start = parseISO(event.checkInStartTime);
    const end = parseISO(event.checkInEndTime);
    const now = new Date();
    return now >= start && now <= end;
  };

  const isCheckInAllowed = userRole === 'admin' || isCheckInTimeValid();

  // Filtragem de atletas para o check-in
  const filteredAthletesForCheckIn = useMemo(() => {
    let athletesToFilter = processedApprovedAthletes;

    // Filtra por attendanceStatus: apenas 'present'
    athletesToFilter = athletesToFilter.filter(a => a.attendanceStatus === 'present');

    if (scannedAthleteId) {
      athletesToFilter = athletesToFilter.filter(athlete => athlete.id === scannedAthleteId);
    } else if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      athletesToFilter = athletesToFilter.filter(athlete =>
        athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (checkInFilter === 'pending') {
      return athletesToFilter.filter(a => a.checkInStatus === 'pending');
    } else if (checkInFilter === 'done') {
      return athletesToFilter.filter(a => a.checkInStatus === 'checked_in' || a.checkInStatus === 'overweight');
    }
    return athletesToFilter; // 'all' filter
  }, [processedApprovedAthletes, searchTerm, scannedAthleteId, checkInFilter]);

  // Check-in Summary Calculations
  const totalOverweights = processedApprovedAthletes.filter(a => a.checkInStatus === 'overweight').length;
  const totalCheckedInOk = processedApprovedAthletes.filter(a => a.checkInStatus === 'checked_in').length;
  const totalPending = processedApprovedAthletes.filter(a => a.checkInStatus === 'pending').length;
  const totalApprovedAthletes = processedApprovedAthletes.length;

  const timeRemainingInSeconds = event.checkInEndTime ? differenceInSeconds(parseISO(event.checkInEndTime), currentTime) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0
    ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${timeRemainingInSeconds % 60}s`
    : 'Encerrado';


  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          {userRole === 'admin' && (
            <>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="approvals">Aprovações ({athletesUnderApproval.length})</TabsTrigger>
              <TabsTrigger value="divisions">Divisões ({eventDivisions.length})</TabsTrigger>
            </>
          )}
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="llm">LLM (Q&A)</TabsTrigger>
        </TabsList>

        <TabsContent value="inscricoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Inscrições</CardTitle>
              <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              {!editingAthlete && (
                <div className="mb-6">
                  <Link to={`/events/${eventId}/registration-options`}>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atleta
                    </Button>
                  </Link>
                </div>
              )}

              {editingAthlete && (
                <AthleteProfileEditForm
                  athlete={editingAthlete}
                  onSave={handleAthleteUpdate}
                  onCancel={() => setEditingAthlete(null)}
                  mandatoryFieldsConfig={mandatoryFieldsConfig}
                />
              )}

              <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({processedApprovedAthletes.length})</h3>
              {processedApprovedAthletes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {processedApprovedAthletes.map((athlete) => (
                    <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                      <div className="flex items-center space-x-4">
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                          <p className="text-xs text-gray-500">Status: <span className="font-semibold text-green-600">Aprovado</span></p>
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.firstName} {athlete.lastName}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checkin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Check-in de Atletas</span>
                <div className="text-sm font-normal text-muted-foreground flex flex-col items-end">
                  <span>Hora Atual: {format(currentTime, 'HH:mm:ss')}</span>
                  <span>Tempo para fechar: {timeRemainingFormatted}</span>
                </div>
              </CardTitle>
              <CardDescription>
                Confirme a presença e o peso dos atletas.
                {!isCheckInTimeValid() && userRole !== 'admin' && (
                  <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
                )}
                {isCheckInTimeValid() && (
                  <span className="text-green-600 block mt-2">Check-in aberto!</span>
                )}
                {!event.checkInStartTime || !event.checkInEndTime ? (
                  <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
                ) : (
                  <span className="text-muted-foreground block mt-2">Horário: {format(parseISO(event.checkInStartTime), 'dd/MM HH:mm')} - {format(parseISO(event.checkInEndTime), 'dd/MM HH:mm')}</span>
                )}
                <div className="mt-4 text-sm">
                  <p>Total de Atletas Aprovados: <span className="font-semibold">{totalApprovedAthletes}</span></p>
                  <p>Check-in OK: <span className="font-semibold text-green-600">{totalCheckedInOk}</span></p>
                  <p>Acima do Peso: <span className="font-semibold text-red-600">{totalOverweights}</span></p>
                  <p>Faltam: <span className="font-semibold text-orange-500">{totalPending}</span></p>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <QrCodeScanner onScanSuccess={(id) => {
                    setScannedAthleteId(id);
                    setSearchTerm('');
                    showSuccess(`Atleta ${id} escaneado!`);
                  }} />
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Buscar atleta (nome, clube, divisão...)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setScannedAthleteId(null);
                    }}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="mb-4 flex justify-center">
                <ToggleGroup type="single" value={checkInFilter} onValueChange={(value: 'pending' | 'done' | 'all') => value && setCheckInFilter(value)}>
                  <ToggleGroupItem value="pending" aria-label="Mostrar pendentes">
                    Pendentes
                  </ToggleGroupItem>
                  <ToggleGroupItem value="done" aria-label="Mostrar concluídos">
                    Concluídos
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label="Mostrar todos">
                    Todos
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {filteredAthletesForCheckIn.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado para check-in encontrado com os critérios atuais.</p>
              ) : (
                <ul className="space-y-4">
                  {filteredAthletesForCheckIn.map((athlete) => (
                    <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                      <div className="flex items-center space-x-3 flex-grow">
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                          {athlete.registeredWeight && (
                            <p className="text-xs text-gray-500">Último peso: <span className="font-semibold">{athlete.registeredWeight}kg</span></p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {athlete.checkInStatus === 'checked_in' && (
                            <span className="flex items-center text-green-600 font-semibold text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Check-in OK
                            </span>
                          )}
                          {athlete.checkInStatus === 'overweight' && (
                            <span className="flex items-center text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4 mr-1" /> Overweight ({athlete.registeredWeight}kg)
                            </span>
                          )}
                          {athlete.checkInStatus === 'pending' && (
                            <span className="flex items-center text-orange-500 font-semibold text-sm">
                              <Scale className="h-4 w-4 mr-1" /> Pendente
                            </span>
                          )}
                        </div>
                        <CheckInForm
                          athlete={athlete}
                          onCheckIn={handleCheckInAthlete}
                          isCheckInAllowed={isCheckInAllowed}
                          divisionMaxWeight={athlete._division?.maxWeight}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceManagement
            eventId={eventId}
            eventDivisions={eventDivisions}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
          />
        </TabsContent>

        <TabsContent value="brackets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brackets</CardTitle>
              <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Brackets para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'admin' && (
          <>
            <TabsContent value="admin" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Administração do Evento</CardTitle>
                  <CardDescription>Gerencie usuários e configurações do evento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/events/${eventId}/import-athletes`}>
                    <Button className="w-full">Importar Atletas em Lote</Button>
                  </Link>

                  <div className="mt-8 space-y-4">
                    <h3 className="text-xl font-semibold">Configurações de Check-in</h3>
                    <div>
                      <Label htmlFor="checkInStartTime">Início do Check-in</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkInStartTime ? format(checkInStartTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={checkInStartTime}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (checkInStartTime) {
                                  newDate.setHours(checkInStartTime.getHours(), checkInStartTime.getMinutes());
                                } else {
                                  newDate.setHours(9, 0); // Default to 9 AM
                                }
                                setCheckInStartTime(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={checkInStartTime ? format(checkInStartTime, 'HH:mm') : '09:00'}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                if (checkInStartTime) {
                                  const newDate = new Date(checkInStartTime);
                                  newDate.setHours(hours, minutes);
                                  setCheckInStartTime(newDate);
                                } else {
                                  const newDate = new Date();
                                  newDate.setHours(hours, minutes);
                                  setCheckInStartTime(newDate);
                                }
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="checkInEndTime">Fim do Check-in</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {checkInEndTime ? format(checkInEndTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={checkInEndTime}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (checkInEndTime) {
                                  newDate.setHours(checkInEndTime.getHours(), checkInEndTime.getMinutes());
                                } else {
                                  newDate.setHours(17, 0); // Default to 5 PM
                                }
                                setCheckInEndTime(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={checkInEndTime ? format(checkInEndTime, 'HH:mm') : '17:00'}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                if (checkInEndTime) {
                                  const newDate = new Date(checkInEndTime);
                                  newDate.setHours(hours, minutes);
                                  setCheckInEndTime(newDate);
                                } else {
                                  const newDate = new Date();
                                  newDate.setHours(hours, minutes);
                                  setCheckInEndTime(newDate);
                                }
                              }}
                            />
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div>
                      <Label htmlFor="numFightAreas">Número de Áreas de Luta</Label>
                      <Input
                        id="numFightAreas"
                        type="number"
                        min="1"
                        value={numFightAreas}
                        onChange={(e) => setNumFightAreas(Number(e.target.value))}
                      />
                    </div>
                    <Button onClick={handleUpdateEventSettings}>Salvar Configurações do Evento</Button>
                  </div>
                  <CheckInMandatoryFieldsConfig eventId={eventId} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aprovações de Inscrição</CardTitle>
                  <CardDescription>Revise e aprove ou rejeite as inscrições pendentes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedAthletesUnderApproval.length === 0 ? (
                    <p className="text-muted-foreground">Nenhuma inscrição aguardando aprovação.</p>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 mb-4">
                        <Checkbox
                          id="selectAll"
                          checked={selectedAthletesForApproval.length === sortedAthletesUnderApproval.length && sortedAthletesUnderApproval.length > 0}
                          onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean)}
                        />
                        <Label htmlFor="selectAll">Selecionar Todos</Label>
                      </div>
                      <div className="flex space-x-2 mb-4">
                        <Button onClick={handleApproveSelected} disabled={selectedAthletesForApproval.length === 0}>
                          Aprovar Selecionados ({selectedAthletesForApproval.length})
                        </Button>
                        <Button onClick={handleRejectSelected} disabled={selectedAthletesForApproval.length === 0} variant="destructive">
                          Rejeitar Selecionados ({selectedAthletesForApproval.length})
                        </Button>
                      </div>
                      <ul className="space-y-2">
                        {sortedAthletesUnderApproval.map((athlete) => (
                          <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                            <div className="flex items-center space-x-4">
                              <Checkbox
                                checked={selectedAthletesForApproval.includes(athlete.id)}
                                onCheckedChange={() => handleToggleAthleteSelection(athlete.id)}
                              />
                              {athlete.photoUrl ? (
                                <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                  <UserRound className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-grow">
                                <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                                <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                                {athlete.paymentProofUrl && (
                                  <p className="text-xs text-blue-500">
                                    <a href={athlete.paymentProofUrl} target="_blank" rel="noopener noreferrer">Ver Comprovante</a>
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-orange-500 font-semibold">Aguardando Aprovação</span>
                              {userRole === 'admin' && (
                                <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.firstName} {athlete.lastName}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remover</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="divisions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Divisões do Evento</CardTitle>
                  <CardDescription>Configure as divisões de idade, peso, gênero e faixa para este evento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/events/${eventId}/import-divisions`}>
                    <Button className="w-full">Importar Divisões em Lote</Button>
                  </Link>
                  <DivisionTable eventId={eventId} divisions={eventDivisions} onUpdateDivisions={handleUpdateDivisions} />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

        <TabsContent value="resultados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>Marque vencedores e exporte resultados.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Resultados para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas & Respostas (LLM)</CardTitle>
              <CardDescription>Faça perguntas sobre os dados do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba LLM (stub) para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default EventDetail;