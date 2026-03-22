/**
 * @module api/patient
 * Patient-scoped data operations. All queries are filtered by the
 * authenticated user's JWT — only the patient's own data is returned.
 */

import { supabase } from '../lib/supabaseClient';

// ── Profile ───────────────────────────────────────────────────────────────────

/** Fetch the current patient's profile. */
export async function getMyProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, gender, date_of_birth, address, avatar_url')
        .eq('id', user.id)
        .single();
    return { data, error };
}

/**
 * Update the current patient's editable profile fields.
 * @param {{ full_name?, phone?, gender?, date_of_birth?, address? }} fields
 */
export async function updateMyProfile(fields) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
        .from('profiles')
        .update({ ...fields, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();
    return { data, error };
}

// ── Appointments ──────────────────────────────────────────────────────────────

/**
 * Fetch all appointments for the current patient.
 * RLS enforces ownership; explicit filter added as defence-in-depth.
 */
export async function getMyAppointments() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(id, name, title, image_url, clinics(name)), scans(id, name)')
        .eq('patient_user_id', user.id)
        .order('appointment_date', { ascending: false });
    return { data: data ?? [], error };
}

/**
 * Cancel a pending appointment.
 * Only works on rows owned by the current patient (RLS).
 * @param {number} id
 */
export async function cancelMyAppointment(id) {
    const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
    return { error };
}

/**
 * Book a new appointment from inside the patient portal.
 * @param {{
 *   patient_name: string,
 *   phone_number: string,
 *   type: string,
 *   service_name: string,
 *   appointment_date: string,
 *   appointment_time: string,
 *   patient_user_id: string,
 * }} payload
 */
export async function bookAppointment(payload) {
    const { data, error } = await supabase
        .from('appointments')
        .insert([{ ...payload, status: 'pending' }])
        .select()
        .single();
    return { data, error };
}
