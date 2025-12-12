// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateAuthenticationOptions as genOptionsV13 } from 'https://esm.sh/@simplewebauthn/server@13.2.1';

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
    const { identifier } = body;

    if (!identifier) {
      throw new Error('Email or username is required');
    }
    
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

    if (!user) {
      throw new Error('User not found.');
    }

    const { data: authenticators, error: authError } = await supabaseAdmin
      .from('user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (authError) throw authError;
    
    if (!authenticators || authenticators.length === 0) {
      throw new Error('No passkeys registered for this user.');
    }

    const originHeader = req.headers.get('origin');
    if (!originHeader) throw new Error('Origin header missing');
    
    const rpID = new URL(originHeader).hostname;

    const options = await genOptionsV13({
      rpID,
      allowCredentials: authenticators.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports as any,
      })),
      userVerification: 'preferred',
    });

    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, currentChallenge: options.challenge },
    });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error in generate-authentication-options:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});