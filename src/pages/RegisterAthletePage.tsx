"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import { Athlete, Event } from '@/types/index';
import { showSuccess, showError } from '@/utils/toast';
import { getAgeDivision, getWeightDivision } from '@/utils/athlete-utils'; // Importar para processar dados do atleta

const RegisterAthletePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (id) {
      const existingEventData = localStorage.getItem(`event_${id}`);
      if (existingEventData) {
        try {
          const parsedEvent: Event = JSON.parse(existingEventData);
          // Processar atletas para garantir que as datas sejam objetos Date
          const processedAthletes = parsedEvent.athletes.map(athleteData => ({
            ...athleteData,
            dateOfBirth: new Date(athleteData.dateOfBirth),
            consentDate: new Date(athleteData.consentDate),
          }));
          setEvent({ ...parsedEvent, athletes: processedAthletes });
        } catch (e) {
          console.error("Falha ao analisar dados do evento armazenados do localStorage", e);
          showError("Erro ao carregar dados do evento.");
          navigate('/events'); // Redirecionar se o evento não puder ser carregado
        }
      } else {
        showError("Evento não encontrado.");
        navigate('/events'); // Redirecionar se o evento não existir
      }
    }
  }, [id, navigate]);

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

  const handleAthleteRegistration = (newAthlete: Athlete) => {
    if (event) {
      const updatedEvent = {
        ...event,
        athletes: [...event.athletes, newAthlete],
      };
      localStorage.setItem(`event_${id}`, JSON.stringify(updatedEvent));
      setEvent(updatedEvent); // Atualiza o estado local do evento
      showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso e aguardando aprovação!`);
      navigate(`/events/${id}`); // Redireciona de volta para a página de detalhes do evento
    }
  };

  if (!event) {
    return (
      <Layout>
        <div className="text-center text-xl mt-8">Carregando evento...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Registrar Atleta para {event.name}</CardTitle>
          <CardDescription>Preencha os detalhes para registrar um novo atleta no evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <AthleteRegistrationForm
            onRegister={handleAthleteRegistration}
            mandatoryFieldsConfig={mandatoryFieldsConfig}
          />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default RegisterAthletePage;