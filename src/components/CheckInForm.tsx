"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, WeightAttempt, CheckInStatus } from '@/types/index'; // Import WeightAttempt
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle } from 'lucide-react';

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (athleteId: string, weight: number, status: CheckInStatus, weightAttempts: WeightAttempt[]) => void;
  isCheckInAllowed: boolean;
  divisionMaxWeight: number;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ athlete, onCheckIn, isCheckInAllowed, divisionMaxWeight }) => {
  const [currentWeight, setCurrentWeight] = useState<number | ''>(athlete.registeredWeight || ''); // Use registeredWeight
  const [isConfirming, setIsConfirming] = useState(false);
  const [attempts, setAttempts] = useState<WeightAttempt[]>(athlete.weightAttempts || []);

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCurrentWeight(value === '' ? '' : parseFloat(value));
  };

  const handleConfirmWeight = () => {
    if (typeof currentWeight !== 'number' || currentWeight <= 0) {
      showError('Por favor, insira um peso válido.');
      return;
    }

    const newAttempt: WeightAttempt = {
      timestamp: new Date(),
      weight: currentWeight,
      success: currentWeight <= divisionMaxWeight,
    };

    const updatedAttempts = [...attempts, newAttempt];
    setAttempts(updatedAttempts);

    if (newAttempt.success) {
      showSuccess(`Peso ${currentWeight}kg registrado com sucesso!`);
      onCheckIn(athlete.id, currentWeight, 'checked_in', updatedAttempts);
      setIsConfirming(false);
    } else {
      showError(`Peso ${currentWeight}kg excede o limite de ${divisionMaxWeight}kg.`);
      // If it's the third attempt and it failed, mark as missed
      if (updatedAttempts.filter(a => !a.success).length >= 3) {
        onCheckIn(athlete.id, currentWeight, 'missed', updatedAttempts);
        showError('Limite de tentativas excedido. Atleta desclassificado por peso.');
      }
    }
    setCurrentWeight(''); // Clear input after attempt
  };

  const lastAttempt = attempts[attempts.length - 1];
  const hasPassedWeight = lastAttempt?.success;
  const remainingAttempts = 3 - attempts.filter(a => !a.success).length;
  const canAttempt = remainingAttempts > 0 && !hasPassedWeight;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="weight-input" className="text-lg">Peso Atual (kg):</Label>
        <div className="flex items-center gap-2">
          <Input
            id="weight-input"
            type="number"
            step="0.1"
            value={currentWeight}
            onChange={handleWeightChange}
            className="w-32 text-lg"
            disabled={!isCheckInAllowed || !canAttempt || hasPassedWeight}
          />
          <Button
            onClick={handleConfirmWeight}
            disabled={!isCheckInAllowed || !canAttempt || hasPassedWeight || typeof currentWeight !== 'number' || currentWeight <= 0}
          >
            Registrar Peso
          </Button>
        </div>
      </div>

      {attempts.length > 0 && (
        <div className="border rounded-md p-3">
          <h4 className="font-semibold mb-2">Tentativas de Pesagem:</h4>
          <ul className="list-disc list-inside space-y-1">
            {attempts.map((attempt, index) => (
              <li key={index} className="flex items-center">
                {format(attempt.timestamp, 'HH:mm')} - {attempt.weight}kg
                {attempt.success ? (
                  <span className="ml-2 text-green-600 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1" /> OK
                  </span>
                ) : (
                  <span className="ml-2 text-red-600 flex items-center">
                    <XCircle className="h-4 w-4 mr-1" /> Acima do peso
                  </span>
                )}
              </li>
            ))}
          </ul>
          {!canAttempt && !hasPassedWeight && attempts.length >= 3 && (
            <p className="text-sm text-red-500 mt-2">Atleta desclassificado por peso.</p>
          )}
          {!hasPassedWeight && canAttempt && (
            <p className="text-sm text-muted-foreground mt-2">Tentativas restantes: {remainingAttempts}</p>
          )}
        </div>
      )}

      {athlete.checkInStatus === 'checked_in' && (
        <div className="flex items-center text-green-600 font-semibold text-lg">
          <CheckCircle className="h-5 w-5 mr-2" /> Atleta Pesado e Aprovado!
        </div>
      )}
      {athlete.checkInStatus === 'missed' && (
        <div className="flex items-center text-red-600 font-semibold text-lg">
          <XCircle className="h-5 w-5 mr-2" /> Atleta Desclassificado por Peso!
        </div>
      )}
    </div>
  );
};

export default CheckInForm;