/**
 * COMPATIBILITY SHIM — re-exports the singleton from supabaseClient.js.
 * Legacy pages import from '../lib/supabase' — this ensures they all get
 * the SAME instance instead of creating a second GoTrueClient.
 * TODO: migrate all callers to import from '../lib/supabaseClient' and delete this file.
 */
export { supabase } from './supabaseClient';