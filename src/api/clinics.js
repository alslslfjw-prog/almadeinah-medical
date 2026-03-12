/**
 * @module api/clinics
 * @description All Supabase data operations for the `clinics` and `clinic_services` tables.
 *
 * Live schema — clinics (read 2026-03-08):
 *   id, name, icon_name, color, description, clinic_number, sort_order
 *
 * Live schema — clinic_services:
 *   id, clinic_id (fk → clinics), service_name, created_at
 */

import { supabase } from '../lib/supabaseClient';

// ─── CLINICS ─────────────────────────────────────────────────────────────────

/**
 * Fetch all clinics ordered by sort_order.
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getClinics() {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('sort_order', { ascending: true });
    return { data, error };
}

/**
 * Fetch a single clinic by ID with its services and doctors.
 * @param {number|string} id
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getClinicById(id) {
    const { data, error } = await supabase
        .from('clinics')
        .select(`
      *,
      clinic_services(id, service_name),
      doctors(id, name, title, image_url, availability_status, schedule, work_days, shift, work_hours)
    `)
        .eq('id', id)
        .single();
    return { data, error };
}

// ─── CLINIC SERVICES ─────────────────────────────────────────────────────────

/**
 * Fetch services for a given clinic.
 * @param {number} clinicId
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getServicesByClinic(clinicId) {
    const { data, error } = await supabase
        .from('clinic_services')
        .select('id, service_name')
        .eq('clinic_id', clinicId);
    return { data, error };
}
