export interface WeightAttempt {
  weight: number;
  timestamp: Date;
  status: 'checked_in' | 'overweight';
}

export type Belt = 'Branca' | 'Cinza' | 'Amarela' | 'Laranja' | 'Verde' | 'Azul' | 'Roxa' | 'Marrom' | 'Preta';
export type Gender = 'Masculino' | 'Feminino' | 'Outro';
export type DivisionGender = 'Masculino' | 'Feminino' | 'Ambos';
export type DivisionBelt = Belt | 'Todas';
export type AgeCategory = string;

export interface AgeDivisionSetting {
  id: string;
  name: string;
  min_age: number;
  fight_duration: number; // in minutes
}

export interface Division {
  id: string;
  event_id?: string;
  name: string;
  min_age: number;
  max_age: number;
  max_weight: number;
  gender: DivisionGender;
  belt: DivisionBelt;
  age_category_name: AgeCategory;
  is_enabled: boolean;
  match_duration?: number;
}

export interface Athlete {
  id: string;
  event_id: string;
  user_id?: string | null;
  registration_qr_code_id?: string | null;
  photo_url?: string | null;
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
  emirates_id?: string | null;
  school_id?: string | null;
  emirates_id_front_url?: string | null;
  emirates_id_back_url?: string | null;
  signature_url?: string | null;
  consent_accepted: boolean;
  consent_date: Date;
  consent_version: string;
  payment_proof_url?: string | null;
  registration_status: 'under_approval' | 'approved' | 'rejected';
  check_in_status: 'pending' | 'checked_in' | 'overweight';
  registered_weight?: number | null;
  weight_attempts: WeightAttempt[];
  attendance_status: 'pending' | 'present' | 'absent' | 'private_transportation';
  moved_to_division_id?: string | null;
  move_reason?: string | null;
  _division?: Division;
  seed?: number | null;
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
  group_name?: string; // e.g. "Group A"
  attendance?: Record<string, {
      status: 'present' | 'on_hold' | 'missing';
      last_updated: string; // ISO timestamp
  }>;
}

export type BracketAttendanceStatus = 'present' | 'on_hold' | 'missing';

export interface CheckInConfig {
  mandatoryFields?: Record<string, boolean>;
  printSettings?: {
    orientation: 'portrait' | 'landscape';
    fontSize: 'small' | 'medium' | 'large';
  };
}

export interface Event {
  id: string;
  name: string;
  description: string;
  status: string;
  event_date: string;
  athletes?: Athlete[];
  divisions?: Division[];
  age_division_settings?: AgeDivisionSetting[];
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
  count_wo_champion_categories: boolean;
  check_in_config?: CheckInConfig; // New field for JSON config
  // Bracket splitting configuration
  max_athletes_per_bracket?: number;
  is_bracket_splitting_enabled?: boolean;
  // Check-in control
  is_check_in_open?: boolean;
  check_in_enabled_start?: string;
  check_in_enabled_end?: string;
  // Bracket settings
  enable_team_separation?: boolean;
  // Lead capture for public pages
  is_lead_capture_enabled?: boolean;
  // Auto-approve registrations
  is_auto_approve_registrations_enabled?: boolean;
  // Dynamic UI theme
  theme?: string;
}

export interface EventLead {
  id: string;
  event_id: string;
  name: string;
  email?: string;
  phone?: string;
  created_at: Date;
}

// ============================================================
// PARTIAL TYPES (for optimized SELECT queries)
// Use these for list views where full Event/Athlete data is not needed
// ============================================================

/** Minimal event data for list views (Events.tsx) */
export interface EventListItem {
  id: string;
  name: string;
  description?: string;
  status: string;
  event_date: string;
  is_active: boolean;
}

/** Minimal athlete data for public list views */
export interface AthleteListItem {
  id: string;
  first_name: string;
  last_name: string;
  club: string;
  belt: Belt;
  age_division: string;
  weight_division: string;
  registration_status: 'under_approval' | 'approved' | 'rejected';
}

/** Athlete data for bracket display (excludes sensitive info) */
export interface AthleteBracketItem extends AthleteListItem {
  seed?: number | null;
  photo_url?: string | null;
}