"use client";

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Athlete } from '@/types/index';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';

const AthleteRegistrationPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Em um aplicativo real, você pode buscar configurações de campos obrigatórios específicas do evento aqui.
  // Por enquanto, usaremos a versão do localStorage como o formulário faz.
  const mandatoryFieldsConfig = JSON.parse(localStorage.getItem(`mandatoryCheckInFields_${eventId}`) || '{}');

  const handleRegister = async (newAthlete: Athlete) => {
    if (!eventId) {
      showError("ID do evento não encontrado.");
      return;
    }

    const { data, error } = await supabase
      .from('athletes')
      .insert({
        ...newAthlete,
        event_id: eventId,
        date_of_birth: format(newAthlete.dateOfBirth, 'yyyy-MM-dd'),
        consent_date: newAthlete.consentDate.toISOString(),
        weight_attempts: JSON.stringify(newAthlete.weightAttempts),
      })
      .select()
      .single();

    if (error) {
      showError('Erro ao registrar atleta: ' + error.message);
    } else if (data) {
      showSuccess(`Atleta ${newAthlete.firstName} registrado com sucesso e aguardando aprovação!`);
      navigate(`/events/${eventId}`); // Navega de volta para a página de detalhes do evento
    }
  };

  if (!eventId) {
    return (
      <Layout>
        <p>ID do evento não encontrado.</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <Card>
        <CardHeader>
          <CardTitle>Inscrição Individual</CardTitle>
          <CardDescription>Preencha os dados abaixo para se inscrever no evento.</CardDescription>
        </CardHeader>
        <CardContent>
          <AthleteRegistrationForm
            eventId={eventId}
            onRegister={handleRegister}
            mandatoryFieldsConfig={mandatoryFieldsConfig}
          />
        </CardContent>
      </Card>
    </Layout>
  );
};

export default AthleteRegistrationPage;