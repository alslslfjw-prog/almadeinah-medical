/**
 * @module api/doctors
 * @description All Supabase operations for the `doctors` table.
 * Public reads + Admin writes. No auth calls — JWT attached automatically.
 */

import { supabase } from '../lib/supabaseClient';

const STORAGE_BUCKET = 'doctor-images';

// ─── READ ────────────────────────────────────────────────────────────────────

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

export async function getDoctorById(id) {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .select('*, clinics(id, name, color, icon_name, clinic_number)')
            .eq('id', id)
            .single();
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

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
        return { data: null, error: err };
    }
}

// ─── ADMIN WRITE ─────────────────────────────────────────────────────────────

/**
 * Create a new doctor record.
 * @param {object} payload — all doctor fields (image_url must be set before calling)
 */
export async function createDoctor(payload) {
    try {
        const { data, error } = await supabase
            .from('doctors')
            .insert([payload])
            .select()
            .single();
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

/**
 * Update a doctor record.
 * @param {number} id
 * @param {object} updates
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
        return { data: null, error: err };
    }
}

/**
 * Delete a doctor record.
 * @param {number} id
 */
export async function deleteDoctor(id) {
    try {
        const { error } = await supabase
            .from('doctors')
            .delete()
            .eq('id', id);
        return { error };
    } catch (err) {
        return { error: err };
    }
}

// ─── STORAGE ─────────────────────────────────────────────────────────────────

/**
 * Upload a doctor photo to Supabase Storage.
 * Returns the public URL of the uploaded file.
 * @param {File} file
 * @returns {Promise<{ url: string|null, error: object|null }>}
 */
export async function uploadDoctorImage(file) {
    try {
        const ext      = file.name.split('.').pop();
        const filename = `doctor-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filename, file, { upsert: true, contentType: file.type });

        if (uploadError) return { url: null, error: uploadError };

        const { data } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(filename);

        return { url: data.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
}
