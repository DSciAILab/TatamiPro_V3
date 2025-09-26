"use client";

import React from 'react';
import { format } from 'date-fns';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Event } from '@/types';

interface EventHeaderProps {
  event: Event;
  currentTime: Date;
  checkInStartTime?: Date;
  checkInEndTime?: Date;
  isAttendanceMandatoryBeforeCheckIn: boolean;
  totalApprovedAthletes: number;
  totalCheckedInOk: number;
  totalOverweights: number;
  totalPendingCheckIn: number;
}

const EventHeader: React.FC<EventHeaderProps> = ({
  event,
  currentTime,
  checkInStartTime,
  checkInEndTime,
  isAttendanceMandatoryBeforeCheckIn,
  totalApprovedAthletes,
  totalCheckedInOk,
  totalOverweights,
  totalPendingCheckIn,
}) => {
  const isCheckInTimeValid = () => {
    if (!checkInStartTime || !checkInEndTime) return false;
    return currentTime >= checkInStartTime && currentTime <= checkInEndTime;
  };

  const timeRemainingInSeconds = checkInEndTime ? Math.max(0, (checkInEndTime.getTime() - currentTime.getTime()) / 1000) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0
    ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${Math.floor(timeRemainingInSeconds % 60)}s`
    : 'Encerrado';

  return (
    <>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <div className="mb-8 p-4 border rounded-lg shadow-sm bg-background">
        <CardTitle className="flex items-center justify-between mb-2">
          <span>Status do Evento</span>
          <div className="text-sm font-normal text-muted-foreground flex flex-col items-end">
            <span>Hora Atual: {format(currentTime, 'HH:mm:ss')}</span>
            <span>Tempo para fechar check-in: {timeRemainingFormatted}</span>
          </div>
        </CardTitle>
        <CardDescription>
          <p>Status: <span className="font-semibold">{event.status}</span></p>
          <p>Data: <span className="font-semibold">{event.date}</span></p>
          {checkInStartTime && checkInEndTime && (
            <p>Horário de Check-in: <span className="font-semibold">{format(checkInStartTime, 'dd/MM HH:mm')} - {format(checkInEndTime, 'dd/MM HH:mm')}</span></p>
          )}
          {isCheckInTimeValid() ? (
            <span className="text-green-600 block mt-2 font-semibold">Check-in aberto!</span>
          ) : (
            <span className="text-red-500 block mt-2 font-semibold">Check-in {checkInEndTime && currentTime > checkInEndTime ? 'encerrado' : 'ainda não iniciado'}.</span>
          )}
          {isAttendanceMandatoryBeforeCheckIn && (
            <span className="text-blue-500 block mt-2">Atenção: A presença é obrigatória antes do check-in.</span>
          )}
          <div className="mt-4 text-sm grid grid-cols-2 gap-2">
            <p>Total de Atletas Aprovados: <span className="font-semibold">{totalApprovedAthletes}</span></p>
            <p>Check-in OK: <span className="font-semibold text-green-600">{totalCheckedInOk}</span></p>
            <p>Acima do Peso: <span className="font-semibold text-red-600">{totalOverweights}</span></p>
            <p>Faltam no Check-in: <span className="font-semibold text-orange-500">{totalPendingCheckIn}</span></p>
          </div>
        </CardDescription>
      </div>
    </>
  );
};

export default EventHeader;