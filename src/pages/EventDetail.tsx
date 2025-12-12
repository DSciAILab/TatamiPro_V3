"use client";

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom'; // useNavigate removido
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Event, Division, Bracket, AgeDivisionSetting } from '../types/index'; // Usando 'import type'
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/hooks/use-permission';

// Importar os novos hooks
import { useEventData } from '@/hooks/useEventData';
import { useAthleteActions } from '@/hooks/useAthleteActions';
import { useEventTabs } from '@/hooks/useEventTabs';

import EventConfigTab from '@/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab';
import AttendanceManagement from '@/components/AttendanceManagement';
import LLMChat from '@/components/LLMChat';
import ResultsTab from '@/components/ResultsTab';
import EventStaffTab from '@/components/EventStaffTab';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SaveChangesButton from '@/components/SaveChangesButton';

// Adiciona um tipo local que estende 'Event' para resolver o erro TS6196
// Isso força o TypeScript a reconhecer o uso do tipo 'Event'
interface _EventDetailEvent extends Event {}

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  // const navigate = useNavigate(); // Removido: não usado diretamente aqui
  const { profile } = useAuth();
  const { can, role: userRole } = usePermission();
  const userClub = profile?.club;

  const {
    event,
    loading,
    hasUnsavedChanges,
    isSaving,
    handleSaveChanges,
    handleUpdateEventProperty,
    fetchEventData,
  } = useEventData();

  const {
    activeTab,
    setActiveTab,
    configSubTab,
    setConfigSubTab,
    inscricoesSubTab,
    setInscricoesSubTab,
    bracketsSubTab,
    setBracketsSubTab,
  } = useEventTabs();

  const {
    selectedAthletesForApproval,
    // setSelectedAthletesForApproval, // Removido: não usado diretamente aqui
    editingAthlete,
    setEditingAthlete,
    searchTerm,
    setSearchTerm,
    setScannedAthleteId,
    checkInFilter,
    setCheckInFilter,
    registrationStatusFilter,
    setRegistrationStatusFilter,
    isScannerOpen,
    setIsScannerOpen,
    
    athletesUnderApproval,
    processedApprovedAthletes,
    coachStats,
    filteredAthletesForDisplayInscricoes,
    filteredAthletesForCheckIn,

    handleAthleteUpdate,
    handleDeleteAthlete,
    handleDeleteSelectedAthletes,
    handleApproveReject,
    handleUpdateAthleteAttendance,
    handleCheckInAthlete,
    handleToggleAthleteSelection,
    handleSelectAllAthletes,
  } = useAthleteActions({ event, fetchEventData });

  const handleUpdateAgeDivisionSettings = (settings: AgeDivisionSetting[]) => {
    handleUpdateEventProperty('age_division_settings', settings);
  };

  const handleUpdateDivisions = async (updatedDivisions: Division[]) => {
      handleUpdateEventProperty('divisions', updatedDivisions);
  };

  const handleUpdateBracketsAndFightOrder = async (updatedBrackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>) => {
      handleUpdateEventProperty('brackets', updatedBrackets);
      handleUpdateEventProperty('mat_fight_order', matFightOrder);
  };

  const visibleTabs = useMemo(() => [
    can('event.settings') && { value: 'config', label: 'Config' },
    can('staff.view') && { value: 'staff', label: 'Equipe' },
    { value: 'inscricoes', label: 'Inscrições' },
    (event?.is_attendance_mandatory_before_check_in && can('attendance.manage')) && { value: 'attendance', label: 'Attendance' },
    can('checkin.manage') && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Resultados' },
    { value: 'llm', label: 'IA Chat' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [can, event?.is_attendance_mandatory_before_check_in]);

  if (loading) return <Layout><div className="text-center text-xl mt-8">Carregando evento...</div></Layout>;
  if (!event) return <Layout><div className="text-center text-xl mt-8">Evento não encontrado ou acesso negado.</div></Layout>;

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto">
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-[80px]">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <EventConfigTab
            event={event}
            configSubTab={configSubTab}
            setConfigSubTab={setConfigSubTab}
            is_active={event.is_active}
            set_is_active={(value) => handleUpdateEventProperty('is_active', value)}
            handleExportJson={() => {}} // Placeholder, implement if needed
            check_in_start_time={event.check_in_start_time}
            set_check_in_start_time={(date) => handleUpdateEventProperty('check_in_start_time', date)}
            check_in_end_time={event.check_in_end_time}
            set_check_in_end_time={(date) => handleUpdateEventProperty('check_in_end_time', date)}
            num_fight_areas={event.num_fight_areas || 1}
            set_num_fight_areas={(value) => handleUpdateEventProperty('num_fight_areas', value)}
            is_attendance_mandatory_before_check_in={event.is_attendance_mandatory_before_check_in || false}
            set_is_attendance_mandatory_before_check_in={(value) => handleUpdateEventProperty('is_attendance_mandatory_before_check_in', value)}
            is_weight_check_enabled={event.is_weight_check_enabled ?? true}
            set_is_weight_check_enabled={(value) => handleUpdateEventProperty('is_weight_check_enabled', value)}
            is_belt_grouping_enabled={event.is_belt_grouping_enabled ?? true}
            set_is_belt_grouping_enabled={(value) => handleUpdateEventProperty('is_belt_grouping_enabled', value)}
            is_overweight_auto_move_enabled={event.is_overweight_auto_move_enabled ?? false}
            set_is_overweight_auto_move_enabled={(value) => handleUpdateEventProperty('is_overweight_auto_move_enabled', value)}
            include_third_place={event.include_third_place || false}
            set_include_third_place={(value) => handleUpdateEventProperty('include_third_place', value)}
            check_in_scan_mode={event.check_in_scan_mode || 'qr'}
            set_check_in_scan_mode={(value) => handleUpdateEventProperty('check_in_scan_mode', value)}
            handleUpdateDivisions={handleUpdateDivisions}
            handleUpdateAgeDivisionSettings={handleUpdateAgeDivisionSettings}
            champion_points={event.champion_points || 9}
            set_champion_points={(value) => handleUpdateEventProperty('champion_points', value)}
            runner_up_points={event.runner_up_points || 3}
            set_runner_up_points={(value) => handleUpdateEventProperty('runner_up_points', value)}
            third_place_points={event.third_place_points || 1}
            set_third_place_points={(value) => handleUpdateEventProperty('third_place_points', value)}
            count_single_club_categories={event.count_single_club_categories ?? true}
            set_count_single_club_categories={(value) => handleUpdateEventProperty('count_single_club_categories', value)}
            count_walkover_single_fight_categories={event.count_walkover_single_fight_categories ?? true}
            set_count_walkover_single_fight_categories={(value) => handleUpdateEventProperty('count_walkover_single_fight_categories', value)}
            userRole={userRole as any}
            event_name={event.name}
            set_event_name={(value) => handleUpdateEventProperty('name', value)}
            event_description={event.description}
            set_event_description={(value) => handleUpdateEventProperty('description', value)}
          />
        </TabsContent>

        <TabsContent value="staff" className="mt-6">
          <EventStaffTab eventId={eventId!} />
        </TabsContent>

        <TabsContent value="inscricoes" className="mt-6">
          <RegistrationsTab
            event={event}
            userRole={userRole as any}
            userClub={userClub}
            inscricoesSubTab={inscricoesSubTab}
            setInscricoesSubTab={setInscricoesSubTab}
            editingAthlete={editingAthlete}
            setEditingAthlete={setEditingAthlete}
            handleAthleteUpdate={handleAthleteUpdate}
            mandatoryFieldsConfig={event.check_in_config || {}} 
            filteredAthletesForDisplay={filteredAthletesForDisplayInscricoes}
            registrationStatusFilter={registrationStatusFilter}
            setRegistrationStatusFilter={setRegistrationStatusFilter}
            coachTotalRegistrations={coachStats.total}
            coachTotalApproved={coachStats.approved}
            coachTotalPending={coachStats.pending}
            coachTotalRejected={coachStats.rejected}
            selectedAthletesForApproval={selectedAthletesForApproval}
            handleToggleAthleteSelection={handleToggleAthleteSelection}
            handleDeleteAthlete={handleDeleteAthlete}
            handleDeleteSelectedAthletes={handleDeleteSelectedAthletes}
            athletesUnderApproval={athletesUnderApproval}
            handleSelectAllAthletes={handleSelectAllAthletes}
            handleApproveSelected={() => handleApproveReject('approved')}
            handleRejectSelected={() => handleApproveReject('rejected')}
            ageDivisionSettings={event.age_division_settings || []}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceManagement 
            eventDivisions={event.divisions || []} 
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance} 
            isAttendanceMandatory={event.is_attendance_mandatory_before_check_in || false} 
            userRole={userRole as any} 
            athletes={event.athletes || []} 
          />
        </TabsContent>
        <TabsContent value="checkin" className="mt-6">
          <CheckInTab 
            event={event} 
            userRole={userRole as any} 
            check_in_start_time={event.check_in_start_time} 
            check_in_end_time={event.check_in_end_time} 
            checkInFilter={checkInFilter} 
            handleCheckInBoxClick={(filter) => setCheckInFilter(prev => prev === filter ? 'all' : filter)} 
            setCheckInFilter={setCheckInFilter} 
            totalCheckedInOk={processedApprovedAthletes.filter(a => a.check_in_status === 'checked_in').length} 
            totalOverweights={processedApprovedAthletes.filter(a => a.check_in_status === 'overweight').length} 
            totalPendingCheckIn={processedApprovedAthletes.filter(a => a.check_in_status === 'pending').length} 
            totalApprovedAthletes={processedApprovedAthletes.length} 
            isScannerOpen={isScannerOpen} 
            setIsScannerOpen={setIsScannerOpen} 
            processedApprovedAthletes={processedApprovedAthletes} 
            setScannedAthleteId={setScannedAthleteId} 
            setSearchTerm={setSearchTerm} 
            searchTerm={searchTerm} 
            filteredAthletesForCheckIn={filteredAthletesForCheckIn} 
            handleCheckInAthlete={handleCheckInAthlete} 
          />
        </TabsContent>
        <TabsContent value="brackets" className="mt-6">
          <BracketsTab 
            event={event} 
            userRole={userRole as any} 
            handleUpdateMatAssignments={(assignments) => { 
              const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...event, mat_assignments: assignments }); 
              handleUpdateEventProperty('mat_assignments', assignments); 
              handleUpdateBracketsAndFightOrder(updatedBrackets, matFightOrder); 
            }} 
            onUpdateBrackets={handleUpdateBracketsAndFightOrder} 
            bracketsSubTab={bracketsSubTab} 
            setBracketsSubTab={setBracketsSubTab} 
          />
        </TabsContent>
        <TabsContent value="resultados" className="mt-6">
          <ResultsTab event={event} />
        </TabsContent>
        <TabsContent value="llm" className="mt-6">
          <Card><CardHeader><CardTitle>Perguntas & Respostas</CardTitle></CardHeader><CardContent><LLMChat event={event} /></CardContent></Card>
        </TabsContent>

      </Tabs>
      <SaveChangesButton onSave={handleSaveChanges} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />
    </Layout>
  );
};

export default EventDetail;