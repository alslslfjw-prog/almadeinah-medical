/**
 * @module api/appointments
 * @description All Supabase data operations for the `appointments` table.
 *
 * Live schema (read 2026-03-08):
 *   id, created_at, patient_name, phone_number, appointment_date (date),
 *   appointment_time (time), doctor_id (fk → doctors), scan_id (fk → scans),
 *   status (text, default 'pending')
 *
 * NOTE: The column is `phone_number`, NOT `patient_phone`.
 */

import { supabase } from '../lib/supabaseClient';

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Get all appointments (Admin use — requires RLS admin policy).
 * @param {{ status?: string, from?: string, to?: string }} [opts]
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getAllAppointments({ status, from, to } = {}) {
    let query = supabase
        .from('appointments')
        .select('*, doctors(id, name, title, category, clinics(name)), scans(id, name), doctor_time_slots(id, slot_date, start_time, end_time, status)')
        .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (from) query = query.gte('appointment_date', from);
    if (to) query = query.lte('appointment_date', to);

    const { data, error } = await query;
    return { data, error };
}

/**
 * Get appointments for the currently authenticated patient.
 * When RLS is active, Supabase automatically filters by auth.uid().
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getMyAppointments() {
    const { data, error } = await supabase
        .from('appointments')
        .select('*, doctors(id, name, title, image_url, clinics(name)), scans(id, name), doctor_time_slots(id, slot_date, start_time, end_time, status)')
        .order('appointment_date', { ascending: false });
    return { data, error };
}

// ─── WRITE ───────────────────────────────────────────────────────────────────

/**
 * Create a new appointment booking.
 * @param {{
 *   patient_name: string,
 *   phone_number: string,
 *   appointment_date: string,   // ISO date 'YYYY-MM-DD'
 *   appointment_time: string,   // 'HH:MM:SS' or 'HH:MM'
 *   doctor_time_slot_id?: number|null,
 *   doctor_id?: number|null,
 *   scan_id?: number|null,
 *   status?: string
 * }} payload
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function createAppointment(payload) {
    const { data, error } = await supabase
        .from('appointments')
        .insert([
            {
                patient_name: payload.patient_name,
                phone_number: payload.phone_number,
                appointment_date: payload.appointment_date ?? null,
                appointment_time: payload.appointment_time ?? null,
                doctor_time_slot_id: payload.doctor_time_slot_id ?? null,
                doctor_id: payload.doctor_id ?? null,
                scan_id: payload.scan_id ?? null,
                status: payload.status ?? 'pending',
                // ── Auth linkage ──────────────────────────────────────────
                patient_user_id: payload.patient_user_id ?? null,
                // ── Extra context (not all bookings have a doctor_id) ─────
                service_name: payload.service_name ?? null,
                type: payload.type ?? null,
                total_price_yer: payload.total_price_yer ?? null,
            },
        ])
        .select()
        .single();
    return { data, error };
}

/**
 * Update an appointment's status (Admin use).
 * @param {number} id
 * @param {'pending'|'confirmed'|'cancelled'|'completed'} status
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateAppointmentStatus(id, status) {
    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

/**
 * Cancel an appointment (patient self-service).
 * @param {number} id
 * @returns {Promise<{ error: object|null }>}
 */
export async function cancelAppointment(id) {
    const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', id);
    return { error };
}

// ─── ADMIN WRITE ────────────────────────────────────────────────────────────────────

/**
 * Update any fields of an appointment (admin rescheduling / status override).
 * @param {number} id
 * @param {{ patient_name?: string, phone_number?: string, appointment_date?: string, appointment_time?: string, doctor_time_slot_id?: number|null, status?: string }} updates
 */
export async function updateAppointment(id, updates) {
    try {
        const { data, error } = await supabase
            .from('appointments')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

/**
 * Hard-delete an appointment (admin only).
 * @param {number} id
 */
export async function deleteAppointment(id) {
    try {
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        return { error };
    } catch (err) { return { error: err }; }
}
