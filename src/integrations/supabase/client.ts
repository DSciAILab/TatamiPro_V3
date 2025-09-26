import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://otqzzllevufcxbpeavmo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90cXp6bGxldnVmY3hicGVhdm1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxODkyNTEsImV4cCI6MjA3MTc2NTI1MX0.siWeTTxga1b62Cc9y3lt1MJwfrSejPhw6en3ZuQYack';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);