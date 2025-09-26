"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getWeightDivision } from '@/utils/athlete-utils';

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (athleteId: string, registeredWeight: number, checkInStatus: 'checked_in' | 'overweight') => void;
  isCheckInAllowed: boolean;
}

const formSchema = z.object({
  weight: z.coerce.number().min(1, { message: 'Peso deve ser um número positivo.' }),
});

const CheckInForm: React.FC<CheckInFormProps> = ({ athlete, onCheckIn, isCheckInAllowed }) => {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight: athlete.registeredWeight || 0,
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isCheckInAllowed) {
      showError('Check-in não permitido neste momento ou sem permissão.');
      return;
    }

    const newRegisteredWeight = values.weight;
    const athleteWeightDivision = getWeightDivision(athlete.weight); // Divisão baseada no peso de inscrição
    const registeredWeightDivision = getWeightDivision(newRegisteredWeight); // Divisão baseada no peso atual

    let newCheckInStatus: 'checked_in' | 'overweight';

    // Simplificação: verifica se o peso registrado está dentro da mesma divisão de peso de inscrição
    // Em um cenário real, as regras de peso podem ser mais complexas (ex: tolerância, etc.)
    if (athleteWeightDivision === registeredWeightDivision) {
      newCheckInStatus = 'checked_in';
      showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} fez check-in com sucesso!`);
    } else {
      newCheckInStatus = 'overweight';
      showError(`Atleta ${athlete.firstName} ${athlete.lastName} está acima do peso (${newRegisteredWeight}kg) para sua divisão (${athlete.weightDivision}).`);
    }

    onCheckIn(athlete.id, newRegisteredWeight, newCheckInStatus);
    reset({ weight: newRegisteredWeight }); // Atualiza o campo com o último peso registrado
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex items-end space-x-2">
      <div className="flex-grow">
        <Label htmlFor={`registeredWeight-${athlete.id}`} className="sr-only">Peso Registrado (kg)</Label>
        <Input
          id={`registeredWeight-${athlete.id}`}
          type="number"
          step="0.1"
          placeholder="Peso (kg)"
          {...register('weight')}
          disabled={!isCheckInAllowed}
        />
        {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
      </div>
      <Button type="submit" disabled={!isCheckInAllowed}>Registrar Peso</Button>
    </form>
  );
};

export default CheckInForm;