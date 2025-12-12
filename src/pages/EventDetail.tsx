"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Athlete, Event, Division, Bracket, AgeDivisionSetting } from '../types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { useAuth } from '@/context/auth-context';
import { usePermission } from '@/hooks/use-permission'; // Import Permission Hook
import { supabase } from '@/integrations/supabase/client';
import { useOffline } from '@/context/offline-context';
import { db } from '@/lib/local-db';
// getAppId removed (unused)

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

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading: authLoading } = useAuth();
  const { can, role: userRole } = usePermission(); // Use RBAC Hook
  const { isOfflineMode, trackChange } = useOffline();
  
  const userClub = profile?.club;
  
  // Security Guard for Password Change
  useEffect(() => {
    if (!authLoading && profile && (profile as any).must_change_password) {
      navigate('/change-password');
    }
  }, [profile, authLoading, navigate]);

  const [activeTab, setActiveTab] = useState('inscricoes');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'checked_in' | 'overweight' | 'all'>('all');
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<'all' | 'approved' | 'under_approval' | 'rejected'>('all');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');
  const [bracketsSubTab, setBracketsSubTab] = useState('mat-distribution');

  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
    if (location.state?.bracketsSubTab) {
      setBracketsSubTab(location.state.bracketsSubTab);
    }
  }, [location.state]);

  const fetchEventData = useCallback(async (source?: string) => {
    if (hasUnsavedChangesRef.current && source === 'subscription') {
      console.warn("Real-time update ignored due to unsaved local changes.");
      return;
    }
    if (!eventId) return;
    if (source !== 'subscription') setLoading(true);
    try {
      let eventData, athletesData, divisionsData;

      if (isOfflineMode) {
        eventData = await db.events.get(eventId);
        if (!eventData) throw new Error("Event not found locally. Please sync online first.");
        
        athletesData = await db.athletes.where('event_id').equals(eventId).toArray();
        divisionsData = await db.divisions.where('event_id').equals(eventId).toArray();
      } else {
        const { data: eData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        if (eventError) throw eventError;
        eventData = eData;

        const { data: aData, error: athletesError } = await supabase
          .from('athletes')
          .select('*')
          .eq('event_id', eventId);
        if (athletesError) throw athletesError;
        athletesData = aData;

        const { data: dData, error: divisionsError } = await supabase
          .from('divisions')
          .select('*')
          .eq('event_id', eventId);
        if (divisionsError) throw divisionsError;
        divisionsData = dData;
      }

      if (!eventData) throw new Error("Event not found.");

      const processedAthletes = (athletesData || []).map(a => processAthleteData(a, divisionsData || [], eventData.age_division_settings || []));
      
      const fullEventData: Event = {
        ...eventData,
        athletes: processedAthletes,
        divisions: divisionsData || [],
        check_in_start_time: eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined,
        check_in_end_time: eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined,
      };
      setEvent(fullEventData);
    } catch (error: any) {
      showError(`Failed to load event data: ${error.message}`);
      setEvent(null);
    } finally {
      if (source !== 'subscription') {
        setLoading(false);
        setHasUnsavedChanges(false);
      }
    }
  }, [eventId, isOfflineMode]);

  useEffect(() => {
    fetchEventData();

    const channel = supabase
      .channel(`event-${eventId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'athletes', filter: `event_id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'divisions', filter: `event_id=eq.${eventId}` }, () => fetchEventData('subscription'))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [eventId, fetchEventData]);

  const handleSaveChanges = async () => {
    if (!event || !eventId || !hasUnsavedChanges) return;
    setIsSaving(true);
    const toastId = showLoading("Saving event settings...");

    try {
      const { athletes, divisions, ...eventToUpdate } = event;
      
      const { error } = await supabase
        .from('events')
        .update({
          ...eventToUpdate,
          check_in_start_time: event.check_in_start_time?.toISOString(),
          check_in_end_time: event.check_in_end_time?.toISOString(),
        })
        .eq('id', eventId);

      if (error) throw error;

      setHasUnsavedChanges(false);
      dismissToast(toastId);
      showSuccess("Event settings saved successfully!");
    } catch (error: any) {
      dismissToast(toastId);
      showError("Failed to save event settings: " + error.message);
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
      setEvent(prev => prev ? ({ ...prev, divisions: updatedDivisions }) : null);
  };

  const handleUpdateBracketsAndFightOrder = async (updatedBrackets: Record<string, Bracket>, matFightOrder: Record<string, string[]>) => {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        return { ...prevEvent, brackets: updatedBrackets, mat_fight_order: matFightOrder };
      });
  };
  
  const handleAthleteUpdate = async (updatedAthlete: Athlete) => {
    if (!eventId) return;
    const toastId = showLoading('Updating athlete...');
    try {
      const { _division, ...athleteToUpdate } = updatedAthlete; // Remove _division before saving
      const { error } = await supabase.from('athletes').update({
        ...athleteToUpdate,
        date_of_birth: athleteToUpdate.date_of_birth.toISOString(),
        consent_date: athleteToUpdate.consent_date.toISOString(),
        weight_attempts: JSON.stringify(athleteToUpdate.weight_attempts),
      }).eq('id', updatedAthlete.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Athlete updated successfully!');
      setEditingAthlete(null);
      fetchEventData(); // Refresh data
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to update athlete: ' + error.message);
    }
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    if (!eventId) return;
    const toastId = showLoading('Deleting athlete...');
    try {
      if (isOfflineMode) {
        await trackChange('athletes', 'delete', { id: athleteId, event_id: eventId });
        setEvent(prev => ({
          ...prev!,
          athletes: prev!.athletes?.filter(a => a.id !== athleteId) || [],
        }));
      } else {
        const { error } = await supabase.from('athletes').delete().eq('id', athleteId);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess('Athlete deleted successfully!');
      fetchEventData(); // Refresh data
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to delete athlete: ' + error.message);
    }
  };

  const handleApproveReject = async (status: 'approved' | 'rejected') => {
    if (selectedAthletesForApproval.length === 0) {
      showError('Nenhum atleta selecionado para aprovação/rejeição.');
      return;
    }
    const toastId = showLoading(`${status === 'approved' ? 'Aprovando' : 'Rejeitando'} atletas...`);
    try {
      if (isOfflineMode) {
        for (const athleteId of selectedAthletesForApproval) {
          const athlete = event?.athletes?.find(a => a.id === athleteId);
          if (athlete) {
            await trackChange('athletes', 'update', { id: athleteId, registration_status: status });
            setEvent(prev => ({
              ...prev!,
              athletes: prev!.athletes?.map(a => a.id === athleteId ? { ...a, registration_status: status } : a) || [],
            }));
          }
        }
      } else {
        const { error } = await supabase
          .from('athletes')
          .update({ registration_status: status })
          .in('id', selectedAthletesForApproval);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess(`Atletas ${status === 'approved' ? 'aprovados' : 'rejeitados'} com sucesso!`);
      setSelectedAthletesForApproval([]);
      fetchEventData(); // Refresh data
    } catch (error: any) {
      dismissToast(toastId);
      showError(`Failed to ${status} athletes: ` + error.message);
    }
  };

  const handleUpdateAthleteAttendance = async (athleteId: string, status: Athlete['attendance_status']) => {
    if (!eventId) return;
    const toastId = showLoading('Updating attendance...');
    try {
      if (isOfflineMode) {
        await trackChange('athletes', 'update', { id: athleteId, attendance_status: status });
        setEvent(prev => ({
          ...prev!,
          athletes: prev!.athletes?.map(a => a.id === athleteId ? { ...a, attendance_status: status } : a) || [],
        }));
      } else {
        const { error } = await supabase
          .from('athletes')
          .update({ attendance_status: status })
          .eq('id', athleteId);
        if (error) throw error;
      }
      dismissToast(toastId);
      showSuccess('Attendance updated successfully!');
      fetchEventData(); // Refresh data
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to update attendance: ' + error.message);
    }
  };

  const handleCheckInAthlete = async (updatedAthlete: Athlete) => {
    if (!eventId) return;
    const toastId = showLoading('Performing check-in...');
    try {
      const { _division, ...athleteToUpdate } = updatedAthlete; // Remove _division before saving
      const { error } = await supabase.from('athletes').update({
        check_in_status: athleteToUpdate.check_in_status,
        registered_weight: athleteToUpdate.registered_weight,
        weight_attempts: JSON.stringify(athleteToUpdate.weight_attempts),
        age_division: athleteToUpdate.age_division, // Update if moved
        weight_division: athleteToUpdate.weight_division, // Update if moved
        belt: athleteToUpdate.belt, // Update if moved
        gender: athleteToUpdate.gender, // Update if moved
        moved_to_division_id: athleteToUpdate.moved_to_division_id,
        move_reason: athleteToUpdate.move_reason,
      }).eq('id', updatedAthlete.id);

      if (error) throw error;

      dismissToast(toastId);
      showSuccess('Check-in successful!');
      fetchEventData(); // Refresh data
    } catch (error: any) {
      dismissToast(toastId);
      showError('Failed to perform check-in: ' + error.message);
    }
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
            handleExportJson={() => {}}
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
            userRole={userRole as any} // Cast to keep compat until strict typing everywhere
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
            handleToggleAthleteSelection={(id) => setSelectedAthletesForApproval(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
            handleDeleteAthlete={handleDeleteAthlete}
            athletesUnderApproval={athletesUnderApproval}
            handleSelectAllAthletes={(checked) => setSelectedAthletesForApproval(checked ? athletesUnderApproval.map(a => a.id) : [])}
            handleApproveSelected={() => handleApproveReject('approved')}
            handleRejectSelected={() => handleApproveReject('rejected')}
            ageDivisionSettings={event.age_division_settings || []}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceManagement eventDivisions={event.divisions || []} onUpdateAthleteAttendance={handleUpdateAthleteAttendance} isAttendanceMandatory={event.is_attendance_mandatory_before_check_in || false} userRole={userRole as any} athletes={event.athletes || []} />
        </TabsContent>
        <TabsContent value="checkin" className="mt-6">
          <CheckInTab event={event} userRole={userRole as any} check_in_start_time={event.check_in_start_time} check_in_end_time={event.check_in_end_time} checkInFilter={checkInFilter} handleCheckInBoxClick={(filter) => setCheckInFilter(prev => prev === filter ? 'all' : filter)} setCheckInFilter={setCheckInFilter} totalCheckedInOk={processedApprovedAthletes.filter(a => a.check_in_status === 'checked_in').length} totalOverweights={processedApprovedAthletes.filter(a => a.check_in_status === 'overweight').length} totalPendingCheckIn={processedApprovedAthletes.filter(a => a.check_in_status === 'pending').length} totalApprovedAthletes={processedApprovedAthletes.length} isScannerOpen={isScannerOpen} setIsScannerOpen={setIsScannerOpen} processedApprovedAthletes={processedApprovedAthletes} setScannedAthleteId={setScannedAthleteId} setSearchTerm={setSearchTerm} searchTerm={searchTerm} filteredAthletesForCheckIn={filteredAthletesForCheckIn} handleCheckInAthlete={handleCheckInAthlete} />
        </TabsContent>
        <TabsContent value="brackets" className="mt-6">
          <BracketsTab event={event} userRole={userRole as any} handleUpdateMatAssignments={(assignments) => { const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...event, mat_assignments: assignments }); handleUpdateEventProperty('mat_assignments', assignments); handleUpdateBracketsAndFightOrder(updatedBrackets, matFightOrder); }} onUpdateBrackets={handleUpdateBracketsAndFightOrder} bracketsSubTab={bracketsSubTab} setBracketsSubTab={setBracketsSubTab} />
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