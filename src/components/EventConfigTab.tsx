"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Event, Division } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarIcon, Download, QrCodeIcon, Barcode } from 'lucide-react';
import { format } from 'date-fns';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useTranslations } from '@/hooks/use-translations';
import DivisionTable from '@/components/DivisionTable';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';

interface EventConfigTabProps {
  event: Event;
  configSubTab: string;
  setConfigSubTab: (value: string) => void;
  isActive: boolean;
  setIsActive: (value: boolean) => void;
  handleExportJson: () => void;
  checkInStartTime?: Date;
  setCheckInStartTime: (date?: Date) => void;
  checkInEndTime?: Date;
  setCheckInEndTime: (date?: Date) => void;
  numFightAreas: number;
  setNumFightAreas: (value: number) => void;
  isAttendanceMandatory: boolean;
  setIsAttendanceMandatory: (value: boolean) => void;
  isWeightCheckEnabled: boolean;
  setIsWeightCheckEnabled: (value: boolean) => void;
  isBeltGroupingEnabled: boolean;
  setIsBeltGroupingEnabled: (value: boolean) => void;
  isOverweightAutoMoveEnabled: boolean;
  setIsOverweightAutoMoveEnabled: (value: boolean) => void;
  includeThirdPlace: boolean;
  setIncludeThirdPlace: (value: boolean) => void;
  checkInScanMode: 'qr' | 'barcode' | 'none';
  setCheckInScanMode: (value: 'qr' | 'barcode' | 'none') => void;
  handleUpdateDivisions: (divisions: Division[]) => void;
  championPoints: number;
  setChampionPoints: (value: number) => void;
  runnerUpPoints: number;
  setRunnerUpPoints: (value: number) => void;
  thirdPlacePoints: number;
  setThirdPlacePoints: (value: number) => void;
  countSingleClubCategories: boolean;
  setCountSingleClubCategories: (value: boolean) => void;
  countWalkoverSingleFightCategories: boolean;
  setCountWalkoverSingleFightCategories: (value: boolean) => void;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete'; // New prop
}

const EventConfigTab: React.FC<EventConfigTabProps> = ({
  event,
  configSubTab,
  setConfigSubTab,
  isActive,
  setIsActive,
  handleExportJson,
  checkInStartTime,
  setCheckInStartTime,
  checkInEndTime,
  setCheckInEndTime,
  numFightAreas,
  setNumFightAreas,
  isAttendanceMandatory,
  setIsAttendanceMandatory,
  isWeightCheckEnabled,
  setIsWeightCheckEnabled,
  isBeltGroupingEnabled,
  setIsBeltGroupingEnabled,
  isOverweightAutoMoveEnabled,
  setIsOverweightAutoMoveEnabled,
  includeThirdPlace,
  setIncludeThirdPlace,
  checkInScanMode,
  setCheckInScanMode,
  handleUpdateDivisions,
  championPoints,
  setChampionPoints,
  runnerUpPoints,
  setRunnerUpPoints,
  thirdPlacePoints,
  setThirdPlacePoints,
  countSingleClubCategories,
  setCountSingleClubCategories,
  countWalkoverSingleFightCategories,
  setCountWalkoverSingleFightCategories,
  userRole, // Destructure new prop
}) => {
  const { t } = useTranslations();

  if (userRole !== 'admin') {
    return (
      <Card><CardHeader><CardTitle>Acesso Negado</CardTitle><CardDescription>Você não tem permissão para acessar as configurações do evento.</CardDescription></CardHeader></Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Evento</CardTitle>
        <CardDescription>Gerencie as configurações gerais, divisões e tempos de luta do evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={configSubTab} onValueChange={setConfigSubTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="event-settings">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="divisions">Divisões ({event.divisions.length})</TabsTrigger>
            <TabsTrigger value="results-settings">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="event-settings" className="mt-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold flex items-center justify-between mb-2">
                  {t('generalSettings')}
                  <LanguageToggle />
                </h3>
                <p className="text-muted-foreground">{t('languageDemo')}</p>
                <div className="flex items-center space-x-2 mt-4">
                  <Switch
                    id="event-active"
                    checked={isActive}
                    onCheckedChange={setIsActive}
                  />
                  <Label htmlFor="event-active">Evento Ativo</Label>
                </div>
                <div className="mt-4">
                  <Button onClick={handleExportJson} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Exportar Dados (JSON)
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold">Configurações de Check-in</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <Label htmlFor="checkInStartTime">Início do Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkInStartTime ? format(checkInStartTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkInStartTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              if (checkInStartTime) newDate.setHours(checkInStartTime.getHours(), checkInStartTime.getMinutes());
                              else newDate.setHours(9, 0);
                              setCheckInStartTime(newDate);
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            value={checkInStartTime ? format(checkInStartTime, 'HH:mm') : '09:00'}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = checkInStartTime ? new Date(checkInStartTime) : new Date();
                              newDate.setHours(hours, minutes);
                              setCheckInStartTime(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="checkInEndTime">Fim do Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkInEndTime ? format(checkInEndTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkInEndTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              if (checkInEndTime) newDate.setHours(checkInEndTime.getHours(), checkInEndTime.getMinutes());
                              else newDate.setHours(17, 0);
                              setCheckInEndTime(newDate);
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            value={checkInEndTime ? format(checkInEndTime, 'HH:mm') : '17:00'}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = checkInEndTime ? new Date(checkInEndTime) : new Date();
                              newDate.setHours(hours, minutes);
                              setCheckInEndTime(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="numFightAreas">Número de Áreas de Luta</Label>
                <Input
                  id="numFightAreas"
                  type="number"
                  min="1"
                  value={numFightAreas}
                  onChange={(e) => setNumFightAreas(Number(e.target.value))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                <div className="flex items-center space-x-2">
                  <Switch id="attendance-mandatory" checked={isAttendanceMandatory} onCheckedChange={setIsAttendanceMandatory} />
                  <Label htmlFor="attendance-mandatory">Presença obrigatória antes do Check-in</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="weight-check-enabled" checked={isWeightCheckEnabled} onCheckedChange={setIsWeightCheckEnabled} />
                  <Label htmlFor="weight-check-enabled">Habilitar Verificação de Peso</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="belt-grouping-enabled" checked={isBeltGroupingEnabled} onCheckedChange={setIsBeltGroupingEnabled} />
                  <Label htmlFor="belt-grouping-enabled">Agrupar Divisões por Faixa</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="overweight-auto-move-enabled" checked={isOverweightAutoMoveEnabled} onCheckedChange={setIsOverweightAutoMoveEnabled} />
                  <Label htmlFor="overweight-auto-move-enabled">Mover atleta acima do peso</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="include-third-place" checked={includeThirdPlace} onCheckedChange={setIncludeThirdPlace} />
                  <Label htmlFor="include-third-place">Incluir Luta pelo 3º Lugar</Label>
                </div>
              </div>
              <div>
                <h4 className="text-md font-semibold mt-4">Modo de Escaneamento para Check-in</h4>
                <ToggleGroup
                  type="single"
                  value={checkInScanMode}
                  onValueChange={(value: 'qr' | 'barcode' | 'none') => {
                    if (value) setCheckInScanMode(value);
                    else setCheckInScanMode('none');
                  }}
                  className="mt-2"
                >
                  <ToggleGroupItem value="qr" aria-label="QR Code">
                    <QrCodeIcon className="mr-2 h-4 w-4" />
                    QR Code
                  </ToggleGroupItem>
                  <ToggleGroupItem value="barcode" aria-label="Código de Barras">
                    <Barcode className="mr-2 h-4 w-4" />
                    Código de Barras
                  </ToggleGroupItem>
                </ToggleGroup>
                <p className="text-sm text-muted-foreground mt-2">
                  Selecione o método de escaneamento. Se nenhum for selecionado, a opção será desativada.
                </p>
              </div>
            </div>
            <CheckInMandatoryFieldsConfig eventId={event.id} />
          </TabsContent>

          <TabsContent value="divisions" className="mt-6">
            <Link to={`/events/${event.id}/import-divisions`}>
              <Button className="w-full mb-4">Importar Divisões em Lote</Button>
            </Link>
            <DivisionTable divisions={event.divisions} onUpdateDivisions={handleUpdateDivisions} />
          </TabsContent>

          <TabsContent value="results-settings" className="mt-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold mb-4">Configuração de Pontos</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="championPoints">Pontos Campeão</Label>
                  <Input
                    id="championPoints"
                    type="number"
                    min="0"
                    value={championPoints}
                    onChange={(e) => setChampionPoints(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="runnerUpPoints">Pontos Vice-Campeão</Label>
                  <Input
                    id="runnerUpPoints"
                    type="number"
                    min="0"
                    value={runnerUpPoints}
                    onChange={(e) => setRunnerUpPoints(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="thirdPlacePoints">Pontos 3º Lugar</Label>
                  <Input
                    id="thirdPlacePoints"
                    type="number"
                    min="0"
                    value={thirdPlacePoints}
                    onChange={(e) => setThirdPlacePoints(Number(e.target.value))}
                  />
                </div>
              </div>

              <h3 className="text-xl font-semibold mt-6 mb-4">Regras de Contagem de Pontos</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="count-single-club-categories"
                  checked={countSingleClubCategories}
                  onCheckedChange={setCountSingleClubCategories}
                />
                <Label htmlFor="count-single-club-categories">Categorias com apenas uma equipe contam pontos</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <Switch
                  id="count-walkover-single-fight-categories"
                  checked={countWalkoverSingleFightCategories}
                  onCheckedChange={setCountWalkoverSingleFightCategories}
                />
                <Label htmlFor="count-walkover-single-fight-categories">W.O. em lutas únicas (equipes diferentes) contam pontos</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EventConfigTab;