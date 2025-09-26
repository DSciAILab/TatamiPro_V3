import { Athlete, Division, AgeCategory, AthleteBelt, DivisionBelt, Gender, DivisionGender } from '@/types/index';
import { format } from 'date-fns';

// Ordem das categorias de idade para ordenação
const ageCategoryOrder: AgeCategory[] = [
  'Kids', 'Juvenile', 'Adult', 'Master 1', 'Master 2', 'Master 3', 'Master 4', 'Master 5', 'Master 6', 'Master 7'
];

// Mapeamento de idade para categoria de idade
export const getAgeDivision = (age: number): AgeCategory => {
  if (age >= 4 && age <= 6) return 'Kids';
  if (age >= 7 && age <= 9) return 'Juvenile';
  if (age >= 10 && age <= 12) return 'Adult'; // Exemplo, ajuste conforme as regras reais
  if (age >= 13 && age <= 15) return 'Master 1'; // Exemplo
  if (age >= 16 && age <= 17) return 'Master 2'; // Exemplo
  if (age >= 18 && age <= 29) return 'Adult';
  if (age >= 30 && age <= 35) return 'Master 1';
  if (age >= 36 && age <= 40) return 'Master 2';
  if (age >= 41 && age <= 45) return 'Master 3';
  if (age >= 46 && age <= 50) return 'Master 4';
  if (age >= 51 && age <= 55) return 'Master 5';
  if (age >= 56 && age <= 60) return 'Master 6';
  if (age >= 61) return 'Master 7';
  return 'Adult'; // Default
};

// Mapeamento de peso para categoria de peso (exemplo simplificado)
export const getWeightDivision = (weight: number): string => {
  if (weight <= 50) return 'Galo';
  if (weight <= 60) return 'Pluma';
  if (weight <= 70) return 'Pena';
  if (weight <= 80) return 'Leve';
  if (weight <= 90) return 'Médio';
  if (weight <= 100) return 'Meio Pesado';
  return 'Pesadíssimo';
};

export const findAthleteDivision = (athlete: Athlete, divisions: Division[]): Division | undefined => {
  const possibleDivisions = divisions.filter(div =>
    div.isEnabled && // Acessando a propriedade isEnabled
    (div.gender === 'Ambos' || div.gender === athlete.gender) &&
    (div.belt === 'Todas' || div.belt === athlete.belt) &&
    athlete.age >= div.minAge && athlete.age <= div.maxAge
  ).sort((a, b) => {
    // 1. Gênero (Ambos primeiro, depois Masculino, Feminino)
    if (a.gender === 'Ambos' && b.gender !== 'Ambos') return -1;
    if (b.gender === 'Ambos' && a.gender !== 'Ambos') return 1;

    // 2. Categoria de Idade
    const ageAIndex = ageCategoryOrder.indexOf(a.ageCategoryName); // Acessando ageCategoryName
    const ageBIndex = ageCategoryOrder.indexOf(b.ageCategoryName); // Acessando ageCategoryName
    if (ageAIndex !== ageBIndex) return ageAIndex - ageBIndex;

    // 3. Faixa (ordem específica)
    const beltOrder: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];
    const beltAIndex = beltOrder.indexOf(a.belt);
    const beltBIndex = beltOrder.indexOf(b.belt);
    if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;

    // 4. Peso (menor maxWeight primeiro)
    return a.maxWeight - b.maxWeight;
  });

  // Lógica para encontrar a divisão de peso mais adequada
  let bestMatch: Division | undefined = undefined;
  let effectiveMinWeight = 0;

  for (let i = 0; i < possibleDivisions.length; i++) {
    const div = possibleDivisions[i];
    // Se a divisão atual é a mesma categoria de idade, gênero e faixa que a anterior,
    // o minWeight efetivo é o maxWeight da divisão anterior.
    if (i > 0) {
      const prevDiv = possibleDivisions[i - 1];
      if (prevDiv.gender === div.gender && prevDiv.ageCategoryName === div.ageCategoryName && prevDiv.belt === div.belt) { // Acessando ageCategoryName
        effectiveMinWeight = prevDiv.maxWeight;
      } else {
        effectiveMinWeight = 0; // Reset para nova categoria
      }
    }

    if (athlete.weight > effectiveMinWeight && athlete.weight <= div.maxWeight) {
      bestMatch = div;
      break;
    }
  }

  return bestMatch;
};

export const getAthleteDisplayString = (athlete: Athlete, division?: Division): string => {
  const dob = format(athlete.dateOfBirth, 'dd/MM/yyyy');
  if (division) {
    return `${division.gender} / ${division.ageCategoryName} / ${division.belt} / ${division.maxWeight}kg - ${athlete.club}`; // Acessando ageCategoryName
  }
  return `${athlete.gender} / ${athlete.ageDivision} / ${athlete.belt} / ${athlete.weight}kg - ${athlete.club}`;
};