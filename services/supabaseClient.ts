import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dcewtbnmjcfpychrwwsp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZXd0Ym5tamNmcHljaHJ3d3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDAzMTEsImV4cCI6MjA4NTY3NjMxMX0.jlcItIgwWYDX7_0op7leg9UbtpJIOUcMl7OQHx7pF-I';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in frontend environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
