"use client";

import React, { useMemo, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Athlete, Belt, Gender, AgeDivisionSetting, Division } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils';
import { uploadFile } from '@/integrations/supabase/storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AthleteFormFields from '@/components/AthleteFormFields';
import { useTranslations } from '@/hooks/use-translations';

interface AthleteProfileEditFormProps {
  athlete: Athlete;
  onSave: (updatedAthlete: Athlete) => Promise<void>;
  onCancel: () => void;
  mandatoryFieldsConfig?: Record<string, boolean>;
  ageDivisionSettings: AgeDivisionSetting[];
  divisions?: Division[]; // Add divisions prop
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
const manualDivisionIdOptionalSchema = z.string().optional(); // New schema

const fileListSchema = typeof window === 'undefined' ? z.any() : z.instanceof(FileList);

const AthleteProfileEditForm: React.FC<AthleteProfileEditFormProps> = ({ athlete, onSave, onCancel, mandatoryFieldsConfig, ageDivisionSettings, divisions = [] }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formValues, setFormValues] = useState<FormValues | null>(null);

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
      manualDivisionId: manualDivisionIdOptionalSchema,
      photo: config?.photo
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto de perfil é obrigatória.' })
        : fileListSchema.optional(),
      emiratesIdFront: config?.emiratesIdFront
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto da frente do Emirates ID é obrigatória.' })
        : fileListSchema.optional(),
      emiratesIdBack: config?.emiratesIdBack
        ? fileListSchema.refine(file => file.length > 0, { message: 'Foto do verso do Emirates ID é obrigatória.' })
        : fileListSchema.optional(),
    };

    return z.object(schemaDefinition).refine(data => data.emirates_id || data.school_id, {
      message: 'Pelo menos um ID (Emirates ID ou School ID) é obrigatório.',
      path: ['emirates_id'],
    });
  };

  const currentSchema = useMemo(() => createDynamicSchema(mandatoryFieldsConfig), [mandatoryFieldsConfig]);
  type FormValues = z.infer<typeof currentSchema>;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      first_name: athlete.first_name,
      last_name: athlete.last_name,
      date_of_birth: new Date(athlete.date_of_birth),
      club: athlete.club,
      gender: athlete.gender,
      belt: athlete.belt,
      weight: athlete.weight,
      nationality: athlete.nationality,
      email: athlete.email,
      phone: athlete.phone,
      emirates_id: athlete.emirates_id ?? '',
      school_id: athlete.school_id ?? '',
      manualDivisionId: athlete.moved_to_division_id || '',
    },
  });

  const proceedWithSave = async (values: FormValues, status: Athlete['registration_status']) => {
    setIsSaving(true);
    const loadingToast = showLoading('Salvando alterações...');
    try {
      const storagePath = `${athlete.event_id}/${athlete.id}`;

      const uploadPromises = [
        values.photo?.[0] ? uploadFile(values.photo[0], 'athlete-photos', storagePath) : Promise.resolve(athlete.photo_url),
        values.emiratesIdFront?.[0] ? uploadFile(values.emiratesIdFront[0], 'athlete-documents', storagePath) : Promise.resolve(athlete.emirates_id_front_url),
        values.emiratesIdBack?.[0] ? uploadFile(values.emiratesIdBack[0], 'athlete-documents', storagePath) : Promise.resolve(athlete.emirates_id_back_url),
      ];

      const [photo_url, emirates_id_front_url, emirates_id_back_url] = await Promise.all(uploadPromises);

      const age = new Date().getFullYear() - values.date_of_birth!.getFullYear();
      const age_division = getAgeDivision(age, ageDivisionSettings);
      const weight_division = getWeightDivision(values.weight!);

      let moved_to_division_id = athlete.moved_to_division_id;
      let move_reason = athlete.move_reason;

      // Handle Manual Override
      if (values.manualDivisionId) {
        moved_to_division_id = values.manualDivisionId;
        const targetDiv = divisions.find(d => d.id === values.manualDivisionId);
        move_reason = targetDiv ? `${targetDiv.name}` : 'Movido Manualmente';
      } else {
        // If cleared or empty, reset to undefined/null (or keep existing if not overriding... actually, if user clears it in UI, they likely want to reset)
        // Ideally if we default it to the existing override, clearing it implies removing the override.
        moved_to_division_id = undefined;
        move_reason = undefined;
      }

      const updatedAthlete: Athlete = {
        ...athlete,
        ...values,
        date_of_birth: values.date_of_birth!,
        age,
        age_division,
        weight_division,
        registration_status: status,
        photo_url,
        emirates_id_front_url,
        emirates_id_back_url,
        moved_to_division_id, // Update this
        move_reason,          // Update this
      };

      await onSave(updatedAthlete);
      dismissToast(loadingToast);
      if (status === 'under_approval') {
        showSuccess('Perfil atualizado e status redefinido para pendente.');
      }
    } catch (error: any) {
      dismissToast(loadingToast);
      showError('Erro ao atualizar atleta: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const hasChangesRequiringReapproval =
      values.first_name !== athlete.first_name ||
      values.last_name !== athlete.last_name ||
      values.date_of_birth!.getTime() !== new Date(athlete.date_of_birth).getTime() ||
      values.club !== athlete.club ||
      values.gender !== athlete.gender ||
      values.belt !== athlete.belt ||
      values.weight !== athlete.weight ||
      values.nationality !== athlete.nationality ||
      values.email !== athlete.email ||
      values.phone !== athlete.phone ||
      values.emirates_id !== athlete.emirates_id ||
      values.school_id !== athlete.school_id ||
      values.manualDivisionId !== (athlete.moved_to_division_id || '') || // Check manual division
      (values.photo && values.photo.length > 0) ||
      (values.emiratesIdFront && values.emiratesIdFront.length > 0) ||
      (values.emiratesIdBack && values.emiratesIdBack.length > 0);

    if (athlete.registration_status === 'approved' && hasChangesRequiringReapproval) {
      setFormValues(values);
      setShowConfirmation(true);
    } else {
      await proceedWithSave(values, athlete.registration_status);
    }
  };

  const isFieldMandatory = (fieldName: string) => {
    const alwaysMandatory = ['first_name', 'last_name', 'date_of_birth', 'club', 'gender', 'belt', 'weight', 'nationality', 'email', 'phone'];
    if (alwaysMandatory.includes(fieldName)) return true;
    return mandatoryFieldsConfig?.[fieldName] === true;
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-md">
        <h3 className="text-xl font-semibold mb-4">{t('editAthleteProfile')}</h3>

        <AthleteFormFields
          register={register}
          errors={errors}
          setValue={setValue}
          watch={watch}
          isFieldMandatory={isFieldMandatory}
          ageDivisionSettings={ageDivisionSettings}
          existingPhotoUrl={athlete.photo_url}
          existingEmiratesIdFrontUrl={athlete.emirates_id_front_url}
          existingEmiratesIdBackUrl={athlete.emirates_id_back_url}
        />

        <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Avançado: Alteração Manual de Categoria</h4>
            <p className="text-xs text-muted-foreground mb-3">Use apenas se necessário mover o atleta para uma categoria diferente da calculada (ex: Absoluto).</p>
            <Label htmlFor="manualDivision">Forçar Categoria</Label>
             <Select 
                value={watch('manualDivisionId') || "auto"} 
                onValueChange={(val) => setValue('manualDivisionId', val === "auto" ? "" : val)}
             >
              <SelectTrigger>
                <SelectValue placeholder="Automático (Baseado em Peso/Idade)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Automático (Baseado em Peso/Idade)</SelectItem>
                 {divisions.map(div => (
                    <SelectItem key={div.id} value={div.id}>
                       {div.name} ({div.gender} / {div.age_category_name} / {div.belt} / {div.max_weight}kg)
                    </SelectItem>
                 ))}
              </SelectContent>
            </Select>
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? '...' : t('saveChanges')}
          </Button>
        </div>
      </form>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reapprovalNeededTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('reapprovalNeededDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFormValues(null)}>Cancel</AlertDialogCancel>
            <Button variant="secondary" onClick={() => {
              if (formValues) proceedWithSave(formValues, 'approved');
              setShowConfirmation(false);
            }}>
              {t('keepApproved')}
            </Button>
            <AlertDialogAction onClick={() => {
              if (formValues) proceedWithSave(formValues, 'under_approval');
              setShowConfirmation(false);
            }}>
              {t('resetToPending')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AthleteProfileEditForm;