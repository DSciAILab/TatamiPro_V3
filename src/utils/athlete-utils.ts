import { Athlete, Division, AgeCategory, Belt, DivisionBelt, Gender, DivisionGender } from '@/types/index'; // Importação adicionada

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

// Ordem das faixas para comparação
const beltOrder: Belt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

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

    // 2. Idade (usando minAge como proxy para categoria de idade)
    if (a.minAge !== b.minAge) return a.minAge - b.minAge;

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
    const effectiveMinWeight = (i === 0 || possibleDivisions[i-1].gender !== div.gender || possibleDivisions[i-1].ageCategoryName !== div.ageCategoryName || possibleDivisions[i-1].belt !== div.belt)
      ? 0 // Primeira divisão em um novo grupo de gênero/idade/faixa
      : possibleDivisions[i-1].maxWeight; // Limite superior da anterior

    if (athlete.age >= div.minAge && athlete.age <= div.maxAge &&
        athlete.weight > effectiveMinWeight && athlete.weight <= div.maxWeight) {
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