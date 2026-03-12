/**
 * @module api/doctors
 * @description All Supabase data operations for the `doctors` table.
 *
 * RULES:
 *  - Import ONLY from '../lib/supabaseClient' (singleton — never call createClient here)
 *  - NO auth calls (no getSession, no getUser). The client attaches the JWT automatically.
 *  - Every function is a plain async query wrapped in try/catch.
 */

import { supabase } from '../lib/supabaseClient';

// ─── READ ────────────────────────────────────────────────────────────────────

/**
 * Fetch all doctors, optionally joined with their clinic.
 * @param {{ withClinic?: boolean, clinicId?: number, category?: string }} [opts]
 */
export async function getDoctors({ withClinic = true, clinicId, category } = {}) {
    try {
        let query = supabase
            .from('doctors')
            .select(withClinic ? '*, clinics(id, name, color, icon_name)' : '*')
            .order('priority', { ascending: true })
            .order('home_page_order', { ascending: true });

        if (clinicId) query = query.eq('clinic_id', clinicId);
        if (category)  query = query.eq('category', category);

        const { data, error } = await query;
        return { data, error };
    } catch (err) {
        console.error('[api/doctors] getDoctors threw:', err);
        return { data: null, error: err };
    }
}

/**
 * Fetch a single doctor by ID, joined with clinic.
 * @param {number|string} id
 */
export async function getDoctorById(id) {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('*, clinics(id, name, color, icon_name, clinic_number)')
            .eq('id', id)
            .single();
        return { data, error };
    } catch (err) {
        console.error('[api/doctors] getDoctorById threw:', err);
        return { data: null, error: err };
    }
}

/**
 * Fetch featured doctors for the homepage widget.
 * @param {number} [limit=6]
 */
export async function getFeaturedDoctors(limit = 6) {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('id, name, title, category, image_url, availability_status, clinic_id, clinics(name, color)')
            .not('home_page_order', 'is', null)
            .order('home_page_order', { ascending: true })
            .limit(limit);
        return { data, error };
    } catch (err) {
        console.error('[api/doctors] getFeaturedDoctors threw:', err);
        return { data: null, error: err };
    }
}

// ─── ADMIN WRITE ─────────────────────────────────────────────────────────────

/**
 * Update a doctor record (admin-only).
 * @param {number} id
 * @param {Partial<object>} updates
 */
export async function updateDoctor(id, updates) {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    } catch (err) {
        console.error('[api/doctors] updateDoctor threw:', err);
        return { data: null, error: err };
    }
}
