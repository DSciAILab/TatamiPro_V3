"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Athlete, Event, Division } from '../types/index';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { useAuth } from '@/context/auth-context';

// Import the new tab components
import EventConfigTab from '@/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab';
import AttendanceManagement from '@/components/AttendanceManagement';
import LLMChat from '@/components/LLMChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import SaveChangesButton from '@/components/SaveChangesButton';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const userRole = profile?.role;
  const userClub = profile?.club;
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

  // Sub-tab states
  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');
  const [bracketsSubTab, setBracketsSubTab] = useState('mat-distribution');

  useEffect(() => {
    if (!id) {
      setEvent(null);
      return;
    }

    let eventData: Event | null = null;
    const existingEventData = localStorage.getItem(`event_${id}`);
    
    if (existingEventData) {
      try {
        const parsedEvent = JSON.parse(existingEventData);
        const processedAthletes = (parsedEvent.athletes || []).map((a: any) => processAthleteData(a, parsedEvent.divisions || []));
        eventData = { 
          ...parsedEvent, 
          athletes: processedAthletes,
          check_in_start_time: parsedEvent.check_in_start_time ? parseISO(parsedEvent.check_in_start_time) : undefined,
          check_in_end_time: parsedEvent.check_in_end_time ? parseISO(parsedEvent.check_in_end_time) : undefined,
        };
      } catch (e) {
        console.error("Failed to parse event data from localStorage", e);
      }
    }

    setEvent(eventData);
    setHasUnsavedChanges(false); // Reset on load
  }, [id]);

  const handleSaveChanges = () => {
    if (!event || !id) return;
    setIsSaving(true);
    const toastId = showLoading("Salvando alterações...");

    try {
      const eventDataToSave = {
        ...event,
        check_in_start_time: event.check_in_start_time instanceof Date ? event.check_in_start_time.toISOString() : event.check_in_start_time,
        check_in_end_time: event.check_in_end_time instanceof Date ? event.check_in_end_time.toISOString() : event.check_in_end_time,
        athletes: (event.athletes || []).map(a => ({
          ...a,
          date_of_birth: a.date_of_birth instanceof Date ? a.date_of_birth.toISOString() : a.date_of_birth,
          consent_date: a.consent_date instanceof Date ? a.consent_date.toISOString() : a.consent_date,
        })),
      };
      localStorage.setItem(`event_${id}`, JSON.stringify(eventDataToSave));

      const eventsListRaw = localStorage.getItem('events');
      let eventsList: { id: string; name: string; status: string; date: string; is_active: boolean }[] = [];
      if (eventsListRaw) {
        try {
          eventsList = JSON.parse(eventsListRaw);
        } catch (e) {
          console.error("Failed to parse events list from localStorage", e);
        }
      }

      const eventIndex = eventsList.findIndex(e => e.id === id);
      const eventSummary = {
        id: event.id,
        name: event.name,
        status: event.status,
        date: event.date,
        is_active: event.is_active,
      };

      if (eventIndex > -1) {
        eventsList[eventIndex] = eventSummary;
      } else {
        eventsList.push(eventSummary);
      }
      localStorage.setItem('events', JSON.stringify(eventsList));

      setHasUnsavedChanges(false);
      dismissToast(toastId);
      showSuccess("Alterações salvas com sucesso!");
    } catch (error: any) {
      dismissToast(toastId);
      showError("Falha ao salvar alterações: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateEventProperty = <K extends keyof Event>(key: K, value: Event[K]) => {
    setEvent(prev => {
      if (!prev) return null;
      const updatedEvent = { ...prev, [key]: value };
      setHasUnsavedChanges(true);

      if (key === 'divisions' || key === 'mat_assignments' || key === 'athletes' || key === 'is_belt_grouping_enabled') {
        const { updatedBrackets, matFightOrder } = generateMatFightOrder(updatedEvent);
        return { ...updatedEvent, brackets: updatedBrackets, mat_fight_order: matFightOrder };
      }
      return updatedEvent;
    });
  };

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    handleUpdateEventProperty('athletes', (event!.athletes || []).map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
    setEditingAthlete(null);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    handleUpdateEventProperty('athletes', (event!.athletes || []).filter(a => a.id !== athleteId));
    showSuccess('Inscrição removida.');
  };

  const handleCheckInAthlete = (updatedAthlete: Athlete) => {
    handleUpdateEventProperty('athletes', (event!.athletes || []).map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
  };

  const handleUpdateAthleteAttendance = (athleteId: string, status: Athlete['attendance_status']) => {
    handleUpdateEventProperty('athletes', (event!.athletes || []).map(a => a.id === athleteId ? { ...a, attendance_status: status } : a));
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev => prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]);
  };

  const handleSelectAllAthletes = (checked: boolean) => {
    if (event) {
      const athletesUnderApproval = (event.athletes || []).filter(a => a.registration_status === 'under_approval');
      setSelectedAthletesForApproval(checked ? athletesUnderApproval.map(a => a.id) : []);
    }
  };

  const handleApproveSelected = () => {
    handleUpdateEventProperty(
      'athletes',
      (event!.athletes || []).map(a =>
        selectedAthletesForApproval.includes(a.id)
          ? { ...a, registration_status: 'approved' as Athlete['registration_status'] }
          : a
      )
    );
    showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas.`);
    setSelectedAthletesForApproval([]);
  };

  const handleRejectSelected = () => {
    handleUpdateEventProperty(
      'athletes',
      (event!.athletes || []).map(a =>
        selectedAthletesForApproval.includes(a.id)
          ? { ...a, registration_status: 'rejected' as Athlete['registration_status'] }
          : a
      )
    );
    showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
    setSelectedAthletesForApproval([]);
  };

  const handleUpdateDivisions = (updatedDivisions: Division[]) => {
    setEvent(prev => {
      if (!prev) return null;
      const updatedAthletes = (prev.athletes || []).map(a => processAthleteData(a, updatedDivisions));
      const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...prev, divisions: updatedDivisions, athletes: updatedAthletes });
      setHasUnsavedChanges(true);
      return { ...prev, divisions: updatedDivisions, athletes: updatedAthletes, brackets: updatedBrackets, mat_fight_order: matFightOrder };
    });
  };

  const handleUpdateMatAssignments = (assignments: Record<string, string[]>) => {
    setEvent(prev => {
      if (!prev) return null;
      const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...prev, mat_assignments: assignments });
      setHasUnsavedChanges(true);
      return { ...prev, mat_assignments: assignments, brackets: updatedBrackets, mat_fight_order: matFightOrder };
    });
  };

  const handleExportJson = () => {
    if (event) {
      const jsonString = JSON.stringify(event, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dados_evento_${event.id}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess('Exportação iniciada.');
    }
  };

  const athletesUnderApproval = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'under_approval'), [event]);
  const approvedAthletes = useMemo(() => (event?.athletes || []).filter(a => a.registration_status === 'approved'), [event]);
  const processedApprovedAthletes = useMemo(() => approvedAthletes.map(a => processAthleteData(a, event?.divisions || [])), [approvedAthletes, event?.divisions]);
  const allAthletesForInscricoesTab = useMemo(() => {
    let athletes = event?.athletes || [];
    if (userRole === 'coach' && userClub) {
      athletes = athletes.filter(a => a.club === userClub);
    }
    return athletes.map(a => processAthleteData(a, event?.divisions || []));
  }, [event?.athletes, event?.divisions, userRole, userClub]);

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
    userRole === 'admin' && { value: 'config', label: 'Config' },
    { value: 'inscricoes', label: 'Inscrições' },
    event?.is_attendance_mandatory_before_check_in && { value: 'attendance', label: 'Attendance' },
    userRole && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Resultados' },
    { value: 'llm', label: 'LLM (Q&A)' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [userRole, event?.is_attendance_mandatory_before_check_in]);

  if (!event) {
    return <Layout><div className="text-center text-xl mt-8">Carregando evento...</div></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full">
          {visibleTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex-1">{tab.label}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <EventConfigTab
            event={event}
            configSubTab={configSubTab}
            setConfigSubTab={setConfigSubTab}
            is_active={event.is_active}
            set_is_active={(value) => handleUpdateEventProperty('is_active', value)}
            handleExportJson={handleExportJson}
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
            userRole={userRole}
            event_name={event.name}
            set_event_name={(value) => handleUpdateEventProperty('name', value)}
            event_description={event.description}
            set_event_description={(value) => handleUpdateEventProperty('description', value)}
          />
        </TabsContent>

        <TabsContent value="inscricoes" className="mt-6">
          <RegistrationsTab
            event={event}
            userRole={userRole}
            userClub={userClub}
            inscricoesSubTab={inscricoesSubTab}
            setInscricoesSubTab={setInscricoesSubTab}
            editingAthlete={editingAthlete}
            setEditingAthlete={setEditingAthlete}
            handleAthleteUpdate={handleAthleteUpdate}
            mandatoryFieldsConfig={{}}
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
            athletesUnderApproval={athletesUnderApproval}
            handleSelectAllAthletes={handleSelectAllAthletes}
            handleApproveSelected={handleApproveSelected}
            handleRejectSelected={handleRejectSelected}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceManagement
            eventId={event.id}
            eventDivisions={event.divisions || []}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
            isAttendanceMandatory={event.is_attendance_mandatory_before_check_in || false}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="checkin" className="mt-6">
          <CheckInTab
            event={event}
            userRole={userRole}
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
            userRole={userRole}
            handleUpdateMatAssignments={handleUpdateMatAssignments}
            bracketsSubTab={bracketsSubTab}
            setBracketsSubTab={setBracketsSubTab}
          />
        </TabsContent>

        <TabsContent value="resultados" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
              <CardDescription>Marque vencedores e exporte resultados.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Resultados para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="llm" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Perguntas & Respostas (LLM)</CardTitle>
              <CardDescription>Faça perguntas sobre os dados do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <LLMChat event={event} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <SaveChangesButton
        onSave={handleSaveChanges}
        isSaving={isSaving}
        hasUnsavedChanges={hasUnsavedChanges}
      />
    </Layout>
  );
};

export default EventDetail;