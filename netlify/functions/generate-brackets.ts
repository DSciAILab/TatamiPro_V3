import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Athlete, Match, Bracket } from '../../src/types'; // Caminho corrigido para os tipos

// Helper para obter a próxima potência de 2
const getNextPowerOf2 = (n: number): number => {
  if (n === 0) return 1;
  let p = 1;
  while (p < n) {
    p <<= 1;
  }
  return p;
};

// Lógica para gerar brackets
const generateBracketsLogic = (athletes: Athlete[], divisionId: string, options: { thirdPlace: boolean }): Bracket => {
  const numAthletes = athletes.length;
  const bracketSize = getNextPowerOf2(numAthletes);

  // Cria uma lista de participantes incluindo BYEs
  const participants: (Athlete | 'BYE')[] = [...athletes];
  while (participants.length < bracketSize) {
    participants.push('BYE');
  }

  // Embaralha os participantes. Para o MVP, um embaralhamento aleatório simples.
  // Uma implementação mais avançada lidaria com seeds e snake seeding.
  // Para evitar confrontos de mesma academia na primeira rodada, um algoritmo mais complexo com trocas seria necessário.
  // Por enquanto, apenas embaralhamos aleatoriamente.
  participants.sort(() => 0.5 - Math.random());

  const matches: Match[] = [];
  const firstRoundMatchesCount = bracketSize / 2;

  // Gera as lutas da primeira rodada
  for (let i = 0; i < firstRoundMatchesCount; i++) {
    const fighter1 = participants[i];
    const fighter2 = participants[i + firstRoundMatchesCount]; // Emparelhamento simples para a primeira rodada

    let winnerId: string | undefined;
    if (fighter1 === 'BYE' && fighter2 !== 'BYE') {
      winnerId = fighter2.id;
    } else if (fighter2 === 'BYE' && fighter1 !== 'BYE') {
      winnerId = fighter1.id;
    } else if (fighter1 === 'BYE' && fighter2 === 'BYE') {
      winnerId = 'BYE'; // Ambos BYE, esta luta é efetivamente um BYE
    }

    matches.push({
      id: `match-1-${i + 1}`,
      round: 1,
      matchNumber: i + 1,
      fighter1: fighter1,
      fighter2: fighter2,
      winnerId: winnerId,
      // nextMatchId e prevMatchIds seriam definidos em uma geração de bracket completa
    });
  }

  // Placeholder para gerar rodadas subsequentes e luta pelo 3º lugar
  // Para este MVP, retornaremos apenas a primeira rodada.
  // Uma implementação completa envolveria a criação recursiva de lutas para as rodadas superiores.

  const bracket: Bracket = {
    divisionId,
    matches,
  };

  if (options.thirdPlace) {
    // Placeholder para luta pelo 3º lugar
    bracket.thirdPlaceMatch = {
      id: 'third-place-match',
      round: -1, // Rodada especial para 3º lugar
      matchNumber: 1,
      fighter1: undefined,
      fighter2: undefined,
    };
  }

  return bracket;
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  try {
    const { athletes, divisionId, options } = JSON.parse(event.body || '{}');

    if (!athletes || !divisionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing required parameters: athletes, divisionId" }),
      };
    }

    const bracket = generateBracketsLogic(athletes, divisionId, options || { thirdPlace: false });

    return {
      statusCode: 200,
      body: JSON.stringify(bracket),
    };
  } catch (error: any) {
    console.error("Error generating brackets:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate brackets", error: error.message }),
    };
  }
};

export { handler };