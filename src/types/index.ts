export type Gender = 'Male' | 'Female'; // Alterado para inglês
export type DivisionGender = Gender | 'Both'; // Alterado para inglês
export type AthleteBelt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
export type DivisionBelt = AthleteBelt | 'Todas'; // Novo tipo para faixa de divisão
export type AgeCategory = 'Kids I' | 'Kids II' | 'Kids III' | 'Junior' | 'Teen' | 'Juvenile' | 'Adult' | 'Master 1' | 'Master 2' | 'Master 3' | 'Master 4' | 'Master 5' | 'Master 6' | 'Master 7'; // Novo tipo para categorias de idade

export type RegistrationStatus = 'pending' | 'under_approval' | 'approved' | 'rejected';
export type CheckInStatus = 'pending' | 'checked_in' | 'missed' | 'overweight'; // Adicionado 'overweight'
export type AttendanceStatus = 'pending' | 'present' | 'absent' | 'private_transportation'; // Adicionado 'private_transportation'
export type UserRole = 'admin' | 'coach' | 'staff' | 'athlete';

export interface User {
  id: string;
  email: string;
  password?: string; // Senha é opcional para evitar passar em todos os lugares
  name: string;
  role: UserRole;
  club?: string;
  isActive: boolean;
}

export interface WeightAttempt { // Nova interface para tentativas de pesagem
  timestamp: Date;
  weight: number;
  success: boolean;
}

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  age: number;
  ageDivision: string;
  gender: Gender;
  nationality: string;
  belt: AthleteBelt;
  weight: number;
  weightDivision: string;
  club: string;
  email: string;
  phone: string;
  idNumber: string; // RG, CPF, Passaporte, etc.
  emiratesId?: string;
  schoolId?: string;
  photoUrl?: string;
  emiratesIdFrontUrl?: string;
  emiratesIdBackUrl?: string;
  paymentProofUrl?: string;
  consentDate: Date;
  registrationStatus: RegistrationStatus;
  checkInStatus: CheckInStatus;
  weightAttempts: WeightAttempt[]; // Usando nova interface WeightAttempt
  attendanceStatus: AttendanceStatus;
  eventId?: string; // Opcional, para associar a um evento específico
  divisionId?: string; // Opcional, para associar a uma divisão específica
  registeredWeight?: number; // Adicionado registeredWeight
  _division?: Division; // Propriedade temporária para exibição
}

export interface Event {
  id: string;
  name: string;
  date: Date;
  location: string; // Adicionado
  registrationOpenDate: Date; // Adicionado
  registrationCloseDate: Date; // Adicionado
  status: 'upcoming' | 'open' | 'closed' | 'completed';
  description?: string;
  posterUrl?: string;
  rulesUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  organizerInfo?: string;
  maxAthletes?: number;
  currentAthletesCount?: number;
  pricePerAthlete?: number;
  currency?: string;
  athletes: Athlete[]; // Adicionado athletes
  divisions: Division[]; // Adicionado divisions
  checkInStartTime?: string; // Armazenado como string, analisado para Date no componente
  checkInEndTime?: string; // Armazenado como string, analisado para Date no componente
  numFightAreas?: number;
  isAttendanceMandatoryBeforeCheckIn?: boolean;
}

export interface Division {
  id: string;
  eventId: string;
  name: string;
  gender: DivisionGender; // Alterado para DivisionGender
  minAge: number;
  maxAge: number;
  ageCategoryName: AgeCategory; // Adicionado ageCategoryName
  minWeight: number;
  maxWeight: number;
  belt: DivisionBelt; // Alterado para DivisionBelt
  isNoGi: boolean;
  isEnabled: boolean; // Adicionado isEnabled
}