/**
 * @module api/scans
 * @description All Supabase data operations for scans, scan_categories, examinations tables.
 *
 * scan_categories: id, name, icon_class, image_url, display_order
 * scans: id, name, category_id (FK→scan_categories), price, description,
 *        icon_class, short_description, preparation, benefits
 * examinations: id, title, description, image_url, icon_class, header_color, title_en, devices
 */

import { supabase } from '../lib/supabaseClient';

// ─── SCANS ───────────────────────────────────────────────────────────────────

/**
 * Fetch all scans (summary fields for listing page).
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getScans() {
    const { data, error } = await supabase
        .from('scans')
        .select('*, scan_categories(id, name)')
        .order('id', { ascending: true });
    return { data, error };
}

/**
 * Fetch a single scan with all detail fields.
 * @param {number|string} id
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getScanById(id) {
    const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// ─── SCAN CATEGORIES ─────────────────────────────────────────────────────────

export async function getScanCategories() {
    const { data, error } = await supabase
        .from('scan_categories')
        .select('*')
        .order('display_order', { ascending: true });
    return { data, error };
}

/**
 * Fetch scans filtered by category (for the cascading Dropdown 2 in the booking widget).
 * @param {number} categoryId
 */
export async function getScansByCategory(categoryId) {
    const { data, error } = await supabase
        .from('scans')
        .select('id, name, price')
        .eq('category_id', categoryId)
        .order('id', { ascending: true });
    return { data, error };
}

// ─── LAB CATEGORIES CRUD ─────────────────────────────────────────────────────

/**
 * Fetch all lab categories from the dedicated table (id, name).
 * Used by the booking widget (Dropdown A) and the admin CMS tabs.
 */
export async function getLabCategories() {
    const { data, error } = await supabase
        .from('lab_categories')
        .select('id, name')
        .order('name', { ascending: true });
    return { data, error };
}

/**
 * Fetch lab tests belonging to a specific category (for booking widget Dropdown B).
 * @param {number} categoryId  — the integer id from lab_categories
 */
export async function getLabTestsByCategory(categoryId) {
    const { data, error } = await supabase
        .from('medical_tests_guide')
        .select('id, name, price')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });
    return { data, error };
}

export async function createLabCategory(name) {
    const { data, error } = await supabase
        .from('lab_categories')
        .insert([{ name: name.trim() }])
        .select()
        .single();
    return { data, error };
}

export async function updateLabCategory(id, name) {
    const { data, error } = await supabase
        .from('lab_categories')
        .update({ name: name.trim() })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

export async function deleteLabCategory(id) {
    const { error } = await supabase
        .from('lab_categories')
        .delete()
        .eq('id', id);
    return { error };
}

export async function createScanCategory(payload) {
    try {
        const { data, error } = await supabase.from('scan_categories').insert([payload]).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function updateScanCategory(id, updates) {
    try {
        const { data, error } = await supabase.from('scan_categories').update(updates).eq('id', id).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function deleteScanCategory(id) {
    try {
        const { error } = await supabase.from('scan_categories').delete().eq('id', id);
        return { error };
    } catch (err) { return { error: err }; }
}

// ─── EXAMINATIONS ─────────────────────────────────────────────────────────────

/**
 * Fetch all examination categories.
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getExaminations() {
    const { data, error } = await supabase
        .from('examinations')
        .select('*');
    return { data, error };
}

/**
 * Fetch a single examination by ID.
 * @param {number|string} id
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getExaminationById(id) {
    const { data, error } = await supabase
        .from('examinations')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// ─── MEDICAL PACKAGES ────────────────────────────────────────────────────────

/**
 * Live schema — medical_packages:
 *   id, created_at, title, description, tests_count, discount_text,
 *   features (text[]), image_url, price (numeric), tests_included (text[]),
 *   detailed_prep
 */

/**
 * Fetch all medical packages.
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getMedicalPackages() {
    const { data, error } = await supabase
        .from('medical_packages')
        .select('*')
        .order('id', { ascending: true });
    return { data, error };
}

/**
 * Fetch a single package by ID.
 * @param {number|string} id
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getMedicalPackageById(id) {
    const { data, error } = await supabase
        .from('medical_packages')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

// ─── LAB TESTS ───────────────────────────────────────────────────────────────

/**
 * Live schema — lab_tests_list: id, name
 * Live schema — medical_tests_guide:
 *   id, created_at, name, category, about, reasons (text[]), prep
 */

/**
 * Fetch all lab test names (for the AllTests page).
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getLabTests() {
    const { data, error } = await supabase
        .from('lab_tests_list')
        .select('id, name')
        .order('id', { ascending: true });
    return { data, error };
}

/**
 * Fetch the medical tests guide (full detail with category and prep).
 * @param {{ category?: string }} [opts]
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getMedicalTestsGuide({ category_id } = {}) {
    let query = supabase
        .from('medical_tests_guide')
        .select('*, lab_categories(id, name)')
        .order('name', { ascending: true });

    if (category_id) query = query.eq('category_id', category_id);

    const { data, error } = await query;
    return { data, error };
}

// ─── ADMIN: SCANS WRITE ───────────────────────────────────────────────────────

export async function createScan(payload) {
    try {
        const { data, error } = await supabase.from('scans').insert([payload]).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function updateScan(id, updates) {
    try {
        const { data, error } = await supabase.from('scans').update(updates).eq('id', id).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function deleteScan(id) {
    try {
        const { error } = await supabase.from('scans').delete().eq('id', id);
        return { error };
    } catch (err) { return { error: err }; }
}

export async function uploadScanImage(file) {
    try {
        const ext = file.name.split('.').pop();
        const filename = `scan-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('scan-images')
            .upload(filename, file, { upsert: true, contentType: file.type });
        if (uploadError) return { url: null, error: uploadError };
        const { data } = supabase.storage.from('scan-images').getPublicUrl(filename);
        return { url: data.publicUrl, error: null };
    } catch (err) { return { url: null, error: err }; }
}

// ─── ADMIN: PACKAGES WRITE ────────────────────────────────────────────────────

export async function createPackage(payload) {
    try {
        const { data, error } = await supabase.from('medical_packages').insert([payload]).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function updatePackage(id, updates) {
    try {
        const { data, error } = await supabase.from('medical_packages').update(updates).eq('id', id).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function deletePackage(id) {
    try {
        const { error } = await supabase.from('medical_packages').delete().eq('id', id);
        return { error };
    } catch (err) { return { error: err }; }
}

export async function uploadPackageImage(file) {
    try {
        const ext = file.name.split('.').pop();
        const filename = `pkg-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('package-images')
            .upload(filename, file, { upsert: true, contentType: file.type });
        if (uploadError) return { url: null, error: uploadError };
        const { data } = supabase.storage.from('package-images').getPublicUrl(filename);
        return { url: data.publicUrl, error: null };
    } catch (err) { return { url: null, error: err }; }
}

// ─── ADMIN: MEDICAL TESTS GUIDE WRITE ────────────────────────────────────────

export async function createTestGuide(payload) {
    try {
        const { data, error } = await supabase.from('medical_tests_guide').insert([payload]).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function updateTestGuide(id, updates) {
    try {
        const { data, error } = await supabase.from('medical_tests_guide').update(updates).eq('id', id).select().single();
        return { data, error };
    } catch (err) { return { data: null, error: err }; }
}

export async function deleteTestGuide(id) {
    try {
        const { error } = await supabase.from('medical_tests_guide').delete().eq('id', id);
        return { error };
    } catch (err) { return { error: err }; }
}
