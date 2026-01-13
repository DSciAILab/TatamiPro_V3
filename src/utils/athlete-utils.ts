"use client";

import { Athlete, Division, AgeCategory, Belt, AgeDivisionSetting } from '@/types/index';

export const getAgeDivision = (age: number, ageSettings: AgeDivisionSetting[]): AgeCategory => {
  if (!ageSettings || ageSettings.length === 0) {
    // Fallback para a lógica antiga se nenhuma configuração for fornecida
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
  }

  const sortedSettings = [...ageSettings].sort((a, b) => b.min_age - a.min_age);
  for (const setting of sortedSettings) {
    if (age >= setting.min_age) {
      return setting.name;
    }
  }
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

// Nova função para encontrar a divisão de um atleta
export const findAthleteDivision = (athlete: Athlete, divisions: Division[]): Division | undefined => {
  // Filtrar divisões habilitadas e que correspondem ao gênero e faixa
  const possibleDivisions = divisions.filter(div =>
    div.is_enabled &&
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

    // 2. Categoria de Idade (aqui usamos a idade mínima para ordenar, já que os nomes são customizáveis)
    if (a.min_age !== b.min_age) return a.min_age - b.min_age;

    // 3. Faixa
    const beltAIndex = beltOrder.indexOf(a.belt as Belt);
    const beltBIndex = beltOrder.indexOf(b.belt as Belt);
    if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;

    // 4. Peso Máximo
    return a.max_weight - b.max_weight;
  });

  // Encontrar a divisão que o atleta se encaixa
  for (let i = 0; i < possibleDivisions.length; i++) {
    const div = possibleDivisions[i];

    // O peso mínimo efetivo é o max_weight da divisão anterior no mesmo grupo (gênero, idade, faixa)
    // ou 0 se for a primeira divisão do grupo.
    let effectiveMinWeight = 0;
    if (i > 0) {
      const prevDiv = possibleDivisions[i - 1];
      if (prevDiv.gender === div.gender && prevDiv.age_category_name === div.age_category_name && prevDiv.belt === div.belt) {
        effectiveMinWeight = prevDiv.max_weight;
      }
    }

    if (athlete.age >= div.min_age && athlete.age <= div.max_age &&
        athlete.weight > effectiveMinWeight && athlete.weight <= div.max_weight) {
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
    div.is_enabled &&
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    div.age_category_name === athlete.age_division &&
    div.max_weight > currentDivision.max_weight // Deve ser uma categoria de peso superior
  );

  // Se o agrupamento por faixa estiver habilitado, filtrar também pela faixa
  if (isBeltGroupingEnabled) {
    relevantDivisions.filter(div =>
      div.belt === 'Todas' || div.belt === athlete.belt
    );
  }

  // Ordenar por peso máximo para encontrar a "próxima" categoria
  relevantDivisions.sort((a, b) => a.max_weight - b.max_weight);

  // Encontrar a menor categoria de peso superior que o atleta se encaixa com o peso atual
  for (const div of relevantDivisions) {
    if (weighedWeight <= div.max_weight) {
      return div;
    }
  }

  return undefined;
};


// Função para gerar a string de ordenação/exibição
// Função para gerar a string de ordenação/exibição
export const getAthleteDisplayString = (athlete: Athlete, division: Division | undefined, t?: (key: any) => string): string => {
  const genderKey = `gender_${division ? division.gender : athlete.gender}`;
  const beltKey = `belt_${division ? division.belt : athlete.belt}`;
  
  // Safe translation: use t if provided and valid, otherwise use raw value or simple mapping
  const translate = (key: string, fallback: string) => {
    if (typeof t === 'function') {
      try {
        return t(key);
      } catch (e) {
        return fallback;
      }
    }
    return fallback;
  };

  const gender = translate(genderKey, division ? division.gender : athlete.gender);
  const belt = translate(beltKey, division ? division.belt : athlete.belt);

  if (division) {
    return division.name || `${division.gender} / ${division.age_category_name} / ${division.belt} / ${division.max_weight}kg`;
  }
  // Fallback se a divisão não for encontrada ou passada
  return `${gender} / ${athlete.age_division} / ${belt} / N/A`;
};

// NOVO: Função para processar dados do atleta
export const processAthleteData = (athleteData: any, divisions: Division[], ageSettings: AgeDivisionSetting[] = []): Athlete => {
  const date_of_birth = new Date(athleteData.date_of_birth);
  const age = new Date().getFullYear() - date_of_birth.getFullYear();
  const age_division = getAgeDivision(age, ageSettings);
  const weight_division = getWeightDivision(athleteData.weight);

  // Safely parse weight_attempts
  let weight_attempts = athleteData.weight_attempts;
  if (typeof weight_attempts === 'string') {
    try {
      weight_attempts = JSON.parse(weight_attempts);
    } catch (e) {
      console.error("Error parsing weight_attempts:", e);
      weight_attempts = [];
    }
  }
  if (!Array.isArray(weight_attempts)) {
    weight_attempts = [];
  }

  // Ensure timestamps are Date objects inside the array
  weight_attempts = weight_attempts.map((wa: any) => ({
    ...wa,
    timestamp: new Date(wa.timestamp)
  }));

  const athleteWithCalculatedProps: Athlete = {
    ...athleteData,
    date_of_birth,
    consent_date: new Date(athleteData.consent_date),
    age,
    age_division,
    weight_division,
    registration_status: athleteData.registration_status as 'under_approval' | 'approved' | 'rejected',
    check_in_status: athleteData.check_in_status || 'pending',
    registered_weight: athleteData.registered_weight || undefined,
    weight_attempts: weight_attempts,
    attendance_status: athleteData.attendance_status || 'pending',
    moved_to_division_id: athleteData.moved_to_division_id || undefined,
    move_reason: athleteData.move_reason || undefined,
    seed: athleteData.seed || undefined,
  };
  
  // Atribuir a propriedade _division
  athleteWithCalculatedProps._division = findAthleteDivision(athleteWithCalculatedProps, divisions);

  return athleteWithCalculatedProps;
};

export const formatMoveReason = (reason: string | null | undefined): string | null => {
  if (!reason) return null;
  // Handle legacy validation message "Movido automaticamente para [Division] por excesso de peso..."
  // User wants just the division name "Movido para: [Division]"
  
  let cleanReason = reason;

  // Remove the prefix
  if (cleanReason.startsWith("Movido automaticamente para ")) {
    cleanReason = cleanReason.replace("Movido automaticamente para ", "");
  }

  // Remove the suffix starting with " por excesso de peso"
  const suffixIndex = cleanReason.indexOf(" por excesso de peso");
  if (suffixIndex !== -1) {
    cleanReason = cleanReason.substring(0, suffixIndex);
  }
  
  // Remove any trailing period if present after stripping
  if (cleanReason.endsWith(".")) {
    cleanReason = cleanReason.slice(0, -1);
  }

  return cleanReason.trim();
};