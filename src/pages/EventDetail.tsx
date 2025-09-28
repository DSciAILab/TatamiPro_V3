"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Athlete, Event, Division } from '../types/index';
import { showSuccess } from '@/utils/toast';
import { processAthleteData } from '@/utils/athlete-utils';
import { parseISO } from 'date-fns';
import { generateMatFightOrder } from '@/utils/fight-order-generator';
import { useAuth } from '@/context/auth-context';
import { baseEvents } from '@/data/base-events';

// Import the new tab components
import EventConfigTab from '@/components/EventConfigTab';
import RegistrationsTab from '@/components/RegistrationsTab';
import CheckInTab from '@/components/CheckInTab';
import BracketsTab from '@/components/BracketsTab'; // Caminho corrigido
import AttendanceManagement from '@/components/AttendanceManagement';
import LLMChat from '@/components/LLMChat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  
  // Consolidate all event-related states into a single 'event' object
  const [event, setEvent] = useState<Event | null>(null);

  // Sub-tab states (these are UI-specific, not event data)
  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');
  const [bracketsSubTab, setBracketsSubTab] = useState('mat-distribution');

  // Effect to load event data
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
        // Ensure dates are parsed correctly
        const processedAthletes = parsedEvent.athletes.map((a: any) => processAthleteData(a, parsedEvent.divisions || []));
        eventData = { 
          ...parsedEvent, 
          athletes: processedAthletes,
          checkInStartTime: parsedEvent.checkInStartTime ? parseISO(parsedEvent.checkInStartTime) : undefined,
          checkInEndTime: parsedEvent.checkInEndTime ? parseISO(parsedEvent.checkInEndTime) : undefined,
        };
      } catch (e) {
        console.error("Failed to parse event data from localStorage", e);
      }
    }

    if (!eventData) {
      const baseEvent = baseEvents.find(e => e.id === id);
      if (baseEvent) {
        // For base events, checkInStartTime and checkInEndTime are already Date objects or undefined
        // No need to parseISO if they are already Date objects.
        eventData = {
          ...baseEvent,
          // Ensure they are Date objects if they exist, otherwise undefined
          checkInStartTime: baseEvent.checkInStartTime instanceof Date ? baseEvent.checkInStartTime : undefined,
          checkInEndTime: baseEvent.checkInEndTime instanceof Date ? baseEvent.checkInEndTime : undefined,
        };
        localStorage.setItem(`event_${id}`, JSON.stringify({
          ...eventData,
          checkInStartTime: eventData.checkInStartTime?.toISOString(),
          checkInEndTime: eventData.checkInEndTime?.toISOString(),
          athletes: eventData.athletes.map(a => ({
            ...a,
            dateOfBirth: a.dateOfBirth.toISOString(),
            consentDate: a.consentDate.toISOString(),
          })),
        })); // Save base event to localStorage
      }
    }

    setEvent(eventData);
  }, [id]);

  // Effect to persist event data to localStorage whenever 'event' state changes
  useEffect(() => {
    if (event && id) {
      // Prepare event data for saving (convert Date objects back to ISO strings)
      const eventDataToSave = {
        ...event,
        checkInStartTime: event.checkInStartTime instanceof Date ? event.checkInStartTime.toISOString() : event.checkInStartTime,
        checkInEndTime: event.checkInEndTime instanceof Date ? event.checkInEndTime.toISOString() : event.checkInEndTime,
        athletes: event.athletes.map(a => ({
          ...a,
          dateOfBirth: a.dateOfBirth instanceof Date ? a.dateOfBirth.toISOString() : a.dateOfBirth,
          consentDate: a.consentDate instanceof Date ? a.consentDate.toISOString() : a.consentDate,
        })),
      };
      localStorage.setItem(`event_${id}`, JSON.stringify(eventDataToSave));

      // Also update the summary list of events
      const eventsListRaw = localStorage.getItem('events');
      let eventsList: { id: string; name: string; status: string; date: string; isActive: boolean }[] = [];
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
        isActive: event.isActive,
      };

      if (eventIndex > -1) {
        eventsList[eventIndex] = eventSummary;
      } else {
        eventsList.push(eventSummary);
      }
      localStorage.setItem('events', JSON.stringify(eventsList));
    }
  }, [event, id]); // This useEffect now depends only on the 'event' object

  // Generic handler to update any property of the event object
  const handleUpdateEventProperty = <K extends keyof Event>(key: K, value: Event[K]) => {
    setEvent(prev => {
      if (!prev) return null;
      const updatedEvent = { ...prev, [key]: value };

      // Special handling for properties that might affect derived data
      if (key === 'divisions' || key === 'matAssignments' || key === 'athletes' || key === 'isBeltGroupingEnabled') {
        // Recalculate mat fight order and brackets if divisions, assignments, or athletes change
        const { updatedBrackets, matFightOrder } = generateMatFightOrder(updatedEvent);
        return { ...updatedEvent, brackets: updatedBrackets, matFightOrder };
      }
      return updatedEvent;
    });
  };

  // Specific handlers for complex updates or nested objects
  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    handleUpdateEventProperty('athletes', event!.athletes.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
    setEditingAthlete(null);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    handleUpdateEventProperty('athletes', event!.athletes.filter(a => a.id !== athleteId));
    showSuccess('Inscrição removida.');
  };

  const handleCheckInAthlete = (updatedAthlete: Athlete) => {
    handleUpdateEventProperty('athletes', event!.athletes.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
  };

  const handleUpdateAthleteAttendance = (athleteId: string, status: Athlete['attendanceStatus']) => {
    handleUpdateEventProperty('athletes', event!.athletes.map(a => a.id === athleteId ? { ...a, attendanceStatus: status } : a));
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev => prev.includes(athleteId) ? prev.filter(id => id !== athleteId) : [...prev, athleteId]);
  };

  const handleSelectAllAthletes = (checked: boolean) => {
    if (event) {
      const athletesUnderApproval = event.athletes.filter(a => a.registrationStatus === 'under_approval');
      setSelectedAthletesForApproval(checked ? athletesUnderApproval.map(a => a.id) : []);
    }
  };

  const handleApproveSelected = () => {
    handleUpdateEventProperty('athletes', event!.athletes.map(a => selectedAthletesForApproval.includes(a.id) ? { ...a, registrationStatus: 'approved' } : a));
    showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas.`);
    setSelectedAthletesForApproval([]);
  };

  const handleRejectSelected = () => {
    handleUpdateEventProperty('athletes', event!.athletes.map(a => selectedAthletesForApproval.includes(a.id) ? { ...a, registrationStatus: 'rejected' } : a));
    showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
    setSelectedAthletesForApproval([]);
  };

  const handleUpdateDivisions = (updatedDivisions: Division[]) => {
    setEvent(prev => {
      if (!prev) return null;
      const updatedAthletes = prev.athletes.map(a => processAthleteData(a, updatedDivisions));
      const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...prev, divisions: updatedDivisions, athletes: updatedAthletes });
      return { ...prev, divisions: updatedDivisions, athletes: updatedAthletes, brackets: updatedBrackets, matFightOrder };
    });
  };

  const handleUpdateMatAssignments = (assignments: Record<string, string[]>) => {
    setEvent(prev => {
      if (!prev) return null;
      const { updatedBrackets, matFightOrder } = generateMatFightOrder({ ...prev, matAssignments: assignments });
      return { ...prev, matAssignments: assignments, brackets: updatedBrackets, matFightOrder };
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

  // Memoized Calculations (now directly from 'event' state)
  const athletesUnderApproval = useMemo(() => event?.athletes.filter(a => a.registrationStatus === 'under_approval') || [], [event]);
  const approvedAthletes = useMemo(() => event?.athletes.filter(a => a.registrationStatus === 'approved') || [], [event]);
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
    approved: allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'approved').length,
    pending: allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'under_approval').length,
    rejected: allAthletesForInscricoesTab.filter(a => a.registrationStatus === 'rejected').length,
  }), [allAthletesForInscricoesTab]);

  const filteredAthletesForDisplayInscricoes = useMemo(() => {
    let athletes = allAthletesForInscricoesTab;
    if (!userRole) athletes = athletes.filter(a => a.registrationStatus === 'approved');
    else if (registrationStatusFilter !== 'all') athletes = athletes.filter(a => a.registrationStatus === registrationStatusFilter);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.firstName} ${a.lastName} ${a.club} ${a.ageDivision} ${a.weightDivision} ${a.belt}`.toLowerCase().includes(lower));
    }
    return athletes;
  }, [allAthletesForInscricoesTab, userRole, registrationStatusFilter, searchTerm]);

  const filteredAthletesForCheckIn = useMemo(() => {
    let athletes = processedApprovedAthletes;
    if (event?.isAttendanceMandatoryBeforeCheckIn) athletes = athletes.filter(a => a.attendanceStatus === 'present');
    if (scannedAthleteId) return athletes.filter(a => a.registrationQrCodeId === scannedAthleteId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.firstName} ${a.lastName} ${a.club} ${a.ageDivision} ${a.weightDivision} ${a.belt}`.toLowerCase().includes(lower));
    }
    if (checkInFilter !== 'all') athletes = athletes.filter(a => a.checkInStatus === checkInFilter);
    return athletes;
  }, [processedApprovedAthletes, event?.isAttendanceMandatoryBeforeCheckIn, scannedAthleteId, searchTerm, checkInFilter]);


  const visibleTabs = useMemo(() => [
    userRole === 'admin' && { value: 'config', label: 'Config' },
    { value: 'inscricoes', label: 'Inscrições' },
    event?.isAttendanceMandatoryBeforeCheckIn && { value: 'attendance', label: 'Attendance' },
    userRole && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Resultados' },
    { value: 'llm', label: 'LLM (Q&A)' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [userRole, event?.isAttendanceMandatoryBeforeCheckIn]);

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
            isActive={event.isActive}
            setIsActive={(value) => handleUpdateEventProperty('isActive', value)}
            handleExportJson={handleExportJson}
            checkInStartTime={event.checkInStartTime}
            setCheckInStartTime={(date) => handleUpdateEventProperty('checkInStartTime', date)}
            checkInEndTime={event.checkInEndTime}
            setCheckInEndTime={(date) => handleUpdateEventProperty('checkInEndTime', date)}
            numFightAreas={event.numFightAreas || 1}
            setNumFightAreas={(value) => handleUpdateEventProperty('numFightAreas', value)}
            isAttendanceMandatory={event.isAttendanceMandatoryBeforeCheckIn || false}
            setIsAttendanceMandatory={(value) => handleUpdateEventProperty('isAttendanceMandatoryBeforeCheckIn', value)}
            isWeightCheckEnabled={event.isWeightCheckEnabled ?? true}
            setIsWeightCheckEnabled={(value) => handleUpdateEventProperty('isWeightCheckEnabled', value)}
            isBeltGroupingEnabled={event.isBeltGroupingEnabled ?? true}
            setIsBeltGroupingEnabled={(value) => handleUpdateEventProperty('isBeltGroupingEnabled', value)}
            isOverweightAutoMoveEnabled={event.isOverweightAutoMoveEnabled ?? false}
            setIsOverweightAutoMoveEnabled={(value) => handleUpdateEventProperty('isOverweightAutoMoveEnabled', value)}
            includeThirdPlace={event.includeThirdPlace || false}
            setIncludeThirdPlace={(value) => handleUpdateEventProperty('includeThirdPlace', value)}
            checkInScanMode={event.checkInScanMode || 'qr'}
            setCheckInScanMode={(value) => handleUpdateEventProperty('checkInScanMode', value)}
            handleUpdateDivisions={handleUpdateDivisions}
            championPoints={event.championPoints || 9}
            setChampionPoints={(value) => handleUpdateEventProperty('championPoints', value)}
            runnerUpPoints={event.runnerUpPoints || 3}
            setRunnerUpPoints={(value) => handleUpdateEventProperty('runnerUpPoints', value)}
            thirdPlacePoints={event.thirdPlacePoints || 1}
            setThirdPlacePoints={(value) => handleUpdateEventProperty('thirdPlacePoints', value)}
            countSingleClubCategories={event.countSingleClubCategories ?? true}
            setCountSingleClubCategories={(value) => handleUpdateEventProperty('countSingleClubCategories', value)}
            countWalkoverSingleFightCategories={event.countWalkoverSingleFightCategories ?? true}
            setCountWalkoverSingleFightCategories={(value) => handleUpdateEventProperty('countWalkoverSingleFightCategories', value)}
            userRole={userRole}
            eventName={event.name}
            setEventName={(value) => handleUpdateEventProperty('name', value)}
            eventDescription={event.description}
            setEventDescription={(value) => handleUpdateEventProperty('description', value)}
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
            eventDivisions={event.divisions}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
            isAttendanceMandatory={event.isAttendanceMandatoryBeforeCheckIn || false}
            userRole={userRole}
          />
        </TabsContent>

        <TabsContent value="checkin" className="mt-6">
          <CheckInTab
            event={event}
            userRole={userRole}
            checkInStartTime={event.checkInStartTime}
            checkInEndTime={event.checkInEndTime}
            checkInFilter={checkInFilter}
            handleCheckInBoxClick={(filter) => setCheckInFilter(prev => prev === filter ? 'all' : filter)}
            setCheckInFilter={setCheckInFilter}
            totalCheckedInOk={processedApprovedAthletes.filter(a => a.checkInStatus === 'checked_in').length}
            totalOverweights={processedApprovedAthletes.filter(a => a.checkInStatus === 'overweight').length}
            totalPendingCheckIn={processedApprovedAthletes.filter(a => a.checkInStatus === 'pending').length}
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
    </Layout>
  );
};

export default EventDetail;