"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Event, Athlete } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserRound, CheckCircle, XCircle, Scale, Search, QrCodeIcon, Barcode, LayoutList, LayoutGrid, Printer } from 'lucide-react';
import CheckInForm from '@/components/CheckInForm';
import CheckInTable, { SortConfig, SortKey } from '@/components/CheckInTable';
import QrScanner from '@/components/QrScanner';
import { getAthleteDisplayString } from '@/utils/athlete-utils';
import { cn } from '@/lib/utils';
import { format, differenceInSeconds } from 'date-fns';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslations } from '@/hooks/use-translations';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { jsPDF } from 'jspdf';

interface CheckInTabProps {
  event: Event;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  check_in_start_time?: Date;
  check_in_end_time?: Date;
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
  check_in_start_time,
  check_in_end_time,
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
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { t } = useTranslations();
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'first_name', direction: 'asc' });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAthletes = useMemo(() => {
    const sortableItems = [...filteredAthletesForCheckIn];
    sortableItems.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Athlete];
      let bValue: any = b[sortConfig.key as keyof Athlete];

      if (sortConfig.key === 'id_number') {
        aValue = a.emirates_id || a.school_id || '';
        bValue = b.emirates_id || b.school_id || '';
      } else if (sortConfig.key === 'division_name') {
        aValue = a._division?.name || '';
        bValue = b._division?.name || '';
      }

      // Handle strings case-insensitive
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
    return sortableItems;
  }, [filteredAthletesForCheckIn, sortConfig]);

  const handlePrintList = () => {
    const config = event.check_in_config?.printSettings || { orientation: 'portrait', fontSize: 'medium' };
    const orientation = config.orientation;
    const doc = new jsPDF({ orientation });
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 10;
    const contentWidth = pageWidth - (margin * 2);

    const fontSizes = { small: 8, medium: 10, large: 12 };
    const lineSpacings = { small: 4, medium: 5, large: 6 };
    const fontSize = fontSizes[config.fontSize];
    const lineSpacing = lineSpacings[config.fontSize];

    const cols = {
      id: { x: margin, width: contentWidth * 0.15 },
      name: { x: margin + contentWidth * 0.15, width: contentWidth * 0.30 },
      division: { x: margin + contentWidth * 0.45, width: contentWidth * 0.25 },
      club: { x: margin + contentWidth * 0.70, width: contentWidth * 0.20 },
      weight: { x: margin + contentWidth * 0.90, width: contentWidth * 0.10 }
    };

    let y = 20;

    const drawHeader = () => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.text("ID", cols.id.x, y);
      doc.text("Atleta", cols.name.x, y);
      doc.text("Divisão", cols.division.x, y);
      doc.text("Clube", cols.club.x, y);
      doc.text("Peso", cols.weight.x, y);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
      y += lineSpacing + 2;
      doc.setFont('helvetica', 'normal');
    };

    doc.setFontSize(fontSize + 4);
    doc.text(`Lista de Check-in - ${event.name}`, pageWidth / 2, y, { align: 'center' });
    y += lineSpacing * 1.5;
    
    doc.setFontSize(fontSize);
    doc.text(`Filtro: ${checkInFilter.toUpperCase()} - Total: ${sortedAthletes.length}`, margin, y);
    y += lineSpacing * 1.5;

    drawHeader();

    sortedAthletes.forEach((athlete) => {
      const id = athlete.emirates_id || athlete.school_id || '-';
      const name = `${athlete.first_name} ${athlete.last_name}`;
      const division = athlete._division?.name || 'N/A';
      const club = athlete.club;
      const weight = athlete.registered_weight ? `${athlete.registered_weight}kg` : '-';

      doc.setFontSize(fontSize);
      const idLines = doc.splitTextToSize(id, cols.id.width);
      const nameLines = doc.splitTextToSize(name, cols.name.width);
      const divisionLines = doc.splitTextToSize(division, cols.division.width);
      const clubLines = doc.splitTextToSize(club, cols.club.width);
      const weightLines = doc.splitTextToSize(weight, cols.weight.width);

      const maxLines = Math.max(idLines.length, nameLines.length, divisionLines.length, clubLines.length, weightLines.length);
      const rowHeight = maxLines * lineSpacing;

      if (y + rowHeight > pageHeight - margin) {
        doc.addPage();
        y = 20;
        drawHeader();
      }

      const drawCenteredText = (lines: string[], col: { x: number }, currentY: number, totalRowHeight: number) => {
        const textBlockHeight = lines.length * lineSpacing;
        const yOffset = (totalRowHeight - textBlockHeight) / 2;
        doc.text(lines, col.x, currentY + yOffset);
      };

      drawCenteredText(idLines, cols.id, y, rowHeight);
      drawCenteredText(nameLines, cols.name, y, rowHeight);
      drawCenteredText(divisionLines, cols.division, y, rowHeight);
      drawCenteredText(clubLines, cols.club, y, rowHeight);
      drawCenteredText(weightLines, cols.weight, y, rowHeight);

      y += rowHeight;

      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.1);
      doc.line(margin, y + 1, pageWidth - margin, y + 1);
      
      y += 3;
    });

    doc.save(`check_in_list_${event.name.replace(/\s+/g, '_')}.pdf`);
  };

  const isCheckInTimeValid = () => {
    if (!check_in_start_time || !check_in_end_time) return false;
    return currentTime >= check_in_start_time && currentTime <= check_in_end_time;
  };

  const isCheckInAllowedGlobally = userRole === 'admin' || isCheckInTimeValid();

  const timeRemainingInSeconds = check_in_end_time ? differenceInSeconds(check_in_end_time, currentTime) : 0;
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
          {!event.check_in_start_time || !event.check_in_end_time ? (
            <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
          ) : (
            <span className="text-muted-foreground block mt-2">Horário: {format(new Date(event.check_in_start_time), 'dd/MM HH:mm')} - {format(new Date(event.check_in_end_time), 'dd/MM HH:mm')}</span>
          )}
          {event.is_attendance_mandatory_before_check_in && (
            <p className="text-orange-500 mt-2">Atenção: A presença é obrigatória antes do check-in. Apenas atletas marcados como 'Presente' aparecerão aqui.</p>
          )}
          {!event.is_weight_check_enabled && (
            <p className="text-blue-500 mt-2">Verificação de peso desabilitada. Todos os atletas serão considerados no peso.</p>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!userRole ? (
          <Card><CardHeader><CardTitle>Acesso Negado</CardTitle><CardDescription>Você não tem permissão para acessar o check-in.</CardDescription></CardHeader></Card>
        ) : (
          <>
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
                  checkInFilter === 'overweight' ? 'hover:bg-red-300 dark:hover:bg-red-700' : 'hover:bg-red-100 dark:hover:bg-red-900'
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
                  checkInFilter === 'pending' ? 'hover:bg-orange-300 dark:hover:bg-orange-700' : 'hover:bg-orange-100 dark:hover:bg-orange-900'
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
                  checkInFilter === 'all' ? 'hover:bg-blue-300 dark:hover:bg-blue-700' : 'hover:bg-blue-100 dark:hover:bg-blue-900'
                )}
                onClick={() => setCheckInFilter('all')}
              >
                <p className="text-2xl font-bold text-blue-600">{totalApprovedAthletes}</p>
                <p className="text-sm text-muted-foreground">Total Aprovados</p>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {event.check_in_scan_mode === 'qr' && (
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                      <QrCodeIcon className="mr-2 h-4 w-4" /> Escanear QR
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Escanear QR Code do Atleta</DialogTitle>
                    </DialogHeader>
                    <QrScanner
                      onScanSuccess={(qrCodeId) => {
                        const athlete = processedApprovedAthletes.find(a => a.registration_qr_code_id === qrCodeId);
                        if (athlete) {
                          setScannedAthleteId(qrCodeId);
                          setSearchTerm('');
                          showSuccess(`Atleta ${athlete.first_name} ${athlete.last_name} escaneado!`);
                          setIsScannerOpen(false);
                        } else {
                          showError('QR Code não reconhecido ou atleta não encontrado.');
                        }
                      }}
                    />
                  </DialogContent>
                </Dialog>
              )}
              {event.check_in_scan_mode === 'barcode' && (
                <div className="w-full md:w-auto">
                  <Button variant="outline" className="w-full" disabled>
                    <Barcode className="mr-2 h-4 w-4" /> Escanear Código
                  </Button>
                </div>
              )}
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder="Buscar atleta (nome, clube, divisão, ID...)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setScannedAthleteId(null);
                  }}
                  className="pr-10"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handlePrintList} title="Imprimir Lista">
                  <Printer className="h-4 w-4 mr-2" /> Imprimir
                </Button>
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'cards' | 'table')}>
                  <ToggleGroupItem value="cards" aria-label="Visualização em Cards"><LayoutGrid className="h-4 w-4" /></ToggleGroupItem>
                  <ToggleGroupItem value="table" aria-label="Visualização em Tabela"><LayoutList className="h-4 w-4" /></ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {sortedAthletes.length === 0 ? (
              <p className="text-muted-foreground">Nenhum atleta aprovado para check-in encontrado com os critérios atuais.</p>
            ) : (
              viewMode === 'table' ? (
                <CheckInTable
                  athletes={sortedAthletes}
                  onCheckIn={handleCheckInAthlete}
                  isCheckInAllowed={isCheckInAllowedGlobally}
                  eventDivisions={event.divisions || []}
                  isWeightCheckEnabled={event.is_weight_check_enabled ?? true}
                  isOverweightAutoMoveEnabled={event.is_overweight_auto_move_enabled ?? false}
                  isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              ) : (
                <ul className="space-y-4">
                  {sortedAthletes.map((athlete) => (
                    <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                      <div className="flex items-center space-x-3 flex-grow">
                        {athlete.photo_url ? (
                          <img src={athlete.photo_url} alt={athlete.first_name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{athlete.first_name} {athlete.last_name} ({athlete.nationality})</p>
                          <p className="text-xs font-mono bg-muted px-1.5 rounded w-fit my-0.5">{athlete.emirates_id || athlete.school_id || 'Sem ID'}</p>
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division, t)}</p>
                          {athlete.registered_weight && (
                            <p className="text-xs text-gray-500">Último peso: <span className="font-semibold">{athlete.registered_weight}kg</span></p>
                          )}
                          {athlete.move_reason && (
                            <p className="text-xs text-blue-500">
                              <span className="font-semibold">{t('moved')}:</span> {athlete.move_reason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {athlete.check_in_status === 'checked_in' && (
                            <span className="flex items-center text-green-600 font-semibold text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Check-in OK
                            </span>
                          )}
                          {athlete.check_in_status === 'overweight' && (
                            <span className="flex items-center text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4 mr-1" /> Acima do Peso ({athlete.registered_weight}kg)
                            </span>
                          )}
                          {athlete.check_in_status === 'pending' && (
                            <span className="flex items-center text-orange-500 font-semibold text-sm">
                              <Scale className="h-4 w-4 mr-1" /> Pendente
                            </span>
                          )}
                        </div>
                        <CheckInForm
                          athlete={athlete}
                          onCheckIn={handleCheckInAthlete}
                          isCheckInAllowed={isCheckInAllowedGlobally && (event.is_attendance_mandatory_before_check_in ? athlete.attendance_status === 'present' : true)}
                          divisionMaxWeight={athlete._division?.max_weight}
                          isWeightCheckEnabled={event.is_weight_check_enabled ?? true}
                          isOverweightAutoMoveEnabled={event.is_overweight_auto_move_enabled ?? false}
                          eventDivisions={event.divisions || []}
                          isBeltGroupingEnabled={event.is_belt_grouping_enabled ?? true}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default CheckInTab;