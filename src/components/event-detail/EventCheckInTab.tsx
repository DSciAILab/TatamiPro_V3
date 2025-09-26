"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import CheckInForm from '@/components/CheckInForm';
import QrCodeScanner from '@/components/QrCodeScanner';
import { Athlete, WeightAttempt, Division } from '@/types';
import { UserRound, CheckCircle, XCircle, Scale, Search } from 'lucide-react';
import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { format } from 'date-fns'; // Importar format

interface EventCheckInTabProps {
  userRole: string | null;
  checkInStartTime?: Date;
  checkInEndTime?: Date;
  currentTime: Date;
  isAttendanceMandatoryBeforeCheckIn: boolean;
  isCheckInAllowed: boolean;
  filteredAthletesForCheckIn: Athlete[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setScannedAthleteId: (id: string | null) => void;
  checkInFilter: 'pending' | 'done' | 'all';
  setCheckInFilter: (filter: 'pending' | 'done' | 'all') => void;
  handleCheckInAthlete: (athleteId: string, registeredWeight: number, status: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => void;
}

const EventCheckInTab: React.FC<EventCheckInTabProps> = ({
  userRole,
  checkInStartTime,
  checkInEndTime,
  currentTime,
  isAttendanceMandatoryBeforeCheckIn,
  isCheckInAllowed,
  filteredAthletesForCheckIn,
  searchTerm,
  setSearchTerm,
  setScannedAthleteId,
  checkInFilter,
  setCheckInFilter,
  handleCheckInAthlete,
}) => {
  const timeRemainingInSeconds = checkInEndTime ? Math.max(0, (checkInEndTime.getTime() - currentTime.getTime()) / 1000) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0
    ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${Math.floor(timeRemainingInSeconds % 60)}s`
    : 'Encerrado';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Check-in de Atletas</span>
          <div className="text-sm font-normal text-muted-foreground flex flex-col items-end">
            <span>Hora Atual: {format(currentTime, 'HH:mm:ss')}</span>
            <span>Tempo para fechar: {timeRemainingFormatted}</span>
          </div>
        </CardTitle>
        <CardDescription>
          Confirme a presença e o peso dos atletas.
          {!isCheckInAllowed && userRole !== 'admin' && (
            <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
          )}
          {isCheckInAllowed && (
            <span className="text-green-600 block mt-2">Check-in aberto!</span>
          )}
          {!checkInStartTime || !checkInEndTime ? (
            <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
          ) : (
            <span className="text-muted-foreground block mt-2">Horário: {format(checkInStartTime, 'dd/MM HH:mm')} - {format(checkInEndTime, 'dd/MM HH:mm')}</span>
          )}
          {isAttendanceMandatoryBeforeCheckIn && (
            <span className="text-blue-500 block mt-2">Atenção: A presença é obrigatória antes do check-in.</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <QrCodeScanner onScanSuccess={(id) => {
              setScannedAthleteId(id);
              setSearchTerm('');
            }} />
          </div>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Buscar atleta (nome, clube, divisão...)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setScannedAthleteId(null);
              }}
              className="pr-10"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <div className="mb-4 flex justify-center">
          <ToggleGroup type="single" value={checkInFilter} onValueChange={(value: 'pending' | 'done' | 'all') => value && setCheckInFilter(value)}>
            <ToggleGroupItem value="pending" aria-label="Mostrar pendentes">
              Pendentes
            </ToggleGroupItem>
            <ToggleGroupItem value="done" aria-label="Mostrar concluídos">
              Concluídos
            </ToggleGroupItem>
            <ToggleGroupItem value="all" aria-label="Mostrar todos">
              Todos
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {filteredAthletesForCheckIn.length === 0 ? (
          <p className="text-muted-foreground">Nenhum atleta aprovado para check-in encontrado com os critérios atuais.</p>
        ) : (
          <ul className="space-y-4">
            {filteredAthletesForCheckIn.map((athlete) => (
              <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                <div className="flex items-center space-x-3 flex-grow">
                  {athlete.photoUrl ? (
                    <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <UserRound className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                    <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                    {athlete.registeredWeight && (
                      <p className="text-xs text-gray-500">Último peso: <span className="font-semibold">{athlete.registeredWeight}kg</span></p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center space-x-2">
                    {athlete.checkInStatus === 'checked_in' && (
                      <span className="flex items-center text-green-600 font-semibold text-sm">
                        <CheckCircle className="h-4 w-4 mr-1" /> Check-in OK
                      </span>
                    )}
                    {athlete.checkInStatus === 'overweight' && (
                      <span className="flex items-center text-red-600 font-semibold text-sm">
                        <XCircle className="h-4 w-4 mr-1" /> Overweight ({athlete.registeredWeight}kg)
                      </span>
                    )}
                    {athlete.checkInStatus === 'pending' && (
                      <span className="flex items-center text-orange-500 font-semibold text-sm">
                        <Scale className="h-4 w-4 mr-1" /> Pendente
                      </span>
                    )}
                  </div>
                  <CheckInForm
                    athlete={athlete}
                    onCheckIn={handleCheckInAthlete}
                    isCheckInAllowed={isCheckInAllowed}
                    divisionMaxWeight={athlete._division?.maxWeight}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default EventCheckInTab;