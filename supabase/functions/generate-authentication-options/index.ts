// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@9.0.3'; 
// Downgrading to v9.0.3 temporarily as v10+ in Deno sometimes causes issues with specific ESM builds, 
// or ensuring we handle the types correctly. Actually, let's try matching major versions if possible, 
// but ESM.sh v13 sometimes has specific Deno requirements. 
// Let's stick to a robust v9 or v10 that is known to work in Deno/Supabase, 
// BUT we must ensure the client (v13) is backward compatible with the options generated.
// Actually, it's safer to use the exact same version if possible.
// Let's try v13.0.0 from esm.sh

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
    const { email } = body;

    if (!email) {
      throw new Error('Email is required');
    }
    
    // Create Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get User ID from Email
    // Note: listUsers is paginated (50 default). For production, this should use a specific RPC or search query.
    // We fetch a larger page to be safer.
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (userError) throw userError;
    
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Return 404 to be specific, but client will see it as error
      throw new Error('User not found. Please register first.');
    }

    // 2. Get User's Authenticators
    const { data: authenticators, error: authError } = await supabaseAdmin
      .from('sjjp_user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (authError) throw authError;
    
    if (!authenticators || authenticators.length === 0) {
      throw new Error('No passkeys registered for this email. Please login with password and set up Face ID/Touch ID.');
    }

    // 3. Generate Options
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

    // 4. Save challenge
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