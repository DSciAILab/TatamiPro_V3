"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Athlete, WeightAttempt } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { Scale, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CheckInFormProps {
  athlete: Athlete;
  onCheckIn: (athleteId: string, registeredWeight: number, status: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => void;
  isCheckInAllowed: boolean;
  divisionMaxWeight?: number;
}

const CheckInForm: React.FC<CheckInFormProps> = ({ athlete, onCheckIn, isCheckInAllowed, divisionMaxWeight }) => {
  const [currentWeight, setCurrentWeight] = useState<number | ''>(athlete.registeredWeight || '');
  const [isConfirming, setIsConfirming] = useState(false);

  const handleCheckIn = () => {
    if (currentWeight === '' || currentWeight <= 0) {
      showError('Por favor, insira um peso válido.');
      return;
    }

    if (!isCheckInAllowed) {
      showError('O check-in está fora do horário permitido ou você não tem permissão.');
      return;
    }

    const newCheckInStatus: 'checked_in' | 'overweight' =
      divisionMaxWeight && currentWeight > divisionMaxWeight ? 'overweight' : 'checked_in';

    const attemptStatus: WeightAttempt['status'] = newCheckInStatus === 'checked_in' ? 'success' : 'fail';

    const newAttempt: WeightAttempt = {
      weight: currentWeight,
      timestamp: new Date(),
      status: attemptStatus, // Usar 'success' ou 'fail'
    };

    const updatedAttempts = [...athlete.weightAttempts, newAttempt];

    onCheckIn(athlete.id, currentWeight, newCheckInStatus, updatedAttempts);
    showSuccess(`Check-in de ${athlete.firstName} ${newCheckInStatus === 'checked_in' ? 'realizado com sucesso!' : 'com peso acima do limite.'}`);
    setIsConfirming(false);
  };

  const isOverweight = divisionMaxWeight && currentWeight !== '' && currentWeight > divisionMaxWeight;

  return (
    <div className="flex flex-col items-end space-y-2">
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          step="0.1"
          placeholder="Peso (kg)"
          value={currentWeight}
          onChange={(e) => setCurrentWeight(Number(e.target.value))}
          className="w-24 text-right"
          disabled={!isCheckInAllowed}
        />
        <AlertDialog open={isConfirming} onOpenChange={setIsConfirming}>
          <AlertDialogTrigger asChild>
            <Button
              onClick={() => setIsConfirming(true)}
              disabled={!isCheckInAllowed || currentWeight === '' || currentWeight <= 0}
            >
              <Scale className="mr-1 h-4 w-4" /> Pesar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Peso?</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a registrar o peso de <span className="font-semibold">{athlete.firstName} {athlete.lastName}</span> como <span className="font-bold text-lg">{currentWeight}kg</span>.
                {divisionMaxWeight && (
                  <p className="mt-2">O limite de peso para a divisão é <span className="font-semibold">{divisionMaxWeight}kg</span>.</p>
                )}
                {isOverweight && (
                  <p className="text-red-500 font-bold mt-2">ATENÇÃO: Este atleta está acima do peso para a divisão!</p>
                )}
                Tem certeza que deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleCheckIn}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {athlete.weightAttempts.length > 0 && (
        <div className="text-xs text-muted-foreground mt-2">
          <p className="font-semibold">Tentativas de peso:</p>
          <ul className="list-disc list-inside">
            {athlete.weightAttempts.map((attempt, index) => (
              <li key={index}>
                {format(attempt.timestamp, 'HH:mm')} - {attempt.weight}kg ({attempt.status === 'success' ? 'OK' : 'Overweight'})
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CheckInForm;