"use client";

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Athlete, AthleteBelt, Gender } from '@/types/index'; // Usar AthleteBelt e Gender exportados
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';

// Esquema de validação para o formulário de edição de atleta
const athleteEditSchema = z.object({
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
  emiratesId: z.string().optional(), // Adicionado
  schoolId: z.string().optional(), // Adicionado
  photo: z.any().optional(),
  emiratesIdFront: z.any().optional(),
  emiratesIdBack: z.any().optional(),
  paymentProof: z.any().optional(),
});

type AthleteEditFormData = z.infer<typeof athleteEditSchema>;

interface AthleteProfileEditFormProps {
  athlete: Athlete;
  onSave: (updatedAthlete: Athlete) => void;
  onCancel: () => void;
  mandatoryFieldsConfig: { [key: string]: boolean };
}

const AthleteProfileEditForm: React.FC<AthleteProfileEditFormProps> = ({ athlete, onSave, onCancel, mandatoryFieldsConfig }) => {
  const { register, handleSubmit, setValue, watch, formState: { errors, isDirty } } = useForm<AthleteEditFormData>({
    resolver: zodResolver(athleteEditSchema),
    defaultValues: {
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth,
      gender: athlete.gender,
      nationality: athlete.nationality,
      belt: athlete.belt,
      weight: athlete.weight,
      club: athlete.club,
      email: athlete.email,
      phone: athlete.phone,
      idNumber: athlete.idNumber,
      emiratesId: athlete.emiratesId || '', // Inicializar com valor existente ou vazio
      schoolId: athlete.schoolId || '', // Inicializar com valor existente ou vazio
    }
  });

  const dateOfBirth = watch('dateOfBirth');
  const gender = watch('gender');
  const belt = watch('belt');
  const photo = watch('photo');
  const emiratesIdFront = watch('emiratesIdFront');
  const emiratesIdBack = watch('emiratesIdBack');
  const paymentProof = watch('paymentProof');

  const onSubmit = (values: AthleteEditFormData) => {
    // Verificar se houve alguma alteração antes de salvar
    const hasChanges =
      values.firstName !== athlete.firstName ||
      values.lastName !== athlete.lastName ||
      values.dateOfBirth.getTime() !== athlete.dateOfBirth.getTime() ||
      values.gender !== athlete.gender ||
      values.nationality !== athlete.nationality ||
      values.belt !== athlete.belt ||
      values.weight !== athlete.weight ||
      values.club !== athlete.club ||
      values.email !== athlete.email ||
      values.phone !== athlete.phone ||
      values.idNumber !== athlete.idNumber ||
      values.emiratesId !== athlete.emiratesId || // Comparar novo campo
      values.schoolId !== athlete.schoolId || // Comparar novo campo
      (photo && photo.length > 0) ||
      (emiratesIdFront && emiratesIdFront.length > 0) ||
      (emiratesIdBack && emiratesIdBack.length > 0) ||
      (paymentProof && paymentProof.length > 0);

    if (!hasChanges) {
      showError("Nenhuma alteração detectada.");
      onCancel();
      return;
    }

    try {
      const age = new Date().getFullYear() - values.dateOfBirth.getFullYear();
      const ageDivision = getAgeDivision(age);
      const weightDivision = getWeightDivision(values.weight);

      const generateMockUrl = (file: File) => URL.createObjectURL(file);

      let photoUrl = athlete.photoUrl;
      if (photo && photo.length > 0) {
        photoUrl = generateMockUrl(photo[0]);
      }

      let emiratesIdFrontUrl = athlete.emiratesIdFrontUrl;
      if (emiratesIdFront && emiratesIdFront.length > 0) {
        emiratesIdFrontUrl = generateMockUrl(emiratesIdFront[0]);
      }

      let emiratesIdBackUrl = athlete.emiratesIdBackUrl;
      if (emiratesIdBack && emiratesIdBack.length > 0) {
        emiratesIdBackUrl = generateMockUrl(emiratesIdBack[0]);
      }

      let paymentProofUrl = athlete.paymentProofUrl;
      if (paymentProof && paymentProof.length > 0) {
        paymentProofUrl = generateMockUrl(paymentProof[0]);
      }

      const updatedAthlete: Athlete = {
        ...athlete,
        firstName: values.firstName,
        lastName: values.lastName,
        dateOfBirth: values.dateOfBirth,
        age,
        gender: values.gender,
        nationality: values.nationality,
        belt: values.belt,
        weight: values.weight,
        club: values.club,
        email: values.email,
        phone: values.phone,
        idNumber: values.idNumber,
        emiratesId: values.emiratesId, // Adicionado
        schoolId: values.schoolId, // Adicionado
        photoUrl,
        emiratesIdFrontUrl, // Adicionado
        emiratesIdBackUrl, // Adicionado
        paymentProofUrl,
        ageDivision,
        weightDivision,
      };

      onSave(updatedAthlete);
      showSuccess(`Atleta ${updatedAthlete.firstName} atualizado com sucesso!`);
    } catch (error) {
      showError("Erro ao atualizar atleta. Verifique os dados.");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-lg shadow-sm bg-background">
      <h3 className="text-2xl font-semibold mb-4">Editar Perfil do Atleta</h3>

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

      {/* Novos campos Emirates ID e School ID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emiratesId">Emirates ID</Label>
          <Input id="emiratesId" {...register('emiratesId')} />
          {errors.emiratesId && <p className="text-red-500 text-sm mt-1">{errors.emiratesId.message}</p>}
        </div>
        <div>
          <Label htmlFor="schoolId">School ID</Label>
          <Input id="schoolId" {...register('schoolId')} />
          {errors.schoolId && <p className="text-red-500 text-sm mt-1">{errors.schoolId.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mandatoryFieldsConfig.photo && (
          <div>
            <Label htmlFor="photo" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Foto do Atleta
            </Label>
            <Input id="photo" type="file" accept="image/*" {...register('photo')} />
            {errors.photo && <p className="text-red-500 text-sm mt-1">{errors.photo.message as string}</p>}
            {athlete.photoUrl && !photo?.length && (
              <p className="text-sm text-muted-foreground mt-1">Foto atual: <a href={athlete.photoUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
            )}
          </div>
        )}
        {mandatoryFieldsConfig.emiratesIdFront && (
          <div>
            <Label htmlFor="emiratesIdFront" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Emirates ID (Frente)
            </Label>
            <Input id="emiratesIdFront" type="file" accept="image/*,application/pdf" {...register('emiratesIdFront')} />
            {errors.emiratesIdFront && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdFront.message as string}</p>}
            {athlete.emiratesIdFrontUrl && !emiratesIdFront?.length && (
              <p className="text-sm text-muted-foreground mt-1">Frente atual: <a href={athlete.emiratesIdFrontUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
            )}
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
            {athlete.emiratesIdBackUrl && !emiratesIdBack?.length && (
              <p className="text-sm text-muted-foreground mt-1">Verso atual: <a href={athlete.emiratesIdBackUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
            )}
          </div>
        )}
        {mandatoryFieldsConfig.paymentProof && (
          <div>
            <Label htmlFor="paymentProof" className="flex items-center gap-2">
              <UploadCloud className="h-4 w-4" /> Comprovante de Pagamento
            </Label>
            <Input id="paymentProof" type="file" accept="image/*,application/pdf" {...register('paymentProof')} />
            {errors.paymentProof && <p className="text-red-500 text-sm mt-1">{errors.paymentProof.message as string}</p>}
            {athlete.paymentProofUrl && !paymentProof?.length && (
              <p className="text-sm text-muted-foreground mt-1">Comprovante atual: <a href={athlete.paymentProofUrl} target="_blank" rel="noopener noreferrer" className="underline">Ver</a></p>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={!isDirty && !photo?.length && !emiratesIdFront?.length && !emiratesIdBack?.length && !paymentProof?.length}>Salvar Alterações</Button>
      </div>
    </form>
  );
};

export default AthleteProfileEditForm;