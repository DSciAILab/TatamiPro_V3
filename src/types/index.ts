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
  weight: number; // in kg
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
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: 'Aberto' | 'Fechado';
  date: string;
  athletes: Athlete[];
}