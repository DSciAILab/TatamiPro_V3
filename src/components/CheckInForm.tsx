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
import { Edit, RotateCcw, XCircle } from 'lucide-react';
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
        ? z.coerce.number().min(1, { message: 'Weight must be a positive number.' })
        : z.coerce.number().optional(), // If weight check is disabled, weight is optional and not validated for min value
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
      showError('Check-in not allowed at this time or without permission.');
      return;
    }

    let newRegisteredWeight: number;
    let newCheckInStatus: 'checked_in' | 'overweight';
    let updatedAthlete: Athlete = { ...athlete };
    const currentDivision = athlete._division; // Assuming _division is available from EventDetail

    if (isWeightCheckEnabled) {
      newRegisteredWeight = values.weight!; 
      if (divisionMaxWeight !== undefined && newRegisteredWeight <= divisionMaxWeight) {
        newCheckInStatus = 'checked_in';
      } else if (divisionMaxWeight === undefined) {
        showError('Could not determine the division weight limit. Manual check-in required.');
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
              move_reason: `${nextHigherDivision.name}`,
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

  const handleRevert = () => {
    if (!window.confirm(`Deseja reverter o status de ${athlete.first_name} para Pendente?`)) return;
    
    const updatedAthlete: Athlete = {
      ...athlete,
      check_in_status: 'pending',
      registered_weight: null,
      move_reason: null, // Reset move reason if reverted
      moved_to_division_id: null,
    };
    onCheckIn(updatedAthlete);
    setIsEditing(false);
  };

  const handleWO = () => {
    if (!window.confirm(`Deseja marcar ${athlete.first_name} como W.O.?`)) return;

    const updatedAthlete: Athlete = {
      ...athlete,
      check_in_status: 'wo',
    };
    onCheckIn(updatedAthlete);
    setIsEditing(false);
  };

  const isCompleted = athlete.check_in_status !== 'pending';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col space-y-2">
      <div className="flex items-end space-x-2">
        {(isCompleted && !isEditing) ? (
          <div className="flex items-center space-x-2">
            {isCheckInAllowed && isWeightCheckEnabled && athlete.check_in_status !== 'wo' && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => setIsEditing(true)} title="Editar Peso">
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {isCheckInAllowed && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10" onClick={handleRevert} title="Reverter para Pendente">
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <>
            {isWeightCheckEnabled && (
              <div className="flex-grow w-24">
                <Label htmlFor={`registeredWeight-${athlete.id}`} className="sr-only">Registered Weight (kg)</Label>
                <div className="relative">
                  <Input
                    id={`registeredWeight-${athlete.id}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder="Weight (kg)"
                    {...register('weight')}
                    disabled={!isCheckInAllowed}
                    className="pr-12"
                  />
                  {divisionMaxWeight !== undefined && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      Max: {divisionMaxWeight}
                    </span>
                  )}
                </div>
                {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
              </div>
            )}
            <div className="flex space-x-1">
              <Button type="submit" disabled={!isCheckInAllowed} size="sm">
                {isWeightCheckEnabled ? 'Register' : 'Check-in'}
              </Button>
              {athlete.check_in_status === 'pending' && (
                 <Button type="button" variant="destructive" size="sm" onClick={handleWO} disabled={!isCheckInAllowed} title="Mark as W.O.">
                   <XCircle className="h-4 w-4 md:mr-1" /> <span className="hidden md:inline">W.O.</span>
                 </Button>
              )}
            </div>
          </>
        )}
      </div>
            {athlete.weight_attempts && athlete.weight_attempts.length > 0 && (
             null
          )}
    </form>
  );
};

export default CheckInForm;
