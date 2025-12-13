"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, WeightAttempt, Division } from '@/types/index';
import { showError } from '@/utils/toast';
import { format } from 'date-fns';
import { Edit } from 'lucide-react';
import { findNextHigherWeightDivision, getWeightDivision } from '@/utils/athlete-utils';

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (updatedAthlete: Athlete) => void;
  isCheckInAllowed: boolean;
  divisionMaxWeight?: number;
  isWeightCheckEnabled: boolean;
  isOverweightAutoMoveEnabled: boolean;
  eventDivisions: Division[];
  isBeltGroupingEnabled: boolean;
}

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

  // Dynamically create the schema based on isWeightCheckEnabled
  const dynamicFormSchema = useMemo(() => {
    return z.object({
      weight: isWeightCheckEnabled
        ? z.coerce.number().min(1, { message: 'Peso deve ser um número positivo.' })
        : z.coerce.number().optional(),
    });
  }, [isWeightCheckEnabled]);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.infer<typeof dynamicFormSchema>>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {
      // Alterado de 0 para undefined para mostrar o placeholder
      weight: athlete.registered_weight || undefined, 
    },
  });

  useEffect(() => {
    // Reset form with new default values when athlete or weight check setting changes
    // Alterado de 0 para undefined para limpar o campo se não houver peso
    reset({ weight: athlete.registered_weight || undefined });
    setIsEditing(false);
  }, [athlete.id, athlete.registered_weight, isWeightCheckEnabled, reset]);

  const onSubmit = (values: z.infer<typeof dynamicFormSchema>) => {
    if (!isCheckInAllowed) {
      showError('Check-in não permitido neste momento ou sem permissão.');
      return;
    }

    let newRegisteredWeight: number;
    let newCheckInStatus: 'checked_in' | 'overweight';
    let updatedAthlete: Athlete = { ...athlete };
    let currentDivision = athlete._division;

    if (isWeightCheckEnabled) {
      newRegisteredWeight = values.weight!; 
      if (divisionMaxWeight !== undefined && newRegisteredWeight <= divisionMaxWeight) {
        newCheckInStatus = 'checked_in';
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
              age_division: nextHigherDivision.age_category_name,
              weight_division: getWeightDivision(newRegisteredWeight),
              belt: nextHigherDivision.belt === 'Todas' ? updatedAthlete.belt : nextHigherDivision.belt as Athlete['belt'],
              gender: nextHigherDivision.gender === 'Ambos' ? updatedAthlete.gender : nextHigherDivision.gender as Athlete['gender'],
              moved_to_division_id: nextHigherDivision.id,
              move_reason: `Movido automaticamente para ${nextHigherDivision.name} por excesso de peso (${newRegisteredWeight}kg).`,
            };
            newCheckInStatus = 'checked_in';
          } else {
            newCheckInStatus = 'overweight';
          }
        } else {
          newCheckInStatus = 'overweight';
        }
      }
    } else {
      newRegisteredWeight = athlete.weight;
      newCheckInStatus = 'checked_in';
    }

    const newAttempt: WeightAttempt = {
      weight: newRegisteredWeight,
      timestamp: new Date(),
      status: newCheckInStatus,
    };

    const updatedWeightAttempts = [...athlete.weight_attempts, newAttempt];

    updatedAthlete = {
      ...updatedAthlete,
      registered_weight: newRegisteredWeight,
      check_in_status: newCheckInStatus,
      weight_attempts: updatedWeightAttempts,
    };

    onCheckIn(updatedAthlete);
    setIsEditing(false);
  };

  const hasCheckedIn = athlete.check_in_status === 'checked_in' || athlete.check_in_status === 'overweight';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-2">
      <div className="flex items-end space-x-2">
        {(hasCheckedIn && !isEditing) ? (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Último peso: <span className="font-semibold">{athlete.registered_weight}kg</span>
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
                    inputMode="decimal" // Garante teclado numérico no mobile
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
      {athlete.weight_attempts && athlete.weight_attempts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          <p className="font-semibold">Tentativas de Pesagem:</p>
          <ul className="list-disc list-inside">
            {athlete.weight_attempts.map((attempt, index) => (
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