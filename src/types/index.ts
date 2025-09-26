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
}