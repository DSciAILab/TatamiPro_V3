// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple Regex for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { 
      eventId, 
      firstName, 
      lastName, 
      email, 
      phone, 
      dateOfBirth, 
      divisionId,
      club,
      gender,
      belt,
      weight
    } = body;

    // --- Strict Validation ---
    if (!eventId || typeof eventId !== 'string') throw new Error("Event ID is missing or invalid.");
    if (!firstName || firstName.length < 2) throw new Error("First name is too short.");
    if (!lastName || lastName.length < 2) throw new Error("Last name is too short.");
    if (!email || !EMAIL_REGEX.test(email)) throw new Error("Invalid email format.");
    if (!phone || !PHONE_REGEX.test(phone)) throw new Error("Invalid phone format.");
    if (!dateOfBirth || isNaN(Date.parse(dateOfBirth))) throw new Error("Invalid date of birth.");
    if (!divisionId || typeof divisionId !== 'string') throw new Error("Division ID is missing.");
    if (!weight || weight < 1 || weight > 300) throw new Error("Invalid weight.");

    // Check if event exists and is active
    const { data: eventData, error: eventError } = await supabaseAdmin
      .from('events')
      .select('app_id, is_active')
      .eq('id', eventId)
      .single();

    if (eventError || !eventData) throw new Error("Event not found.");
    if (!eventData.is_active) throw new Error("Registration for this event is closed.");

    // Check Division
    const { data: division, error: divError } = await supabaseAdmin
      .from('divisions')
      .select('*')
      .eq('id', divisionId)
      .single();

    if (divError || !division) {
      throw new Error("Invalid division selected.");
    }

    // Duplicate Check (Simple prevention of spam)
    const { count } = await supabaseAdmin
      .from('athletes')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('email', email);
    
    if (count && count > 0) {
      // Allow re-registration? Typically no, update instead. For now, block.
      throw new Error("This email is already registered for this event.");
    }

    // Calculate Age
    const dob = new Date(dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    const athleteId = crypto.randomUUID();

    const newAthlete = {
      id: athleteId,
      event_id: eventId,
      app_id: eventData.app_id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      date_of_birth: dateOfBirth,
      age: age,
      club: club ? club.trim() : 'Sem Equipe',
      gender: gender || division.gender, 
      belt: belt || division.belt,
      weight: weight,
      nationality: 'BR', // Default
      
      // Computed Fields
      age_division: division.age_category_name,
      weight_division: `${division.max_weight}kg`,
      registration_qr_code_id: `EV_${eventId}_ATH_${athleteId}`,
      registration_status: 'under_approval',
      check_in_status: 'pending',
      attendance_status: 'pending',
      consent_accepted: true,
      consent_date: new Date().toISOString(),
      consent_version: '1.0 public'
    };

    const { error: insertError } = await supabaseAdmin.from('athletes').insert(newAthlete);

    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, athleteId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in public-register-athlete:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});