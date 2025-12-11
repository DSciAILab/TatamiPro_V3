// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@10.0.0';

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
    const { email, credential } = await req.json();
    const origin = req.headers.get('origin')!;
    const rpID = new URL(origin).hostname;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get User
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) throw new Error('User not found');

    // 2. Get Authenticator
    const { data: authenticator } = await supabaseAdmin
      .from('user_authenticators')
      .select('*')
      .eq('credential_id', credential.id)
      .single();

    if (!authenticator) throw new Error('Authenticator not found');

    // 3. Verify
    const expectedChallenge = user.user_metadata.currentChallenge;
    
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: new Uint8Array(authenticator.public_key), // Convert back to Uint8Array
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      // Update counter
      await supabaseAdmin
        .from('user_authenticators')
        .update({ counter: authenticationInfo.newCounter })
        .eq('credential_id', credential.id);

      // Clear challenge
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, currentChallenge: null },
      });

      // 4. GENERATE SESSION
      // We generate a Magic Link, but extract the token so the client can use it immediately
      // effectively logging them in without clicking an email.
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
      });

      if (linkError) throw linkError;

      // The link looks like: http://.../verify?token=XYZ&type=magiclink...
      // We need to extract XYZ.
      const actionLink = linkData.properties?.action_link;
      let token = '';
      
      if (actionLink) {
        const url = new URL(actionLink);
        // Supabase usually puts the token in the query param 'token' or inside the hash for implicit flows
        // For generateLink, it is usually a query param named 'token' or 'hashed_token' depending on version.
        // It's safest to look for 'token'.
        token = url.searchParams.get('token') || '';
      }

      if (!token) throw new Error('Failed to generate session token');

      return new Response(JSON.stringify({ verified: true, token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Verification failed');

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});