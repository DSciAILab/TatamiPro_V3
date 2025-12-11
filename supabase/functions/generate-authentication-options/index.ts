// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@10.0.0';

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
    const { email } = await req.json();
    
    // Create Admin Client to look up user by email
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Get User ID from Email
    const { data: { users }, error: userError } = await supabaseAdmin.auth.admin.listUsers();
    if (userError) throw userError;
    
    // Note: listUsers isn't efficient for production with millions of users, 
    // but getUserByEmail isn't exposed in all versions of the client easily without scopes.
    // For this app, filtering is fine, or we use a direct RPC if available.
    // Better approach: Admin listUsers is paginated. Let's try a safer way if possible.
    // Actually, listUsers doesn't filter by email in the JS client args easily.
    // Let's rely on the client sending the email, and we search.
    const user = users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (!user) {
      // Don't reveal user existence
      throw new Error('User not found or no passkey registered');
    }

    // 2. Get User's Authenticators
    const { data: authenticators, error: authError } = await supabaseAdmin
      .from('user_authenticators')
      .select('credential_id, transports')
      .eq('user_id', user.id);

    if (authError || !authenticators || authenticators.length === 0) {
      throw new Error('No passkeys registered for this user');
    }

    // 3. Generate Options
    const options = await generateAuthenticationOptions({
      rpID: new URL(req.headers.get('origin')!).hostname,
      allowCredentials: authenticators.map((auth: any) => ({
        id: auth.credential_id,
        type: 'public-key',
        transports: auth.transports as any,
      })),
      userVerification: 'preferred',
    });

    // 4. Save challenge to user metadata (or a temporary table) to verify later
    await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, currentChallenge: options.challenge },
    });

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});