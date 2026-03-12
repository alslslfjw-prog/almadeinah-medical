import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[supabaseClient] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables.');
}

/**
 * The single Supabase client instance for the entire application.
 * ⚠️  Import this ONLY from src/api/* files — never directly from pages or components.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);
