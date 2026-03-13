/**
 * @module api/clinics
 * @description All Supabase operations for clinics and clinic_services tables.
 * Public reads + Admin writes. No auth calls.
 */

import { supabase } from '../lib/supabaseClient';

// ─── CLINICS — READ ──────────────────────────────────────────────────────────

export async function getClinics() {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('sort_order', { ascending: true });
    return { data, error };
}

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

// ─── CLINICS — ADMIN WRITE ───────────────────────────────────────────────────

export async function createClinic(payload) {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .insert([payload])
            .select()
            .single();
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function updateClinic(id, updates) {
    try {
        const { data, error } = await supabase
            .from('clinics')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function deleteClinic(id) {
    try {
        const { error } = await supabase
            .from('clinics')
            .delete()
            .eq('id', id);
        return { error };
    } catch (err) {
        return { error: err };
    }
}

// ─── CLINIC SERVICES — READ ───────────────────────────────────────────────────

export async function getServicesByClinic(clinicId) {
    const { data, error } = await supabase
        .from('clinic_services')
        .select('id, service_name')
        .eq('clinic_id', clinicId);
    return { data, error };
}

// ─── CLINIC SERVICES — ADMIN WRITE ───────────────────────────────────────────

export async function createService(clinicId, serviceName) {
    try {
        const { data, error } = await supabase
            .from('clinic_services')
            .insert([{ clinic_id: clinicId, service_name: serviceName }])
            .select()
            .single();
        return { data, error };
    } catch (err) {
        return { data: null, error: err };
    }
}

export async function deleteService(id) {
    try {
        const { error } = await supabase
            .from('clinic_services')
            .delete()
            .eq('id', id);
        return { error };
    } catch (err) {
        return { error: err };
    }
}
