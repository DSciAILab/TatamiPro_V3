export interface Athlete {
  id: string;
  eventId: string; // Adicionado: eventId é necessário para associar o atleta a um evento
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
}

export interface Match {
  id: string;
  round: number;
  matchNumber: number;
  fighter1?: Athlete | 'BYE';
  fighter2?: Athlete | 'BYE';
  winnerId?: string; // Athlete ID or 'BYE'
  nextMatchId?: string;
  prevMatch1Id?: string;
  prevMatch2Id?: string;
}

export interface Bracket {
  divisionId: string;
  matches: Match[];
  thirdPlaceMatch?: Match;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: 'Aberto' | 'Fechado';
  date: string;
  athletes: Athlete[];
  brackets?: Bracket[]; // Adicionado para armazenar os brackets gerados
}