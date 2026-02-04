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

    const assignedIds = event.mat_assignments?.[matName] || [];
    
    // Resolve assigned IDs to actual Bracket objects + Divisions
    // We treat assignedIds as potentially Bracket IDs (primary) or Division IDs (legacy/fallback).
    const itemsOnMat: { bracket: Bracket, division: Division }[] = [];

    // Deduplicate IDs just in case
    const uniqueIds = Array.from(new Set(assignedIds));

    uniqueIds.forEach(id => {
        // 1. Is it a direct Bracket ID? (Regular or Split e.g. "divA-B")
        if (event.brackets?.[id]) {
            const bracket = event.brackets[id];
            const division = event.divisions?.find(d => d.id === bracket.division_id);
            if (division) {
                itemsOnMat.push({ bracket, division });
            }
            return;
        }

        // 2. Is it a Division ID?
        // If so, it might mean "Assign all brackets for this division".
        // This is important if user assigned the category before regenerating into splits,
        // or if we rely on implicit grouping.
        const division = event.divisions?.find(d => d.id === id);
        if (division) {
             // Find all brackets belonging to this division (Parent or Splits)
             // Check parent bracket
             if (event.brackets?.[id]) {
                 itemsOnMat.push({ bracket: event.brackets[id], division });
             } 
             // Check for splits (keys starting with "id-")
             // Note: This logic assumes we haven't already added them via explicit valid IDs. 
             // Since uniqueIds are unique string keys, if we have "div1" and "div1-A" assigned, 
             // "div1-A" is handled in step 1. "div1" falls here.
             // We should avoid adding duplicates.
             const splitKeys = Object.keys(event.brackets || {}).filter(k => k.startsWith(`${id}-`));
             splitKeys.forEach(key => {
                 // Avoid adding if already explicitly assigned (though highly unlikely in a Set unless logic elsewhere is weird)
                 // But wait, "itemsOnMat" is a list. We should check if we already pushed this bracket.
                 if (!itemsOnMat.some(item => item.bracket.id === key)) {
                     const bracket = event.brackets![key];
                     itemsOnMat.push({ bracket, division });
                 }
             });
        }
    });

    // Sort the assigned items
    itemsOnMat.sort((itemA, itemB) => {
        const a = itemA.division;
        const b = itemB.division;

      const genderDiff = genderOrder.indexOf(a.gender) - genderOrder.indexOf(b.gender);
      if (genderDiff !== 0) return genderDiff;

      const ageDiff = ageCategoryOrder.indexOf(a.age_category_name) - ageCategoryOrder.indexOf(b.age_category_name);
      if (ageDiff !== 0) return ageDiff;

      if (event.is_belt_grouping_enabled && a.belt && b.belt) {
        const beltAIndex = beltOrder.indexOf(a.belt);
        const beltBIndex = beltOrder.indexOf(b.belt);
        if (beltAIndex !== beltBIndex) return beltAIndex - beltBIndex;
      }
      
      // Sort by weight
      const weightDiff = a.max_weight - b.max_weight;
      if (weightDiff !== 0) return weightDiff;
      
      // Finally, if same division/weight (e.g. Split Brackets), sort by Block/Group Name
      // Assuming alphabetical group names (Group A, Group B)
      const groupA = itemA.bracket.group_name || '';
      const groupB = itemB.bracket.group_name || '';
      return groupA.localeCompare(groupB);
    });

    itemsOnMat.forEach(({ bracket, division: _div }) => {
      // Logic remains similar but iterating itemsOnMat items
      const divisionId = bracket.division_id; // Keep original division ID for lookup if needed
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
          // Ensure we tag with the actual bracket's division context. 
          // match._division_id is usually used for display. 
          // If split, should we change this? Probably fine to keep underlying division ID.
          // Maybe add _group_name?
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