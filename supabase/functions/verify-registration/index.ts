import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@10.0.0';
import type { VerifiedRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@10.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const rpID = 'localhost';
const origin = `http://${rpID}:8080`;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not found');
    }

    const body = await req.json();
    const expectedChallenge = user.user_metadata.currentChallenge;

    if (!expectedChallenge) {
      throw new Error('Challenge not found for user');
    }

    const verification: VerifiedRegistrationResponse = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter, credentialDeviceType, credentialBackedUp } = registrationInfo;

      const { error: insertError } = await supabaseAdmin
        .from('user_authenticators')
        .insert({
          user_id: user.id,
          credential_id: credentialID,
          public_key: new Uint8Array(credentialPublicKey),
          counter,
          transports: body.credential.response.transports,
          friendly_name: body.friendlyName,
        });

      if (insertError) throw insertError;

      // Clear the challenge
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, currentChallenge: null },
      });
    }

    return new Response(JSON.stringify({ verified }), {
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