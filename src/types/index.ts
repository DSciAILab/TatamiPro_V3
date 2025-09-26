export interface WeightAttempt {
  weight: number;
  timestamp: Date;
  status: 'checked_in' | 'overweight';
}

export interface Athlete {
  id: string;
  eventId: string; // Adicionado: ID do evento ao qual o atleta está inscrito
  photoUrl?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number; // Calculated
  club: string;
  gender: 'Masculino' | 'Feminino' | 'Outro';
  belt: 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
  weight: number; // in kg (peso de inscrição)
  nationality: string; // Novo: Nacionalidade do atleta
  ageDivision: string; // Novo: Divisão de idade calculada
  weightDivision: string; // Novo: Divisão de peso calculada
  email: string;
  phone: string; // E.164 format
  emiratesId?: string;
  schoolId?: string;
  signatureUrl?: string;
  consentAccepted: boolean;
  consentDate: Date;
  consentVersion: string;
  paymentProofUrl?: string; // Novo: URL do comprovante de pagamento
  registrationStatus: 'under_approval' | 'approved' | 'rejected'; // Novo: Status da inscrição
  checkInStatus: 'pending' | 'checked_in' | 'overweight'; // Novo: Status do check-in
  registeredWeight?: number; // Novo: Último peso registrado no check-in
  weightAttempts: WeightAttempt[]; // Novo: Log de tentativas de pesagem
}

export interface Division {
  id: string;
  name: string; // Nome completo da divisão, ex: "Adulto Masculino Faixa Azul Peso Pena"
  minAge: number;
  maxAge: number;
  minWeight: number;
  maxWeight: number;
  gender: 'Masculino' | 'Feminino' | 'Ambos';
  belt: 'Branca' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta' | 'Todas';
  ageCategoryName: string; // Nome público da categoria de idade, ex: "Adulto", "Juvenil"
  isEnabled: boolean; // Para habilitar/desabilitar no evento
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
}