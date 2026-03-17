/**
 * api/settings.js — Read and update the single-row site_settings table.
 */
import { supabase } from '../lib/supabaseClient';

/** Fetch the single settings row (always id = 1) */
export async function getSiteSettings() {
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single();
  return { data, error };
}

/** Update the single settings row */
export async function updateSiteSettings(patch) {
  const { data, error } = await supabase
    .from('site_settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();
  return { data, error };
}
