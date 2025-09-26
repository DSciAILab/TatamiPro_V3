"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, WeightAttempt } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Edit } from 'lucide-react';

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (athleteId: string, registeredWeight: number, checkInStatus: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => void;
  isCheckInAllowed: boolean;
  divisionMaxWeight?: number;
  isWeightCheckEnabled: boolean; // NOVO: Prop para controlar a verificação de peso
}

const formSchema = z.object({
  weight: z.coerce.number().min(1, { message: 'Peso deve ser um número positivo.' }),
});

const CheckInForm: React.FC<CheckInFormProps> = ({ athlete, onCheckIn, isCheckInAllowed, divisionMaxWeight, isWeightCheckEnabled }) => {
  const [isEditing, setIsEditing] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight: athlete.registeredWeight || 0,
    },
  });

  // Reset form with athlete's registered weight when athlete changes or edit mode is toggled
  useEffect(() => {
    reset({ weight: athlete.registeredWeight || 0 });
    setIsEditing(false); // Exit edit mode when athlete changes
  }, [athlete.id, athlete.registeredWeight, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isCheckInAllowed) {
      showError('Check-in não permitido neste momento ou sem permissão.');
      return;
    }

    let newRegisteredWeight: number;
    let newCheckInStatus: 'checked_in' | 'overweight';

    if (isWeightCheckEnabled) {
      // Lógica de verificação de peso normal
      newRegisteredWeight = values.weight;
      if (divisionMaxWeight !== undefined && newRegisteredWeight <= divisionMaxWeight) {
        newCheckInStatus = 'checked_in';
        showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} fez check-in com sucesso!`);
      } else if (divisionMaxWeight === undefined) {
        showError('Não foi possível determinar o limite de peso da divisão. Check-in manual necessário.');
        return;
      } else {
        newCheckInStatus = 'overweight';
        showError(`Atleta ${athlete.firstName} ${athlete.lastName} está acima do peso (${newRegisteredWeight}kg) para sua divisão (limite: ${divisionMaxWeight}kg).`);
      }
    } else {
      // Check-in sem verificação de peso: assume que está no peso
      newRegisteredWeight = athlete.weight; // Usa o peso de inscrição do atleta
      newCheckInStatus = 'checked_in';
      showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} fez check-in com sucesso (verificação de peso desabilitada)!`);
    }

    const newAttempt: WeightAttempt = {
      weight: newRegisteredWeight,
      timestamp: new Date(),
      status: newCheckInStatus,
    };

    const updatedWeightAttempts = [...athlete.weightAttempts, newAttempt];

    onCheckIn(athlete.id, newRegisteredWeight, newCheckInStatus, updatedWeightAttempts);
    setIsEditing(false); // Exit edit mode after submission
  };

  const hasCheckedIn = athlete.checkInStatus === 'checked_in' || athlete.checkInStatus === 'overweight';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-2">
      <div className="flex items-end space-x-2">
        {(hasCheckedIn && !isEditing) ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Último peso: <span className="font-semibold">{athlete.registeredWeight}kg</span>
            </span>
            {isCheckInAllowed && isWeightCheckEnabled && ( // Only allow edit if check-in is generally allowed AND weight check is enabled
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-1 h-3 w-3" /> Editar
              </Button>
            )}
          </div>
        ) : (
          <>
            {isWeightCheckEnabled && ( // Mostrar input de peso apenas se a verificação de peso estiver habilitada
              <div className="flex-grow">
                <Label htmlFor={`registeredWeight-${athlete.id}`} className="sr-only">Peso Registrado (kg)</Label>
                <div className="relative">
                  <Input
                    id={`registeredWeight-${athlete.id}`}
                    type="number"
                    step="0.1"
                    placeholder="Peso (kg)"
                    {...register('weight')}
                    disabled={!isCheckInAllowed}
                    className="pr-20"
                  />
                  {divisionMaxWeight !== undefined && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      Max: {divisionMaxWeight}kg
                    </span>
                  )}
                </div>
                {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
              </div>
            )}
            <Button type="submit" disabled={!isCheckInAllowed}>
              {isWeightCheckEnabled ? 'Registrar Peso' : 'Confirmar Check-in'}
            </Button>
          </>
        )}
      </div>
      {athlete.weightAttempts && athlete.weightAttempts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          <p className="font-semibold">Tentativas de Pesagem:</p>
          <ul className="list-disc list-inside">
            {athlete.weightAttempts.map((attempt, index) => (
              <li key={index}>
                {format(attempt.timestamp, 'HH:mm')} - {attempt.weight}kg ({attempt.status === 'checked_in' ? 'OK' : 'Overweight'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
};

export default CheckInForm;