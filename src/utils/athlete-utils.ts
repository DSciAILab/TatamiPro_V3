"use client";

import { Athlete, Division, AthleteBelt, Gender, DivisionGender, DivisionBelt, AgeCategory } from '@/types/index'; // Updated imports
import { format } from 'date-fns';

// Helper para obter a categoria de idade
export const getAgeDivision = (age: number): AgeCategory => {
  if (age >= 4 && age <= 6) return 'Kids I';
  if (age >= 7 && age <= 8) return 'Kids II';
  if (age >= 9 && age <= 10) return 'Kids III';
  if (age >= 11 && age <= 12) return 'Junior';
  if (age >= 13 && age <= 15) return 'Teen';
  if (age >= 16 && age <= 17) return 'Juvenile';
  if (age >= 18 && age <= 29) return 'Adult';
  if (age >= 30 && age <= 35) return 'Master 1';
  if (age >= 36 && age <= 40) return 'Master 2';
  if (age >= 41 && age <= 45) return 'Master 3';
  if (age >= 46 && age <= 50) return 'Master 4';
  if (age >= 51 && age <= 55) return 'Master 5';
  if (age >= 56 && age <= 60) return 'Master 6';
  if (age >= 61) return 'Master 7';
  return 'Adult'; // Default ou para idades fora do range
};

// Helper para obter a categoria de peso (simplificado, pode ser mais complexo)
export const getWeightDivision = (weight: number): string => {
  if (weight <= 50) return 'Galo';
  if (weight <= 57.5) return 'Pluma';
  if (weight <= 64) return 'Pena';
  if (weight <= 70) return 'Leve';
  if (weight <= 76) return 'Médio';
  if (weight <= 82.3) return 'Meio Pesado';
  if (weight <= 88.3) return 'Pesado';
  if (weight <= 94.3) return 'Super Pesado';
  if (weight <= 100.5) return 'Pesadíssimo';
  return 'Absoluto';
};

// Order for belts
const beltOrder: AthleteBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

// Order for age categories
const ageCategoryOrder: AgeCategory[] = [
  'Kids I', 'Kids II', 'Kids III', 'Junior', 'Teen', 'Juvenile', 'Adult',
  'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'
];

export const findPossibleDivisions = (athlete: Athlete, divisions: Division[]): Division[] => {
  const possibleDivisions = divisions.filter(div =>
    div.isEnabled &&
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    (div.belt === 'Todas' || div.belt === athlete.belt) &&
    athlete.age >= div.minAge && athlete.age <= div.maxAge &&
    athlete.weight > div.minWeight && athlete.weight <= div.maxWeight
  );

  // Sort divisions for consistent assignment
  possibleDivisions.sort((a, b) => {
    // 1. Gênero (Ambos primeiro, depois Masculino, Feminino)
    if (a.gender === 'Ambos' && b.gender !== 'Ambos') return -1;
    if (b.gender === 'Ambos' && a.gender !== 'Ambos') return 1;
    if (a.gender === 'Masculino' && b.gender === 'Feminino') return -1;
    if (a.gender === 'Feminino' && b.gender === 'Masculino') return 1;

    // 2. Categoria de Idade
    const ageAIndex = ageCategoryOrder.indexOf(a.ageCategoryName);
    const ageBIndex = ageCategoryOrder.indexOf(b.ageCategoryName);
    if (ageAIndex !== ageBIndex) return ageAIndex - ageBIndex;

    // 3. Faixa
    const beltAIndex = beltOrder.indexOf(a.belt as AthleteBelt); // Cast to AthleteBelt for comparison
    const beltBIndex = beltOrder.indexOf(b.belt as AthleteBelt); // Cast to AthleteBelt for comparison
    if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;

    // 4. Peso (menor maxWeight primeiro)
    return a.maxWeight - b.maxWeight;
  });

  // Refine weight divisions to ensure no overlaps and correct assignment
  const refinedDivisions: Division[] = [];
  let effectiveMinWeight = 0;

  for (let i = 0; i < possibleDivisions.length; i++) {
    const div = possibleDivisions[i];
    if (i > 0) {
      const prevDiv = possibleDivisions[i - 1];
      // If the previous division has the same gender, age category, and belt,
      // adjust the current division's minWeight to be the previous's maxWeight
      if (prevDiv.gender === div.gender && prevDiv.ageCategoryName === div.ageCategoryName && prevDiv.belt === div.belt) {
        effectiveMinWeight = prevDiv.maxWeight;
      } else {
        effectiveMinWeight = div.minWeight; // Reset if it's a new group
      }
    } else {
      effectiveMinWeight = div.minWeight;
    }

    // Only add if athlete's weight fits the refined range
    if (athlete.weight > effectiveMinWeight && athlete.weight <= div.maxWeight) {
      refinedDivisions.push({ ...div, minWeight: effectiveMinWeight }); // Update minWeight for clarity
    }
  }

  return refinedDivisions;
};

// Exportando findAthleteDivision para ser usado onde uma única divisão é esperada
export const findAthleteDivision = (athlete: Athlete, divisions: Division[]): Division | undefined => {
  const possibleDivs = findPossibleDivisions(athlete, divisions);
  // Para simplificar, retorna a primeira divisão encontrada.
  // Em um cenário real, pode haver uma lógica mais complexa para escolher a 'melhor' divisão.
  return possibleDivs.length > 0 ? possibleDivs[0] : undefined;
};

export const getAthleteDisplayString = (athlete: Athlete, division?: Division): string => {
  if (division) {
    return `${division.gender} / ${division.ageCategoryName} / ${division.belt} / ${division.maxWeight}kg - ${athlete.club}`;
  }
  return `${athlete.firstName} ${athlete.lastName} (${athlete.club})`;
};