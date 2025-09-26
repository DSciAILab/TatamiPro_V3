import { Athlete, Division } from '@/types/index'; // Importação adicionada

export const getAgeDivision = (age: number): string => {
  if (age < 16) return "Kids";
  if (age >= 16 && age <= 17) return "Juvenile";
  if (age >= 18 && age <= 29) return "Adult";
  if (age >= 30) return "Master";
  return "Indefinido";
};

export const getWeightDivision = (weight: number): string => {
  // Simplificado para MVP. Em um cenário real, isso seria mais complexo,
  // considerando gênero, faixa e regras específicas da federação.
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

// Nova função para encontrar a divisão de um atleta
export const findAthleteDivision = (athlete: Athlete, divisions: Division[]): Division | undefined => {
  return divisions.find(div =>
    div.isEnabled &&
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    (div.belt === 'Todas' || div.belt === athlete.belt) &&
    athlete.age >= div.minAge && athlete.age <= div.maxAge &&
    athlete.weight > div.minWeight && athlete.weight <= div.maxWeight // Peso de inscrição deve estar dentro da faixa
  );
};

// Função para gerar a string de ordenação/exibição
export const getAthleteDisplayString = (athlete: Athlete, division?: Division): string => {
  if (division) {
    return `${division.gender} / ${division.ageCategoryName} / ${division.belt} / ${division.maxWeight}kg`;
  }
  // Fallback se a divisão não for encontrada ou passada
  return `${athlete.gender} / ${athlete.ageDivision} / ${athlete.belt} / ${athlete.weightDivision}`;
};