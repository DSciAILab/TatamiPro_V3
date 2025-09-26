import { Athlete, Division, Match, Bracket, DivisionGender, DivisionBelt, AgeCategory } from '@/types/index';

// Helper para obter a próxima potência de 2
const getNextPowerOf2 = (n: number): number => {
  if (n === 0) return 1;
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
};

// Helper para embaralhar um array (Fisher-Yates)
const shuffleArray = <T>(array: T[], rng: () => number): T[] => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Helper para criar um gerador de números aleatórios com seed (para determinismo)
const seededRandom = (seed: number) => {
  let m = 0x80000000; // 2**31
  let a = 1103515245;
  let c = 12345;
  let s = seed ? seed : Math.floor(Math.random() * (m - 1));
  return function() {
    s = (a * s + c) % m;
    return s / m;
  };
};

// Ordem das faixas para comparação
const beltOrder: DivisionBelt[] = ['Branca', 'Cinza', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta', 'Todas'];

// Ordem das categorias de idade para comparação
const ageCategoryOrder: AgeCategory[] = ['Kids 1', 'Kids 2', 'Kids 3', 'Infant', 'Junior', 'Teen', 'Juvenile', 'Adult', 'Master', 'Indefinido'];

// Ordem de gênero para comparação
const genderOrder: DivisionGender[] = ['Masculino', 'Feminino', 'Ambos'];


interface GenerateBracketOptions {
  thirdPlace?: boolean;
  rngSeed?: number;
  maxBlocks?: number; // Para o algoritmo de blocos
}

export const generateBracketForDivision = (
  division: Division,
  athletes: Athlete[],
  options?: GenerateBracketOptions
): Bracket => {
  const rng = seededRandom(options?.rngSeed || Date.now());

  // 1. Pré-processo: Filtrar e preparar atletas
  const divisionAthletes = athletes.filter(a =>
    a.registrationStatus === 'approved' &&
    a.checkInStatus === 'checked_in' &&
    a._division?.id === division.id // Usar a divisão já atribuída ao atleta
  );

  const N0 = divisionAthletes.length;
  const bracketSize = getNextPowerOf2(N0);
  const byes = bracketSize - N0;

  // Separar atletas com seed e sem seed
  const seededAthletes = divisionAthletes.filter(a => a.seed !== undefined).sort((a, b) => a.seed! - b.seed!);
  let unseededAthletes = divisionAthletes.filter(a => a.seed === undefined);

  // Embaralha os atletas não-seeded
  unseededAthletes = shuffleArray(unseededAthletes, rng);

  // Crie a lista inicial de participantes com BYEs
  const initialParticipants: (Athlete | 'BYE')[] = new Array(bracketSize).fill('BYE');

  // Colocar seeds em posições "clássicas" (simplificado)
  const seedPositions = [0, bracketSize - 1]; // Top and bottom
  if (bracketSize > 2) {
    seedPositions.push(bracketSize / 2);
    seedPositions.push(bracketSize / 2 - 1);
  }
  for (let i = 0; i < seededAthletes.length && i < seedPositions.length; i++) {
    initialParticipants[seedPositions[i]] = seededAthletes[i];
  }

  // Preencher as posições restantes com atletas não-seeded
  let currentUnseededIndex = 0;
  for (let i = 0; i < bracketSize; i++) {
    if (initialParticipants[i] === 'BYE') { // Se a posição está vazia
      if (currentUnseededIndex < unseededAthletes.length) {
        initialParticipants[i] = unseededAthletes[currentUnseededIndex];
        currentUnseededIndex++;
      }
    }
  }

  // A lista final de participantes para a primeira rodada é agora initialParticipants.
  // Quaisquer 'BYE's restantes em initialParticipants são BYEs reais.
  const finalBracketParticipants = initialParticipants;


  const rounds: Match[][] = [];
  let currentRoundParticipants = finalBracketParticipants;
  let roundNumber = 1;

  // 8. Construção da árvore
  while (currentRoundParticipants.length > 1) {
    const matchesInRound: Match[] = [];
    const nextRoundParticipants: (Athlete | 'BYE')[] = [];

    for (let i = 0; i < currentRoundParticipants.length; i += 2) {
      const fighter1 = currentRoundParticipants[i];
      const fighter2 = currentRoundParticipants[i + 1];

      const matchId = `${division.id}-R${roundNumber}-M${i / 2 + 1}`;
      const nextMatchId = roundNumber < Math.log2(bracketSize) ? `${division.id}-R${roundNumber + 1}-M${Math.floor(i / 4) + 1}` : undefined;

      let winner: Athlete | 'BYE' | undefined;
      let fighter1Id: string | 'BYE' = fighter1 === 'BYE' ? 'BYE' : (fighter1 as Athlete)?.id;
      let fighter2Id: string | 'BYE' = fighter2 === 'BYE' ? 'BYE' : (fighter2 as Athlete)?.id;

      if (fighter1 === 'BYE' && fighter2 !== 'BYE') {
        winner = fighter2;
        nextRoundParticipants.push(fighter2);
      } else if (fighter2 === 'BYE' && fighter1 !== 'BYE') {
        winner = fighter1;
        nextRoundParticipants.push(fighter1);
      } else if (fighter1 === 'BYE' && fighter2 === 'BYE') {
        winner = 'BYE';
        nextRoundParticipants.push('BYE');
      } else {
        // Luta real, vencedor indefinido por enquanto
        nextRoundParticipants.push(undefined as any); // Placeholder para o vencedor
      }

      matchesInRound.push({
        id: matchId,
        round: roundNumber,
        matchNumber: i / 2 + 1,
        fighter1Id: fighter1Id,
        fighter2Id: fighter2Id,
        winnerId: winner === 'BYE' ? 'BYE' : (winner as Athlete)?.id,
        nextMatchId: nextMatchId,
        prevMatchIds: undefined, // Será preenchido no próximo loop se necessário
      });
    }
    rounds.push(matchesInRound);
    currentRoundParticipants = nextRoundParticipants;
    roundNumber++;
  }

  // Preencher prevMatchIds
  for (let r = 1; r < rounds.length; r++) {
    for (let m = 0; m < rounds[r].length; m++) {
      const currentMatch = rounds[r][m];
      const prevRound = rounds[r - 1];
      const prevMatch1 = prevRound[m * 2];
      const prevMatch2 = prevRound[m * 2 + 1];
      currentMatch.prevMatchIds = [prevMatch1.id, prevMatch2.id];
    }
  }

  let thirdPlaceMatch: Match | undefined = undefined;
  if (options?.thirdPlace && rounds.length >= 2) {
    const semiFinals = rounds[rounds.length - 2];
    if (semiFinals.length === 2) {
      thirdPlaceMatch = {
        id: `${division.id}-3rdPlace`,
        round: -1, // Rodada especial
        matchNumber: 1,
        fighter1Id: undefined, // Perdedor da primeira semifinal
        fighter2Id: undefined, // Perdedor da segunda semifinal
        winnerId: undefined,
        loserId: undefined,
        nextMatchId: undefined,
        prevMatchIds: [semiFinals[0].id, semiFinals[1].id],
      };
    }
  }

  return {
    id: division.id,
    divisionId: division.id,
    rounds,
    thirdPlaceMatch,
    bracketSize,
    participants: finalBracketParticipants, // A lista final de participantes na ordem do bracket
  };
};