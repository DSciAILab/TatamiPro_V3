"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '@/components/AppLayout';
import Layout from '@/components/Layout';
import { PageSkeleton } from '@/components/skeletons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SaveChangesButton from '@/components/SaveChangesButton';

import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/hooks/use-permission';
import { useEventTabs } from '@/hooks/use-event-tabs';
import { useEventData } from '@/features/events/hooks/use-event-data';
import { useCheckInMutation } from '@/features/events/hooks/use-check-in-mutation';
import { useEventLogic } from '@/features/events/hooks/use-event-logic';

import { generateMatFightOrder } from '@/utils/fight-order-generator';

import EventConfigTab from '@/features/events/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab';
import AttendanceManagement from '@/features/events/components/AttendanceManagement';
import LLMChat from '@/components/LLMChat';
import ResultsTab from '@/components/ResultsTab';
import EventStaffTab from '@/features/events/components/EventStaffTab';
import EventSidebar from '@/components/EventSidebar';

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { can, role: userRole } = usePermission();
  
  const userClub = profile?.club;

  // Theme caching to prevent FOUC (Flash of Unstyled Content)
  const [cachedTheme] = useState(() => {
    if (eventId) {
      return localStorage.getItem(`event-theme-${eventId}`) || 'default';
    }
    return 'default';
  });



  // --- Data Fetching ---
  const { data: serverEvent, isLoading: isLoadingData } = useEventData(eventId);
  
  // --- Logic Hook (State & Actions) ---
  const { state, actions } = useEventLogic(eventId, serverEvent || undefined);
  const { 
    event, 
    // isLoading (from state not used, we use useEventData isLoading), 
    isSaving, 
    hasUnsavedChanges, 
    selectedAthletesForApproval, 
    editingAthlete 
  } = state;

  // Update theme cache when event theme is available
  useEffect(() => {
    if (event?.theme && eventId) {
      localStorage.setItem(`event-theme-${eventId}`, event.theme);
    }
  }, [event?.theme, eventId]);

  // --- Mutations ---
  const { checkInAthlete, batchCheckIn } = useCheckInMutation(eventId || '');

  // --- Tabs State ---
  const {
    activeTab,
    setActiveTab,
    configSubTab,
    setConfigSubTab,
    inscricoesSubTab,
    setInscricoesSubTab,
    bracketsSubTab,
    setBracketsSubTab,
    navSelectedMat,
    navSelectedDivisionId,
    navDivisionDetailTab,
  } = useEventTabs();

  // --- UI State (Local) ---
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<any>('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<any>('all');

  // --- Handlers Wrappers (for UI logic) ---

  const handleToggleAthleteSelection = (athleteId: string) => {
    const newSelection = selectedAthletesForApproval.includes(athleteId)
      ? selectedAthletesForApproval.filter(id => id !== athleteId)
      : [...selectedAthletesForApproval, athleteId];
    actions.setSelectedAthletes(newSelection);
  };

  // --- Derived State (Filtering) ---
  const athletesUnderApproval = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'under_approval'), [event]);
  const processedApprovedAthletes = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'approved'), [event]);
  
  const allAthletesForInscricoesTab = useMemo(() => {
    let athletes = event?.athletes || [];
    if (userRole === 'coach' && userClub) {
      athletes = athletes.filter(a => a.club === userClub);
    }
    return athletes;
  }, [event?.athletes, userRole, userClub]);

  const coachStats = useMemo(() => ({
    total: allAthletesForInscricoesTab.length,
    approved: allAthletesForInscricoesTab.filter(a => a.registration_status === 'approved').length,
    pending: allAthletesForInscricoesTab.filter(a => a.registration_status === 'under_approval').length,
    rejected: allAthletesForInscricoesTab.filter(a => a.registration_status === 'rejected').length,
  }), [allAthletesForInscricoesTab]);

  const filteredAthletesForDisplayInscricoes = useMemo(() => {
    let athletes = allAthletesForInscricoesTab;
    if (!userRole) athletes = athletes.filter(a => a.registration_status === 'approved');
    else if (registrationStatusFilter !== 'all') athletes = athletes.filter(a => a.registration_status === registrationStatusFilter);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.first_name} ${a.last_name} ${a.club} ${a.age_division} ${a.weight_division} ${a.belt}`.toLowerCase().includes(lower));
    }
    return athletes;
  }, [allAthletesForInscricoesTab, userRole, registrationStatusFilter, searchTerm]);

  const filteredAthletesForCheckIn = useMemo(() => {
    let athletes = processedApprovedAthletes;
    if (event?.is_attendance_mandatory_before_check_in) athletes = athletes.filter(a => a.attendance_status === 'present');
    if (scannedAthleteId) return athletes.filter(a => a.registration_qr_code_id === scannedAthleteId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.first_name} ${a.last_name} ${a.club} ${a.age_division} ${a.weight_division} ${a.belt}`.toLowerCase().includes(lower));
    }
    if (checkInFilter !== 'all') athletes = athletes.filter(a => a.check_in_status === checkInFilter);
    return athletes;
  }, [processedApprovedAthletes, event?.is_attendance_mandatory_before_check_in, scannedAthleteId, searchTerm, checkInFilter]);

  const handleSelectAllAthletes = () => {
    if (selectedAthletesForApproval.length === filteredAthletesForDisplayInscricoes.length) {
      actions.setSelectedAthletes([]);
    } else {
      actions.setSelectedAthletes(filteredAthletesForDisplayInscricoes.map(a => a.id));
    }
  };

  const pageHeader = useMemo(() => {
    switch (activeTab) {
      case 'config': return { title: 'Configuration', description: 'Manage event settings and defaults.' };
      case 'staff': return { title: 'Staff Access', description: 'Manage staff permissions and roles.' };
      case 'inscricoes': return { title: 'Registrations', description: 'Manage registrations' };
      case 'attendance': return { title: 'Attendance', description: 'Track athlete attendance status.' };
      case 'checkin': return { title: 'Check-in', description: 'Process weigh-ins and check-ins.' };
      case 'brackets': return { title: 'Brackets', description: 'View and manage tournament brackets.' };
      case 'resultados': return { title: 'Results', description: 'View tournament results.' };
      case 'llm': return { title: 'AI Assistant', description: 'Analyze event data with AI.' };
      default: return { title: event?.name || 'Event', description: event?.description || '' };
    }
  }, [activeTab, event]);

  const visibleTabs = useMemo(() => [
    can('event.settings') && { value: 'config', label: 'Config' },
    { value: 'inscricoes', label: 'Registrations' },
    (event?.is_attendance_mandatory_before_check_in && can('attendance.manage')) && { value: 'attendance', label: 'Attendance' },
    can('checkin.manage') && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Results' },
    { value: 'llm', label: 'IA Chat' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [can, event?.is_attendance_mandatory_before_check_in]);

  // --- Render ---

  const activeTheme = event?.theme || cachedTheme;

  if (isLoadingData && !event) return <Layout className={`theme-${cachedTheme}`}><PageSkeleton /></Layout>;
  if (!event) return <Layout><div className="text-center text-xl mt-8">Event not found or access denied.</div></Layout>;

  return (
    <AppLayout
      sidebar={
        <EventSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          visibleTabs={visibleTabs}
          eventName={event.name}
          eventDescription={event.description}
        />
      }
      title={event.name}
      description={event.description}
      backUrl="/events"
      className={`theme-${activeTheme}`}
    >
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold flex items-center flex-wrap gap-3">
          {pageHeader.title} 
          <span className="text-xl lg:text-2xl text-muted-foreground font-medium">|</span>
          <span className="text-lg lg:text-xl text-muted-foreground font-normal">{pageHeader.description}</span>
        </h1>
      </div>

      {activeTab === 'config' && (
        <EventConfigTab
          event={event}
          configSubTab={configSubTab}
          setConfigSubTab={setConfigSubTab}
          
          is_active={event.is_active}
          set_is_active={(value) => actions.updateEventProperty('is_active', value)}
          
          handleExportJson={() => {}} 
          
          check_in_start_time={event.check_in_start_time}
          set_check_in_start_time={(date) => actions.updateEventProperty('check_in_start_time', date)}
          check_in_end_time={event.check_in_end_time}
          set_check_in_end_time={(date) => actions.updateEventProperty('check_in_end_time', date)}
          
          num_fight_areas={event.num_fight_areas || 1}
          set_num_fight_areas={(value) => actions.updateEventProperty('num_fight_areas', value)}
          
          is_attendance_mandatory_before_check_in={event.is_attendance_mandatory_before_check_in || false}
          set_is_attendance_mandatory_before_check_in={(value) => actions.updateEventProperty('is_attendance_mandatory_before_check_in', value)}
          
          is_weight_check_enabled={event.is_weight_check_enabled ?? true}
          set_is_weight_check_enabled={(value) => actions.updateEventProperty('is_weight_check_enabled', value)}
          
          is_belt_grouping_enabled={event.is_belt_grouping_enabled ?? true}
          set_is_belt_grouping_enabled={(value) => actions.updateEventProperty('is_belt_grouping_enabled', value)}
          
          is_overweight_auto_move_enabled={event.is_overweight_auto_move_enabled ?? false}
          set_is_overweight_auto_move_enabled={(value) => actions.updateEventProperty('is_overweight_auto_move_enabled', value)}
          
          include_third_place={event.include_third_place || false}
          set_include_third_place={(value) => actions.updateEventProperty('include_third_place', value)}
          
          check_in_scan_mode={event.check_in_scan_mode || 'qr'}
          set_check_in_scan_mode={(value) => actions.updateEventProperty('check_in_scan_mode', value)}
          
          handleUpdateDivisions={(updatedDivisions) => actions.updateEventProperty('divisions', updatedDivisions)}
          handleUpdateAgeDivisionSettings={(settings) => actions.updateEventProperty('age_division_settings', settings)}
          
          champion_points={event.champion_points || 9}
          set_champion_points={(value) => actions.updateEventProperty('champion_points', value)}
          runner_up_points={event.runner_up_points || 3}
          set_runner_up_points={(value) => actions.updateEventProperty('runner_up_points', value)}
          third_place_points={event.third_place_points || 1}
          set_third_place_points={(value) => actions.updateEventProperty('third_place_points', value)}
          
          count_single_club_categories={event.count_single_club_categories ?? true}
          set_count_single_club_categories={(value) => actions.updateEventProperty('count_single_club_categories', value)}
          count_walkover_single_fight_categories={event.count_walkover_single_fight_categories ?? true}
          set_count_walkover_single_fight_categories={(value) => actions.updateEventProperty('count_walkover_single_fight_categories', value)}
          count_wo_champion_categories={event.count_wo_champion_categories ?? false}
          set_count_wo_champion_categories={(value) => actions.updateEventProperty('count_wo_champion_categories', value)}
          
          userRole={userRole as any}
          event_name={event.name}
          set_event_name={(value) => actions.updateEventProperty('name', value)}
          event_description={event.description}
          set_event_description={(value) => actions.updateEventProperty('description', value)}
          
          max_athletes_per_bracket={event.max_athletes_per_bracket || 0}
          set_max_athletes_per_bracket={(value) => actions.updateEventProperty('max_athletes_per_bracket', value)}
          is_bracket_splitting_enabled={event.is_bracket_splitting_enabled || false}
          set_is_bracket_splitting_enabled={(value) => actions.updateEventProperty('is_bracket_splitting_enabled', value)}
          enable_team_separation={event.enable_team_separation ?? true}
          set_enable_team_separation={(value) => actions.updateEventProperty('enable_team_separation', value)}
          is_lead_capture_enabled={event.is_lead_capture_enabled ?? false}
          set_is_lead_capture_enabled={(value) => actions.updateEventProperty('is_lead_capture_enabled', value)}
          is_auto_approve_registrations_enabled={event.is_auto_approve_registrations_enabled ?? false}
          set_is_auto_approve_registrations_enabled={(value) => actions.updateEventProperty('is_auto_approve_registrations_enabled', value)}
          theme={event.theme || 'default'}
          set_theme={(value) => actions.updateEventProperty('theme', value)}
          onUpdateCheckInConfig={(config) => actions.updateEventProperty('check_in_config', config)}
        />
      )}

      {activeTab === 'inscricoes' && (
        <RegistrationsTab
          event={event}
          userRole={userRole as any}
          userClub={userClub}
          inscricoesSubTab={inscricoesSubTab}
          setInscricoesSubTab={setInscricoesSubTab}
          
          editingAthlete={editingAthlete}
          setEditingAthlete={actions.setEditingAthlete}
          handleAthleteUpdate={actions.updateAthlete}
          
          mandatoryFieldsConfig={event.check_in_config?.mandatoryFields || {}} 
          
          filteredAthletesForDisplay={filteredAthletesForDisplayInscricoes}
          registrationStatusFilter={registrationStatusFilter}
          setRegistrationStatusFilter={setRegistrationStatusFilter}
          
          coachTotalRegistrations={coachStats.total}
          coachTotalApproved={coachStats.approved}
          coachTotalPending={coachStats.pending}
          coachTotalRejected={coachStats.rejected}
          
          selectedAthletesForApproval={selectedAthletesForApproval}
          handleToggleAthleteSelection={handleToggleAthleteSelection}
          handleDeleteAthlete={actions.deleteAthlete}
          handleDeleteSelectedAthletes={() => actions.bulkDeleteAthletes(selectedAthletesForApproval)}
          athletesUnderApproval={athletesUnderApproval}
          handleSelectAllAthletes={handleSelectAllAthletes}
          handleApproveSelected={() => actions.updateRegistrationStatus(selectedAthletesForApproval, 'approved')}
          handleRejectSelected={() => actions.updateRegistrationStatus(selectedAthletesForApproval, 'rejected')}
          handleRevertApprovalStatus={() => actions.updateRegistrationStatus(selectedAthletesForApproval, 'under_approval')}
          ageDivisionSettings={event.age_division_settings || []}
          onBatchUpdate={actions.batchUpdateAthletes}
        />
      )}

      {activeTab === 'attendance' && (
        <AttendanceManagement 
          eventDivisions={event.divisions || []} 
          eventName={event.name} 
          onUpdateAthleteAttendance={actions.updateAttendance} 
          isAttendanceMandatory={event.is_attendance_mandatory_before_check_in || false} 
          userRole={userRole as any} 
          athletes={event.athletes || []} 
        />
      )}

      {activeTab === 'checkin' && (
        <CheckInTab 
          event={event} 
          processedApprovedAthletes={processedApprovedAthletes}
          filteredAthletesForCheckIn={filteredAthletesForCheckIn}
          checkInFilter={checkInFilter} 
          setCheckInFilter={setCheckInFilter}
          totalApprovedAthletes={processedApprovedAthletes.length}
          totalCheckedIn={processedApprovedAthletes.filter(a => a.check_in_status === 'checked_in').length}
          totalPendingCheckIn={processedApprovedAthletes.filter(a => a.check_in_status === 'pending').length}
          totalWO={processedApprovedAthletes.filter(a => a.check_in_status === 'wo' as any).length}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          // Wrap handler to fit type if needed, but actions don't return promise? 
          // CheckInTab expects (athlete) => void.
          handleCheckInAthlete={(athlete) => checkInAthlete({ athlete })}
          handleBatchCheckIn={(ids) => batchCheckIn({ athleteIds: ids })}
        />
      )}

      {activeTab === 'brackets' && (
        <BracketsTab 
          event={event} 
          userRole={userRole as any} 
          handleUpdateMatAssignments={(assignments) => { 
            const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...event, mat_assignments: assignments }); 
            actions.updateEventProperty('mat_assignments', assignments); 
            actions.updateBracketsAndFightOrder(updatedBrackets, matFightOrder); 
          }} 
          onUpdateBrackets={actions.updateBracketsAndFightOrder} 
          bracketsSubTab={bracketsSubTab} 
          setBracketsSubTab={setBracketsSubTab} 
          navSelectedMat={navSelectedMat}
          navSelectedDivisionId={navSelectedDivisionId}
          navDivisionDetailTab={navDivisionDetailTab}
        />
      )}

      {activeTab === 'resultados' && (
        <ResultsTab event={event} />
      )}

      {activeTab === 'llm' && (
        <Card>
          <CardHeader>
            <CardTitle>Questions & Answers</CardTitle>
          </CardHeader>
          <CardContent>
            <LLMChat event={event} />
          </CardContent>
        </Card>
      )}

      <SaveChangesButton onSave={actions.saveChanges} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />
      </div>
    </AppLayout>
  );
};

export default EventDetail;
