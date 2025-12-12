// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@13.2.1';

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
    const body = await req.json().catch(() => ({}));
    const { identifier, credential } = body;
    
    if (!identifier || !credential) throw new Error('Identifier and credential are required');

    const origin = req.headers.get('origin')!;
    const rpID = new URL(origin).hostname;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let user;
    const isEmail = identifier.includes('@');

    if (isEmail) {
      const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (userError) throw userError;
      user = users.find((u: any) => u.email?.toLowerCase() === identifier.toLowerCase());
    } else {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', identifier)
        .single();
      
      if (profileError || !profile) {
        throw new Error('User not found with that username.');
      }

      const { data: { user: userById }, error: userByIdError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      if (userByIdError) throw userByIdError;
      user = userById;
    }

    if (!user) throw new Error('User not found');

    const { data: authenticator } = await supabaseAdmin
      .from('user_authenticators')
      .select('*')
      .eq('credential_id', credential.id)
      .single();

    if (!authenticator) throw new Error('Authenticator not found or not associated with this credential');

    const expectedChallenge = user.user_metadata.currentChallenge;
    if (!expectedChallenge) throw new Error('No authentication challenge found for user');
    
    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: authenticator.credential_id,
        credentialPublicKey: new Uint8Array(authenticator.public_key),
        counter: authenticator.counter,
        transports: authenticator.transports,
      },
    });

    const { verified, authenticationInfo } = verification;

    if (verified && authenticationInfo) {
      await supabaseAdmin
        .from('user_authenticators')
        .update({ counter: authenticationInfo.newCounter })
        .eq('credential_id', credential.id);

      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        user_metadata: { ...user.user_metadata, currentChallenge: null },
      });

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: user.email!,
      });

      if (linkError) throw linkError;

      const actionLink = linkData.properties?.action_link;
      let token = '';
      
      if (actionLink) {
        const url = new URL(actionLink);
        token = url.searchParams.get('token') || '';
      }

      if (!token) throw new Error('Failed to generate session token');

      return new Response(JSON.stringify({ verified: true, token, email: user.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Verification failed');

  } catch (error: any) {
    console.error("Error in verify-authentication:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});