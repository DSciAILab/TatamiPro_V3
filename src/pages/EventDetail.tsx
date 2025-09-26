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
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm';
import CheckInForm from '@/components/CheckInForm';
import QrCodeScanner from '@/components/QrCodeScanner';
import DivisionTable from '@/components/DivisionTable';
import CheckInMandatoryFieldsConfig from '@/components/CheckInMandatoryFieldsConfig';
import AttendanceManagement from '@/components/AttendanceManagement';
import { Athlete, Event, WeightAttempt, Division } from '../types/index';
import { UserRound, Edit, CheckCircle, XCircle, Scale, CalendarIcon, Search, Trash2, PlusCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useSession } from '@/components/SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';

const AccessDenied = () => (
  <Card>
    <CardHeader>
      <CardTitle>Acesso Negado</CardTitle>
      <CardDescription>Você não tem permissão para ver esta aba.</CardDescription>
    </CardHeader>
  </Card>
);

const EventDetail: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const { userRole } = useSession();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);
  const [checkInFilter, setCheckInFilter] = useState<'pending' | 'done' | 'all'>('pending');
  const [currentTime, setCurrentTime] = useState(new Date());

  const [event, setEvent] = useState<Event | null>(null);
  const [eventAthletes, setEventAthletes] = useState<Athlete[]>([]);
  const [eventDivisions, setEventDivisions] = useState<Division[]>([]);
  const [loadingEventData, setLoadingEventData] = useState(true);

  const [checkInStartTime, setCheckInStartTime] = useState<Date | undefined>(undefined);
  const [checkInEndTime, setCheckInEndTime] = useState<Date | undefined>(undefined);
  const [numFightAreas, setNumFightAreas] = useState<number>(1);

  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
    return storedConfig ? JSON.parse(storedConfig) : {
      club: true, firstName: true, lastName: true, dateOfBirth: true, belt: true, weight: true,
      idNumber: true, gender: true, nationality: true, email: true, phone: true,
      photo: false, emiratesIdFront: false, emiratesIdBack: false, paymentProof: false,
    };
  }, [eventId]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!eventId) return;
      setLoadingEventData(true);

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        showError('Erro ao carregar detalhes do evento: ' + eventError.message);
        setEvent(null);
      } else {
        setEvent(eventData);
        setCheckInStartTime(eventData.check_in_start_time ? parseISO(eventData.check_in_start_time) : undefined);
        setCheckInEndTime(eventData.check_in_end_time ? parseISO(eventData.check_in_end_time) : undefined);
        setNumFightAreas(eventData.num_fight_areas || 1);
      }

      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('*')
        .eq('event_id', eventId);

      if (athletesError) {
        showError('Erro ao carregar atletas: ' + athletesError.message);
        setEventAthletes([]);
      } else {
        const processedAthletes = (athletesData || []).map(a => ({
          ...a,
          dateOfBirth: parseISO(a.date_of_birth),
          consentDate: parseISO(a.consent_date),
          weightAttempts: a.weight_attempts || [],
        }));
        setEventAthletes(processedAthletes);
      }

      const { data: divisionsData, error: divisionsError } = await supabase
        .from('divisions')
        .select('*')
        .eq('event_id', eventId);

      if (divisionsError) {
        showError('Erro ao carregar divisões: ' + divisionsError.message);
        setEventDivisions([]);
      } else {
        setEventDivisions(divisionsData || []);
      }

      setLoadingEventData(false);
    };

    fetchEventData();
  }, [eventId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAthleteUpdate = async (updatedAthlete: Athlete) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({
        ...updatedAthlete,
        date_of_birth: format(updatedAthlete.dateOfBirth, 'yyyy-MM-dd'),
        consent_date: updatedAthlete.consentDate.toISOString(),
        weight_attempts: JSON.stringify(updatedAthlete.weightAttempts),
      })
      .eq('id', updatedAthlete.id);

    if (error) {
      showError('Erro ao atualizar atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === updatedAthlete.id ? updatedAthlete : athlete
      ));
      setEditingAthlete(null);
      showSuccess('Perfil do atleta atualizado com sucesso!');
    }
  };

  const handleDeleteAthlete = async (athleteId: string) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao remover atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.filter(athlete => athlete.id !== athleteId));
      showSuccess('Inscrição do atleta removida com sucesso!');
    }
  };

  const handleCheckInAthlete = async (athleteId: string, registeredWeight: number, status: 'checked_in' | 'overweight', weightAttempts: WeightAttempt[]) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({
        registered_weight: registeredWeight,
        check_in_status: status,
        weight_attempts: JSON.stringify(weightAttempts),
      })
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao atualizar check-in do atleta: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === athleteId
          ? { ...athlete, registeredWeight, checkInStatus: status, weightAttempts }
          : athlete
      ));
    }
  };

  const handleUpdateAthleteAttendance = async (athleteId: string, status: Athlete['attendanceStatus']) => {
    if (!eventId) return;

    const { error } = await supabase
      .from('athletes')
      .update({ attendance_status: status })
      .eq('id', athleteId);

    if (error) {
      showError('Erro ao atualizar status de presença: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        athlete.id === athleteId
          ? { ...athlete, attendanceStatus: status }
          : athlete
      ));
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
    const athletesUnderApproval = eventAthletes.filter(a => a.registrationStatus === 'under_approval');
    if (checked) {
      setSelectedAthletesForApproval(athletesUnderApproval.map(a => a.id));
    } else {
      setSelectedAthletesForApproval([]);
    }
  };

  const handleApproveSelected = async () => {
    if (!eventId || selectedAthletesForApproval.length === 0) return;

    const { error } = await supabase
      .from('athletes')
      .update({ registration_status: 'approved' })
      .in('id', selectedAthletesForApproval);

    if (error) {
      showError('Erro ao aprovar inscrições: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        selectedAthletesForApproval.includes(athlete.id)
          ? { ...athlete, registrationStatus: 'approved' as const }
          : athlete
      ));
      showSuccess(`${selectedAthletesForApproval.length} inscrições aprovadas com sucesso!`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleRejectSelected = async () => {
    if (!eventId || selectedAthletesForApproval.length === 0) return;

    const { error } = await supabase
      .from('athletes')
      .update({ registration_status: 'rejected' })
      .in('id', selectedAthletesForApproval);

    if (error) {
      showError('Erro ao rejeitar inscrições: ' + error.message);
    } else {
      setEventAthletes(prev => prev.map(athlete =>
        selectedAthletesForApproval.includes(athlete.id)
          ? { ...athlete, registrationStatus: 'rejected' as const }
          : athlete
      ));
      showSuccess(`${selectedAthletesForApproval.length} inscrições rejeitadas.`);
      setSelectedAthletesForApproval([]);
    }
  };

  const handleUpdateDivisions = async (updatedDivisions: Division[]) => {
    if (!eventId) return;

    const existingDivisionIds = new Set(eventDivisions.map(d => d.id));
    const updatedDivisionIds = new Set(updatedDivisions.map(d => d.id));

    const divisionsToInsert = updatedDivisions.filter(d => !existingDivisionIds.has(d.id));
    const divisionsToUpdate = updatedDivisions.filter(d => existingDivisionIds.has(d.id));
    const divisionsToDelete = eventDivisions.filter(d => !updatedDivisionIds.has(d.id));

    let hasError = false;

    if (divisionsToInsert.length > 0) {
      const { error } = await supabase.from('divisions').insert(divisionsToInsert.map(d => ({ ...d, event_id: eventId })));
      if (error) { showError('Erro ao adicionar divisões: ' + error.message); hasError = true; }
    }

    for (const division of divisionsToUpdate) {
      const { error } = await supabase.from('divisions').update(division).eq('id', division.id);
      if (error) { showError(`Erro ao atualizar divisão ${division.name}: ` + error.message); hasError = true; }
    }

    if (divisionsToDelete.length > 0) {
      const { error } = await supabase.from('divisions').delete().in('id', divisionsToDelete.map(d => d.id));
      if (error) { showError('Erro ao remover divisões: ' + error.message); hasError = true; }
    }

    if (!hasError) {
      setEventDivisions(updatedDivisions);
      showSuccess('Divisões atualizadas com sucesso!');
    }
  };

  const handleUpdateEventSettings = async () => {
    if (!eventId || !event) return;

    const { error } = await supabase
      .from('events')
      .update({
        check_in_start_time: checkInStartTime?.toISOString() || null,
        check_in_end_time: checkInEndTime?.toISOString() || null,
        num_fight_areas: numFightAreas,
      })
      .eq('id', eventId);

    if (error) {
      showError('Erro ao atualizar configurações do evento: ' + error.message);
    } else {
      setEvent(prev => prev ? {
        ...prev,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas: numFightAreas,
      } : null);
      showSuccess('Configurações do evento atualizadas!');
    }
  };

  if (loadingEventData || !event) {
    return <Layout><div className="text-center text-xl mt-8">Carregando detalhes do evento...</div></Layout>;
  }

  const athletesUnderApproval = eventAthletes.filter(a => a.registrationStatus === 'under_approval');
  const approvedAthletes = eventAthletes.filter(a => a.registrationStatus === 'approved');

  const processedApprovedAthletes = useMemo(() => {
    return approvedAthletes.map(athlete => ({
      ...athlete,
      _division: findAthleteDivision(athlete, eventDivisions),
    })).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [approvedAthletes, eventDivisions]);

  const sortedAthletesUnderApproval = useMemo(() => {
    return athletesUnderApproval.map(athlete => ({
      ...athlete,
      _division: findAthleteDivision(athlete, eventDivisions),
    })).sort((a, b) => getAthleteDisplayString(a, a._division).localeCompare(getAthleteDisplayString(b, b._division)));
  }, [athletesUnderApproval, eventDivisions]);

  const isCheckInTimeValid = () => {
    if (!event.checkInStartTime || !event.checkInEndTime) return false;
    const start = parseISO(event.checkInStartTime);
    const end = parseISO(event.checkInEndTime);
    return currentTime >= start && currentTime <= end;
  };

  const isCheckInAllowed = userRole === 'admin' || isCheckInTimeValid();

  const filteredAthletesForCheckIn = useMemo(() => {
    let athletesToFilter = processedApprovedAthletes.filter(a => a.attendanceStatus === 'present');

    if (scannedAthleteId) {
      athletesToFilter = athletesToFilter.filter(athlete => athlete.id === scannedAthleteId);
    } else if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      athletesToFilter = athletesToFilter.filter(athlete =>
        `${athlete.firstName} ${athlete.lastName}`.toLowerCase().includes(lowerCaseSearchTerm) ||
        athlete.club.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    if (checkInFilter === 'pending') return athletesToFilter.filter(a => a.checkInStatus === 'pending');
    if (checkInFilter === 'done') return athletesToFilter.filter(a => a.checkInStatus !== 'pending');
    return athletesToFilter;
  }, [processedApprovedAthletes, searchTerm, scannedAthleteId, checkInFilter]);

  const totalCheckedInOk = processedApprovedAthletes.filter(a => a.checkInStatus === 'checked_in').length;
  const totalOverweights = processedApprovedAthletes.filter(a => a.checkInStatus === 'overweight').length;
  const totalPending = processedApprovedAthletes.filter(a => a.checkInStatus === 'pending').length;

  const timeRemainingInSeconds = event.checkInEndTime ? differenceInSeconds(parseISO(event.checkInEndTime), currentTime) : 0;
  const timeRemainingFormatted = timeRemainingInSeconds > 0
    ? `${Math.floor(timeRemainingInSeconds / 3600)}h ${Math.floor((timeRemainingInSeconds % 3600) / 60)}m ${timeRemainingInSeconds % 60}s`
    : 'Encerrado';

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger key="inscricoes" value="inscricoes">Inscrições</TabsTrigger>
          <TabsTrigger key="checkin" value="checkin">Check-in</TabsTrigger>
          <TabsTrigger key="attendance" value="attendance">Attendance</TabsTrigger>
          <TabsTrigger key="brackets" value="brackets">Brackets</TabsTrigger>
          <TabsTrigger key="admin" value="admin" className={userRole !== 'admin' ? 'hidden' : ''}>Admin</TabsTrigger>
          <TabsTrigger key="approvals" value="approvals" className={userRole !== 'admin' ? 'hidden' : ''}>Aprovações ({athletesUnderApproval.length})</TabsTrigger>
          <TabsTrigger key="divisions" value="divisions" className={userRole !== 'admin' ? 'hidden' : ''}>Divisões ({eventDivisions.length})</TabsTrigger>
          <TabsTrigger key="resultados" value="resultados">Resultados</TabsTrigger>
          <TabsTrigger key="llm" value="llm">LLM (Q&A)</TabsTrigger>
        </TabsList>

        <TabsContent key="inscricoes" value="inscricoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Inscrições</CardTitle>
              <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              {!editingAthlete && (
                <div className="mb-6">
                  <Link to={`/events/${eventId}/registration-options`}>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atleta
                    </Button>
                  </Link>
                </div>
              )}

              <AthleteProfileEditForm
                athlete={editingAthlete}
                onSave={handleAthleteUpdate}
                onCancel={() => setEditingAthlete(null)}
                mandatoryFieldsConfig={mandatoryFieldsConfig}
              />

              <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({processedApprovedAthletes.length})</h3>
              {processedApprovedAthletes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {processedApprovedAthletes.map((athlete) => (
                    <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                      <div className="flex items-center space-x-4">
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                          <p className="text-xs text-gray-500">Status: <span className="font-semibold text-green-600">Aprovado</span></p>
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.firstName} {athlete.lastName}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remover</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="checkin" value="checkin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Check-in de Atletas</span>
                <div className="text-sm font-normal text-muted-foreground flex flex-col items-end">
                  <span>Hora Atual: {format(currentTime, 'HH:mm:ss')}</span>
                  <span>Tempo para fechar: {timeRemainingFormatted}</span>
                </div>
              </CardTitle>
              <CardDescription>
                Confirme a presença e o peso dos atletas.
                {!isCheckInTimeValid() && userRole !== 'admin' && (
                  <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
                )}
                {isCheckInTimeValid() && (
                  <span className="text-green-600 block mt-2">Check-in aberto!</span>
                )}
                {!event.checkInStartTime || !event.checkInEndTime ? (
                  <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
                ) : (
                  <span className="text-muted-foreground block mt-2">Horário: {format(parseISO(event.checkInStartTime), 'dd/MM HH:mm')} - {format(parseISO(event.checkInEndTime), 'dd/MM HH:mm')}</span>
                )}
                <div className="mt-4 text-sm">
                  <p>Total de Atletas Aprovados: <span className="font-semibold">{processedApprovedAthletes.length}</span></p>
                  <p>Check-in OK: <span className="font-semibold text-green-600">{totalCheckedInOk}</span></p>
                  <p>Acima do Peso: <span className="font-semibold text-red-600">{totalOverweights}</span></p>
                  <p>Faltam: <span className="font-semibold text-orange-500">{totalPending}</span></p>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <QrCodeScanner onScanSuccess={(id) => {
                    setScannedAthleteId(id);
                    setSearchTerm('');
                    showSuccess(`Atleta ${id} escaneado!`);
                  }} />
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    placeholder="Buscar atleta (nome, clube, divisão...)"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setScannedAthleteId(null);
                    }}
                    className="pr-10"
                  />
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="mb-4 flex justify-center">
                <ToggleGroup type="single" value={checkInFilter} onValueChange={(value: 'pending' | 'done' | 'all') => value && setCheckInFilter(value)}>
                  <ToggleGroupItem value="pending" aria-label="Mostrar pendentes">
                    Pendentes
                  </ToggleGroupItem>
                  <ToggleGroupItem value="done" aria-label="Mostrar concluídos">
                    Concluídos
                  </ToggleGroupItem>
                  <ToggleGroupItem value="all" aria-label="Mostrar todos">
                    Todos
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {filteredAthletesForCheckIn.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado para check-in encontrado com os critérios atuais.</p>
              ) : (
                <ul className="space-y-4">
                  {filteredAthletesForCheckIn.map((athlete) => (
                    <li key={athlete.id} className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 md:space-x-4 p-3 border rounded-md">
                      <div className="flex items-center space-x-3 flex-grow">
                        {athlete.photoUrl ? (
                          <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                          {athlete.registeredWeight && (
                            <p className="text-xs text-gray-500">Último peso: <span className="font-semibold">{athlete.registeredWeight}kg</span></p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex items-center space-x-2">
                          {athlete.checkInStatus === 'checked_in' && (
                            <span className="flex items-center text-green-600 font-semibold text-sm">
                              <CheckCircle className="h-4 w-4 mr-1" /> Check-in OK
                            </span>
                          )}
                          {athlete.checkInStatus === 'overweight' && (
                            <span className="flex items-center text-red-600 font-semibold text-sm">
                              <XCircle className="h-4 w-4 mr-1" /> Overweight ({athlete.registeredWeight}kg)
                            </span>
                          )}
                          {athlete.checkInStatus === 'pending' && (
                            <span className="flex items-center text-orange-500 font-semibold text-sm">
                              <Scale className="h-4 w-4 mr-1" /> Pendente
                            </span>
                          )}
                        </div>
                        <CheckInForm
                          athlete={athlete}
                          onCheckIn={handleCheckInAthlete}
                          isCheckInAllowed={isCheckInAllowed}
                          divisionMaxWeight={athlete._division?.maxWeight}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent key="attendance" value="attendance" className="mt-6">
          <AttendanceManagement
            eventId={eventId}
            eventDivisions={eventDivisions}
            onUpdateAthleteAttendance={handleUpdateAthleteAttendance}
          />
        </TabsContent>

        <TabsContent key="brackets" value="brackets" className="mt-6">
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

        <TabsContent key="admin" value="admin" className="mt-6">
          <div style={{ display: userRole === 'admin' ? 'block' : 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>Administração do Evento</CardTitle>
                <CardDescription>Gerencie usuários e configurações do evento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to={`/events/${eventId}/import-athletes`}>
                  <Button className="w-full">Importar Atletas em Lote</Button>
                </Link>

                <div className="mt-8 space-y-4">
                  <h3 className="text-xl font-semibold">Configurações de Check-in</h3>
                  <div>
                    <Label htmlFor="checkInStartTime">Início do Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkInStartTime ? format(checkInStartTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkInStartTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              if (checkInStartTime) {
                                newDate.setHours(checkInStartTime.getHours(), checkInStartTime.getMinutes());
                              } else {
                                newDate.setHours(9, 0);
                              }
                              setCheckInStartTime(newDate);
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            value={checkInStartTime ? format(checkInStartTime, 'HH:mm') : '09:00'}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = checkInStartTime ? new Date(checkInStartTime) : new Date();
                              newDate.setHours(hours, minutes);
                              setCheckInStartTime(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="checkInEndTime">Fim do Check-in</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant={"outline"}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {checkInEndTime ? format(checkInEndTime, "dd/MM/yyyy HH:mm") : <span>Selecione data e hora</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={checkInEndTime}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              if (checkInEndTime) {
                                newDate.setHours(checkInEndTime.getHours(), checkInEndTime.getMinutes());
                              } else {
                                newDate.setHours(17, 0);
                              }
                              setCheckInEndTime(newDate);
                            }
                          }}
                          initialFocus
                        />
                        <div className="p-3 border-t border-border">
                          <Input
                            type="time"
                            value={checkInEndTime ? format(checkInEndTime, 'HH:mm') : '17:00'}
                            onChange={(e) => {
                              const [hours, minutes] = e.target.value.split(':').map(Number);
                              const newDate = checkInEndTime ? new Date(checkInEndTime) : new Date();
                              newDate.setHours(hours, minutes);
                              setCheckInEndTime(newDate);
                            }}
                          />
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label htmlFor="numFightAreas">Número de Áreas de Luta</Label>
                    <Input
                      id="numFightAreas"
                      type="number"
                      min="1"
                      value={numFightAreas}
                      onChange={(e) => setNumFightAreas(Number(e.target.value))}
                    />
                  </div>
                  <Button onClick={handleUpdateEventSettings}>Salvar Configurações do Evento</Button>
                </div>
                <CheckInMandatoryFieldsConfig eventId={eventId} />
              </CardContent>
            </Card>
          </div>
          <div style={{ display: userRole !== 'admin' ? 'block' : 'none' }}>
            <AccessDenied />
          </div>
        </TabsContent>

        <TabsContent key="approvals" value="approvals" className="mt-6">
          <div style={{ display: userRole === 'admin' ? 'block' : 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>Aprovações de Inscrição</CardTitle>
                <CardDescription>Revise e aprove ou rejeite as inscrições pendentes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {sortedAthletesUnderApproval.length === 0 ? (
                  <p className="text-muted-foreground">Nenhuma inscrição aguardando aprovação.</p>
                ) : (
                  <>
                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id="selectAll"
                        checked={selectedAthletesForApproval.length === sortedAthletesUnderApproval.length && sortedAthletesUnderApproval.length > 0}
                        onCheckedChange={(checked) => handleSelectAllAthletes(checked as boolean)}
                      />
                      <Label htmlFor="selectAll">Selecionar Todos</Label>
                    </div>
                    <div className="flex space-x-2 mb-4">
                      <Button onClick={handleApproveSelected} disabled={selectedAthletesForApproval.length === 0}>
                        Aprovar Selecionados ({selectedAthletesForApproval.length})
                      </Button>
                      <Button onClick={handleRejectSelected} disabled={selectedAthletesForApproval.length === 0} variant="destructive">
                        Rejeitar Selecionados ({selectedAthletesForApproval.length})
                      </Button>
                    </div>
                    <ul className="space-y-2">
                      {sortedAthletesUnderApproval.map((athlete) => (
                        <li key={athlete.id} className="flex items-center justify-between space-x-4 p-2 border rounded-md">
                          <div className="flex items-center space-x-4">
                            <Checkbox
                              checked={selectedAthletesForApproval.includes(athlete.id)}
                              onCheckedChange={() => handleToggleAthleteSelection(athlete.id)}
                            />
                            {athlete.photoUrl ? (
                              <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <UserRound className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex-grow">
                              <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.nationality})</p>
                              <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete, athlete._division)}</p>
                              {athlete.paymentProofUrl && (
                                <p className="text-xs text-blue-500">
                                  <a href={athlete.paymentProofUrl} target="_blank" rel="noopener noreferrer">Ver Comprovante</a>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-orange-500 font-semibold">Aguardando Aprovação</span>
                            {userRole === 'admin' && (
                              <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso removerá permanentemente a inscrição de {athlete.firstName} {athlete.lastName}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteAthlete(athlete.id)}>Remover</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          <div style={{ display: userRole !== 'admin' ? 'block' : 'none' }}>
            <AccessDenied />
          </div>
        </TabsContent>

        <TabsContent key="divisions" value="divisions" className="mt-6">
          <div style={{ display: userRole === 'admin' ? 'block' : 'none' }}>
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Divisões do Evento</CardTitle>
                <CardDescription>Configure as divisões de idade, peso, gênero e faixa para este evento.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to={`/events/${eventId}/import-divisions`}>
                  <Button className="w-full">Importar Divisões em Lote</Button>
                </Link>
                <DivisionTable eventId={eventId} divisions={eventDivisions} onUpdateDivisions={handleUpdateDivisions} />
              </CardContent>
            </Card>
          </div>
          <div style={{ display: userRole !== 'admin' ? 'block' : 'none' }}>
            <AccessDenied />
          </div>
        </TabsContent>

        <TabsContent key="resultados" value="resultados" className="mt-6">
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

        <TabsContent key="llm" value="llm" className="mt-6">
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