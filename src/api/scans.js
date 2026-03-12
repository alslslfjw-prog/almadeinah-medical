/**
 * @module api/scans
 * @description All Supabase data operations for the `scans` and `examinations` tables.
 *
 * Live schema — scans (read 2026-03-08):
 *   id, name, image_url, price (numeric), duration, description,
 *   uses (jsonb), preparation, advantages (jsonb),
 *   icon_class, short_description, benefits
 *
 * Live schema — examinations:
 *   id, title, description, image_url, icon_class,
 *   header_color, title_en, devices
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
        .select('id, name, image_url, price, duration, short_description, icon_class');
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
export async function getMedicalTestsGuide({ category } = {}) {
    let query = supabase
        .from('medical_tests_guide')
        .select('*')
        .order('name', { ascending: true });

    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    return { data, error };
}
