"use client";

import { Event } from '@/types/index';

export const createEventSummaryForLLM = (eventData: Event): string => {
  const summary = [];
  summary.push(`- Nome do Evento: ${eventData.name}`);
  summary.push(`- Data: ${eventData.date}`);
  summary.push(`- Status: ${eventData.status}`);
  summary.push(`- Descrição: ${eventData.description}`);

  if (eventData.athletes && eventData.athletes.length > 0) {
    const totalAthletes = eventData.athletes.length;
    const approved = eventData.athletes.filter(a => a.registration_status === 'approved').length;
    const pending = eventData.athletes.filter(a => a.registration_status === 'under_approval').length;
    const checkedIn = eventData.athletes.filter(a => a.check_in_status === 'checked_in').length;
    const belts = [...new Set(eventData.athletes.map(a => a.belt))];

    summary.push(`- Atletas: ${totalAthletes} inscritos no total.`);
    summary.push(`  - ${approved} atletas aprovados.`);
    summary.push(`  - ${pending} atletas com inscrição pendente.`);
    summary.push(`  - ${checkedIn} atletas com check-in realizado.`);
    summary.push(`  - Faixas presentes: ${belts.join(', ')}.`);
  } else {
    summary.push("- Atletas: Nenhum atleta inscrito.");
  }

  if (eventData.divisions && eventData.divisions.length > 0) {
    summary.push(`- Divisões: ${eventData.divisions.length} divisões configuradas.`);
    const divisionNames = eventData.divisions.map(d => d.name).slice(0, 10).join(', '); // Limita para não ficar muito longo
    summary.push(`  - Exemplo de Divisões: ${divisionNames}${eventData.divisions.length > 10 ? '...' : ''}`);
  } else {
    summary.push("- Divisões: Nenhuma divisão configurada.");
  }

  if (eventData.brackets && Object.keys(eventData.brackets).length > 0) {
    const bracketedDivisions = Object.keys(eventData.brackets).map(divId => eventData.divisions.find(d => d.id === divId)?.name || divId);
    summary.push(`- Brackets: Gerados para ${bracketedDivisions.length} divisões: ${bracketedDivisions.join(', ')}.`);
  } else {
    summary.push("- Brackets: Nenhum bracket gerado ainda.");
  }

  return summary.join('\n');
};