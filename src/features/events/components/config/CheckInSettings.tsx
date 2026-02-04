
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarIcon, Printer, Type, QrCodeIcon, Barcode } from 'lucide-react';
import { format } from 'date-fns';
import { Event, CheckInConfig } from '@/types/index';
import CheckInMandatoryFieldsConfig from '@/features/events/components/CheckInMandatoryFieldsConfig';

interface CheckInSettingsProps {
    event: Event;
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
    onUpdateCheckInConfig: (config: CheckInConfig) => void;
}

const CheckInSettings: React.FC<CheckInSettingsProps> = ({
    event,
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
    onUpdateCheckInConfig
}) => {
    // Print Settings State
    const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [printFontSize, setPrintFontSize] = useState<'small' | 'medium' | 'large'>('medium');

    useEffect(() => {
        if (event.check_in_config?.printSettings) {
            setPrintOrientation(event.check_in_config.printSettings.orientation);
            setPrintFontSize(event.check_in_config.printSettings.fontSize);
        }
    }, [event.check_in_config]);

    // Handle updates to print settings locally, then propagate to parent
    const handlePrintConfigChange = (type: 'orientation' | 'fontSize', value: string) => {
        if (type === 'orientation') setPrintOrientation(value as any);
        if (type === 'fontSize') setPrintFontSize(value as any);

        const currentConfig: CheckInConfig = event.check_in_config || {};
        const updatedConfig: CheckInConfig = {
            ...currentConfig,
            printSettings: {
                orientation: type === 'orientation' ? (value as any) : printOrientation,
                fontSize: type === 'fontSize' ? (value as any) : printFontSize,
            },
        };
        onUpdateCheckInConfig(updatedConfig);
    };

    return (
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

            <div className="p-4 border rounded-md bg-muted/20">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold flex items-center gap-2">
                        <Printer className="h-5 w-5" /> Configuração de Impressão do Check-in
                    </h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>Orientação</Label>
                        <ToggleGroup type="single" value={printOrientation} onValueChange={(v) => v && handlePrintConfigChange('orientation', v)} className="justify-start mt-2">
                            <ToggleGroupItem value="portrait" aria-label="Retrato">Retrato</ToggleGroupItem>
                            <ToggleGroupItem value="landscape" aria-label="Paisagem">Paisagem</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                    <div>
                        <Label>Tamanho da Fonte</Label>
                        <ToggleGroup type="single" value={printFontSize} onValueChange={(v) => v && handlePrintConfigChange('fontSize', v)} className="justify-start mt-2">
                            <ToggleGroupItem value="small" aria-label="Pequena"><Type className="h-3 w-3 mr-1" />Pequena</ToggleGroupItem>
                            <ToggleGroupItem value="medium" aria-label="Média"><Type className="h-4 w-4 mr-1" />Média</ToggleGroupItem>
                            <ToggleGroupItem value="large" aria-label="Grande"><Type className="h-5 w-5 mr-1" />Grande</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                    As alterações serão salvas automaticamente ao salvar as configurações do evento.
                </p>
            </div>

            <CheckInMandatoryFieldsConfig eventId={event.id} />
        </div>
    );
};

export default CheckInSettings;
