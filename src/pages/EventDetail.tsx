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
import { Athlete, Event, WeightAttempt, Division } from '../types/index';
import { UserRound, Edit, CheckCircle, XCircle, Scale, CalendarIcon, Search, Trash2, PlusCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision, getAthleteDisplayString, findAthleteDivision } from '@/utils/athlete-utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO, isValid } from 'date-fns';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const userRole = localStorage.getItem('userRole');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [scannedAthleteId, setScannedAthleteId] = useState<string | null>(null);

  const [event, setEvent] = useState<Event | null>(() => {
    const processAthleteData = (athleteData: any): Athlete => {
      const age = new Date().getFullYear() - new Date(athleteData.dateOfBirth).getFullYear();
      const ageDivision = getAgeDivision(age);
      const weightDivision = getWeightDivision(athleteData.weight); // Keep for backward compatibility if needed, but findAthleteDivision is primary
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

  useEffect(() => {
    if (event) {
      localStorage.setItem(`event_${id}`, JSON.stringify(event));
    }
  }, [event, id]);

  useEffect(() => {
    setEvent(prevEvent => {
      if (!prevEvent) return null;
      return {
        ...prevEvent,
        checkInStartTime: checkInStartTime?.toISOString(),
        checkInEndTime: checkInEndTime?.toISOString(),
        numFightAreas: numFightAreas,
      };
    });
  }, [checkInStartTime, checkInEndTime, numFightAreas]);


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
    return athletesToFilter;
  }, [processedApprovedAthletes, searchTerm, scannedAthleteId]);

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="pesagem">Pesagem</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          {userRole === 'admin' && (
            <>
              <TabsTrigger value="admin">Admin</TabsTrigger>
              <TabsTrigger value="approvals">Aprovações ({athletesUnderApproval.length})</TabsTrigger>
              <TabsTrigger value="divisions">Divisões ({event.divisions.length})</TabsTrigger>
            </>
          )}
          <TabsTrigger value="resultados">Resultados</TabsTrigger>
          <TabsTrigger value="llm">LLM (Q&A)</TabsTrigger>
        </TabsList>

        <TabsContent value="inscricoes" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gerenciar Inscrições</CardTitle>
              <CardDescription>Registre atletas nas divisões do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              {!editingAthlete && (
                <div className="mb-6">
                  <Link to={`/events/${event.id}/registration-options`}>
                    <Button className="w-full">
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Atleta
                    </Button>
                  </Link>
                </div>
              )}

              {editingAthlete && (
                <AthleteProfileEditForm
                  athlete={editingAthlete}
                  onSave={handleAthleteUpdate}
                  onCancel={() => setEditingAthlete(null)}
                />
              )}

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

        <TabsContent value="checkin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Check-in de Atletas</CardTitle>
              <CardDescription>
                Confirme a presença e o peso dos atletas.
                {!isCheckInTimeValid() && userRole !== 'admin' && (
                  <span className="text-red-500 block mt-2">O check-in está fora do horário permitido. Apenas administradores podem realizar o check-in agora.</span>
                )}
                {isCheckInTimeValid() && (
                  <span className="text-green-600 block mt-2">Check-in aberto!</span>
                )}
                {!checkInStartTime || !checkInEndTime ? (
                  <span className="text-orange-500 block mt-2">Horário de check-in não configurado.</span>
                ) : (
                  <span className="text-muted-foreground block mt-2">Horário: {format(checkInStartTime, 'dd/MM HH:mm')} - {format(checkInEndTime, 'dd/MM HH:mm')}</span>
                )}
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
                          divisionMaxWeight={athlete._division?.maxWeight} // Passar o limite de peso
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pesagem" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Pesagem</CardTitle>
              <CardDescription>Registre o peso dos atletas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Pesagem para o evento {event.name}.</p>
            </CardContent>
          </Card>
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
              <Card>
                <CardHeader>
                  <CardTitle>Administração do Evento</CardTitle>
                  <CardDescription>Gerencie usuários e configurações do evento.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Link to={`/events/${event.id}/import-athletes`}>
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
                                  newDate.setHours(9, 0); // Default to 9 AM
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
                                if (checkInStartTime) {
                                  const newDate = new Date(checkInStartTime);
                                  newDate.setHours(hours, minutes);
                                  setCheckInStartTime(newDate);
                                } else {
                                  const newDate = new Date();
                                  newDate.setHours(hours, minutes);
                                  setCheckInStartTime(newDate);
                                }
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
                                  newDate.setHours(17, 0); // Default to 5 PM
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
                                if (checkInEndTime) {
                                  const newDate = new Date(checkInEndTime);
                                  newDate.setHours(hours, minutes);
                                  setCheckInEndTime(newDate);
                                } else {
                                  const newDate = new Date();
                                  newDate.setHours(hours, minutes);
                                  setCheckInEndTime(newDate);
                                }
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
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="approvals" className="mt-6">
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