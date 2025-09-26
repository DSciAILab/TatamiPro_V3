"use client";

import { Athlete, Division, AgeCategory, Belt, DivisionBelt, Gender, DivisionGender } from '@/types/index';

export const getAgeDivision = (age: number): AgeCategory => {
  if (age >= 4 && age <= 6) return "Kids 1";
  if (age >= 7 && age <= 8) return "Kids 2";
  if (age >= 9 && age <= 10) return "Kids 3";
  if (age >= 11 && age <= 12) return "Infant";
  if (age >= 13 && age <= 14) return "Junior";
  if (age >= 15 && age <= 15) return "Teen";
  if (age >= 16 && age <= 17) return "Juvenile";
  if (age >= 18 && age <= 29) return "Adult";
  if (age >= 30) return "Master";
  return "Indefinido";
};

export const getWeightDivision = (weight: number): string => {
  // Esta função é um fallback e não será usada para o encaixe principal de divisões
  // mas pode ser útil para exibição genérica.
  if (weight <= 57.5) return "Galo";
  if (weight <= 64) return "Pluma";
  if (weight <= 70) return "Pena";
  if (weight <= 76) return "Leve";
  if (weight <= 82.3) return "Médio";
  if (weight <= 88.3) return "Meio-Pesado";
  if (weight <= 94.3) return "Pesado";
  if (weight <= 100.5) return "Super Pesado";
  if (weight > 100.5) return "Pesadíssimo";
  return "Indefinido";
};

// Ordem das faixas para comparação
const beltOrder: Belt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

// Ordem das categorias de idade para comparação
const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];

// Nova função para encontrar a divisão de um atleta
export const findAthleteDivision = (athlete: Athlete, divisions: Division[]): Division | undefined => {
  // Filtrar divisões habilitadas e que correspondem ao gênero e faixa
  const possibleDivisions = divisions.filter(div =>
    div.isEnabled &&
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    (div.belt === 'Todas' || div.belt === athlete.belt)
  );

  // Ordenar as divisões para aplicar a lógica de "peso mínimo é o limite superior da anterior"
  // A ordenação é crucial: Gênero, Categoria de Idade, Faixa, Peso Máximo
  possibleDivisions.sort((a, b) => {
    // 1. Gênero
    if (a.gender !== b.gender) {
      if (a.gender === 'Masculino') return -1;
      if (b.gender === 'Masculino') return 1;
      if (a.gender === 'Feminino') return -1;
      if (b.gender === 'Feminino') return 1;
    }

    // 2. Categoria de Idade
    const ageAIndex = ageCategoryOrder.indexOf(a.ageCategoryName);
    const ageBIndex = ageCategoryOrder.indexOf(b.ageCategoryName);
    if (ageAIndex !== ageBIndex) return ageAIndex - ageBIndex;

    // 3. Faixa
    const beltAIndex = beltOrder.indexOf(a.belt as Belt);
    const beltBIndex = beltOrder.indexOf(b.belt as Belt);
    if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;

    // 4. Peso Máximo
    return a.maxWeight - b.maxWeight;
  });

  // Encontrar a divisão que o atleta se encaixa
  for (let i = 0; i < possibleDivisions.length; i++) {
    const div = possibleDivisions[i];

    // O peso mínimo efetivo é o maxWeight da divisão anterior no mesmo grupo (gênero, idade, faixa)
    // ou 0 se for a primeira divisão do grupo.
    let effectiveMinWeight = 0;
    if (i > 0) {
      const prevDiv = possibleDivisions[i - 1];
      if (prevDiv.gender === div.gender && prevDiv.ageCategoryName === div.ageCategoryName && prevDiv.belt === div.belt) {
        effectiveMinWeight = prevDiv.maxWeight;
      }
    }

    if (athlete.age >= div.minAge && athlete.age <= div.maxAge &&
        athlete.weight > effectiveMinWeight && athlete.weight <= div.maxWeight) {
      return div;
    }
  }

  return undefined;
};

// Função para encontrar a próxima divisão de peso superior para um atleta
export const findNextHigherWeightDivision = (
  athlete: Athlete,
  currentDivision: Division,
  allDivisions: Division[],
  weighedWeight: number,
  isBeltGroupingEnabled: boolean
): Division | undefined => {
  // Filtrar divisões que correspondem ao gênero e idade do atleta
  const relevantDivisions = allDivisions.filter(div =>
    div.isEnabled &&
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    div.ageCategoryName === athlete.ageDivision &&
    div.maxWeight > currentDivision.maxWeight // Deve ser uma categoria de peso superior
  );

  // Se o agrupamento por faixa estiver habilitado, filtrar também pela faixa
  if (isBeltGroupingEnabled) {
    relevantDivisions.filter(div =>
      div.belt === 'Todas' || div.belt === athlete.belt
    );
  }

  // Ordenar por peso máximo para encontrar a "próxima" categoria
  relevantDivisions.sort((a, b) => a.maxWeight - b.maxWeight);

  // Encontrar a menor categoria de peso superior que o atleta se encaixa com o peso atual
  for (const div of relevantDivisions) {
    if (weighedWeight <= div.maxWeight) {
      return div;
    }
  }

  return undefined;
};


// Função para gerar a string de ordenação/exibição
export const getAthleteDisplayString = (athlete: Athlete, division?: Division): string => {
  if (division) {
    return `${division.gender} / ${division.ageCategoryName} / ${division.belt} / ${division.maxWeight}kg`;
  }
  // Fallback se a divisão não for encontrada ou passada
  return `${athlete.gender} / ${athlete.ageDivision} / ${athlete.belt} / Divisão não encontrada`;
};

// NOVO: Função para processar dados do atleta
export const processAthleteData = (athleteData: any, divisions: Division[]): Athlete => {
  const dateOfBirth = new Date(athleteData.dateOfBirth);
  const age = new Date().getFullYear() - dateOfBirth.getFullYear();
  const ageDivision = getAgeDivision(age);
  const weightDivision = getWeightDivision(athleteData.weight);

  const athleteWithCalculatedProps: Athlete = {
    ...athleteData,
    dateOfBirth,
    consentDate: new Date(athleteData.consentDate),
    age,
    ageDivision,
    weightDivision,
    registrationStatus: athleteData.registrationStatus as 'under_approval' | 'approved' | 'rejected',
    checkInStatus: athleteData.checkInStatus || 'pending',
    registeredWeight: athleteData.registeredWeight || undefined,
    weightAttempts: athleteData.weightAttempts || [],
    attendanceStatus: athleteData.attendanceStatus || 'pending',
    movedToDivisionId: athleteData.movedToDivisionId || undefined,
    moveReason: athleteData.moveReason || undefined,
    seed: athleteData.seed || undefined,
  };
  
  // Atribuir a propriedade _division
  athleteWithCalculatedProps._division = findAthleteDivision(athleteWithCalculatedProps, divisions);

  return athleteWithCalculatedProps;
};