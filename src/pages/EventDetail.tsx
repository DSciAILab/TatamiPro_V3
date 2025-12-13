"use client";

import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Trash2, Trophy, Scale, Users, Settings, Clock, AlertTriangle, Swords } from 'lucide-react';
import { useEventData } from '@/hooks/useEventData';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/hooks/use-permission';
import { useEventTabs } from '@/hooks/useEventTabs';
import { useAthleteActions } from '@/hooks/useAthleteActions';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import DeleteEventDialog from '@/components/DeleteEventDialog';
import EventConfigTab from '@/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab';
import AttendanceManagement from '@/components/AttendanceManagement';
import ResultsTab from '@/components/ResultsTab';
import LLMChat from '@/components/LLMChat';
import SaveChangesButton from '@/components/SaveChangesButton';
import EventStaffTab from '@/components/EventStaffTab';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { cn } from '@/lib/utils';
import { Event, Bracket } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';

const EventDetail: React.FC = () => {
  useParams<{ id: string }>(); // Removida a desestruturação de 'id'
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { can } = usePermission();
  const {
    activeTab, setActiveTab, configSubTab, setConfigSubTab, inscricoesSubTab, setInscricoesSubTab, bracketsSubTab, setBracketsSubTab,
    navSelectedMat, navSelectedDivisionId
  } = useEventTabs();

  const {
    event, loading, hasUnsavedChanges, isSaving, handleSaveChanges, handleUpdateEventProperty, fetchEventData
  } = useEventData();

  const {
    selectedAthletesForApproval, editingAthlete, setEditingAthlete, searchTerm, setSearchTerm, 
    checkInFilter, setCheckInFilter, registrationStatusFilter, setRegistrationStatusFilter, isScannerOpen, setIsScannerOpen,
    athletesUnderApproval, processedApprovedAthletes, coachStats,
    filteredAthletesForDisplayInscricoes, filteredAthletesForCheckIn,
    handleAthleteUpdate, handleDeleteAthlete, handleDeleteSelectedAthletes, handleApproveReject,
    handleUpdateAthleteAttendance, handleCheckInAthlete, handleToggleAthleteSelection, handleSelectAllAthletes,
    setScannedAthleteId,
  } = useAthleteActions({ event, fetchEventData });

  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  // --- Handlers for EventConfigTab ---
  const handleUpdateDivisions = useCallback((updatedDivisions: Event['divisions']) => {
    handleUpdateEventProperty('divisions', updatedDivisions);
  }, [handleUpdateEventProperty]);

  const handleUpdateAgeDivisionSettings = useCallback((settings: Event['age_division_settings']) => {
    handleUpdateEventProperty('age_division_settings', settings);
  }, [handleUpdateEventProperty]);

  const handleExportJson = () => {
    if (!event) {
      showError('Event data not available for export.');
      return;
    }
    try {
      const json = JSON.stringify(event, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `event_data_${event.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('Event data exported successfully!');
    } catch (error: any) {
      showError('Failed to export data: ' + error.message);
    }
  };

  // --- Handlers for BracketsTab ---
  const handleUpdateMatAssignments = useCallback((assignments: Record<string, string[]>) => {
    if (!event) return;
    
    // 1. Update mat assignments
    handleUpdateEventProperty('mat_assignments', assignments);

    // 2. Recalculate fight order based on new assignments
    const { updatedBrackets, matFightOrder } = generateMatFightOrder({ 
      ...event, 
      mat_assignments: assignments,
      brackets: event.brackets || {} // Ensure brackets are passed
    });
    
    // 3. Update brackets and fight order
    handleUpdateEventProperty('brackets', updatedBrackets);
    handleUpdateEventProperty('mat_fight_order', matFightOrder);
    
    // Note: We rely on handleSaveChanges to persist this to DB later.
  }, [event, handleUpdateEventProperty]);

  const handleUpdateBrackets = useCallback((brackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>) => {
    handleUpdateEventProperty('brackets', brackets);
    handleUpdateEventProperty('mat_fight_order', matFightOrder);
  }, [handleUpdateEventProperty]);

  // --- Handlers for CheckInTab ---
  const handleCheckInBoxClick = (filterType: 'pending' | 'checked_in' | 'overweight') => {
    const newFilter = (checkInFilter === filterType ? 'all' : filterType);
    setCheckInFilter(newFilter);
  };

  // --- Delete Event Handler ---
  const handleConfirmDelete = async (eventId: string) => {
    const loadingToast = showLoading('Deleting event...');
    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      dismissToast(loadingToast);
      showSuccess(`Event "${eventToDelete?.name}" deleted successfully.`);
      navigate('/events');
    } catch (error: any) {
      dismissToast(loadingToast);
      showError(`Failed to delete event: ${error.message}`);
    }
  };

  if (loading || authLoading) {
    return <Layout><div className="text-center text-xl mt-8">Loading event details...</div></Layout>;
  }

  if (!event) {
    return <Layout><div className="text-center text-xl mt-8 text-red-500">Event not found or access denied.</div></Layout>;
  }

  const canManageEvent = can('event.manage');
  const canViewCheckin = can('checkin.manage');
  const canViewAttendance = can('attendance.manage');
  const canViewBrackets = can('bracket.manage');
  const canViewResults = can('fight.score');
  const canViewStaff = can('staff.view');

  const tabs = [
    { value: 'inscricoes', label: 'Inscrições', icon: Users, permission: can('athlete.create') || can('athlete.update') },
    { value: 'attendance', label: 'Presença', icon: Clock, permission: canViewAttendance && (event.is_attendance_mandatory_before_check_in || canManageEvent) },
    { value: 'checkin', label: 'Check-in', icon: Scale, permission: canViewCheckin },
    { value: 'brackets', label: 'Chaves', icon: Swords, permission: canViewBrackets },
    { value: 'results', label: 'Resultados', icon: Trophy, permission: canViewResults },
    { value: 'config', label: 'Config', icon: Settings, permission: canManageEvent },
    { value: 'staff', label: 'Equipe', icon: Users, permission: canViewStaff },
    { value: 'ia-chat', label: 'IA Chat', icon: AlertTriangle, permission: canManageEvent },
  ].filter(tab => tab.permission || tab.value === 'inscricoes'); // Always show registrations for coaches/admins

  const activeTabComponent = () => {
    switch (activeTab) {
      case 'inscricoes':
        return (
          <RegistrationsTab
            event={event}
            userRole={profile?.role}
            userClub={profile?.club}
            inscricoesSubTab={inscricoesSubTab}
            setInscricoesSubTab={setInscricoesSubTab}
            editingAthlete={editingAthlete}
            setEditingAthlete={setEditingAthlete}
            handleAthleteUpdate={handleAthleteUpdate}
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
        );
      case 'attendance':
        return (
          <AttendanceManagement
            eventDivisions={event.divisions || []}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
            isAttendanceMandatory={event.is_attendance_mandatory_before_check_in ?? false}
            userRole={profile?.role}
            athletes={processedApprovedAthletes}
          />
        );
      case 'checkin':
        return (
          <CheckInTab
            event={event}
            userRole={profile?.role}
            check_in_start_time={event.check_in_start_time}
            check_in_end_time={event.check_in_end_time}
            checkInFilter={checkInFilter}
            handleCheckInBoxClick={handleCheckInBoxClick}
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
        );
      case 'brackets':
        return (
          <BracketsTab
            event={event}
            userRole={profile?.role}
            handleUpdateMatAssignments={handleUpdateMatAssignments}
            onUpdateBrackets={handleUpdateBrackets}
            bracketsSubTab={bracketsSubTab}
            setBracketsSubTab={setBracketsSubTab}
            navSelectedMat={navSelectedMat}
            navSelectedDivisionId={navSelectedDivisionId}
          />
        );
      case 'results':
        return <ResultsTab event={event} />;
      case 'config':
        return (
          <EventConfigTab
            event={event}
            configSubTab={configSubTab}
            setConfigSubTab={setConfigSubTab}
            is_active={event.is_active}
            set_is_active={(v) => handleUpdateEventProperty('is_active', v)}
            handleExportJson={handleExportJson}
            check_in_start_time={event.check_in_start_time}
            set_check_in_start_time={(v) => handleUpdateEventProperty('check_in_start_time', v)}
            check_in_end_time={event.check_in_end_time}
            set_check_in_end_time={(v) => handleUpdateEventProperty('check_in_end_time', v)}
            num_fight_areas={event.num_fight_areas || 1}
            set_num_fight_areas={(v) => handleUpdateEventProperty('num_fight_areas', v)}
            is_attendance_mandatory_before_check_in={event.is_attendance_mandatory_before_check_in ?? false}
            set_is_attendance_mandatory_before_check_in={(v) => handleUpdateEventProperty('is_attendance_mandatory_before_check_in', v)}
            is_weight_check_enabled={event.is_weight_check_enabled ?? true}
            set_is_weight_check_enabled={(v) => handleUpdateEventProperty('is_weight_check_enabled', v)}
            is_belt_grouping_enabled={event.is_belt_grouping_enabled ?? true}
            set_is_belt_grouping_enabled={(v) => handleUpdateEventProperty('is_belt_grouping_enabled', v)}
            is_overweight_auto_move_enabled={event.is_overweight_auto_move_enabled ?? false}
            set_is_overweight_auto_move_enabled={(v) => handleUpdateEventProperty('is_overweight_auto_move_enabled', v)}
            include_third_place={event.include_third_place ?? false}
            set_include_third_place={(v) => handleUpdateEventProperty('include_third_place', v)}
            check_in_scan_mode={event.check_in_scan_mode || 'qr'}
            set_check_in_scan_mode={(v) => handleUpdateEventProperty('check_in_scan_mode', v)}
            handleUpdateDivisions={handleUpdateDivisions}
            handleUpdateAgeDivisionSettings={handleUpdateAgeDivisionSettings}
            champion_points={event.champion_points}
            set_champion_points={(v) => handleUpdateEventProperty('champion_points', v)}
            runner_up_points={event.runner_up_points}
            set_runner_up_points={(v) => handleUpdateEventProperty('runner_up_points', v)}
            third_place_points={event.third_place_points}
            set_third_place_points={(v) => handleUpdateEventProperty('third_place_points', v)}
            count_single_club_categories={event.count_single_club_categories}
            set_count_single_club_categories={(v) => handleUpdateEventProperty('count_single_club_categories', v)}
            count_walkover_single_fight_categories={event.count_walkover_single_fight_categories}
            set_count_walkover_single_fight_categories={(v) => handleUpdateEventProperty('count_walkover_single_fight_categories', v)}
            userRole={profile?.role}
            event_name={event.name}
            set_event_name={(v) => handleUpdateEventProperty('name', v)}
            event_description={event.description}
            set_event_description={(v) => handleUpdateEventProperty('description', v)}
          />
        );
      case 'staff':
        return <EventStaffTab eventId={event.id} />;
      case 'ia-chat':
        return <LLMChat event={event} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{event.name}</h1>
        {canManageEvent && (
          <div className="flex space-x-2">
            <Button onClick={() => setEventToDelete(event)} variant="destructive" size="icon">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn("grid w-full", `grid-cols-${tabs.length}`)}>
          {tabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center">
              <tab.icon className="mr-2 h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(tab => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {activeTabComponent()}
          </TabsContent>
        ))}
      </Tabs>

      <SaveChangesButton
        onSave={handleSaveChanges}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />

      {eventToDelete && (
        <DeleteEventDialog
          isOpen={!!eventToDelete}
          onClose={() => setEventToDelete(null)}
          eventId={eventToDelete.id}
          eventName={eventToDelete.name}
          eventData={eventToDelete}
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </Layout>
  );
};

export default EventDetail;