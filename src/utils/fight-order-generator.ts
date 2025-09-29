import { Event, Match, Bracket, DivisionGender, AgeCategory, DivisionBelt } from '@/types/index';

interface CategoryGroup {
  key: string; // e.g., "Masculino/Adult/Preta" or "Masculino/Adult"
  display: string; // e.g., "Masculino / Adult / Preta"
  gender: DivisionGender;
  age_category_name: AgeCategory;
  belt?: DivisionBelt;
  athleteCount: number;
  divisionIds: string[];
}

// Ordem das faixas para comparação
const beltOrder: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];

// Ordem das categorias de idade para comparação
const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];

// Ordem de gênero para comparação
const genderOrder: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];

/**
 * Gera a ordem sequencial das lutas para cada mat, atribuindo um `mat_fight_number` a cada luta.
 *
 * @param event O objeto Event completo.
 * @returns Um objeto contendo os brackets atualizados com `mat_fight_number` e o `mat_fight_order` para o evento.
 */
export const generateMatFightOrder = (event: Event): { updatedBrackets: Record<string, Bracket>; matFightOrder: Record<string, string[]> } => {
  const updatedBrackets: Record<string, Bracket> = JSON.parse(JSON.stringify(event.brackets || {})); // Deep copy
  const matFightOrder: Record<string, string[]> = {};

  if (!event.mat_assignments || !event.brackets || !event.num_fight_areas) {
    return { updatedBrackets, matFightOrder };
  }

  const matNames = Array.from({ length: event.num_fight_areas }, (_, i) => `Mat ${i + 1}`);

  matNames.forEach(matName => {
    matFightOrder[matName] = [];
    let currentMatFightNumber = 1;

    const assignedCategoryKeys = event.mat_assignments?.[matName] || [];

    // Reconstroi os grupos de categoria para ordenar corretamente
    const groupsMap = new Map<string, CategoryGroup>();
    (event.athletes || []).filter(a => a.registration_status === 'approved' && a.check_in_status === 'checked_in').forEach(athlete => {
      const division = athlete._division;
      if (!division) return;

      let key: string;
      let display: string;
      let belt: DivisionBelt | undefined;

      if (event.is_belt_grouping_enabled) {
        key = `${division.gender}/${division.age_category_name}/${division.belt}`;
        display = `${division.gender} / ${division.age_category_name} / ${division.belt}`;
        belt = division.belt;
      } else {
        key = `${division.gender}/${division.age_category_name}`;
        display = `${division.gender} / ${division.age_category_name}`;
      }

      if (assignedCategoryKeys.includes(key)) {
        if (!groupsMap.has(key)) {
          groupsMap.set(key, {
            key,
            display,
            gender: division.gender,
            age_category_name: division.age_category_name,
            belt,
            athleteCount: 0,
            divisionIds: [],
          });
        }
        const group = groupsMap.get(key)!;
        group.athleteCount++;
        if (!group.divisionIds.includes(division.id)) {
          group.divisionIds.push(division.id);
        }
      }
    });

    // Ordenar as categorias atribuídas ao mat
    const sortedCategoriesOnMat = Array.from(groupsMap.values()).sort((a, b) => {
      const genderDiff = genderOrder.indexOf(a.gender) - genderOrder.indexOf(b.gender);
      if (genderDiff !== 0) return genderDiff;

      const ageDiff = ageCategoryOrder.indexOf(a.age_category_name) - ageCategoryOrder.indexOf(b.age_category_name);
      if (ageDiff !== 0) return ageDiff;

      if (event.is_belt_grouping_enabled && a.belt && b.belt) {
        const beltAIndex = beltOrder.indexOf(a.belt);
        const beltBIndex = beltOrder.indexOf(b.belt);
        if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;
      }
      return 0;
    });

    sortedCategoriesOnMat.forEach(categoryGroup => {
      categoryGroup.divisionIds.forEach(divisionId => {
        const bracket = updatedBrackets[divisionId];
        if (bracket && bracket.rounds) {
          // Coletar todas as lutas do bracket, incluindo a luta pelo 3º lugar
          const allMatchesInBracket: Match[] = [];
          bracket.rounds.forEach(round => allMatchesInBracket.push(...round));
          if (bracket.third_place_match) {
            allMatchesInBracket.push(bracket.third_place_match);
          }

          // Ordenar as lutas dentro do bracket (primeiro por rodada, depois por número da luta)
          allMatchesInBracket.sort((a, b) => {
            if (a.round !== b.round) return a.round - b.round;
            return a.match_number - b.match_number;
          });

          allMatchesInBracket.forEach(match => {
            // Atribuir o mat_fight_number e adicionar à ordem do mat
            match.mat_fight_number = currentMatFightNumber++;
            match._division_id = divisionId; // Adicionar para fácil acesso
            match._mat_name = matName; // Adicionar para fácil acesso
            matFightOrder[matName].push(match.id);

            // Atualizar o match no bracket original (deep copy)
            if (match.round === -1 && bracket.third_place_match) {
              bracket.third_place_match = match;
            } else {
              const roundIndex = bracket.rounds.findIndex(r => r.some(m => m.id === match.id));
              if (roundIndex !== -1) {
                const matchIndex = bracket.rounds[roundIndex].findIndex(m => m.id === match.id);
                if (matchIndex !== -1) {
                  bracket.rounds[roundIndex][matchIndex] = match;
                }
              }
            }
          });
        }
      });
    });
  });

  return { updatedBrackets, matFightOrder };
};