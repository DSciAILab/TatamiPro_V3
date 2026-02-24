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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, password, firstName, lastName, eventId, role } = await req.json();

    if (!email || !password || !eventId) {
      throw new Error("Missing required fields");
    }

    // 1. Check if user exists or create
    let userId;
    const { data: listUsers } = await supabaseAdmin.auth.admin.listUsers();
    // Simple search (in production with thousands of users, allow filtering by email directly via API if available)
    const existingUser = listUsers.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

    if (existingUser) {
      userId = existingUser.id;
      // We do NOT update password for existing users to avoid locking them out of other events
    } else {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm since admin created it
        user_metadata: { first_name: firstName, last_name: lastName }
      });
      
      if (createError) throw createError;
      userId = newUser.user.id;

      // Update profile to enforce password change and set name
      // Note: Trigger usually creates profile, but we need to update the flag specifically
      // We wait a bit to ensure trigger fired or upsert
      await new Promise(r => setTimeout(r, 1000));
      
      await supabaseAdmin.from('sjjp_profiles').upsert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        role: 'staff', // Default global role, event access is specific
        must_change_password: true
      });
    }

    // 2. Assign to Event
    const { error: assignError } = await supabaseAdmin.from('sjjp_event_staff').insert({
      event_id: eventId,
      user_id: userId,
      role: role
    });

    // Ignore duplicate key error (already assigned)
    if (assignError && !assignError.message.includes('duplicate key')) {
      throw assignError;
    }

    return new Response(JSON.stringify({ success: true, userId, isNew: !existingUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Error creating user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});