"use client";

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import { Athlete, Event, Bracket, Match } from '../types/index';
import { UserRound } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const EventDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('inscricoes');
  const userRole = localStorage.getItem('userRole');

  const [event, setEvent] = useState<Event | null>({
    id: id || 'mock-event-id',
    name: `Evento #${id}`,
    description: `Detalhes do evento ${id} de Jiu-Jitsu.`,
    status: 'Aberto',
    date: '2024-12-01',
    athletes: [],
    brackets: [], // Inicializado com array vazio para brackets
  });

  const handleAthleteRegistration = (newAthlete: Athlete) => {
    if (event) {
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          athletes: [...prevEvent.athletes, newAthlete],
        };
      });
      showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso!`);
    }
  };

  const handleGenerateBrackets = async () => {
    if (!event || event.athletes.length < 2) {
      showError('É necessário pelo menos 2 atletas para gerar um bracket.');
      return;
    }

    try {
      // Para o MVP, usaremos um divisionId e opções fixas
      const divisionId = 'faixa-branca-masculino-leve'; // Exemplo de divisão
      const options = { thirdPlace: true };

      const response = await fetch('/.netlify/functions/generate-brackets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          athletes: event.athletes,
          divisionId,
          options,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao gerar brackets.');
      }

      const generatedBracket: Bracket = await response.json();
      setEvent(prevEvent => {
        if (!prevEvent) return null;
        return {
          ...prevEvent,
          brackets: [...(prevEvent.brackets || []), generatedBracket],
        };
      });
      showSuccess('Brackets gerados com sucesso!');
      setActiveTab('brackets'); // Mudar para a aba de brackets
    } catch (error: any) {
      showError(`Erro ao gerar brackets: ${error.message}`);
      console.error('Erro ao gerar brackets:', error);
    }
  };

  const getAthleteName = (participant: Athlete | 'BYE' | undefined) => {
    if (!participant) return 'Aguardando';
    if (participant === 'BYE') return 'BYE';
    return `${participant.firstName} ${participant.lastName}`;
  };

  if (!event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Evento não encontrado.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-4xl font-bold mb-4">{event.name}</h1>
      <p className="text-lg text-muted-foreground mb-8">{event.description}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="inscricoes">Inscrições</TabsTrigger>
          <TabsTrigger value="checkin">Check-in</TabsTrigger>
          <TabsTrigger value="pesagem">Pesagem</TabsTrigger>
          <TabsTrigger value="brackets">Brackets</TabsTrigger>
          {userRole === 'admin' && (
            <TabsTrigger value="admin">Admin</TabsTrigger>
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
              <AthleteRegistrationForm eventId={event.id} onRegister={handleAthleteRegistration} />
              <h3 className="text-xl font-semibold mt-8 mb-4">Atletas Inscritos ({event.athletes.length})</h3>
              {event.athletes.length === 0 ? (
                <p className="text-muted-foreground">Nenhum atleta inscrito ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {event.athletes.map((athlete) => (
                    <li key={athlete.id} className="flex items-center space-x-4 p-2 border rounded-md">
                      {athlete.photoUrl ? (
                        <img src={athlete.photoUrl} alt={athlete.firstName} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <UserRound className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{athlete.firstName} {athlete.lastName} ({athlete.age} anos)</p>
                        <p className="text-sm text-muted-foreground">{athlete.belt} - {athlete.club}</p>
                      </div>
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
              {userRole === 'admin' && (
                <Button onClick={handleGenerateBrackets} className="mb-4">Gerar Brackets</Button>
              )}

              {event.brackets && event.brackets.length > 0 ? (
                event.brackets.map((bracket, index) => (
                  <div key={index} className="mb-6 p-4 border rounded-md">
                    <h4 className="text-lg font-semibold mb-2">Divisão: {bracket.divisionId}</h4>
                    <h5 className="font-medium mb-2">Primeira Rodada:</h5>
                    <ul className="space-y-2">
                      {bracket.matches.map((match) => (
                        <li key={match.id} className="p-2 border rounded-md bg-muted/50">
                          Match {match.matchNumber}: {getAthleteName(match.fighter1)} vs {getAthleteName(match.fighter2)}
                          {match.winnerId && match.winnerId !== 'BYE' && (
                            <span className="ml-2 text-green-600">(Vencedor: {getAthleteName(event.athletes.find(a => a.id === match.winnerId))})</span>
                          )}
                          {match.winnerId === 'BYE' && (
                            <span className="ml-2 text-gray-500">(Ambos BYE)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {bracket.thirdPlaceMatch && (
                      <p className="mt-4 text-sm text-muted-foreground">Luta pelo 3º lugar será gerada após as semifinais.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">Nenhum bracket gerado ainda para este evento.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="admin" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Administração do Evento</CardTitle>
              <CardDescription>Gerencie usuários e configurações do evento.</CardDescription>
            </CardHeader>
            <CardContent>
              <p>Conteúdo da aba Admin para o evento {event.name}.</p>
            </CardContent>
          </Card>
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
              <p>Conteúdo da aba LLM (stub) para o evento {event.name}.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Layout>
  );
};

export default EventDetail;