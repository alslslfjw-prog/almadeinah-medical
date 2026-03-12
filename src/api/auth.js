/**
 * @module api/auth
 * @description Authentication wrappers around Supabase Auth.
 * All session / user data should flow through here — never call supabase.auth directly from UI.
 */

import { supabase } from '../lib/supabaseClient';

// ─── SESSION ─────────────────────────────────────────────────────────────────

/**
 * Get the current authenticated session.
 * @returns {Promise<{ session: object|null, error: object|null }>}
 */
export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data?.session ?? null, error };
}

/**
 * Subscribe to auth state changes (returns an unsubscribe function).
 * @param {(event: string, session: object|null) => void} callback
 * @returns {{ unsubscribe: () => void }}
 */
export function onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return { unsubscribe: () => subscription.unsubscribe() };
}

// ─── SIGN IN / SIGN UP ───────────────────────────────────────────────────────

/**
 * Sign in with email and password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: object|null, session: object|null, error: object|null }>}
 */
export async function signInWithEmail({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { user: data?.user ?? null, session: data?.session ?? null, error };
}

/**
 * Sign up with email and password.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ user: object|null, error: object|null }>}
 */
export async function signUpWithEmail({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    return { user: data?.user ?? null, error };
}

/**
 * Sign out the current user.
 * @returns {Promise<{ error: object|null }>}
 */
export async function signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
}

// ─── USER PROFILE / ROLE ─────────────────────────────────────────────────────

/**
 * Fetch the profile row for a given user ID (reads role, etc.).
 * NOTE: Assumes a `profiles` table exists with columns: id (uuid), role (text), ...
 * If the table doesn't exist yet, this will return { data: null, error }.
 * @param {string} userId
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
    return { data, error };
}
