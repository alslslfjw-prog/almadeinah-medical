/**
 * @module api/equipments
 * @description All Supabase data operations for the `equipments` table.
 *
 * Live schema (read 2026-03-08):
 *   id, name, model, image_url, description, technical_specs (jsonb),
 *   safety_features (jsonb), status (default 'available'), is_new (bool),
 *   badge, features (text[]), overview, tech_specs (text[]),
 *   medical_benefits (text[]), medical_uses (text[])
 */

import { supabase } from '../lib/supabaseClient';

/**
 * Fetch all equipment items.
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getEquipments() {
    const { data, error } = await supabase
        .from('equipments')
        .select('id, name, model, image_url, status, is_new, badge, overview');
    return { data, error };
}

/**
 * Fetch a single equipment item with all details.
 * @param {number|string} id
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getEquipmentById(id) {
    const { data, error } = await supabase
        .from('equipments')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}
