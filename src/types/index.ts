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
  registeredWeight?: number; // Novo: Peso registrado no check-in
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
}