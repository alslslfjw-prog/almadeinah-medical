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

// ─── PHONE / OTP AUTH (patients) ─────────────────────────────────────────────

/**
 * Send an OTP to a phone number via the Supabase Send-SMS hook
 * (which forwards it to UltraMsg WhatsApp).
 * @param {string} phoneE164 — E.164 format, e.g. "+96777XXXXXXX"
 * @returns {Promise<{ error: object|null }>}
 */
export async function signInWithPhone(phoneE164) {
    const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
    return { error };
}

/**
 * Verify the OTP received on the patient's phone.
 * On success, a full Supabase session is created.
 * @param {string} phoneE164 — must match the phone used in signInWithPhone
 * @param {string} token     — 6-digit OTP
 * @returns {Promise<{ user: object|null, session: object|null, error: object|null }>}
 */
export async function verifyPhoneOtp(phoneE164, token) {
    const { data, error } = await supabase.auth.verifyOtp({
        phone: phoneE164,
        token,
        type: 'sms',
    });
    return { user: data?.user ?? null, session: data?.session ?? null, error };
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

// ─── PASSWORD RESET ───────────────────────────────────────────────────────────

/**
 * Send a password-reset email. The link in the email will redirect to
 * /reset-password where the user can set a new password.
 * @param {string} email
 * @returns {Promise<{ error: object|null }>}
 */
export async function resetPasswordForEmail(email) {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
}

/**
 * Update the current user's password. Call ONLY after a PASSWORD_RECOVERY
 * auth event has confirmed the recovery session is active.
 * @param {string} newPassword
 * @returns {Promise<{ user: object|null, error: object|null }>}
 */
export async function updateUserPassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });
    return { user: data?.user ?? null, error };
}
