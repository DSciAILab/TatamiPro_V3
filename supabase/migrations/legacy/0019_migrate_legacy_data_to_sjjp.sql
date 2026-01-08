-- Migration script to copy data from legacy tables to new 'sjjp_' prefixed tables

-- 1. Clubs
INSERT INTO public.sjjp_clubs (id, name, created_at)
SELECT id, name, created_at FROM public.clubs
ON CONFLICT (id) DO NOTHING;

-- 2. Profiles (Users)
-- Note: 'profiles' usually matches auth.users, so conflicts might exist if system created new ones.
INSERT INTO public.sjjp_profiles (id, first_name, last_name, role, club, avatar_url, username, phone, must_change_password)
SELECT id, first_name, last_name, role, club, avatar_url, username, phone, must_change_password FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- 3. Events
INSERT INTO public.sjjp_events (
  id, user_id, name, description, status, event_date, is_active, 
  champion_points, runner_up_points, third_place_points, 
  count_single_club_categories, count_walkover_single_fight_categories, 
  mat_assignments, brackets, mat_fight_order, 
  is_belt_grouping_enabled, is_overweight_auto_move_enabled, include_third_place, 
  is_attendance_mandatory_before_check_in, is_weight_check_enabled, check_in_scan_mode, 
  num_fight_areas, age_division_settings, check_in_start_time, check_in_end_time, created_at
)
SELECT 
  id, user_id, name, description, status, event_date, is_active, 
  champion_points, runner_up_points, third_place_points, 
  count_single_club_categories, count_walkover_single_fight_categories, 
  mat_assignments, brackets, mat_fight_order, 
  is_belt_grouping_enabled, is_overweight_auto_move_enabled, include_third_place, 
  is_attendance_mandatory_before_check_in, is_weight_check_enabled, check_in_scan_mode, 
  num_fight_areas, age_division_settings, check_in_start_time, check_in_end_time, created_at
FROM public.events
ON CONFLICT (id) DO NOTHING;

-- 4. Divisions
INSERT INTO public.sjjp_divisions (
  id, event_id, name, min_age, max_age, max_weight, gender, belt, 
  age_category_name, is_enabled, created_at
)
SELECT 
  id, event_id, name, min_age, max_age, max_weight, gender, belt, 
  age_category_name, is_enabled, created_at
FROM public.divisions
ON CONFLICT (id) DO NOTHING;

-- 5. Athletes
INSERT INTO public.sjjp_athletes (
  id, event_id, user_id, registration_qr_code_id, photo_url, 
  first_name, last_name, date_of_birth, age, club, gender, belt, weight, nationality, 
  age_division, weight_division, email, phone, emirates_id, school_id, 
  emirates_id_front_url, emirates_id_back_url, signature_url, 
  consent_accepted, consent_date, consent_version, payment_proof_url, 
  registration_status, check_in_status, registered_weight, weight_attempts, 
  attendance_status, moved_to_division_id, move_reason, seed, created_at
)
SELECT 
  id, event_id, user_id, registration_qr_code_id, photo_url, 
  first_name, last_name, date_of_birth, age, club, gender, belt, weight, nationality, 
  age_division, weight_division, email, phone, emirates_id, school_id, 
  emirates_id_front_url, emirates_id_back_url, signature_url, 
  consent_accepted, consent_date, consent_version, payment_proof_url, 
  registration_status, check_in_status, registered_weight, weight_attempts, 
  attendance_status, moved_to_division_id, move_reason, seed, created_at
FROM public.athletes
ON CONFLICT (id) DO NOTHING;

-- 6. Event Staff
INSERT INTO public.sjjp_event_staff (id, event_id, user_id, role, created_at)
SELECT id, event_id, user_id, role, created_at FROM public.event_staff
ON CONFLICT (id) DO NOTHING;

-- 7. Authenticators
INSERT INTO public.sjjp_user_authenticators (id, user_id, credential_id, credential_public_key, counter, transports, friendly_name, created_at)
SELECT id, user_id, credential_id, credential_public_key, counter, transports, friendly_name, created_at FROM public.user_authenticators
ON CONFLICT (id) DO NOTHING;
