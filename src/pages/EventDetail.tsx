"use client";

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import AthleteProfileEditForm from '@/components/AthleteProfileEditForm'; // Novo import
import { Athlete, Event } from '../types/index';
import { UserRound, Edit } from 'lucide-react'; // Novo import: Edit icon
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision, getAthleteDisplayString } from '@/utils/athlete-utils'; // Importar utilitários

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const userRole = localStorage.getItem('userRole');
  const [selectedAthletesForApproval, setSelectedAthletesForApproval] = useState<string[]>([]);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null); // Estado para atleta em edição

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
    if (existingEventData) {
      try {
        const parsedEvent = JSON.parse(existingEventData);
        existingAthletes = parsedEvent.athletes.map(processAthleteData);
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
    };
  });

  useEffect(() => {
    if (event) {
      localStorage.setItem(`event_${id}`, JSON.stringify(event));
    }
  }, [event, id]);

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
      setEditingAthlete(null); // Fechar o formulário de edição
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

  // Função de comparação para ordenar atletas
  const sortAthletes = (a: Athlete, b: Athlete) => {
    const displayA = getAthleteDisplayString(a);
    const displayB = getAthleteDisplayString(b);
    return displayA.localeCompare(displayB);
  };

  const sortedApprovedAthletes = [...approvedAthletes].sort(sortAthletes);
  const sortedAthletesUnderApproval = [...athletesUnderApproval].sort(sortAthletes);

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
                <AthleteRegistrationForm eventId={event.id} onRegister={handleAthleteRegistration} />
              )}

              {editingAthlete && (
                <AthleteProfileEditForm
                  athlete={editingAthlete}
                  onSave={handleAthleteUpdate}
                  onCancel={() => setEditingAthlete(null)}
                />
              )}

              <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({sortedApprovedAthletes.length})</h3>
              {sortedApprovedAthletes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta aprovado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {sortedApprovedAthletes.map((athlete) => (
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
                          <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete)}</p>
                          <p className="text-xs text-gray-500">Status: <span className="font-semibold text-green-600">Aprovado</span></p>
                        </div>
                      </div>
                      {userRole === 'admin' && (
                        <Button variant="ghost" size="icon" onClick={() => setEditingAthlete(athlete)}>
                          <Edit className="h-4 w-4" />
                        </Button>
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
              <CardDescription>Confirme a presença dos atletas.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Check-in para o evento {event.name}.</p>
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
                  <p>Conteúdo da aba Admin para o evento {event.name}.</p>
                  <Link to={`/events/${event.id}/import-athletes`}>
                    <Button className="w-full">Importar Atletas em Lote</Button>
                  </Link>
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
                                <p className="text-sm text-muted-foreground">{getAthleteDisplayString(athlete)}</p>
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
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
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