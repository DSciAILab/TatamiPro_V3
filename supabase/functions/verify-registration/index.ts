// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@13.2.1';

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

    const body = await req.json();
    const { credential, friendlyName } = body;

    if (!credential) {
        throw new Error('Credential missing in body');
    }

    const expectedChallenge = user.user_metadata.currentChallenge;

    if (!expectedChallenge) {
      throw new Error('Challenge not found for user. Please restart registration.');
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    const { verified, registrationInfo } = verification;

    if (verified && registrationInfo) {
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      // Need admin rights to insert into user_authenticators if RLS restricts it 
      // or to ensure we can write byte arrays properly if needed.
      // Usually RLS allows authenticated insert with their own user_id.
      // But let's use Admin client for reliability here as we are bypassing RLS checks for safety on server side logic often.
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { error: insertError } = await supabaseAdmin
        .from('sjjp_user_authenticators')
        .insert({
          user_id: user.id,
          credential_id: credentialID,
          public_key: Array.from(new Uint8Array(credentialPublicKey)), // Store as array for JSON compatibility
          counter,
          transports: credential.response.transports || [],
          friendly_name: friendlyName || 'Unknown Device',
        });

      if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
      }

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, currentChallenge: null },
      });
    }

    return new Response(JSON.stringify({ verified }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Error in verify-registration:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});