// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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
    } = await req.json();

    if (!eventId || !firstName || !lastName || !email || !dateOfBirth || !divisionId) {
      throw new Error("Campos obrigatórios faltando.");
    }

    // Buscar detalhes da divisão selecionada para preencher os dados redundantes do atleta
    const { data: division, error: divError } = await supabaseAdmin
      .from('divisions')
      .select('*')
      .eq('id', divisionId)
      .single();

    if (divError || !division) {
      throw new Error("Divisão selecionada inválida.");
    }

    // Calcular idade
    const dob = new Date(dateOfBirth);
    const age = new Date().getFullYear() - dob.getFullYear();
    const athleteId = crypto.randomUUID();

    // Buscar App ID do evento
    const { data: eventData } = await supabaseAdmin.from('events').select('app_id').eq('id', eventId).single();
    const appId = eventData?.app_id;

    const newAthlete = {
      id: athleteId,
      event_id: eventId,
      app_id: appId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      date_of_birth: dateOfBirth,
      age: age,
      // Usar dados da divisão se o usuário não forneceu (dropdown simplificado) ou o que veio do form
      club: club || 'Sem Equipe',
      gender: gender || division.gender, 
      belt: belt || division.belt,
      weight: weight || 0, // Peso pode ser verificado no check-in
      nationality: 'BR', // Default, pode adicionar campo se quiser
      
      // Campos calculados/sistema
      age_division: division.age_category_name,
      weight_division: `${division.max_weight}kg`,
      registration_qr_code_id: `EV_${eventId}_ATH_${athleteId}`,
      registration_status: 'under_approval', // SEMPRE entra como pendente
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