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
      event_id: athlete.event_id,
      registration_qr_code_id: athlete.registration_qr_code_id,
      first_name: athlete.first_name,
      last_name: athlete.last_name,
      date_of_birth: athlete.date_of_birth.toISOString().split('T')[0], // Formato YYYY-MM-DD
      age: athlete.age,
      club: athlete.club,
      gender: athlete.gender,
      belt: athlete.belt,
      weight: athlete.weight,
      nationality: athlete.nationality,
      age_division: athlete.age_division,
      weight_division: athlete.weight_division,
      email: athlete.email,
      phone: athlete.phone,
      emirates_id: athlete.emirates_id,
      school_id: athlete.school_id,
      photo_url: athlete.photo_url,
      emirates_id_front_url: athlete.emirates_id_front_url,
      emirates_id_back_url: athlete.emirates_id_back_url,
      consent_accepted: athlete.consent_accepted,
      consent_date: athlete.consent_date.toISOString(),
      consent_version: athlete.consent_version,
      payment_proof_url: athlete.payment_proof_url,
      registration_status: athlete.registration_status,
      check_in_status: athlete.check_in_status,
      registered_weight: athlete.registered_weight,
      weight_attempts: JSON.stringify(athlete.weight_attempts), // Stringify complex objects
      attendance_status: athlete.attendance_status,
      moved_to_division_id: athlete.moved_to_division_id,
      move_reason: athlete.move_reason,
      seed: athlete.seed,
    }));
  } else if (dataType === 'divisions') {
    dataToExport = event.divisions.map(division => ({
      id: division.id,
      name: division.name,
      min_age: division.min_age,
      max_age: division.max_age,
      max_weight: division.max_weight,
      gender: division.gender,
      belt: division.belt,
      age_category_name: division.age_category_name,
      is_enabled: division.is_enabled,
    }));
  } else {
    throw new Error('Tipo de dado inválido para exportação.');
  }

  const csv = Papa.unparse(dataToExport);
  return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
};