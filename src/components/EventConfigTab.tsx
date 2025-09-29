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
import { useLayoutSettings } from '@/context/layout-settings-context';
import { Textarea } from '@/components/ui/textarea';

interface EventConfigTabProps {
  event: Event;
  configSubTab: string;
  setConfigSubTab: (value: string) => void;
  is_active: boolean;
  set_is_active: (value: boolean) => void;
  handleExportJson: () => void;
  check_in_start_time?: Date;
  set_check_in_start_time: (date?: Date) => void;
  check_in_end_time?: Date;
  set_check_in_end_time: (date?: Date) => void;
  num_fight_areas: number;
  set_num_fight_areas: (value: number) => void;
  is_attendance_mandatory_before_check_in: boolean;
  set_is_attendance_mandatory_before_check_in: (value: boolean) => void;
  is_weight_check_enabled: boolean;
  set_is_weight_check_enabled: (value: boolean) => void;
  is_belt_grouping_enabled: boolean;
  set_is_belt_grouping_enabled: (value: boolean) => void;
  is_overweight_auto_move_enabled: boolean;
  set_is_overweight_auto_move_enabled: (value: boolean) => void;
  include_third_place: boolean;
  set_include_third_place: (value: boolean) => void;
  check_in_scan_mode: 'qr' | 'barcode' | 'none';
  set_check_in_scan_mode: (value: 'qr' | 'barcode' | 'none') => void;
  handleUpdateDivisions: (divisions: Division[]) => void;
  champion_points: number;
  set_champion_points: (value: number) => void;
  runner_up_points: number;
  set_runner_up_points: (value: number) => void;
  third_place_points: number;
  set_third_place_points: (value: number) => void;
  count_single_club_categories: boolean;
  set_count_single_club_categories: (value: boolean) => void;
  count_walkover_single_fight_categories: boolean;
  set_count_walkover_single_fight_categories: (value: boolean) => void;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  event_name: string;
  set_event_name: (name: string) => void;
  event_description: string;
  set_event_description: (description: string) => void;
}

const EventConfigTab: React.FC<EventConfigTabProps> = ({
  event,
  configSubTab,
  setConfigSubTab,
  is_active,
  set_is_active,
  handleExportJson,
  check_in_start_time,
  set_check_in_start_time,
  check_in_end_time,
  set_check_in_end_time,
  num_fight_areas,
  set_num_fight_areas,
  is_attendance_mandatory_before_check_in,
  set_is_attendance_mandatory_before_check_in,
  is_weight_check_enabled,
  set_is_weight_check_enabled,
  is_belt_grouping_enabled,
  set_is_belt_grouping_enabled,
  is_overweight_auto_move_enabled,
  set_is_overweight_auto_move_enabled,
  include_third_place,
  set_include_third_place,
  check_in_scan_mode,
  set_check_in_scan_mode,
  handleUpdateDivisions,
  champion_points,
  set_champion_points,
  runner_up_points,
  set_runner_up_points,
  third_place_points,
  set_third_place_points,
  count_single_club_categories,
  set_count_single_club_categories,
  count_walkover_single_fight_categories,
  set_count_walkover_single_fight_categories,
  userRole,
  event_name,
  set_event_name,
  event_description,
  set_event_description,
}) => {
  const { t } = useTranslations();
  const { isWideLayout, setIsWideLayout } = useLayoutSettings();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações do Evento</CardTitle>
        <CardDescription>Gerencie as configurações gerais, divisões e tempos de luta do evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {userRole !== 'admin' ? (
          <Card><CardHeader><CardTitle>Acesso Negado</CardTitle><CardDescription>Você não tem permissão para acessar as configurações do evento.</CardDescription></CardHeader></Card>
        ) : (
          <Tabs value={configSubTab} onValueChange={setConfigSubTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="event-settings">Configurações Gerais</TabsTrigger>
              <TabsTrigger value="divisions">Divisões ({event.divisions?.length || 0})</TabsTrigger>
              <TabsTrigger value="check-in-settings">Check-in</TabsTrigger>
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
                  
                  <div className="mt-4">
                    <Label htmlFor="eventName">Nome do Evento</Label>
                    <Input
                      id="eventName"
                      value={event_name}
                      onChange={(e) => set_event_name(e.target.value)}
                      placeholder="Ex: Campeonato Aberto de Verão"
                    />
                  </div>
                  <div className="mt-4">
                    <Label htmlFor="eventDescription">Descrição</Label>
                    <Textarea
                      id="eventDescription"
                      value={event_description}
                      onChange={(e) => set_event_description(e.target.value)}
                      placeholder="Uma breve descrição do evento..."
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="event-active"
                      checked={is_active}
                      onCheckedChange={set_is_active}
                    />
                    <Label htmlFor="event-active">Evento Ativo</Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-4">
                    <Switch
                      id="wide-layout"
                      checked={isWideLayout}
                      onCheckedChange={setIsWideLayout}
                    />
                    <Label htmlFor="wide-layout">Layout Amplo (Todas as Páginas)</Label>
                  </div>
                  <div className="mt-4">
                    <Button onClick={handleExportJson} variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar Dados (JSON)
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="divisions" className="mt-6">
              <Link to={`/events/${event.id}/import-divisions`}>
                <Button className="w-full mb-4">Importar Divisões em Lote</Button>
              </Link>
              <DivisionTable divisions={event.divisions || []} onUpdateDivisions={handleUpdateDivisions} />
            </TabsContent>

            <TabsContent value="check-in-settings" className="mt-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold">Configurações de Check-in</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label htmlFor="checkInStartTime">Início do Check-in</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {check_in_start_time ? format(check_in_start_time, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={check_in_start_time}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (check_in_start_time) newDate.setHours(check_in_start_time.getHours(), check_in_start_time.getMinutes());
                                else newDate.setHours(9, 0);
                                set_check_in_start_time(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={check_in_start_time ? format(check_in_start_time, 'HH:mm') : '09:00'}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                const newDate = check_in_start_time ? new Date(check_in_start_time) : new Date();
                                newDate.setHours(hours, minutes);
                                set_check_in_start_time(newDate);
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
                            {check_in_end_time ? format(check_in_end_time, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={check_in_end_time}
                            onSelect={(date) => {
                              if (date) {
                                const newDate = new Date(date);
                                if (check_in_end_time) newDate.setHours(check_in_end_time.getHours(), check_in_end_time.getMinutes());
                                else newDate.setHours(17, 0);
                                set_check_in_end_time(newDate);
                              }
                            }}
                            initialFocus
                          />
                          <div className="p-3 border-t border-border">
                            <Input
                              type="time"
                              value={check_in_end_time ? format(check_in_end_time, 'HH:mm') : '17:00'}
                              onChange={(e) => {
                                const [hours, minutes] = e.target.value.split(':').map(Number);
                                const newDate = check_in_end_time ? new Date(check_in_end_time) : new Date();
                                newDate.setHours(hours, minutes);
                                set_check_in_end_time(newDate);
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
                    value={num_fight_areas}
                    onChange={(e) => set_num_fight_areas(Number(e.target.value))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                  <div className="flex items-center space-x-2">
                    <Switch id="attendance-mandatory" checked={is_attendance_mandatory_before_check_in} onCheckedChange={set_is_attendance_mandatory_before_check_in} />
                    <Label htmlFor="attendance-mandatory">Presença obrigatória antes do Check-in</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="weight-check-enabled" checked={is_weight_check_enabled} onCheckedChange={set_is_weight_check_enabled} />
                    <Label htmlFor="weight-check-enabled">Habilitar Verificação de Peso</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="belt-grouping-enabled" checked={is_belt_grouping_enabled} onCheckedChange={set_is_belt_grouping_enabled} />
                    <Label htmlFor="belt-grouping-enabled">Agrupar Divisões por Faixa</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="overweight-auto-move-enabled" checked={is_overweight_auto_move_enabled} onCheckedChange={set_is_overweight_auto_move_enabled} />
                    <Label htmlFor="overweight-auto-move-enabled">Mover atleta acima do peso</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch id="include-third-place" checked={include_third_place} onCheckedChange={set_include_third_place} />
                    <Label htmlFor="include-third-place">Incluir Luta pelo 3º Lugar</Label>
                  </div>
                </div>
                <div>
                  <h4 className="text-md font-semibold mt-4">Modo de Escaneamento para Check-in</h4>
                  <ToggleGroup
                    type="single"
                    value={check_in_scan_mode}
                    onValueChange={(value: 'qr' | 'barcode' | 'none') => {
                      if (value) set_check_in_scan_mode(value);
                      else set_check_in_scan_mode('none');
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
                      value={champion_points}
                      onChange={(e) => set_champion_points(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="runnerUpPoints">Pontos Vice-Campeão</Label>
                    <Input
                      id="runnerUpPoints"
                      type="number"
                      min="0"
                      value={runner_up_points}
                      onChange={(e) => set_runner_up_points(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="thirdPlacePoints">Pontos 3º Lugar</Label>
                    <Input
                      id="thirdPlacePoints"
                      type="number"
                      min="0"
                      value={third_place_points}
                      onChange={(e) => set_third_place_points(Number(e.target.value))}
                    />
                  </div>
                </div>

                <h3 className="text-xl font-semibold mt-6 mb-4">Regras de Contagem de Pontos</h3>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="count-single-club-categories"
                    checked={count_single_club_categories}
                    onCheckedChange={set_count_single_club_categories}
                  />
                  <Label htmlFor="count-single-club-categories">Categorias com apenas uma equipe contam pontos</Label>
                </div>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    id="count-walkover-single-fight-categories"
                    checked={count_walkover_single_fight_categories}
                    onCheckedChange={set_count_walkover_single_fight_categories}
                  />
                  <Label htmlFor="count-walkover-single-fight-categories">W.O. em lutas únicas (equipes diferentes) contam pontos</Label>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default EventConfigTab;