"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';

interface EventAdminSettingsTabProps {
  eventId: string;
  checkInStartTime?: Date;
  setCheckInStartTime: (date: Date | undefined) => void;
  checkInEndTime?: Date;
  setCheckInEndTime: (date: Date | undefined) => void;
  numFightAreas: number;
  setNumFightAreas: (num: number) => void;
  isAttendanceMandatoryBeforeCheckIn: boolean;
  setIsAttendanceMandatoryBeforeCheckIn: (checked: boolean) => void;
}

const EventAdminSettingsTab: React.FC<EventAdminSettingsTabProps> = ({
  eventId,
  checkInStartTime,
  setCheckInStartTime,
  checkInEndTime,
  setCheckInEndTime,
  numFightAreas,
  setNumFightAreas,
  isAttendanceMandatoryBeforeCheckIn,
  setIsAttendanceMandatoryBeforeCheckIn,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Administração do Evento</CardTitle>
        <CardDescription>Gerencie usuários e configurações do evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link to={`/events/${eventId}/import-athletes`}>
          <Button className="w-full">Importar Atletas em Lote</Button>
        </Link>

        <div className="mt-8 space-y-4">
          <h3 className="text-xl font-semibold">Configurações de Check-in</h3>
          <div>
            <Label htmlFor="checkInStartTime">Início do Check-in</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
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
                      if (checkInStartTime) {
                        newDate.setHours(checkInStartTime.getHours(), checkInStartTime.getMinutes());
                      } else {
                        newDate.setHours(9, 0); // Default to 9 AM
                      }
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
                      if (checkInStartTime) {
                        const newDate = new Date(checkInStartTime);
                        newDate.setHours(hours, minutes);
                        setCheckInStartTime(newDate);
                      } else {
                        const newDate = new Date();
                        newDate.setHours(hours, minutes);
                        setCheckInStartTime(newDate);
                      }
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
                <Button
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
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
                      if (checkInEndTime) {
                        newDate.setHours(checkInEndTime.getHours(), checkInEndTime.getMinutes());
                      } else {
                        newDate.setHours(17, 0); // Default to 5 PM
                      }
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
                      if (checkInEndTime) {
                        const newDate = new Date(checkInEndTime);
                        newDate.setHours(hours, minutes);
                        setCheckInEndTime(newDate);
                      } else {
                        const newDate = new Date();
                        newDate.setHours(hours, minutes);
                        setCheckInEndTime(newDate);
                      }
                    }}
                  />
                </div>
              </PopoverContent>
            </Popover>
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
          <div className="flex items-center space-x-2">
            <Switch
              id="attendance-mandatory"
              checked={isAttendanceMandatoryBeforeCheckIn}
              onCheckedChange={setIsAttendanceMandatoryBeforeCheckIn}
            />
            <Label htmlFor="attendance-mandatory">Exigir presença antes do Check-in</Label>
          </div>
        </div>
        <CheckInMandatoryFieldsConfig eventId={eventId} />
      </CardContent>
    </Card>
  );
};

export default EventAdminSettingsTab;