"use client";

import React, { useState, useEffect } from 'react';
import { Event, Athlete } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserRound, CheckCircle, XCircle, Scale, Search, QrCodeIcon, Barcode } from 'lucide-react';
import CheckInForm from '@/components/CheckInForm';
import QrScanner from '@/components/QrScanner';
import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';
import { format, differenceInSeconds } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';

interface CheckInTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  checkInStartTime?: Date;
  checkInEndTime?: Date;
  checkInFilter: 'pending' | 'checked_in' | 'overweight' | 'all';
  handleCheckInBoxClick: (filter: 'pending' | 'checked_in' | 'overweight') => void;
  setCheckInFilter: (filter: 'all' | 'pending' | 'checked_in' | 'overweight') => void;
  totalCheckedInOk: number;
  totalOverweights: number;
  totalPendingCheckIn: number;
  totalApprovedAthletes: number;
  isScannerOpen: boolean;
  setIsScannerOpen: (isOpen: boolean) => void;
  processedApprovedAthletes: Athlete[];
  setScannedAthleteId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  searchTerm: string;
  filteredAthletesForCheckIn: Athlete[];
  handleCheckInAthlete: (athlete: Athlete) => void;
}

const CheckInTab: React.FC<CheckInTabProps> = ({
  event,
  userRole,
  checkInStartTime,
  checkInEndTime,
  checkInFilter,
  handleCheckInBoxClick,
  setCheckInFilter,
  totalCheckedInOk,
  totalOverweights,
  totalPendingCheckIn,
  totalApprovedAthletes,
  isScannerOpen,
  setIsScannerOpen,
  processedApprovedAthletes,
  setScannedAthleteId,
  setSearchTerm,
  searchTerm,
  filteredAthletesForCheckIn,
  handleCheckInAthlete,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isCheckInTimeValid = () => {
    if (!checkInStartTime || !checkInEndTime) return false;
    return currentTime >= checkInStartTime && currentTime <= checkInEndTime;
  };

  const isCheckInAllowedGlobally = userRole === 'admin' || isCheckInTimeValid();

  const timeRemainingInSeconds = checkInEndTime ? differenceInSeconds(checkInEndTime, currentTime) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0 ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${timeRemainingInSeconds % 60}s` : 'Encerrado';

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
          {!isCheckInTimeValid() && userRole !== 'admin' && (
            <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
          )}
          {isCheckInTimeValid() && (
            <span className="text-green-600 block mt-2">Check-in aberto!</span>
          )}
          {!event.checkInStartTime || !event.checkInEndTime ? (
            <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
          ) : (
            <span className="text-muted-foreground block mt-2">Horário: {format(new Date(event.checkInStartTime), 'dd/MM HH:mm')} - {format(new Date(event.checkInEndTime), 'dd/MM HH:mm')}</span>
          )}
          {event.isAttendanceMandatoryBeforeCheckIn && (
            <p className="text-orange-500 mt-2">Atenção: A presença é obrigatória antes do check-in. Apenas atletas marcados como 'Presente' aparecerão aqui.</p>
          )}
          {!event.isWeightCheckEnabled && (
            <p className="text-blue-500 mt-2">Verificação de peso desabilitada. Todos os atletas serão considerados no peso.</p>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              checkInFilter === 'checked_in' ? 'bg-green-200 dark:bg-green-800 border-green-500' : 'bg-green-50 dark:bg-green-950',
              'hover:bg-green-100 dark:hover:bg-green-900'
            )}
            onClick={() => handleCheckInBoxClick('checked_in')}
          >
            <p className="text-2xl font-bold text-green-600">{totalCheckedInOk}</p>
            <p className="text-sm text-muted-foreground">Check-in OK</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              checkInFilter === 'overweight' ? 'bg-red-200 dark:bg-red-800 border-red-500' : 'bg-red-50 dark:bg-red-950',
              'hover:bg-red-100 dark:hover:bg-red-900'
            )}
            onClick={() => handleCheckInBoxClick('overweight')}
          >
            <p className="text-2xl font-bold text-red-600">{totalOverweights}</p>
            <p className="text-sm text-muted-foreground">Acima do Peso</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              checkInFilter === 'pending' ? 'bg-orange-200 dark:bg-orange-800 border-orange-500' : 'bg-orange-50 dark:bg-orange-950',
              'hover:bg-orange-100 dark:hover:bg-orange-900'
            )}
            onClick={() => handleCheckInBoxClick('pending')}
          >
            <p className="text-2xl font-bold text-orange-600">{totalPendingCheckIn}</p>
            <p className="text-sm text-muted-foreground">Faltam</p>
          </div>
          <div
            className={cn(
              "p-3 border rounded-md cursor-pointer transition-colors",
              checkInFilter === 'all' ? 'bg-blue-200 dark:bg-blue-800 border-blue-500' : 'bg-blue-50 dark:bg-blue-950',
              'hover:bg-blue-100 dark:hover:bg-blue-900'
            )}
            onClick={() => setCheckInFilter('all')}
          >
            <p className="text-2xl font-bold text-blue-600">{totalApprovedAthletes}</p>
            <p className="text-sm text-muted-foreground">Total Aprovados</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {event.checkInScanMode === 'qr' && (
            <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <QrCodeIcon className="mr-2 h-4 w-4" /> Escanear QR Code
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Escanear QR Code do Atleta</DialogTitle>
                </DialogHeader>
                <QrScanner
                  onScanSuccess={(qrCodeId) => {
                    const athlete = processedApprovedAthletes.find(a => a.registrationQrCodeId === qrCodeId);
                    if (athlete) {
                      setScannedAthleteId(qrCodeId);
                      setSearchTerm('');
                      showSuccess(`Atleta ${athlete.firstName} ${athlete.lastName} escaneado!`);
                      setIsScannerOpen(false);
                    } else {
                      showError('QR Code não reconhecido ou atleta não encontrado.');
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          )}
          {event.checkInScanMode === 'barcode' && (
            <div className="flex-1">
              <Button variant="outline" className="w-full" disabled>
                <Barcode className="mr-2 h-4 w-4" /> Escanear Código de Barras (Em breve)
              </Button>
            </div>
          )}
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
                    {athlete.moveReason && (
                      <p className="text-xs text-blue-500">
                        <span className="font-semibold">Movido:</span> {athlete.moveReason}
                      </p>
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
                        <XCircle className="h-4 w-4 mr-1" /> Acima do Peso ({athlete.registeredWeight}kg)
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
                    isCheckInAllowed={isCheckInAllowedGlobally && (event.isAttendanceMandatoryBeforeCheckIn ? athlete.attendanceStatus === 'present' : true)}
                    divisionMaxWeight={athlete._division?.maxWeight}
                    isWeightCheckEnabled={event.isWeightCheckEnabled ?? true}
                    isOverweightAutoMoveEnabled={event.isOverweightAutoMoveEnabled ?? false}
                    eventDivisions={event.divisions}
                    isBeltGroupingEnabled={event.isBeltGroupingEnabled ?? true}
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

export default CheckInTab;