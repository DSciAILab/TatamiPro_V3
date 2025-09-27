export interface WeightAttempt {
  weight: number;
  timestamp: Date;
  status: 'checked_in' | 'overweight';
}

export type Belt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type DivisionGender = 'Masculino' | 'Feminino' | 'Ambos';
export type DivisionBelt = Belt | 'Todas';
export type AgeCategory = 'Kids 1' | 'Kids 2' | 'Kids 3' | 'Infant' | 'Junior' | 'Teen' | 'Juvenile' | 'Adult' | 'Master' | 'Indefinido';

// NOVO: Interface para Divisão
export interface Division {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
  maxWeight: number;
  gender: DivisionGender;
  belt: DivisionBelt;
  ageCategoryName: AgeCategory;
  isEnabled: boolean;
}

export interface Athlete {
  id: string;
  eventId: string; // Adicionado: ID do evento ao qual o atleta está inscrito
  registrationQrCodeId?: string; // NOVO: ID único para o QR Code da inscrição
  photoUrl?: string; // Novo: URL da foto de perfil do atleta
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number; // Calculated
  club: string;
  gender: Gender;
  belt: Belt;
  weight: number; // in kg (peso de inscrição)
  nationality: string; // Novo: Nacionalidade do atleta
  ageDivision: AgeCategory; // Novo: Divisão de idade calculada
  weightDivision: string; // Novo: Divisão de peso calculada
  email: string;
  phone: string; // E.164 format
  emiratesId?: string;
  schoolId?: string;
  emiratesIdFrontUrl?: string; // Novo: URL da foto da frente do Emirates ID
  emiratesIdBackUrl?: string; // Novo: URL da foto do verso do Emirates ID
  signatureUrl?: string;
  consentAccepted: boolean;
  consentDate: Date;
  consentVersion: string;
  paymentProofUrl?: string; // Novo: URL do comprovante de pagamento
  registrationStatus: 'under_approval' | 'approved' | 'rejected'; // Novo: Status da inscrição
  checkInStatus: 'pending' | 'checked_in' | 'overweight'; // Novo: Status do check-in
  registeredWeight?: number; // Novo: Último peso registrado no check-in
  weightAttempts: WeightAttempt[]; // Novo: Log de tentativas de pesagem
  attendanceStatus: 'pending' | 'present' | 'absent' | 'private_transportation'; // Novo: Status de presença
  // NOVO: Propriedades para registrar movimentação por excesso de peso
  movedToDivisionId?: string;
  moveReason?: string;
  _division?: Division; // Adicionado para facilitar o acesso à divisão no frontend
  seed?: number; // NOVO: Propriedade para o seed do atleta
}

export type FightResultType = 'submission' | 'points' | 'decision' | 'disqualification' | 'walkover';

export interface Match {
  id: string;
  round: number; // 1 para a primeira rodada, 2 para a segunda, etc.
  matchNumber: number; // Número da luta dentro da rodada (por rodada)
  matFightNumber?: number; // NOVO: Número sequencial da luta dentro de um mat específico
  fighter1Id: string | 'BYE' | undefined; // ID do atleta 1 ou 'BYE'
  fighter2Id: string | 'BYE' | undefined; // ID do atleta 2 ou 'BYE'
  winnerId?: string; // ID do vencedor
  loserId?: string; // ID do perdedor
  nextMatchId?: string; // ID da próxima luta para onde o vencedor avança
  prevMatchIds?: [string | undefined, string | undefined]; // IDs das lutas anteriores que alimentam esta luta
  result?: { // NOVO: Detalhes do resultado da luta
    type: FightResultType;
    winnerId: string;
    loserId: string;
    details?: string; // Ex: "Pontos: 6-2", "Finalização: Armlock"
  };
  _divisionId?: string; // NOVO: Para facilitar o acesso à divisão da luta
  _matName?: string; // NOVO: Para facilitar o acesso ao mat da luta
}

export interface Bracket {
  id: string; // ID único do bracket (geralmente divisionId)
  divisionId: string;
  rounds: Match[][]; // Array de rodadas, onde cada rodada é um array de lutas
  thirdPlaceMatch?: Match; // Luta pelo terceiro lugar, se houver
  bracketSize: number; // Tamanho total do bracket (próxima potência de 2)
  participants: (Athlete | 'BYE')[]; // Lista final de participantes (incluindo BYEs) na ordem do bracket
  finalists?: [string, string]; // IDs dos finalistas
  winnerId?: string; // ID do campeão
  runnerUpId?: string; // ID do vice-campeão
  thirdPlaceWinnerId?: string; // ID do 3º lugar
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: 'Aberto' | 'Fechado';
  date: string;
  athletes: Athlete[];
  checkInStartTime?: string; // Novo: Horário de início do check-in (ISO string)
  checkInEndTime?: string; // Novo: Horário de término do check-in (ISO string)
  numFightAreas?: number; // Novo: Número de áreas de luta
  divisions: Division[]; // Novo: Divisões configuradas para o evento
  isAttendanceMandatoryBeforeCheckIn?: boolean; // NOVO: Se a presença é obrigatória antes do check-in
  isWeightCheckEnabled?: boolean; // NOVO: Se a verificação de peso está habilitada no check-in
  checkInScanMode?: 'qr' | 'barcode' | 'none'; // NOVO: Modo de escaneamento para check-in
  matAssignments?: Record<string, string[]>; // NOVO: Atribuições de categorias aos mats
  isBeltGroupingEnabled?: boolean; // NOVO: Se o agrupamento de categorias considera a faixa
  isOverweightAutoMoveEnabled?: boolean; // NOVO: Se a movimentação automática por excesso de peso está habilitada
  brackets?: Record<string, Bracket>; // NOVO: Brackets gerados para cada divisão
  matFightOrder?: Record<string, string[]>; // NOVO: Ordem sequencial das lutas por mat
  includeThirdPlace?: boolean; // NOVO: Se a luta pelo 3º lugar está habilitada
  isActive: boolean; // NOVO: Se o evento está ativo ou inativo
  championPoints: number; // NOVO: Pontos para o campeão
  runnerUpPoints: number; // NOVO: Pontos para o vice-campeão
  thirdPlacePoints: number; // NOVO: Pontos para o terceiro lugar
  countSingleClubCategories: boolean; // NOVO: Se categorias com apenas uma escola contam pontos
  countWalkoverSingleFightCategories: boolean; // NOVO: Se W.O. em lutas únicas entre escolas diferentes contam pontos
}