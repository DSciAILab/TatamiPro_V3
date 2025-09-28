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
import BracketsTab from '@/components/BracketsTab';
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
  const [event, setEvent] = useState<Event | null>(null);

  // Component State derived from event state
  const [checkInStartTime, setCheckInStartTime] = useState<Date | undefined>();
  const [checkInEndTime, setCheckInEndTime] = useState<Date | undefined>();
  const [numFightAreas, setNumFightAreas] = useState<number>(1);
  const [isAttendanceMandatory, setIsAttendanceMandatory] = useState<boolean>(false);
  const [isWeightCheckEnabled, setIsWeightCheckEnabled] = useState<boolean>(true);
  const [checkInScanMode, setCheckInScanMode] = useState<'qr' | 'barcode' | 'none'>('qr');
  const [isBeltGroupingEnabled, setIsBeltGroupingEnabled] = useState<boolean>(true);
  const [isOverweightAutoMoveEnabled, setIsOverweightAutoMoveEnabled] = useState<boolean>(false);
  const [includeThirdPlace, setIncludeThirdPlace] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [championPoints, setChampionPoints] = useState<number>(9);
  const [runnerUpPoints, setRunnerUpPoints] = useState<number>(3);
  const [thirdPlacePoints, setThirdPlacePoints] = useState<number>(1);
  const [countSingleClubCategories, setCountSingleClubCategories] = useState<boolean>(true);
  const [countWalkoverSingleFightCategories, setCountWalkoverSingleFightCategories] = useState<boolean>(true);
  const [configSubTab, setConfigSubTab] = useState('event-settings');
  const [inscricoesSubTab, setInscricoesSubTab] = useState('registered-athletes');
  const [bracketsSubTab, setBracketsSubTab] = useState('mat-distribution'); // NOVO: Estado para a sub-aba de Brackets

  // Effect to load event data and sync all related state
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
        const processedAthletes = parsedEvent.athletes.map((a: any) => processAthleteData(a, parsedEvent.divisions || []));
        eventData = { ...parsedEvent, athletes: processedAthletes };
      } catch (e) {
        console.error("Failed to parse event data", e);
      }
    }

    if (!eventData) {
      const baseEvent = baseEvents.find(e => e.id === id);
      if (baseEvent) {
        localStorage.setItem(`event_${id}`, JSON.stringify(baseEvent));
        eventData = baseEvent;
      }
    }

    if (eventData) {
      setEvent(eventData);
      setCheckInStartTime(eventData.checkInStartTime ? parseISO(eventData.checkInStartTime) : undefined);
      setCheckInEndTime(eventData.checkInEndTime ? parseISO(eventData.checkInEndTime) : undefined);
      setNumFightAreas(eventData.numFightAreas || 1);
      setIsAttendanceMandatory(eventData.isAttendanceMandatoryBeforeCheckIn || false);
      setIsWeightCheckEnabled(eventData.isWeightCheckEnabled ?? true);
      setCheckInScanMode(eventData.checkInScanMode || 'qr');
      setIsBeltGroupingEnabled(eventData.isBeltGroupingEnabled ?? true);
      setIsOverweightAutoMoveEnabled(eventData.isOverweightAutoMoveEnabled ?? false);
      setIncludeThirdPlace(eventData.includeThirdPlace || false);
      setIsActive(eventData.isActive ?? true);
      setChampionPoints(eventData.championPoints || 9);
      setRunnerUpPoints(eventData.runnerUpPoints || 3);
      setThirdPlacePoints(eventData.thirdPlacePoints || 1);
      setCountSingleClubCategories(eventData.countSingleClubCategories ?? true);
      setCountWalkoverSingleFightCategories(eventData.countWalkoverSingleFightCategories ?? true);
    } else {
      setEvent(null);
    }
  }, [id]);

  // Effect to persist event data to localStorage
  useEffect(() => {
    if (event) {
      const eventDataToSave = {
        ...event,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas,
        isAttendanceMandatoryBeforeCheckIn: isAttendanceMandatory,
        isWeightCheckEnabled,
        checkInScanMode,
        isBeltGroupingEnabled,
        isOverweightAutoMoveEnabled,
        includeThirdPlace,
        isActive,
        championPoints,
        runnerUpPoints,
        thirdPlacePoints,
        countSingleClubCategories,
        countWalkoverSingleFightCategories,
      };
      localStorage.setItem(`event_${id}`, JSON.stringify(eventDataToSave));

      const eventsListRaw = localStorage.getItem('events');
      if (eventsListRaw) {
        try {
          let eventsList: { id: string; name: string; status: string; date: string; isActive: boolean }[] = JSON.parse(eventsListRaw);
          const eventIndex = eventsList.findIndex(e => e.id === id);
          if (eventIndex > -1) {
            eventsList[eventIndex].isActive = isActive; // Update isActive in the events list
            localStorage.setItem('events', JSON.stringify(eventsList));
          } else {
            // If event is not in the list (e.g., a base event not yet modified), add it
            eventsList.push({
              id: event.id,
              name: event.name,
              status: event.status,
              date: event.date,
              isActive: isActive,
            });
            localStorage.setItem('events', JSON.stringify(eventsList));
          }
        } catch (e) {
          console.error("Failed to update events list", e);
        }
      } else {
        // If no 'events' list exists yet, create it with the current event
        localStorage.setItem('events', JSON.stringify([{
          id: event.id,
          name: event.name,
          status: event.status,
          date: event.date,
          isActive: isActive,
        }]));
      }
    }
  }, [event, id, checkInStartTime, checkInEndTime, numFightAreas, isAttendanceMandatory, isWeightCheckEnabled, checkInScanMode, isBeltGroupingEnabled, isOverweightAutoMoveEnabled, includeThirdPlace, isActive, championPoints, runnerUpPoints, thirdPlacePoints, countSingleClubCategories, countWalkoverSingleFightCategories]);

  // Handler Functions
  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.map(a => a.id === updatedAthlete.id ? updatedAthlete : a) } : null);
    setEditingAthlete(null);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.filter(a => a.id !== athleteId) } : null);
    showSuccess('Inscrição removida.');
  };

  const handleCheckInAthlete = (updatedAthlete: Athlete) => {
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.map(a => a.id === updatedAthlete.id ? updatedAthlete : a) } : null);
  };

  const handleUpdateAthleteAttendance = (athleteId: string, status: Athlete['attendanceStatus']) => {
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.map(a => a.id === athleteId ? { ...a, attendanceStatus: status } : a) } : null);
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
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.map(a => selectedAthletesForApproval.includes(a.id) ? { ...a, registrationStatus: 'approved' } : a) } : null);
    showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas.`);
    setSelectedAthletesForApproval([]);
  };

  const handleRejectSelected = () => {
    setEvent(prev => prev ? { ...prev, athletes: prev.athletes.map(a => selectedAthletesForApproval.includes(a.id) ? { ...a, registrationStatus: 'rejected' } : a) } : null);
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

  // Memoized Calculations
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

  // NOVO: Definição de filteredAthletesForCheckIn
  const filteredAthletesForCheckIn = useMemo(() => {
    let athletes = processedApprovedAthletes;
    if (isAttendanceMandatory) athletes = athletes.filter(a => a.attendanceStatus === 'present');
    if (scannedAthleteId) return athletes.filter(a => a.registrationQrCodeId === scannedAthleteId);
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      athletes = athletes.filter(a => `${a.firstName} ${a.lastName} ${a.club} ${a.ageDivision} ${a.weightDivision} ${a.belt}`.toLowerCase().includes(lower));
    }
    if (checkInFilter !== 'all') athletes = athletes.filter(a => a.checkInStatus === checkInFilter);
    return athletes;
  }, [processedApprovedAthletes, isAttendanceMandatory, scannedAthleteId, searchTerm, checkInFilter]);


  const visibleTabs = useMemo(() => [
    userRole === 'admin' && { value: 'config', label: 'Config' },
    { value: 'inscricoes', label: 'Inscrições' },
    isAttendanceMandatory && { value: 'attendance', label: 'Attendance' },
    userRole && { value: 'checkin', label: 'Check-in' },
    { value: 'brackets', label: 'Brackets' },
    { value: 'resultados', label: 'Resultados' },
    { value: 'llm', label: 'LLM (Q&A)' },
  ].filter((tab): tab is { value: string; label: string } => Boolean(tab)), [userRole, isAttendanceMandatory]);

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

        {/* Render all TabsContent unconditionally to maintain hook consistency */}
        <TabsContent value="config" className="mt-6">
          <EventConfigTab
            event={event}
            configSubTab={configSubTab}
            setConfigSubTab={setConfigSubTab}
            isActive={isActive}
            setIsActive={setIsActive}
            handleExportJson={handleExportJson}
            checkInStartTime={checkInStartTime}
            setCheckInStartTime={setCheckInStartTime}
            checkInEndTime={checkInEndTime}
            setCheckInEndTime={setCheckInEndTime}
            numFightAreas={numFightAreas}
            setNumFightAreas={setNumFightAreas}
            isAttendanceMandatory={isAttendanceMandatory}
                        setIsAttendanceMandatory={setIsAttendanceMandatory}
            isWeightCheckEnabled={isWeightCheckEnabled}
            setIsWeightCheckEnabled={setIsWeightCheckEnabled}
            isBeltGroupingEnabled={isBeltGroupingEnabled}
            setIsBeltGroupingEnabled={setIsBeltGroupingEnabled}
            isOverweightAutoMoveEnabled={isOverweightAutoMoveEnabled}
            setIsOverweightAutoMoveEnabled={setIsOverweightAutoMoveEnabled}
            includeThirdPlace={includeThirdPlace}
            setIncludeThirdPlace={setIncludeThirdPlace}
            checkInScanMode={checkInScanMode}
            setCheckInScanMode={setCheckInScanMode}
            handleUpdateDivisions={handleUpdateDivisions}
            championPoints={championPoints}
            setChampionPoints={setChampionPoints}
            runnerUpPoints={runnerUpPoints}
            setRunnerUpPoints={setRunnerUpPoints}
            thirdPlacePoints={thirdPlacePoints}
            setThirdPlacePoints={setThirdPlacePoints}
            countSingleClubCategories={countSingleClubCategories}
            setCountSingleClubCategories={setCountSingleClubCategories}
            countWalkoverSingleFightCategories={countWalkoverSingleFightCategories}
            setCountWalkoverSingleFightCategories={setCountWalkoverSingleFightCategories}
            userRole={userRole} // Pass userRole down
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
            isAttendanceMandatory={isAttendanceMandatory} // Pass isAttendanceMandatory down
            userRole={userRole} // Pass userRole down
          />
        </TabsContent>

        <TabsContent value="checkin" className="mt-6">
          <CheckInTab
            event={event}
            userRole={userRole}
            checkInStartTime={checkInStartTime}
            checkInEndTime={checkInEndTime}
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
            bracketsSubTab={bracketsSubTab} // NOVO: Passar o estado da sub-aba
            setBracketsSubTab={setBracketsSubTab} // NOVO: Passar a função de atualização
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