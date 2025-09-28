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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Athlete, Belt, Gender } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';

interface AthleteProfileEditFormProps {
  athlete: Athlete;
  onSave: (updatedAthlete: Athlete) => void;
  onCancel: () => void;
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

const emiratesIdOptionalSchema = z.string().optional();
const schoolIdOptionalSchema = z.string().optional();

const fileListSchema = typeof window === 'undefined' ? z.any() : z.instanceof(FileList);

const AthleteProfileEditForm: React.FC<AthleteProfileEditFormProps> = ({ athlete, onSave, onCancel, mandatoryFieldsConfig }) => {
  // Função para criar o esquema dinamicamente
  const createDynamicSchema = (config?: Record<string, boolean>) => {
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
      // paymentProof is not editable via this form, so it's not included in dynamic schema for edit.
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
      first_name: athlete.first_name,
      last_name: athlete.last_name,
      date_of_birth: athlete.date_of_birth,
      club: athlete.club,
      gender: athlete.gender,
      belt: athlete.belt,
      weight: athlete.weight,
      nationality: athlete.nationality,
      email: athlete.email,
      phone: athlete.phone,
      emirates_id: athlete.emirates_id,
      school_id: athlete.school_id,
    },
  });

  const date_of_birth = watch('date_of_birth');
  const currentGender = watch('gender');
  const currentBelt = watch('belt');
  const photo = watch('photo');
  const emiratesIdFront = watch('emiratesIdFront');
  const emiratesIdBack = watch('emiratesIdBack');

  const onSubmit = async (values: z.infer<typeof currentSchema>) => {
    try {
      const age = new Date().getFullYear() - values.date_of_birth!.getFullYear();
      const age_division = getAgeDivision(age);
      const weight_division = getWeightDivision(values.weight!);

      let newRegistrationStatus = athlete.registration_status;

      // Check if any significant field has changed that would require re-approval
      const hasChangesRequiringReapproval =
        values.first_name !== athlete.first_name ||
        values.last_name !== athlete.last_name ||
        values.date_of_birth!.getTime() !== athlete.date_of_birth.getTime() ||
        values.club !== athlete.club ||
        values.gender !== athlete.gender ||
        values.belt !== athlete.belt ||
        values.weight !== athlete.weight ||
        values.nationality !== athlete.nationality ||
        values.email !== athlete.email ||
        values.phone !== athlete.phone ||
        values.emirates_id !== athlete.emirates_id ||
        values.school_id !== athlete.school_id;

      if (athlete.registration_status === 'approved' && hasChangesRequiringReapproval) {
        newRegistrationStatus = 'under_approval';
        showSuccess('Perfil atualizado. A aprovação anterior foi cancelada e requer nova aprovação.');
      } else {
        showSuccess('Perfil atualizado com sucesso!');
      }

      let photo_url = athlete.photo_url;
      if (values.photo && values.photo.length > 0) {
        photo_url = `mock-photo-url/${values.photo[0].name}`;
        showSuccess(`Nova foto de perfil ${values.photo[0].name} anexada.`);
      }

      let emirates_id_front_url = athlete.emirates_id_front_url;
      if (values.emiratesIdFront && values.emiratesIdFront.length > 0) {
        emirates_id_front_url = `mock-eid-front-url/${values.emiratesIdFront[0].name}`;
        showSuccess(`Nova foto da frente do EID ${values.emiratesIdFront[0].name} anexada.`);
      }

      let emirates_id_back_url = athlete.emirates_id_back_url;
      if (values.emiratesIdBack && values.emiratesIdBack.length > 0) {
        emirates_id_back_url = `mock-eid-back-url/${values.emiratesIdBack[0].name}`;
        showSuccess(`Nova foto do verso do EID ${values.emiratesIdBack[0].name} anexada.`);
      }

      const updatedAthlete: Athlete = {
        ...athlete,
        ...values,
        age,
        age_division,
        weight_division,
        registration_status: newRegistrationStatus,
        photo_url,
        emirates_id_front_url,
        emirates_id_back_url,
      };

      onSave(updatedAthlete);
    } catch (error: any) {
      showError('Erro ao atualizar atleta: ' + error.message);
    }
  };

  const isFieldMandatory = (fieldName: string) => {
    // Campos sempre obrigatórios
    const alwaysMandatory = ['first_name', 'last_name', 'date_of_birth', 'club', 'gender', 'belt', 'weight', 'nationality', 'email', 'phone'];
    if (alwaysMandatory.includes(fieldName)) return true;
    // Campos configuráveis
    return mandatoryFieldsConfig?.[fieldName] === true;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md">
      <h3 className="text-xl font-semibold mb-4">Editar Perfil do Atleta</h3>

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
          value={currentGender}
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
        <Select onValueChange={(value: Belt) => setValue('belt', value)} value={currentBelt}>
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
        {athlete.photo_url && !photo?.length && (
          <p className="text-sm text-muted-foreground mt-1">Foto atual: <a href={athlete.photo_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emiratesIdFront">Emirates ID (Frente {isFieldMandatory('emiratesIdFront') && <span className="text-red-500">*</span>})</Label>
          <Input id="emiratesIdFront" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdFront')} />
          {errors.emiratesIdFront?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdFront.message as string}</p>}
          {athlete.emirates_id_front_url && !emiratesIdFront?.length && (
            <p className="text-sm text-muted-foreground mt-1">Frente atual: <a href={athlete.emirates_id_front_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
          )}
        </div>
        <div>
          <Label htmlFor="emiratesIdBack">Emirates ID (Verso {isFieldMandatory('emiratesIdBack') && <span className="text-red-500">*</span>})</Label>
          <Input id="emiratesIdBack" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdBack')} />
          {errors.emiratesIdBack?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdBack.message as string}</p>}
          {athlete.emirates_id_back_url && !emiratesIdBack?.length && (
            <p className="text-sm text-muted-foreground mt-1">Verso atual: <a href={athlete.emirates_id_back_url} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-2 mt-6">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Salvar Alterações</Button>
      </div>
    </form>
  );
};

export default AthleteProfileEditForm;