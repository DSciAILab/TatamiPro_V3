"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import CheckInForm from '@/components/CheckInForm';
import QrCodeScanner from '@/components/QrCodeScanner';
import DivisionTable from '@/components/DivisionTable';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';
import AttendanceManagement from '@/components/AttendanceManagement';
import UserManagementTable from '@/components/UserManagementTable';
import EventHeader from '@/components/event-detail/EventHeader'; // Novo componente
import EventAthletesTab from '@/components/event-detail/EventAthletesTab'; // Novo componente
import EventCheckInTab from '@/components/event-detail/EventCheckInTab'; // Novo componente
import EventApprovalsTab from '@/components/event-detail/EventApprovalsTab'; // Novo componente
import EventAdminSettingsTab from '@/components/event-detail/EventAdminSettingsTab'; // Novo componente

import { Athlete, Event, WeightAttempt, Division } from '../types/index';
import { UserRound, Edit, CheckCircle, XCircle, Scale, CalendarIcon, Search, Trash2, PlusCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision, getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid, differenceInMinutes, differenceInSeconds } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Switch } from '@/components/ui/switch';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const userRole = localStorage.getItem('userRole');
  const userClub = localStorage.getItem('userClub');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [event, setEvent] = useState<Event | null>(() => {
    const processAthleteData = (athleteData: any): Athlete => {
      const age = new Date().getFullYear() - new Date(athleteData.dateOfBirth).getFullYear();
      const ageDivision = getAgeDivision(age);
      const weightDivision = getWeightDivision(athleteData.weight);
      return {
        ...athleteData,
        dateOfBirth: new Date(athleteData.dateOfBirth),
        consentDate: new Date(athleteData.consentDate),
        age,
        ageDivision,
        weightDivision,
        registrationStatus: athleteData.registrationStatus as 'under_approval' | 'approved' | 'rejected',
        checkInStatus: athleteData.checkInStatus || 'pending',
        registeredWeight: athleteData.registeredWeight || undefined,
        weightAttempts: athleteData.weightAttempts || [],
        attendanceStatus: athleteData.attendanceStatus || 'pending',
      };
    };

    const storedImportedAthletes = localStorage.getItem(`importedAthletes_${id}`);
    let initialImportedAthletes: Athlete[] = [];
    if (storedImportedAthletes) {
      try {
        initialImportedAthletes = JSON.parse(storedImportedAthletes).map(processAthleteData);
        localStorage.removeItem(`importedAthletes_${id}`);
        showSuccess(`Atletas importados do arquivo CSV carregados para o evento ${id}.`);
      } catch (e) {
        console.error("Falha ao analisar atletas importados do localStorage", e);
        showError("Erro ao carregar atletas importados do armazenamento local.");
      }
    }

    const existingEventData = localStorage.getItem(`event_${id}`);
    let existingAthletes: Athlete[] = [];
    let eventSettings = {};
    let existingDivisions: Division[] = [];
    let isAttendanceMandatoryBeforeCheckIn = false; // Default value
    if (existingEventData) {
      try {
        const parsedEvent = JSON.parse(existingEventData);
        existingAthletes = parsedEvent.athletes.map(processAthleteData);
        eventSettings = {
          checkInStartTime: parsedEvent.checkInStartTime,
          checkInEndTime: parsedEvent.checkInEndTime,
          numFightAreas: parsedEvent.numFightAreas,
        };
        existingDivisions = parsedEvent.divisions || [];
        isAttendanceMandatoryBeforeCheckIn = parsedEvent.isAttendanceMandatoryBeforeCheckIn || false;
      } catch (e) {
        console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
      }
    }

    return {
      id: id || 'mock-event-id',
      name: `Evento #${id}`,
      description: `Detalhes do evento ${id} de Jiu-Jitsu.`,
      status: 'Aberto',
      date: '2024-12-01',
      athletes: [...existingAthletes, ...initialImportedAthletes],
      divisions: existingDivisions,
      isAttendanceMandatoryBeforeCheckIn: isAttendanceMandatoryBeforeCheckIn, // Set initial value
      ...eventSettings,
    };
  });

  const [checkInStartTime, setCheckInStartTime] = useState<Date | undefined>(
    event?.checkInStartTime ? parseISO(event.checkInStartTime) : undefined
  );
  const [checkInEndTime, setCheckInEndTime] = useState<Date | undefined>(
    event?.checkInEndTime ? parseISO(event.checkInEndTime) : undefined
  );
  const [numFightAreas, setNumFightAreas] = useState<number>(event?.numFightAreas || 1);
  const [isAttendanceMandatoryBeforeCheckIn, setIsAttendanceMandatoryBeforeCheckIn] = useState<boolean>(event?.isAttendanceMandatoryBeforeCheckIn || false);


  // Configuração de campos obrigatórios para check-in
  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${id}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true,
      firstName: true,
      lastName: true,
      dateOfBirth: true,
      belt: true,
      weight: true,
      idNumber: true,
      gender: true,
      nationality: true,
      email: true,
      phone: true,
      photo: false,
      emiratesIdFront: false,
      emiratesIdBack: false,
      paymentProof: false,
    };
  }, [id]);

  useEffect(() => {
    if (event) {
      localStorage.setItem(`event_${id}`, JSON.stringify({
        ...event,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas: numFightAreas,
        isAttendanceMandatoryBeforeCheckIn: isAttendanceMandatoryBeforeCheckIn, // Save the new setting
      }));
    }
  }, [event, id, checkInStartTime, checkInEndTime, numFightAreas, isAttendanceMandatoryBeforeCheckIn]); // Add new setting to dependencies

  // Timer for current time and time remaining
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);


  const handleAthleteRegistration = (newAthlete: Athlete) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          athletes: [...prevEvent.athletes, newAthlete],
        };
      });
      showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso e aguardando aprovação!`);
    }
  };

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === updatedAthlete.id ? updatedAthlete : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      setEditingAthlete(null);
    }
  };

  const handleDeleteAthlete = (athleteId: string) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.filter(athlete => athlete.id !== athleteId);
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess('Inscrição do atleta removida com sucesso!');
    }
  };

  const handleCheckInAthlete = (athleteId: string, registeredWeight: number, status: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === athleteId
            ? { ...athlete, registeredWeight, checkInStatus: status, weightAttempts }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
    }
  };

  const handleUpdateAthleteAttendance = (athleteId: string, status: Athlete['attendanceStatus']) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          athlete.id === athleteId
            ? { ...athlete, attendanceStatus: status }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
    }
  };

  const handleToggleAthleteSelection = (athleteId: string) => {
    setSelectedAthletesForApproval(prev =>
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    );
  };

  const handleSelectAllAthletes = (checked: boolean) => {
    if (event) {
      const athletesUnderApproval = event.athletes.filter(a => a.registrationStatus === 'under_approval');
      if (checked) {
        setSelectedAthletesForApproval(athletesUnderApproval.map(a => a.id));
      } else {
        setSelectedAthletesForApproval([]);
      }
    }
  };

  const handleApproveSelected = () => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          selectedAthletesForApproval.includes(athlete.id)
            ? { ...athlete, registrationStatus: 'approved' as const }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas com sucesso!`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleRejectSelected = () => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        const updatedAthletes = prevEvent.athletes.map(athlete =>
          selectedAthletesForApproval.includes(athlete.id)
            ? { ...athlete, registrationStatus: 'rejected' as const }
            : athlete
        );
        return { ...prevEvent, athletes: updatedAthletes };
      });
      showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleUpdateDivisions = (updatedDivisions: Division[]) => {
    setEvent(prevEvent => {
      if (!prevEvent) return null;
      return {
        ...prevEvent,
        divisions: updatedDivisions,
      };
    });
  };

  if (!event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Evento não encontrado.</div>
      </Layout>
    );
  }

  const athletesUnderApproval = event.athletes.filter(a => a.registrationStatus === 'under_approval');
  const approvedAthletes = event.athletes.filter(a => a.registrationStatus === 'approved');
  const rejectedAthletes = event.athletes.filter(a => a.registrationStatus === 'rejected');

  // Processar atletas aprovados para incluir informações da divisão
  const processedApprovedAthletes = useMemo(() => {
    return approvedAthletes.map(athlete => {
      const division = findAthleteDivision(athlete, event.divisions);
      return {
        ...athlete,
        _division: division, // Armazenar a divisão encontrada para uso posterior
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [approvedAthletes, event.divisions]);

  const sortedAthletesUnderApproval = useMemo(() => {
    return athletesUnderApproval.map(athlete => {
      const division = findAthleteDivision(athlete, event.divisions);
      return {
        ...athlete,
        _division: division,
      };
    }).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [athletesUnderApproval, event.divisions]);


  // Lógica para verificar se o check-in é permitido
  const isCheckInTimeValid = () => {
    if (!checkInStartTime || !checkInEndTime) return false;
    const now = new Date();
    return now >= checkInStartTime && now <= checkInEndTime;
  };

  const isCheckInAllowed = userRole === 'admin' || isCheckInTimeValid();

  // Filtragem de atletas para o check-in
  const filteredAthletesForCheckIn = useMemo(() => {
    let athletesToFilter = processedApprovedAthletes;

    // Filtra por attendanceStatus: apenas 'present' SE a attendance for obrigatória
    if (isAttendanceMandatoryBeforeCheckIn) {
      athletesToFilter = athletesToFilter.filter(a => a.attendanceStatus === 'present');
    }

    if (scannedAthleteId) {
      athletesToFilter = athletesToFilter.filter(athlete => athlete.id === scannedAthleteId);
    } else if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      athletesToFilter = athletesToFilter.filter(athlete =>
        athlete.firstName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.lastName.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.ageDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.weightDivision.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.belt.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (checkInFilter === 'pending') {
      return athletesToFilter.filter(a => a.checkInStatus === 'pending');
    } else if (checkInFilter === 'done') {
      return athletesToFilter.filter(a => a.checkInStatus === 'checked_in' || a.checkInStatus === 'overweight');
    }
    return athletesToFilter; // 'all' filter
  }, [processedApprovedAthletes, searchTerm, scannedAthleteId, checkInFilter, isAttendanceMandatoryBeforeCheckIn]);

  // Check-in Summary Calculations
  const totalOverweights = processedApprovedAthletes.filter(a => a.checkInStatus === 'overweight').length;
  const totalCheckedInOk = processedApprovedAthletes.filter(a => a.checkInStatus === 'checked_in').length;
  const totalPendingCheckIn = processedApprovedAthletes.filter(a => a.checkInStatus === 'pending').length;
  const totalApprovedAthletes = processedApprovedAthletes.length;

  return (
    <Layout>
      <EventHeader
        event={event}
        currentTime={currentTime}
        checkInStartTime={checkInStartTime}
        checkInEndTime={checkInEndTime}
        isAttendanceMandatoryBeforeCheckIn={isAttendanceMandatoryBeforeCheckIn}
        totalApprovedAthletes={totalApprovedAthletes}
        totalCheckedInOk={totalCheckedInOk}
        totalOverweights={totalOverweights}
        totalPendingCheckIn={totalPendingCheckIn}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          {userRole === 'admin' && (
            <>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="approvals">Aprovações ({athletesUnderApproval.length})</TabsTrigger>
              <TabsTrigger value="divisions">Divisões ({event.divisions.length})</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
            </>
          )}
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="llm">LLM (Q&A)</TabsTrigger>
        </TabsList>

        <TabsContent value="inscricoes" className="mt-6">
          <EventAthletesTab
            eventId={event.id}
            processedApprovedAthletes={processedApprovedAthletes}
            userRole={userRole}
            editingAthlete={editingAthlete}
            setEditingAthlete={setEditingAthlete}
            handleAthleteUpdate={handleAthleteUpdate}
            handleDeleteAthlete={handleDeleteAthlete}
            mandatoryFieldsConfig={mandatoryFieldsConfig}
          />
        </TabsContent>

        <TabsContent value="checkin" className="mt-6">
          <EventCheckInTab
            userRole={userRole}
            checkInStartTime={checkInStartTime}
            checkInEndTime={checkInEndTime}
            currentTime={currentTime}
            isAttendanceMandatoryBeforeCheckIn={isAttendanceMandatoryBeforeCheckIn}
            isCheckInAllowed={isCheckInAllowed}
            filteredAthletesForCheckIn={filteredAthletesForCheckIn}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            setScannedAthleteId={setScannedAthleteId}
            checkInFilter={checkInFilter}
            setCheckInFilter={setCheckInFilter}
            handleCheckInAthlete={handleCheckInAthlete}
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <AttendanceManagement
            eventId={event.id}
            eventDivisions={event.divisions}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
          />
        </TabsContent>

        <TabsContent value="brackets" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Brackets</CardTitle>
              <CardDescription>Gere e visualize os brackets do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Brackets para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {userRole === 'admin' && (
          <>
            <TabsContent value="admin" className="mt-6">
              <EventAdminSettingsTab
                eventId={event.id}
                checkInStartTime={checkInStartTime}
                setCheckInStartTime={setCheckInStartTime}
                checkInEndTime={checkInEndTime}
                setCheckInEndTime={setCheckInEndTime}
                numFightAreas={numFightAreas}
                setNumFightAreas={setNumFightAreas}
                isAttendanceMandatoryBeforeCheckIn={isAttendanceMandatoryBeforeCheckIn}
                setIsAttendanceMandatoryBeforeCheckIn={setIsAttendanceMandatoryBeforeCheckIn}
              />
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
              <EventApprovalsTab
                sortedAthletesUnderApproval={sortedAthletesUnderApproval}
                selectedAthletesForApproval={selectedAthletesForApproval}
                userRole={userRole}
                editingAthlete={editingAthlete}
                setEditingAthlete={setEditingAthlete}
                handleAthleteUpdate={handleAthleteUpdate}
                handleDeleteAthlete={handleDeleteAthlete}
                handleToggleAthleteSelection={handleToggleAthleteSelection}
                handleSelectAllAthletes={handleSelectAllAthletes}
                handleApproveSelected={handleApproveSelected}
                handleRejectSelected={handleRejectSelected}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
              />
            </TabsContent>

            <TabsContent value="divisions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciar Divisões do Evento</CardTitle>
                  <CardDescription>Configure as divisões de idade, peso, gênero e faixa para este evento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/events/${event.id}/import-divisions`}>
                    <Button className="w-full">Importar Divisões em Lote</Button>
                  </Link>
                  <DivisionTable divisions={event.divisions} onUpdateDivisions={handleUpdateDivisions} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Gerenciamento de Usuários</CardTitle>
                  <CardDescription>Adicione, edite e gerencie os usuários do sistema.</CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementTable />
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}

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
              <p>Conteúdo da aba LLM (stub) para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default EventDetail;