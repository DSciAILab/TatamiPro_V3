"use client";

import React, { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AthleteRegistrationForm from '@/components/AthleteRegistrationForm';
import { Athlete } from '@/types/index';
import { showSuccess } from '@/utils/toast';

const RegisterAthletePage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();

  const handleAthleteRegistration = (newAthlete: Athlete) => {
    const existingEventData = localStorage.getItem(`event_${eventId}`);
    let eventToUpdate: any = { athletes: [] };
    if (existingEventData) {
      try {
        eventToUpdate = JSON.parse(existingEventData);
      } catch (e) {
        console.error("Failed to parse existing event data", e);
      }
    }

    const updatedAthletes = [...(eventToUpdate.athletes || []), newAthlete];
    localStorage.setItem(`event_${eventId}`, JSON.stringify({ ...eventToUpdate, athletes: updatedAthletes }));

    showSuccess(`Athlete ${newAthlete.firstName} registered successfully for event ${eventId}!`);
  };

  // Configuração de campos obrigatórios para check-in (mock para este contexto)
  const mandatoryFieldsConfig = useMemo(() => {
    const storedConfig = localStorage.getItem(`mandatoryCheckInFields_${eventId}`);
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
  }, [eventId]);

  return (
    <Layout>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Register Athlete for Event {eventId}</CardTitle>
          <CardDescription>Fill in the details below to register a new athlete for this event.</CardDescription>
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