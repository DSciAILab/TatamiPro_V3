"use client";

import React from 'react';
import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Belt, Gender, AgeDivisionSetting } from '@/types/index';
import { DatePicker } from './ui/date-picker';
import { useTranslations } from '@/hooks/use-translations';

interface AthleteFormFieldsProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  setValue: UseFormSetValue<any>;
  watch: UseFormWatch<any>;
  isFieldMandatory: (fieldName: string) => boolean;
  existingPhotoUrl?: string | null;
  existingEmiratesIdFrontUrl?: string | null;
  existingEmiratesIdBackUrl?: string | null;
  ageDivisionSettings: AgeDivisionSetting[];
}

const AthleteFormFields: React.FC<AthleteFormFieldsProps> = ({
  register,
  errors,
  setValue,
  watch,
  isFieldMandatory,
  existingPhotoUrl,
  existingEmiratesIdFrontUrl,
  existingEmiratesIdBackUrl,
}) => {
  const { t } = useTranslations();
  const currentGender = watch('gender');
  const currentBelt = watch('belt');
  const photo = watch('photo');
  const emiratesIdFront = watch('emiratesIdFront');
  const emiratesIdBack = watch('emiratesIdBack');

  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="first_name">{t('firstName')} {isFieldMandatory('first_name') && <span className="text-red-500">*</span>}</Label>
          <Input id="first_name" {...register('first_name')} />
          {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name.message as string}</p>}
        </div>
        <div>
          <Label htmlFor="last_name">{t('lastName')} {isFieldMandatory('last_name') && <span className="text-red-500">*</span>}</Label>
          <Input id="last_name" {...register('last_name')} />
          {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name.message as string}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="date_of_birth">{t('dateOfBirth')} {isFieldMandatory('date_of_birth') && <span className="text-red-500">*</span>}</Label>
        <DatePicker
          value={watch('date_of_birth')}
          onChange={(date) => setValue('date_of_birth', date!, { shouldValidate: true })}
          placeholder={t('selectDate')}
          fromYear={1920}
          toYear={currentYear}
        />
        {errors.date_of_birth && <p className="text-red-500 text-sm mt-1">{errors.date_of_birth.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="club">{t('club')} {isFieldMandatory('club') && <span className="text-red-500">*</span>}</Label>
        <Input id="club" {...register('club')} />
        {errors.club && <p className="text-red-500 text-sm mt-1">{errors.club.message as string}</p>}
      </div>

      <div>
        <Label>{t('gender')} {isFieldMandatory('gender') && <span className="text-red-500">*</span>}</Label>
        <RadioGroup
          onValueChange={(value: Gender) => setValue('gender', value, { shouldValidate: true })}
          value={currentGender}
          className="flex space-x-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Masculino" id="gender-male" />
            <Label htmlFor="gender-male">{t('gender_Masculino')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Feminino" id="gender-female" />
            <Label htmlFor="gender-female">{t('gender_Feminino')}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="Outro" id="gender-other" />
            <Label htmlFor="gender-other">{t('gender_Outro')}</Label>
          </div>
        </RadioGroup>
        {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="belt">{t('belt')} {isFieldMandatory('belt') && <span className="text-red-500">*</span>}</Label>
        <Select onValueChange={(value: Belt) => setValue('belt', value, { shouldValidate: true })} value={currentBelt}>
          <SelectTrigger>
            <SelectValue placeholder={t('placeholderSelectBelt')} />
          </SelectTrigger>
          <SelectContent>
            {['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'].map(belt => (
              <SelectItem key={belt} value={belt}>{t(`belt_${belt}` as any)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.belt && <p className="text-red-500 text-sm mt-1">{errors.belt.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="weight">{t('weight')} {isFieldMandatory('weight') && <span className="text-red-500">*</span>}</Label>
        <Input id="weight" type="number" step="0.1" {...register('weight')} />
        {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="nationality">{t('nationality')} {isFieldMandatory('nationality') && <span className="text-red-500">*</span>}</Label>
        <Input id="nationality" {...register('nationality')} />
        {errors.nationality && <p className="text-red-500 text-sm mt-1">{errors.nationality.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="email">{t('email')} {isFieldMandatory('email') && <span className="text-red-500">*</span>}</Label>
        <Input id="email" type="email" {...register('email')} />
        {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message as string}</p>}
      </div>

      <div>
        <Label htmlFor="phone">{t('phone')} {isFieldMandatory('phone') && <span className="text-red-500">*</span>}</Label>
        <Input id="phone" type="tel" {...register('phone')} />
        {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone.message as string}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emirates_id">{t('emiratesId')} ({t('optional')})</Label>
          <Input id="emirates_id" {...register('emirates_id')} />
          {errors.emirates_id && <p className="text-red-500 text-sm mt-1">{errors.emirates_id.message as string}</p>}
        </div>
        <div>
          <Label htmlFor="school_id">{t('schoolId')} ({t('optional')})</Label>
          <Input id="school_id" {...register('school_id')} />
          {errors.school_id && <p className="text-red-500 text-sm mt-1">{errors.school_id.message as string}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor="photo">{t('profilePhoto')} {isFieldMandatory('photo') && <span className="text-red-500">*</span>}</Label>
        <Input id="photo" type="file" accept=".jpg,.jpeg,.png" {...register('photo')} />
        {errors.photo?.message && <p className="text-red-500 text-sm mt-1">{errors.photo.message as string}</p>}
        {existingPhotoUrl && !photo?.length && (
          <p className="text-sm text-muted-foreground mt-1">{t('currentPhoto')}: <a href={existingPhotoUrl} target="_blank" rel="noopener noreferrer" className="underline">{t('view')}</a></p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="emiratesIdFront">{t('idFront')} {isFieldMandatory('emiratesIdFront') && <span className="text-red-500">*</span>}</Label>
          <Input id="emiratesIdFront" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdFront')} />
          {errors.emiratesIdFront?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdFront.message as string}</p>}
          {existingEmiratesIdFrontUrl && !emiratesIdFront?.length && (
            <p className="text-sm text-muted-foreground mt-1">{t('currentFront')}: <a href={existingEmiratesIdFrontUrl} target="_blank" rel="noopener noreferrer" className="underline">{t('view')}</a></p>
          )}
        </div>
        <div>
          <Label htmlFor="emiratesIdBack">{t('idBack')} {isFieldMandatory('emiratesIdBack') && <span className="text-red-500">*</span>}</Label>
          <Input id="emiratesIdBack" type="file" accept=".pdf,.jpg,.jpeg,.png" {...register('emiratesIdBack')} />
          {errors.emiratesIdBack?.message && <p className="text-red-500 text-sm mt-1">{errors.emiratesIdBack.message as string}</p>}
          {existingEmiratesIdBackUrl && !emiratesIdBack?.length && (
            <p className="text-sm text-muted-foreground mt-1">{t('currentBack')}: <a href={existingEmiratesIdBackUrl} target="_blank" rel="noopener noreferrer" className="underline">{t('view')}</a></p>
          )}
        </div>
      </div>
    </>
  );
};

export default AthleteFormFields;