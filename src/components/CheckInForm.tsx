"use client";

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, WeightAttempt, Division } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Edit } from 'lucide-react';
import { findNextHigherWeightDivision, getAgeDivision, getWeightDivision } from '@/utils/athlete-utils'; // Importar funções utilitárias

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (updatedAthlete: Athlete) => void; // Updated signature
  isCheckInAllowed: boolean;
  divisionMaxWeight?: number;
  isWeightCheckEnabled: boolean;
  isOverweightAutoMoveEnabled: boolean; // New prop
  eventDivisions: Division[]; // New prop
  isBeltGroupingEnabled: boolean; // New prop
}

const formSchema = z.object({
  weight: z.coerce.number().min(1, { message: 'Peso deve ser um número positivo.' }).optional(), // Make weight optional
});

const CheckInForm: React.FC<CheckInFormProps> = ({
  athlete,
  onCheckIn,
  isCheckInAllowed,
  divisionMaxWeight,
  isWeightCheckEnabled,
  isOverweightAutoMoveEnabled,
  eventDivisions,
  isBeltGroupingEnabled,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      weight: athlete.registeredWeight || 0,
    },
  });

  useEffect(() => {
    reset({ weight: athlete.registeredWeight || 0 });
    setIsEditing(false);
  }, [athlete.id, athlete.registeredWeight, reset]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!isCheckInAllowed) {
      showError('Check-in não permitido neste momento ou sem permissão.');
      return;
    }

    let newRegisteredWeight: number;
    let newCheckInStatus: 'checked_in' | 'overweight';
    let updatedAthlete: Athlete = { ...athlete };
    let currentDivision = athlete._division; // Assuming _division is available from EventDetail

    if (isWeightCheckEnabled) {
      newRegisteredWeight = values.weight!; // Weight is mandatory if check is enabled
      if (divisionMaxWeight !== undefined && newRegisteredWeight <= divisionMaxWeight) {
        newCheckInStatus = 'checked_in';
        showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} fez check-in com sucesso!`);
      } else if (divisionMaxWeight === undefined) {
        showError('Não foi possível determinar o limite de peso da divisão. Check-in manual necessário.');
        return;
      } else {
        // Athlete is overweight
        if (isOverweightAutoMoveEnabled && currentDivision) {
          const nextHigherDivision = findNextHigherWeightDivision(
            athlete,
            currentDivision,
            eventDivisions,
            newRegisteredWeight,
            isBeltGroupingEnabled
          );

          if (nextHigherDivision) {
            updatedAthlete = {
              ...updatedAthlete,
              ageDivision: nextHigherDivision.ageCategoryName,
              weightDivision: getWeightDivision(newRegisteredWeight), // Update weight division display
              belt: nextHigherDivision.belt === 'Todas' ? updatedAthlete.belt : nextHigherDivision.belt as Athlete['belt'], // Update belt if specific
              gender: nextHigherDivision.gender === 'Ambos' ? updatedAthlete.gender : nextHigherDivision.gender as Athlete['gender'], // Update gender if specific
              movedToDivisionId: nextHigherDivision.id,
              moveReason: `Movido automaticamente para ${nextHigherDivision.name} por excesso de peso (${newRegisteredWeight}kg).`,
            };
            newCheckInStatus = 'checked_in';
            showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} acima do peso, movido para a divisão ${nextHigherDivision.name}!`);
          } else {
            newCheckInStatus = 'overweight';
            showError(`Atleta ${athlete.firstName} ${athlete.lastName} está acima do peso (${newRegisteredWeight}kg) para sua divisão (limite: ${divisionMaxWeight}kg) e não há categoria superior disponível.`);
          }
        } else {
          newCheckInStatus = 'overweight';
          showError(`Atleta ${athlete.firstName} ${athlete.lastName} está acima do peso (${newRegisteredWeight}kg) para sua divisão (limite: ${divisionMaxWeight}kg).`);
        }
      }
    } else {
      // Check-in without weight verification: assume on weight
      newRegisteredWeight = athlete.weight; // Use athlete's registered weight
      newCheckInStatus = 'checked_in';
      showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} fez check-in com sucesso (verificação de peso desabilitada)!`);
    }

    const newAttempt: WeightAttempt = {
      weight: newRegisteredWeight,
      timestamp: new Date(),
      status: newCheckInStatus,
    };

    const updatedWeightAttempts = [...athlete.weightAttempts, newAttempt];

    updatedAthlete = {
      ...updatedAthlete,
      registeredWeight: newRegisteredWeight,
      checkInStatus: newCheckInStatus,
      weightAttempts: updatedWeightAttempts,
    };

    onCheckIn(updatedAthlete); // Pass the fully updated athlete object
    setIsEditing(false);
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
            {isCheckInAllowed && isWeightCheckEnabled && (
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-1 h-3 w-3" /> Editar
              </Button>
            )}
          </div>
        ) : (
          <>
            {isWeightCheckEnabled && (
              <div className="flex-grow">
                <Label htmlFor={`registeredWeight-${athlete.id}`} className="sr-only">Peso Registrado (kg)</Label>
                <div className="relative">
                  <Input
                    id={`registeredWeight-${athlete.id}`}
                    type="number"
                    step="0.1"
                    placeholder="Peso (kg)"
                    {...register('weight', { required: isWeightCheckEnabled ? 'Peso é obrigatório para o check-in.' : false })}
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