"use client";

import { Athlete, Division, Match, Bracket } from '@/types/index';

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

// Helper para obter a posição de um seed em um bracket de eliminação simples (0-indexed)
const getSeedPosition = (seedNumber: number, bracketSize: number): number | null => {
  if (seedNumber < 1) return null;

  // Posições clássicas de seeds para brackets de potência de 2 (0-indexed)
  switch (seedNumber) {
    case 1: return 0;
    case 2: return bracketSize - 1;
    case 3: return bracketSize >= 4 ? bracketSize / 2 - 1 : null;
    case 4: return bracketSize >= 4 ? bracketSize / 2 : null;
    case 5: return bracketSize >= 8 ? bracketSize / 4 - 1 : null;
    case 6: return bracketSize >= 8 ? bracketSize - (bracketSize / 4) : null;
    case 7: return bracketSize >= 8 ? bracketSize / 4 : null;
    case 8: return bracketSize >= 8 ? bracketSize - (bracketSize / 4) - 1 : null;
    // Para seeds > 8, eles serão tratados como não-seeds para fins de posicionamento inicial
    default: return null;
  }
};

interface GenerateBracketOptions {
  thirdPlace?: boolean;
  rngSeed?: number;
}

export const generateBracketForDivision = (
  division: Division,
  athletes: Athlete[],
  options?: GenerateBracketOptions
): Bracket => {
  const rng = seededRandom(options?.rngSeed || Date.now());

  // 1. Pré-processo: Filtrar e preparar atletas
  const divisionAthletes = athletes.filter(a =>
    a.registration_status === 'approved' &&
    a.check_in_status === 'checked_in' &&
    a._division?.id === division.id // Usar a divisão já atribuída ao atleta
  );

  const N0 = divisionAthletes.length;
  const bracketSize = getNextPowerOf2(N0);
  const numByes = bracketSize - N0;

  // 2. Separar atletas com seed e sem seed
  const seededAthletes = divisionAthletes.filter(a => a.seed !== undefined).sort((a, b) => a.seed! - b.seed!);
  let unseededAthletes = divisionAthletes.filter(a => a.seed === undefined);

  // 3. Inicializar o array de participantes final
  const finalParticipants: (Athlete | 'BYE' | null)[] = new Array(bracketSize).fill(null);

  // 4. Colocar atletas cabeças de chave (seeds)
  const placedSeedIds = new Set<string>();
  for (const athlete of seededAthletes) {
    const position = getSeedPosition(athlete.seed!, bracketSize);
    if (position !== null && finalParticipants[position] === null) {
      finalParticipants[position] = athlete;
      placedSeedIds.add(athlete.id);
    }
  }

  // 5. Criar pool de preenchimento com atletas não-seed e BYEs
  // Atletas não-seed que não foram colocados como seeds (se houver seeds > 8)
  const remainingUnseededAthletes = unseededAthletes.filter(a => !placedSeedIds.has(a.id));
  
  // Pool de preenchimento: atletas não-seed embaralhados + BYEs
  const fillers: (Athlete | 'BYE')[] = [
    ...shuffleArray(remainingUnseededAthletes, rng),
    ...Array(numByes).fill('BYE')
  ];
  shuffleArray(fillers, rng); // Embaralhar o pool de preenchimento para distribuição balanceada

  // 6. Preencher slots restantes com o pool de preenchimento
  for (let i = 0; i < bracketSize; i++) {
    if (finalParticipants[i] === null) {
      if (fillers.length > 0) {
        finalParticipants[i] = fillers.shift()!;
      } else {
        // Isso não deve acontecer se numByes e unseededAthletes forem calculados corretamente
        console.warn("Faltam atletas ou BYEs para preencher o bracket.");
        finalParticipants[i] = 'BYE'; // Fallback
      }
    }
  }

  // Garantir que todos os slots foram preenchidos (para tipagem)
  const initialRoundParticipants: (Athlete | 'BYE')[] = finalParticipants as (Athlete | 'BYE')[];

  // 7. Anti-conflito (mesma equipe) - Primeira rodada (melhor esforço)
  // A distribuição aleatória dos 'fillers' já ajuda a evitar agrupamentos.
  // Uma implementação robusta de anti-conflito com swaps locais é complexa e pode ser adicionada futuramente.
  // Por enquanto, a aleatoriedade dos não-seeds e BYEs é o principal mecanismo de balanceamento.

  const rounds: Match[][] = [];
  let currentRoundParticipants = initialRoundParticipants;
  let roundNumber = 1;
  let globalMatchCounter = 0; // Global counter for match IDs

  // 8. Construção da árvore do bracket (Primeira Passagem: Criar Matches)
  while (currentRoundParticipants.length > 1) {
    const matchesInRound: Match[] = [];
    const nextRoundParticipants: (Athlete | 'BYE' | undefined)[] = [];

    for (let i = 0; i < currentRoundParticipants.length; i += 2) {
      globalMatchCounter++; // Increment global counter for each new match
      const fighter1 = currentRoundParticipants[i];
      const fighter2 = currentRoundParticipants[i + 1];

      const matchId = `${division.id}-M${globalMatchCounter}`; // Use global counter for ID
      
      let winner: Athlete | 'BYE' | undefined;
      let fighter1_id: string | 'BYE' | undefined = fighter1 === 'BYE' ? 'BYE' : (fighter1 as Athlete)?.id;
      let fighter2_id: string | 'BYE' | undefined = fighter2 === 'BYE' ? 'BYE' : (fighter2 as Athlete)?.id;

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
        nextRoundParticipants.push(undefined); // Placeholder para o vencedor
      }

      matchesInRound.push({
        id: matchId,
        round: roundNumber,
        match_number: i / 2 + 1, // This is still match number *within the round*
        fighter1_id: fighter1_id,
        fighter2_id: fighter2_id,
        winner_id: winner === 'BYE' ? 'BYE' : (winner as Athlete)?.id,
        loser_id: (winner === fighter1) ? fighter2_id : (winner === fighter2 ? fighter1_id : undefined), // Define loser for BYE matches
        next_match_id: undefined, // Will be filled in a later pass
        prev_match_ids: undefined, // Will be filled in a later pass
      });
    }
    rounds.push(matchesInRound);
    currentRoundParticipants = nextRoundParticipants as (Athlete | 'BYE')[]; // Cast para continuar o loop
    roundNumber++;
  }

  // Segunda Passagem: Ligar Matches (definir next_match_id e prev_match_ids)
  for (let r = 0; r < rounds.length; r++) {
    const currentRound = rounds[r];
    const nextRound = rounds[r + 1];

    if (nextRound) {
      for (let m = 0; m < currentRound.length; m++) {
        const currentMatch = currentRound[m];
        const nextMatchIndex = Math.floor(m / 2); // A luta na próxima rodada que esta luta alimenta
        if (nextMatchIndex < nextRound.length) {
          const nextMatch = nextRound[nextMatchIndex];
          currentMatch.next_match_id = nextMatch.id;

          // Definir prev_match_ids para a próxima luta
          if (!nextMatch.prev_match_ids) {
            nextMatch.prev_match_ids = [undefined, undefined];
          }
          if (m % 2 === 0) { // Primeira luta do par
            nextMatch.prev_match_ids[0] = currentMatch.id;
          } else { // Segunda luta do par
            nextMatch.prev_match_ids[1] = currentMatch.id;
          }
        }
      }
    }
  }

  let third_place_match: Match | undefined = undefined;
  if (options?.thirdPlace && rounds.length >= 2) {
    const semiFinals = rounds[rounds.length - 2];
    if (semiFinals.length === 2) {
      globalMatchCounter++; // Increment for third place match
      third_place_match = {
        id: `${division.id}-M${globalMatchCounter}`, // Use global counter for ID
        round: -1, // Rodada especial
        match_number: 1,
        fighter1_id: undefined, // Perdedor da primeira semifinal
        fighter2_id: undefined, // Perdedor da segunda semifinal
        winner_id: undefined,
        loser_id: undefined,
        next_match_id: undefined,
        prev_match_ids: [semiFinals[0].id, semiFinals[1].id], // IDs das semifinais
      };
    }
  }

  return {
    id: division.id,
    division_id: division.id,
    rounds,
    third_place_match,
    bracket_size: bracketSize,
    participants: initialRoundParticipants, // A lista final de participantes na ordem do bracket
  };
};