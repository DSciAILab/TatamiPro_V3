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
import { findNextHigherWeightDivision, getWeightDivision } from '@/utils/athlete-utils'; // Importar funções utilitárias

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
      weight: athlete.registered_weight || 0, // Still provide a default, but validation will handle it
    },
  });

  useEffect(() => {
    // Reset form with new default values when athlete or weight check setting changes
    reset({ weight: athlete.registered_weight || 0 });
    setIsEditing(false);
  }, [athlete.id, athlete.registered_weight, isWeightCheckEnabled, reset]); // Add isWeightCheckEnabled to dependencies

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
      // If weight check is enabled, values.weight must be defined due to schema validation
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
      // Check-in without weight verification: assume on weight
      newRegisteredWeight = athlete.weight; // Use athlete's registered weight from their profile
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
            {isCheckInAllowed && isWeightCheckEnabled && ( // Only allow editing if weight check is enabled
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        ) : (
          <>
            {isWeightCheckEnabled && ( // Only render input if weight check is enabled
              <div className="flex-grow">
                <Label htmlFor={`registeredWeight-${athlete.id}`} className="sr-only">Registered Weight (kg)</Label>
                <div className="relative">
                  <Input
                    id={`registeredWeight-${athlete.id}`}
                    type="number"
                    step="0.1"
                    placeholder="Weight (kg)"
                    {...register('weight')} // No 'required' option here, Zod handles it
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
              {isWeightCheckEnabled ? 'Register Weight' : 'Confirm Check-in'}
            </Button>
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
