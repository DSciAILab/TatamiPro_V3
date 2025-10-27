import { Event, Match, Bracket, DivisionGender, AgeCategory, DivisionBelt } from '@/types/index';

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

  // Sort order constants
  const genderOrder: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];
  const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];
  const beltOrder: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];

  matNames.forEach(matName => {
    matFightOrder[matName] = [];
    let currentMatFightNumber = 1;

    const assignedDivisionIds = event.mat_assignments?.[matName] || [];
    const divisionsOnMat = (event.divisions || []).filter(div => assignedDivisionIds.includes(div.id));

    // Sort the divisions assigned to the mat to create a logical fight order
    divisionsOnMat.sort((a, b) => {
      const genderDiff = genderOrder.indexOf(a.gender) - genderOrder.indexOf(b.gender);
      if (genderDiff !== 0) return genderDiff;

      const ageDiff = ageCategoryOrder.indexOf(a.age_category_name) - ageCategoryOrder.indexOf(b.age_category_name);
      if (ageDiff !== 0) return ageDiff;

      if (event.is_belt_grouping_enabled && a.belt && b.belt) {
        const beltAIndex = beltOrder.indexOf(a.belt);
        const beltBIndex = beltOrder.indexOf(b.belt);
        if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;
      }
      
      // Finally, sort by weight within the same group
      return a.max_weight - b.max_weight;
    });

    divisionsOnMat.forEach(division => {
      const divisionId = division.id;
      const bracket = updatedBrackets[divisionId];
      if (bracket && bracket.rounds) {
        const allMatchesInBracket: Match[] = [];
        bracket.rounds.forEach(round => allMatchesInBracket.push(...round));
        if (bracket.third_place_match) {
          allMatchesInBracket.push(bracket.third_place_match);
        }

        allMatchesInBracket.sort((a, b) => {
          if (a.round !== b.round) return a.round - b.round;
          return a.match_number - b.match_number;
        });

        allMatchesInBracket.forEach(match => {
          match.mat_fight_number = currentMatFightNumber++;
          match._division_id = divisionId;
          match._mat_name = matName;
          matFightOrder[matName].push(match.id);

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

  return { updatedBrackets, matFightOrder };
};