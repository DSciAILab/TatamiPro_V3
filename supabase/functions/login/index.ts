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
    const { login, password } = await req.json();

    if (!login || !password) {
      throw new Error("Login and password are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let email = login;

    // Check if input is NOT an email (simple check)
    if (!login.includes('@')) {
      // It's likely a username. Look up the email in profiles.
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('username', login)
        .single();

      if (profileError || !profile) {
        throw new Error("Invalid login credentials");
      }

      // Get email from Auth User object using the ID found in profile
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
      
      if (userError || !userData.user) {
        throw new Error("User account not found");
      }
      
      email = userData.user.email;
    }

    // Perform Sign In
    // We use a regular client context to sign in, but we can't use 'supabaseAdmin' for signInWithPassword 
    // because it's a service role client (which bypasses auth). 
    // We need to use the public client URL/Key but with the credentials.
    // Actually, we can use a fresh client instance to simulate the sign-in.
    
    const supabasePublic = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const { data, error } = await supabasePublic.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});