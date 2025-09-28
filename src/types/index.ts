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

export interface Division {
  id: string;
  event_id?: string; // Added for linking to an event
  name: string;
  min_age: number;
  max_age: number;
  max_weight: number;
  gender: DivisionGender;
  belt: DivisionBelt;
  age_category_name: AgeCategory;
  is_enabled: boolean;
}

export interface Athlete {
  id: string;
  event_id: string;
  user_id?: string;
  registration_qr_code_id?: string;
  photo_url?: string;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  age: number;
  club: string;
  gender: Gender;
  belt: Belt;
  weight: number;
  nationality: string;
  age_division: AgeCategory;
  weight_division: string;
  email: string;
  phone: string;
  emirates_id?: string;
  school_id?: string;
  emirates_id_front_url?: string;
  emirates_id_back_url?: string;
  signature_url?: string;
  consent_accepted: boolean;
  consent_date: Date;
  consent_version: string;
  payment_proof_url?: string;
  registration_status: 'under_approval' | 'approved' | 'rejected';
  check_in_status: 'pending' | 'checked_in' | 'overweight';
  registered_weight?: number;
  weight_attempts: WeightAttempt[];
  attendance_status: 'pending' | 'present' | 'absent' | 'private_transportation';
  moved_to_division_id?: string;
  move_reason?: string;
  _division?: Division;
  seed?: number;
}

export type FightResultType = 'submission' | 'points' | 'decision' | 'disqualification' | 'walkover';

export interface Match {
  id: string;
  round: number;
  match_number: number;
  mat_fight_number?: number;
  fighter1_id: string | 'BYE' | undefined;
  fighter2_id: string | 'BYE' | undefined;
  winner_id?: string;
  loser_id?: string;
  next_match_id?: string;
  prev_match_ids?: [string | undefined, string | undefined];
  result?: {
    type: FightResultType;
    winner_id: string;
    loser_id: string;
    details?: string;
  };
  _division_id?: string;
  _mat_name?: string;
}

export interface Bracket {
  id: string;
  division_id: string;
  rounds: Match[][];
  third_place_match?: Match;
  bracket_size: number;
  participants: (Athlete | 'BYE')[];
  finalists?: [string, string];
  winner_id?: string;
  runner_up_id?: string;
  third_place_winner_id?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: 'Aberto' | 'Fechado';
  date: string;
  athletes: Athlete[];
  divisions: Division[];
  // DB fields
  check_in_start_time?: Date;
  check_in_end_time?: Date;
  num_fight_areas?: number;
  is_attendance_mandatory_before_check_in?: boolean;
  is_weight_check_enabled?: boolean;
  check_in_scan_mode?: 'qr' | 'barcode' | 'none';
  mat_assignments?: Record<string, string[]>;
  is_belt_grouping_enabled?: boolean;
  is_overweight_auto_move_enabled?: boolean;
  brackets?: Record<string, Bracket>;
  mat_fight_order?: Record<string, string[]>;
  include_third_place?: boolean;
  is_active: boolean;
  champion_points: number;
  runner_up_points: number;
  third_place_points: number;
  count_single_club_categories: boolean;
  count_walkover_single_fight_categories: boolean;
}