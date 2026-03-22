/**
 * @module api/users
 * Admin-only functions for managing staff profiles, invitations, and patient records.
 */

import { supabase } from '../lib/supabaseClient';

export const STAFF_ROLES = [
    { value: 'admin',        label: 'المدير',        color: 'bg-teal-100 text-teal-700' },
    { value: 'receptionist', label: 'موظف استقبال', color: 'bg-blue-100 text-blue-700' },
    { value: 'accountant',   label: 'محاسب',         color: 'bg-orange-100 text-orange-700' },
    { value: 'editor',       label: 'محرر محتوى',   color: 'bg-purple-100 text-purple-700' },
];

// ── Staff ─────────────────────────────────────────────────────────────────────

/** Fetch all staff members (excludes patients). Admin RLS required. */
export async function getAllStaff() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role, created_at')
        .neq('role', 'patient')
        .order('created_at', { ascending: false });
    return { data, error };
}

/** Update a staff member's role. Admin RLS required. */
export async function updateUserRole(userId, role) {
    const { data, error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
        .select('id, role')
        .single();
    return { data, error };
}

/**
 * Create a new staff member via the `create-staff-user` Edge Function.
 * Uses auth.admin.createUser — no email sent, no rate limits.
 * Returns { tempPassword } on success so the admin can share credentials.
 * @param {{ email, role, full_name, password? }} payload
 */
export async function inviteStaffMember({ email, role, full_name, password }) {
    const { data, error } = await supabase.functions.invoke('create-staff-user', {
        body: { email, role, full_name, password },
    });

    if (error) {
        // In Supabase SDK v2, data is null on error — read body from error.context
        const body = await error.context?.json().catch(() => null);
        const actualMessage = body?.error ?? error.message;
        return { data: null, error: { message: actualMessage } };
    }
    // data.tempPassword is the generated/provided password to share with the staff member
    return { data, error: null };
}

// ── Patients ──────────────────────────────────────────────────────────────────

/** Fetch all patients. Admin RLS required. */
export async function getAllPatients() {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, gender, date_of_birth, address, created_at')
        .eq('role', 'patient')
        .order('created_at', { ascending: false });
    return { data, error };
}

/**
 * Update a patient's profile information.
 * @param {string} patientId
 * @param {{ full_name, phone, gender, date_of_birth, address }} fields
 */
export async function updatePatientProfile(patientId, fields) {
    const { data, error } = await supabase
        .from('profiles')
        .update(fields)
        .eq('id', patientId)
        .select()
        .single();
    return { data, error };
}

/**
 * Permanently delete a user from auth.users (CASCADE removes the profiles row).
 * Routed through the `delete-user` Edge Function — requires service role.
 * @param {string} userId
 */
export async function deleteUser(userId) {
    const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
    });
    if (error) {
        const body = await error.context?.json().catch(() => null);
        const actualMessage = body?.error ?? error.message;
        return { error: { message: actualMessage } };
    }
    return { error: null };
}
