"use client";

import { Event } from '@/types/index'; // 'Athlete' e 'Division' são acessíveis via 'Event'
import Papa from 'papaparse';

/**
 * Exporta dados de atletas ou divisões de um evento para um arquivo CSV.
 * @param event O objeto Event completo.
 * @param dataType O tipo de dado a ser exportado ('athletes' ou 'divisions').
 * @returns Um Blob contendo os dados CSV.
 */
export const exportEventDataToCsv = (event: Event, dataType: 'athletes' | 'divisions'): Blob => {
  let dataToExport: any[] = [];
  // A variável 'filename' não é usada dentro desta função, pois o nome do arquivo é gerado no componente que chama.

  if (dataType === 'athletes') {
    dataToExport = event.athletes.map(athlete => ({
      id: athlete.id,
      eventId: athlete.eventId,
      registrationQrCodeId: athlete.registrationQrCodeId,
      firstName: athlete.firstName,
      lastName: athlete.lastName,
      dateOfBirth: athlete.dateOfBirth.toISOString().split('T')[0], // Formato YYYY-MM-DD
      age: athlete.age,
      club: athlete.club,
      gender: athlete.gender,
      belt: athlete.belt,
      weight: athlete.weight,
      nationality: athlete.nationality,
      ageDivision: athlete.ageDivision,
      weightDivision: athlete.weightDivision,
      email: athlete.email,
      phone: athlete.phone,
      emiratesId: athlete.emiratesId,
      schoolId: athlete.schoolId,
      photoUrl: athlete.photoUrl,
      emiratesIdFrontUrl: athlete.emiratesIdFrontUrl,
      emiratesIdBackUrl: athlete.emiratesIdBackUrl,
      consentAccepted: athlete.consentAccepted,
      consentDate: athlete.consentDate.toISOString(),
      consentVersion: athlete.consentVersion,
      paymentProofUrl: athlete.paymentProofUrl,
      registrationStatus: athlete.registrationStatus,
      checkInStatus: athlete.checkInStatus,
      registeredWeight: athlete.registeredWeight,
      weightAttempts: JSON.stringify(athlete.weightAttempts), // Stringify complex objects
      attendanceStatus: athlete.attendanceStatus,
      movedToDivisionId: athlete.movedToDivisionId,
      moveReason: athlete.moveReason,
      seed: athlete.seed,
    }));
  } else if (dataType === 'divisions') {
    dataToExport = event.divisions.map(division => ({
      id: division.id,
      name: division.name,
      minAge: division.minAge,
      maxAge: division.maxAge,
      maxWeight: division.maxWeight,
      gender: division.gender,
      belt: division.belt,
      ageCategoryName: division.ageCategoryName,
      isEnabled: division.isEnabled,
    }));
  } else {
    throw new Error('Tipo de dado inválido para exportação.');
  }

  const csv = Papa.unparse(dataToExport);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
};