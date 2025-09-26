export type Gender = 'Masculino' | 'Feminino';
export type AthleteBelt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
export type DivisionBelt = AthleteBelt | 'Todas';
export type AgeCategory = 'Kids' | 'Juvenile' | 'Adult' | 'Master 1' | 'Master 2' | 'Master 3' | 'Master 4' | 'Master 5' | 'Master 6' | 'Master 7';
export type DivisionGender = Gender | 'Ambos';

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  gender: Gender; // Usar o tipo Gender exportado
  nationality: string;
  belt: AthleteBelt; // Usar o tipo AthleteBelt exportado
  weight: number; // Peso declarado pelo atleta
  club: string;
  email: string;
  phone: string;
  idNumber: string; // Emirates ID ou School ID
  photoUrl?: string;
  consentDate: Date;
  ageDivision: string;
  weightDivision: string;
  registrationStatus: 'under_approval' | 'approved' | 'rejected';
  checkInStatus: 'pending' | 'checked_in' | 'overweight';
  registeredWeight?: number; // Peso registrado no check-in
  weightAttempts: WeightAttempt[];
  paymentProofUrl?: string;
  attendanceStatus: 'pending' | 'present' | 'absent' | 'private_transportation'; // Novo status de presença
  _division?: Division; // Propriedade temporária para armazenar a divisão encontrada
  emiratesId?: string; // Adicionado
  schoolId?: string; // Adicionado
  emiratesIdFrontUrl?: string; // Adicionado
  emiratesIdBackUrl?: string; // Adicionado
}

export interface WeightAttempt {
  weight: number;
  timestamp: Date;
  status: 'success' | 'fail'; // Status específico para a tentativa de peso
}

export interface Division {
  id: string;
  name: string;
  minAge: number;
  maxAge: number;
  minWeight: number;
  maxWeight: number;
  gender: DivisionGender; // Usar o tipo DivisionGender exportado
  belt: DivisionBelt; // Usar o tipo DivisionBelt exportado
  isEnabled: boolean; // Adicionado
  ageCategoryName: AgeCategory; // Adicionado
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: 'Aberto' | 'Fechado' | 'Concluído';
  date: string;
  athletes: Athlete[];
  divisions: Division[];
  checkInStartTime?: string;
  checkInEndTime?: string;
  numFightAreas?: number;
  isAttendanceMandatoryBeforeCheckIn?: boolean;
}

export interface User {
  id: string;
  email: string;
  password?: string; // Apenas para mock, não em produção real
  role: 'admin' | 'coach' | 'staff' | 'athlete';
  club?: string;
  isActive: boolean;
  name: string; // Nome para exibição
}