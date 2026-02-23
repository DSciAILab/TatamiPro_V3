"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Event, Division, AgeDivisionSetting, CheckInConfig } from '@/types/index';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  GeneralSettings, 
  RegistrationSettings, 
  PointSystemSettings, 
  BracketSettings, 
  CheckInSettings 
} from './config';
import AgeDivisionConfig from './AgeDivisionConfig';
import DivisionTable from '@/features/events/components/DivisionTable';

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
  handleUpdateAgeDivisionSettings: (settings: AgeDivisionSetting[]) => void;
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
  count_wo_champion_categories: boolean;
  set_count_wo_champion_categories: (value: boolean) => void;
  userRole?: 'admin' | 'coach' | 'staff' | 'athlete';
  event_name: string;
  set_event_name: (name: string) => void;
  event_description: string;
  set_event_description: (description: string) => void;
  max_athletes_per_bracket: number;
  set_max_athletes_per_bracket: (value: number) => void;
  is_bracket_splitting_enabled: boolean;
  set_is_bracket_splitting_enabled: (value: boolean) => void;
  enable_team_separation: boolean;
  set_enable_team_separation: (value: boolean) => void;
  is_lead_capture_enabled: boolean;
  set_is_lead_capture_enabled: (value: boolean) => void;
  is_auto_approve_registrations_enabled: boolean;
  set_is_auto_approve_registrations_enabled: (value: boolean) => void;
  theme?: string;
  set_theme?: (value: string) => void;
  // This prop allows us to update check_in_config which is part of event
  // but originally wasn't explicitly passed as separate prop like others.
  // It's implicitly updated via handleUpdateEventProperty in parent
  // But EventConfigTab didn't expose it. 
  // We need to assume parent might pass it or we need to add it to props.
  // Wait, EventConfigTabProps is defined here. I can add it.
  // BUT the parent (EventDetail) calls this component. I need to make sure I don't break parent call.
  // EventDetail passes `handleUpdateEventProperty`? No it passes individual setters.
  // I need to add `onUpdateCheckInConfig` to props here and update parent to pass it.
  onUpdateCheckInConfig?: (config: CheckInConfig) => void;
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
  handleUpdateAgeDivisionSettings,
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
  count_wo_champion_categories,
  set_count_wo_champion_categories,
  userRole,
  event_name,
  set_event_name,
  event_description,
  set_event_description,
  max_athletes_per_bracket,
  set_max_athletes_per_bracket,
  is_bracket_splitting_enabled,
  set_is_bracket_splitting_enabled,
  enable_team_separation,
  set_enable_team_separation,
  is_lead_capture_enabled,
  set_is_lead_capture_enabled,
  is_auto_approve_registrations_enabled,
  set_is_auto_approve_registrations_enabled,
  theme,
  set_theme,
  onUpdateCheckInConfig
}) => {
  const handleShare = (type: 'public_event' | 'public_registration') => {
    const path = type === 'public_event' ? `/p/events/${event.id}` : `/p/events/${event.id}/register`;
    const publicUrl = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
 //     showSuccess("Link público copiado para a área de transferência!");
      alert("Link público copiado para a área de transferência!"); // Quick fallback if toast unused here
    }, (err) => {
 //     showError('Falha ao copiar o link: ' + err);
      alert('Falha ao copiar o link: ' + err);
    });
  };

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
                <GeneralSettings
                    event={event}
                    event_name={event_name}
                    set_event_name={set_event_name}
                    event_description={event_description}
                    set_event_description={set_event_description}
                    is_active={is_active}
                    set_is_active={set_is_active}
                    is_lead_capture_enabled={is_lead_capture_enabled}
                    set_is_lead_capture_enabled={set_is_lead_capture_enabled}
                    theme={theme}
                    set_theme={set_theme}
                    handleExportJson={handleExportJson}
                    handleShare={handleShare}
                />
                
                <RegistrationSettings 
                    is_auto_approve_registrations_enabled={is_auto_approve_registrations_enabled}
                    set_is_auto_approve_registrations_enabled={set_is_auto_approve_registrations_enabled}
                />

                <BracketSettings
                    is_bracket_splitting_enabled={is_bracket_splitting_enabled}
                    set_is_bracket_splitting_enabled={set_is_bracket_splitting_enabled}
                    max_athletes_per_bracket={max_athletes_per_bracket}
                    set_max_athletes_per_bracket={set_max_athletes_per_bracket}
                    enable_team_separation={enable_team_separation}
                    set_enable_team_separation={set_enable_team_separation}
                />
            </TabsContent>

            <TabsContent value="divisions" className="mt-6 space-y-8">
              <AgeDivisionConfig
                settings={event.age_division_settings || []}
                onUpdateSettings={handleUpdateAgeDivisionSettings}
              />
              <hr />
              <Link to={`/events/${event.id}/import-divisions`}>
                <Button className="w-full mb-4">Importar Divisões em Lote</Button>
              </Link>
              <DivisionTable
                divisions={event.divisions || []}
                onUpdateDivisions={handleUpdateDivisions}
                ageDivisionSettings={event.age_division_settings || []}
              />
            </TabsContent>

            <TabsContent value="check-in-settings" className="mt-6">
                <CheckInSettings
                    event={event}
                    check_in_start_time={check_in_start_time}
                    set_check_in_start_time={set_check_in_start_time}
                    check_in_end_time={check_in_end_time}
                    set_check_in_end_time={set_check_in_end_time}
                    num_fight_areas={num_fight_areas}
                    set_num_fight_areas={set_num_fight_areas}
                    is_attendance_mandatory_before_check_in={is_attendance_mandatory_before_check_in}
                    set_is_attendance_mandatory_before_check_in={set_is_attendance_mandatory_before_check_in}
                    is_weight_check_enabled={is_weight_check_enabled}
                    set_is_weight_check_enabled={set_is_weight_check_enabled}
                    is_belt_grouping_enabled={is_belt_grouping_enabled}
                    set_is_belt_grouping_enabled={set_is_belt_grouping_enabled}
                    is_overweight_auto_move_enabled={is_overweight_auto_move_enabled}
                    set_is_overweight_auto_move_enabled={set_is_overweight_auto_move_enabled}
                    include_third_place={include_third_place}
                    set_include_third_place={set_include_third_place}
                    check_in_scan_mode={check_in_scan_mode}
                    set_check_in_scan_mode={set_check_in_scan_mode}
                    onUpdateCheckInConfig={onUpdateCheckInConfig || (() => console.warn('onUpdateCheckInConfig not provided'))}
                />
            </TabsContent>

            <TabsContent value="results-settings" className="mt-6">
                <PointSystemSettings
                    champion_points={champion_points}
                    set_champion_points={set_champion_points}
                    runner_up_points={runner_up_points}
                    set_runner_up_points={set_runner_up_points}
                    third_place_points={third_place_points}
                    set_third_place_points={set_third_place_points}
                    count_single_club_categories={count_single_club_categories}
                    set_count_single_club_categories={set_count_single_club_categories}
                    count_walkover_single_fight_categories={count_walkover_single_fight_categories}
                    set_count_walkover_single_fight_categories={set_count_walkover_single_fight_categories}
                    count_wo_champion_categories={count_wo_champion_categories}
                    set_count_wo_champion_categories={set_count_wo_champion_categories}
                />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};

export default EventConfigTab;