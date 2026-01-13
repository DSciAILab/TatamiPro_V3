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
  explicitAthletes?: Athlete[];
  enableTeamSeparation?: boolean;
}

/**
 * Generates a double elimination bracket specifically for 3 athletes.
 * Structure (3 matches):
 * - Match 1: Athlete A vs Athlete B
 * - Match 2: Loser(M1) vs Athlete C
 * - Match 3 (Final): Winner(M1) vs Winner(M2)
 */
const generateDoubleEliminationFor3Athletes = (
  division: Division,
  athletes: Athlete[]
): Bracket => {
  if (athletes.length !== 3) {
    throw new Error('This function only works with exactly 3 athletes');
  }

  // Sort athletes by seed (if available) or randomly
  const sortedAthletes = [...athletes].sort((a, b) => {
    if (a.seed !== undefined && b.seed !== undefined) return a.seed - b.seed;
    if (a.seed !== undefined) return -1;
    if (b.seed !== undefined) return 1;
    return 0;
  });

  const [athleteA, athleteB, athleteC] = sortedAthletes;

  // Match 1: Athlete A vs Athlete B
  const match1: Match = {
    id: `${division.id}-M1`,
    round: 1,
    match_number: 1,
    fighter1_id: athleteA.id,
    fighter2_id: athleteB.id,
    winner_id: undefined,
    loser_id: undefined,
    next_match_id: `${division.id}-M3`, // Winner goes to final
    prev_match_ids: undefined,
  };

  // Match 2: Loser(M1) vs Athlete C
  const match2: Match = {
    id: `${division.id}-M2`,
    round: 2,
    match_number: 1,
    fighter1_id: undefined, // Loser from M1
    fighter2_id: athleteC.id,
    winner_id: undefined,
    loser_id: undefined,
    next_match_id: `${division.id}-M3`, // Winner goes to final
    prev_match_ids: [match1.id, undefined], // Loser comes from M1
  };

  // Match 3: Final (Winner M1 vs Winner M2)
  const match3: Match = {
    id: `${division.id}-M3`,
    round: 3,
    match_number: 1,
    fighter1_id: undefined, // Winner from M1
    fighter2_id: undefined, // Winner from M2
    winner_id: undefined,
    loser_id: undefined,
    next_match_id: undefined,
    prev_match_ids: [match1.id, match2.id],
  };

  // Organize into rounds
  const rounds: Match[][] = [
    [match1],      // Round 1
    [match2],      // Round 2
    [match3],      // Round 3 (Final)
  ];

  return {
    id: division.id,
    division_id: division.id,
    rounds,
    third_place_match: undefined, // Not needed - 3rd place is automatically the loser of M2
    bracket_size: 3,
    participants: sortedAthletes,
  };
};

export const generateBracketForDivision = (
  division: Division,
  athletes: Athlete[],
  options?: GenerateBracketOptions
): Bracket => {
  const rng = seededRandom(options?.rngSeed || Date.now());

  // 1. Pré-processo: Filtrar e preparar atletas
  // Check if athlete belongs to this division:
  // - If athlete has moved_to_division_id, use that as their effective division
  // - Otherwise, use their original _division
  let divisionAthletes: Athlete[] = [];
  
  if (options?.explicitAthletes) {
      divisionAthletes = options.explicitAthletes;
  } else {
      divisionAthletes = athletes.filter(a => {
        if (a.registration_status !== 'approved' || a.check_in_status !== 'checked_in') {
          return false;
        }
        
        // Determine the effective division for this athlete
        const effectiveDivisionId = a.moved_to_division_id || a._division?.id;
        return effectiveDivisionId === division.id;
      });
  }

  const N0 = divisionAthletes.length;
  console.log(`[BracketGenerator] Division ${division.name}: Found ${N0} athletes (Approved & Checked-in)`);

  // Special case: Exactly 3 athletes should use double elimination
  if (N0 === 3) {
    console.log(`[BracketGenerator] Using Double Elimination for 3 athletes`);
    return generateDoubleEliminationFor3Athletes(division, divisionAthletes);
  }

  const bracketSize = getNextPowerOf2(N0);
  const numByes = bracketSize - N0;

  // 2. Separar atletas com seed e sem seed
  const seededAthletes = divisionAthletes.filter(a => a.seed !== undefined).sort((a, b) => (a.seed || 0) - (b.seed || 0));
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
  // Melhoria: Separação de Equipes (Team Separation)
  const remainingUnseededAthletes = unseededAthletes.filter(a => !placedSeedIds.has(a.id));
  
  // Agrupar por equipe
  const athletesByTeam: Record<string, Athlete[]> = {};
  const solitaryAthletes: Athlete[] = [];

  remainingUnseededAthletes.forEach(a => {
    const team = a.club || 'Unknown';
    if (!athletesByTeam[team]) {
      athletesByTeam[team] = [];
    }
    athletesByTeam[team].push(a);
  });

  // Identificar times com mais de 1 atleta e solitários
  const teams: { name: string, athletes: Athlete[] }[] = [];
  Object.entries(athletesByTeam).forEach(([name, teamAthletes]) => {
    if (teamAthletes.length > 1) {
      teams.push({ name, athletes: teamAthletes });
    } else {
      solitaryAthletes.push(...teamAthletes);
    }
  });

  // Ordenar equipes por tamanho (maiores primeiro para garantir melhor separação)
  teams.sort((a, b) => b.athletes.length - a.athletes.length);

  // Lista de índices vazios disponíveis
  let availableSlots: number[] = [];
  for (let i = 0; i < bracketSize; i++) {
    if (finalParticipants[i] === null) {
      availableSlots.push(i);
    }
  }

  // Função auxiliar para distribuir atletas de uma equipe
  const distributeTeam = (teamAthletes: Athlete[]) => {
    // Dividir slots disponíveis em Top e Bottom
    const pivot = bracketSize / 2;
    const topSlots = availableSlots.filter(s => s < pivot);
    const bottomSlots = availableSlots.filter(s => s >= pivot);

    // Embaralhar as opções dentro de cada metade para manter a aleatoriedade local
    shuffleArray(topSlots, rng);
    shuffleArray(bottomSlots, rng);

    // Distribuir alternadamente
    // Se a equipe for muito grande, balancear entre Top/Bottom
    let placedCount = 0;
    while (teamAthletes.length > 0) {
      const athlete = teamAthletes.shift()!;
      let slot: number | undefined;

      // Tentar alternar: Top, Bottom, Top, Bottom...
      if (placedCount % 2 === 0) {
        // Tenta Top, se não der, tenta Bottom
        if (topSlots.length > 0) {
          slot = topSlots.pop();
        } else if (bottomSlots.length > 0) {
          slot = bottomSlots.pop();
        }
      } else {
        // Tenta Bottom, se não der, tenta Top
        if (bottomSlots.length > 0) {
          slot = bottomSlots.pop();
        } else if (topSlots.length > 0) {
          slot = topSlots.pop();
        }
      }

      if (slot !== undefined) {
        finalParticipants[slot] = athlete;
        // Remover slot usado da lista global availableSlots
        availableSlots = availableSlots.filter(s => s !== slot);
        placedCount++;
      } else {
        console.error("Erro crítico: Sem slots para atleta", athlete.first_name, athlete.last_name);
      }
    }
  };

  // 1. Distribuir Equipes
  if (options?.enableTeamSeparation) {
    console.log("[BracketGenerator] Using Team Separation Logic");
    teams.forEach(team => {
      distributeTeam(team.athletes);
    });
  } else {
    // Fallback: Se não estiver habilitado, tratar como seeds para colocar no array, ou melhor,
    // se não usar a lógica de separação, devemos apenas jogar todos no pool de 'remainingUnseeded'?
    // A logica acima JA separou eles em 'teams'. Se não formos distribuir por team,
    // precisamos devolver eles para o pool geral ou distribuir aleatoriamente.
    
    // Na verdade, o código anterior (Step 58) removia eles de 'availableSlots' ao distribuir.
    // Se não distribuirmos aqui, eles ficarão 'null' no finalParticipants?
    // SIM.
    
    // Então se enableTeamSeparation for FALSE, precisamos distribuir esses atletas aleatoriamente.
    // Vamos coletar todos os atletas de todos os times e tratar como solitários.
    
    const allTeamAthletes: Athlete[] = [];
    teams.forEach(t => allTeamAthletes.push(...t.athletes));
    
    // Adicionar aos solitários para serem processados no passo 2
    solitaryAthletes.push(...allTeamAthletes);
    // Mas 'solitaryAthletes' já foi preenchido com atletas de times de tamanho 1.
    // E 'teams' tem times de tamanho > 1.
    // Então, ao jogar tudo em solitaryAthletes, o passo 2 vai cuidar de tudo.
  }

  // 2. Distribuir Solitários (aleatoriamente nos slots restantes)
  shuffleArray(solitaryAthletes, rng);
  solitaryAthletes.forEach(athlete => {
    // Re-embaralhar availableSlots para cada inserção ou apenas pegar random?
    // Shuffle inicial já garante aleatoriedade, mas vamos embaralhar availableSlots uma vez antes de preencher
    // Na verdade, shuffleArray(availableSlots, rng) antes desse loop seria o ideal.
    if (availableSlots.length > 0) {
        // Embaralhar a cada iteração é custoso mas garante max randomness, mas um shuffle antes é O(N).
        // Vamos fazer um swap aleatório para pegar um slot.
        const randIndex = Math.floor(rng() * availableSlots.length);
        const slot = availableSlots[randIndex];
        finalParticipants[slot] = athlete;
        availableSlots.splice(randIndex, 1);
    }
  });

  // 3. Preencher restantes com BYE
  for (let i = 0; i < bracketSize; i++) {
    if (finalParticipants[i] === null) {
      finalParticipants[i] = 'BYE';
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