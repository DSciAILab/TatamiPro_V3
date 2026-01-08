// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@13.2.1';

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
    const origin = req.headers.get('origin');
    if (!origin) {
      throw new Error('Origin header is missing');
    }
    const url = new URL(origin);
    const rpID = url.hostname;
    const rpName = 'TatamiPro';

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        throw new Error('Missing Authorization header');
    }

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
      .from('sjjp_user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (dbError) throw dbError;

    // Convert string ID to byte array for the library if needed, 
    // but the library handles string IDs for exclusion usually.
    // We pass what we have.
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: user.id, // v13 accepts string
      userName: user.email!,
      authenticatorSelection: {
        residentKey: 'preferred', // Changed to preferred for better compatibility
        userVerification: 'preferred',
      },
      excludeCredentials: existingAuthenticators?.map((auth: any) => ({
        id: auth.credential_id,
        // Optional in some versions, but good to have if stored
        transports: auth.transports, 
      })),
    });

    // Save challenge
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, currentChallenge: options.challenge },
    });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error in generate-registration-options:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});