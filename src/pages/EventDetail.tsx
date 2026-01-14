"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import AppLayout from '@/components/AppLayout';
import Layout from '@/components/Layout';
import { Athlete, Event, Division, Bracket, AgeDivisionSetting } from '@/types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/hooks/use-permission';
import { supabase } from '@/integrations/supabase/client';
import { useEventData } from '@/features/events/hooks/use-event-data';
import { useCheckInMutation } from '@/features/events/hooks/use-check-in-mutation';
import { useEventTabs } from '@/hooks/useEventTabs';

import EventConfigTab from '@/features/events/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab';
import AttendanceManagement from '@/features/events/components/AttendanceManagement';
import LLMChat from '@/components/LLMChat';
import ResultsTab from '@/components/ResultsTab';
import EventStaffTab from '@/features/events/components/EventStaffTab';
import EventSidebar from '@/components/EventSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import SaveChangesButton from '@/components/SaveChangesButton';
import { PageSkeleton } from '@/components/skeletons';

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { can, role: userRole } = usePermission();
  const queryClient = useQueryClient();
  
  const userClub = profile?.club;

  // --- Data Fetching via Hook ---
  const { data: serverEvent, isLoading: isLoadingData, error: loadError } = useEventData(eventId);
  
  // Optimistic Mutations
  const { checkInAthlete, batchCheckIn } = useCheckInMutation(eventId || '');
  
  // Local state for event (to allow optimistic updates / unsaved changes)
  const [event, setEvent] = useState<Event | null>(null);
  
  // Sync local state when server data arrives (only if no unsaved changes)
  const hasUnsavedChangesRef = useRef(false);
  
  useEffect(() => {
    if (serverEvent) {
      if (!hasUnsavedChangesRef.current) {
        // No unsaved changes - sync everything from server
        setEvent(serverEvent);
      } else {
        // Has unsaved changes - only sync brackets and mat_fight_order from server
        // These are updated externally from FightDetail page and should always be fresh
        setEvent(prev => prev ? {
          ...prev,
          brackets: serverEvent.brackets,
          mat_fight_order: serverEvent.mat_fight_order,
          athletes: serverEvent.athletes, // Also sync athletes as they may be updated elsewhere
        } : serverEvent);
      }
    }
  }, [serverEvent]);

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
  } = useEventTabs();

  // --- UI State ---
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'checked_in' | 'overweight' | 'all' | 'moved'>('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<'all' | 'approved' | 'under_approval' | 'rejected'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync ref
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);



  const handleSaveChanges = async () => {
    if (!event || !eventId || !hasUnsavedChanges) return;
    setIsSaving(true);
    const toastId = showLoading("Saving event settings...");

    try {
      const { athletes, divisions, ...eventToUpdate } = event;
      
      // 1. Update Event Details
      const { error: eventError } = await supabase
        .from('sjjp_events')
        .update({
          ...eventToUpdate,
          check_in_start_time: event.check_in_start_time?.toISOString(),
          check_in_end_time: event.check_in_end_time?.toISOString(),
        })
        .eq('id', eventId);

      if (eventError) throw eventError;

      // 2. Sync Divisions (Upsert + Delete)
      if (divisions) {
        // A. Get existing divisions from DB to find deletions
        const { data: existingDivisions, error: fetchError } = await supabase
          .from('sjjp_divisions')
          .select('id')
          .eq('event_id', eventId);

        if (fetchError) throw fetchError;

        const existingIds = new Set(existingDivisions?.map(d => d.id) || []);
        const currentIds = new Set(divisions.map(d => d.id));

        // Find IDs to delete (in DB but not in current state)
        const idsToDelete = [...existingIds].filter(id => !currentIds.has(id));

        // B. Perform Deletions
        if (idsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('sjjp_divisions')
            .delete()
            .in('id', idsToDelete);
          if (deleteError) throw deleteError;
        }

        // C. Perform Upserts (Insert New / Update Existing)
        // Ensure event_id is set
        const divisionsToUpsert = divisions.map(d => ({
          ...d,
          event_id: eventId
        }));

        if (divisionsToUpsert.length > 0) {
            const { error: upsertError } = await supabase
            .from('sjjp_divisions')
            .upsert(divisionsToUpsert);
            
            if (upsertError) throw upsertError;
        }
      }

      setHasUnsavedChanges(false);
      dismissToast(toastId);
      showSuccess("Event settings saved successfully!");
      
      // Force refresh to ensure everything is in sync
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });

    } catch (error: any) {
      dismissToast(toastId);
      showError("Failed to save event settings: " + error.message);
      console.error("Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEventProperty = <K extends keyof Event>(key: K, value: Event[K]) => {
    setEvent(prev => {
      if (!prev) return null;
      setHasUnsavedChanges(true);
      return { ...prev, [key]: value };
    });
  };

  const handleUpdateAgeDivisionSettings = (settings: AgeDivisionSetting[]) => {
    handleUpdateEventProperty('age_division_settings', settings);
  };

  const handleUpdateDivisions = async (updatedDivisions: Division[]) => {
      handleUpdateEventProperty('divisions', updatedDivisions);
  };

  const handleUpdateBracketsAndFightOrder = async (updatedBrackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>, shouldSave: boolean = false) => {
      console.log("[EventDetail] handleUpdateBracketsAndFightOrder called. shouldSave:", shouldSave);
      // 1. Update State
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        if (!shouldSave) setHasUnsavedChanges(true);
        return { ...prevEvent, brackets: updatedBrackets, mat_fight_order: matFightOrder };
      });

      // 2. Persist if requested
      if (shouldSave && event && eventId) {
         console.log("[EventDetail] Auto-saving brackets to DB...");
         try {
            const toastId = showLoading("Saving brackets...");
            const { error } = await supabase
              .from('sjjp_events')
              .update({
                brackets: updatedBrackets,
                mat_fight_order: matFightOrder
              })
              .eq('id', eventId);

            if (error) throw error;
            dismissToast(toastId);
            showSuccess("Brackets updated and saved successfully!");
         } catch (err: any) {
            console.error("Error saving brackets:", err);
            showError("Error saving brackets: " + err.message);
            // Revert unsaved status if save failed? Or keep it true?
            setHasUnsavedChanges(true);
         }
      }
  };
  
  const handleAthleteUpdate = async (updatedAthlete: Athlete) => {
    if (!event || !eventId) return;
    
    try {
      const toastId = showLoading("Saving athlete changes...");
      
      // Prepare data for Supabase (remove _division which is a computed field)
      const { _division, ...athleteData } = updatedAthlete;
      
      const { error } = await supabase
        .from('sjjp_athletes')
        .update({
          first_name: athleteData.first_name,
          last_name: athleteData.last_name,
          date_of_birth: athleteData.date_of_birth instanceof Date 
            ? athleteData.date_of_birth.toISOString() 
            : athleteData.date_of_birth,
          club: athleteData.club,
          gender: athleteData.gender,
          belt: athleteData.belt,
          weight: athleteData.weight,
          nationality: athleteData.nationality,
          email: athleteData.email,
          phone: athleteData.phone,
          emirates_id: athleteData.emirates_id,
          school_id: athleteData.school_id,
          age: athleteData.age,
          age_division: athleteData.age_division,
          weight_division: athleteData.weight_division,
          registration_status: athleteData.registration_status,
          photo_url: athleteData.photo_url,
          emirates_id_front_url: athleteData.emirates_id_front_url,
          emirates_id_back_url: athleteData.emirates_id_back_url,
          moved_to_division_id: athleteData.moved_to_division_id || null,
          move_reason: athleteData.move_reason || null,
        })
        .eq('id', updatedAthlete.id);
      
      if (error) throw error;
      
      // Update local state
      setEvent(prev => {
        if (!prev || !prev.athletes) return prev;
        return {
          ...prev,
          athletes: prev.athletes.map(a => 
            a.id === updatedAthlete.id ? { ...updatedAthlete, _division: a._division } : a
          )
        };
      });
      
      dismissToast(toastId);
      showSuccess("Athlete updated successfully!");
      setEditingAthlete(null);
    } catch (error: any) {
      showError("Failed to update athlete: " + error.message);
      console.error("Athlete update error:", error);
    }
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAllAthletes = () => {
    if (selectedAthletesForApproval.length === filteredAthletesForDisplayInscricoes.length) {
      setSelectedAthletesForApproval([]);
    } else {
      setSelectedAthletesForApproval(filteredAthletesForDisplayInscricoes.map(a => a.id));
    }
  };

  const handleDeleteAthlete = async (id: string) => {
      if (!event || !eventId) return;
      const toastId = showLoading(`Deleting athlete...`);
      try {
        const { error } = await supabase.from('sjjp_athletes').delete().eq('id', id);
        if (error) throw error;
        setEvent(prev => prev ? { ...prev, athletes: prev.athletes?.filter(a => a.id !== id) } : prev);
        dismissToast(toastId);
        showSuccess('Athlete deleted successfully');
      } catch (error: any) {
        dismissToast(toastId);
        showError('Failed to delete athlete: ' + error.message);
      }
  };

  const handleDeleteSelectedAthletes = async () => {
      if (!event || !eventId || selectedAthletesForApproval.length === 0) return;
      const toastId = showLoading(`Deleting ${selectedAthletesForApproval.length} athletes...`);
      try {
        const { error } = await supabase.from('sjjp_athletes').delete().in('id', selectedAthletesForApproval);
        if (error) throw error;
        setEvent(prev => prev ? { ...prev, athletes: prev.athletes?.filter(a => !selectedAthletesForApproval.includes(a.id)) } : prev);
        dismissToast(toastId);
        showSuccess('Athletes deleted successfully');
        setSelectedAthletesForApproval([]);
      } catch (error: any) {
        dismissToast(toastId);
        showError('Failed to delete athletes: ' + error.message);
      }
  };
  
  const handleApproveReject = async (status: 'approved' | 'rejected') => {
    if (!event || !eventId || selectedAthletesForApproval.length === 0) {
      showError('No athletes selected for approval/rejection.');
      return;
    }
    
    const toastId = showLoading(`Updating ${selectedAthletesForApproval.length} athlete(s)...`);
    
    try {
      const { error } = await supabase
        .from('sjjp_athletes')
        .update({ registration_status: status })
        .in('id', selectedAthletesForApproval);
      
      if (error) throw error;
      
      // Update local state
      setEvent(prev => {
        if (!prev || !prev.athletes) return prev;
        return {
          ...prev,
          athletes: prev.athletes.map(a =>
            selectedAthletesForApproval.includes(a.id)
              ? { ...a, registration_status: status }
              : a
          )
        };
      });
      
      dismissToast(toastId);
      showSuccess(`${selectedAthletesForApproval.length} athlete(s) ${status === 'approved' ? 'approved' : 'rejected'} successfully!`);
      setSelectedAthletesForApproval([]);
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to update athletes: ${error.message}`);
      console.error('Approve/Reject error:', error);
    }
  };
  
  const handleUpdateAthleteAttendance = async (athleteId: string, status: Athlete['attendance_status']) => {
    console.log('[ATTENDANCE] Updating attendance for athlete:', athleteId, 'to status:', status);
    
    try {
      const { error } = await supabase
        .from('sjjp_athletes')
        .update({ attendance_status: status })
        .eq('id', athleteId);

      if (error) {
        console.error('[ATTENDANCE] Error updating attendance:', error);
        showError('Failed to update attendance: ' + error.message);
        return;
      }

      console.log('[ATTENDANCE] Attendance updated successfully');
      showSuccess('Attendance updated successfully!');
      
      // Update local state optimistically
      setEvent(prev => {
        if (!prev || !prev.athletes) return prev;
        return {
          ...prev,
          athletes: prev.athletes.map(a => 
            a.id === athleteId ? { ...a, attendance_status: status } : a
          )
        };
      });
    } catch (err: any) {
      console.error('[ATTENDANCE] Exception updating attendance:', err);
      showError('Error updating attendance.');
    }
  };
  
  const handleCheckInAthlete = (updatedAthlete: Athlete) => {
    checkInAthlete({ athlete: updatedAthlete });
  };



  const handleBatchAthleteUpdate = (updatedAthletes: Athlete[]) => {
    setEvent(prev => {
      if (!prev || !prev.athletes) return prev;
      
      const updatedMap = new Map(updatedAthletes.map(a => [a.id, a]));
      const newAthletes = prev.athletes.map(a => updatedMap.get(a.id) || a);
      
      return { ...prev, athletes: newAthletes };
    });
  };

  const handleBatchCheckIn = (athleteIds: string[]) => {
    batchCheckIn({ athleteIds });
  };

  // --- Derived State ---
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

  const visibleTabs = useMemo(() => [
    can('event.settings') && { value: 'config', label: 'Config' },
    can('staff.view') && { value: 'staff', label: 'Staff' },
    { value: 'inscricoes', label: 'Registrations' },
    (event?.is_attendance_mandatory_before_check_in && can('attendance.manage')) && { value: 'attendance', label: 'Attendance' },
    can('checkin.manage') && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Results' },
    { value: 'llm', label: 'IA Chat' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [can, event?.is_attendance_mandatory_before_check_in]);

  if (isLoadingData && !event) return <Layout><PageSkeleton /></Layout>;
  if (!event) return <Layout><div className="text-center text-xl mt-8">Event not found or access denied.</div></Layout>;

  const sidebarElement = (
    <EventSidebar
      activeTab={activeTab}
      onTabChange={setActiveTab}
      visibleTabs={visibleTabs}
      eventName={event.name}
      eventDescription={event.description}
    />
  );

  return (
    <AppLayout
      sidebar={sidebarElement}
      title={event.name}
      description={event.description}
      backUrl="/events"
    >
      {/* Event Header - visible on all screens */}
      <div className="mb-6">
        <h1 className="text-3xl lg:text-4xl font-bold">{event.name}</h1>
        <p className="text-lg text-muted-foreground">{event.description}</p>
      </div>
          {activeTab === 'config' && (
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
              count_wo_champion_categories={event.count_wo_champion_categories ?? false}
              set_count_wo_champion_categories={(value) => handleUpdateEventProperty('count_wo_champion_categories', value)}
              userRole={userRole as any}
              event_name={event.name}
              set_event_name={(value) => handleUpdateEventProperty('name', value)}
              event_description={event.description}
              set_event_description={(value) => handleUpdateEventProperty('description', value)}
              max_athletes_per_bracket={event.max_athletes_per_bracket || 0}
              set_max_athletes_per_bracket={(value) => handleUpdateEventProperty('max_athletes_per_bracket', value)}
              is_bracket_splitting_enabled={event.is_bracket_splitting_enabled || false}
              set_is_bracket_splitting_enabled={(value) => handleUpdateEventProperty('is_bracket_splitting_enabled', value)}
              enable_team_separation={event.enable_team_separation ?? true}
              set_enable_team_separation={(value) => handleUpdateEventProperty('enable_team_separation', value)}
              is_lead_capture_enabled={event.is_lead_capture_enabled ?? false}
              set_is_lead_capture_enabled={(value) => handleUpdateEventProperty('is_lead_capture_enabled', value)}
            />
          )}

          {activeTab === 'staff' && (
            <EventStaffTab eventId={eventId!} />
          )}

          {activeTab === 'inscricoes' && (
            <RegistrationsTab
              event={event}
              userRole={userRole as any}
              userClub={userClub}
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
              onBatchUpdate={handleBatchAthleteUpdate}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceManagement 
              eventDivisions={event.divisions || []} 
              eventName={event.name} 
              onUpdateAthleteAttendance={handleUpdateAthleteAttendance} 
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
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              handleCheckInAthlete={handleCheckInAthlete}
              handleBatchCheckIn={handleBatchCheckIn}
            />
          )}

          {activeTab === 'brackets' && (
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
              navSelectedMat={navSelectedMat}
              navSelectedDivisionId={navSelectedDivisionId}
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

      <SaveChangesButton onSave={handleSaveChanges} isSaving={isSaving} hasUnsavedChanges={hasUnsavedChanges} />
    </AppLayout>
  );
};

export default EventDetail;
