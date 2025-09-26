import { Athlete } from '@/types/index'; // Importação adicionada

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

// Função para gerar a string de ordenação/exibição
export const getAthleteDisplayString = (athlete: Athlete): string => {
  return `${athlete.gender} / ${athlete.ageDivision} / ${athlete.belt} / ${athlete.weightDivision}`;
};