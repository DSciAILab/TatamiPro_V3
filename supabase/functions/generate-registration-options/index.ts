import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@10.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Dynamically determine RP ID and origin from the request
    const origin = req.headers.get('origin');
    if (!origin) {
      throw new Error('Origin header is missing');
    }
    const url = new URL(origin);
    const rpID = url.hostname;
    const rpName = 'TatamiPro';

    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not found');
    }

    const { data: existingAuthenticators, error: dbError } = await supabaseClient
      .from('user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id,
      userName: user.email!,
      authenticatorSelection: {
        residentKey: 'discouraged',
      },
      excludeCredentials: existingAuthenticators.map(auth => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports as any,
      })),
    });

    await supabaseClient.auth.updateUser({
      data: {
        currentChallenge: options.challenge,
      },
    });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});