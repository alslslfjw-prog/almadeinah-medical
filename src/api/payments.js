/**
 * api/payments.js — CRUD for the payment_methods table.
 *
 * Table shape:
 *   id, name_ar, name_en, is_active, type ('manual'|'api'),
 *   provider_id, sort_order, config (JSONB), created_at
 */

import { supabase } from '../lib/supabaseClient';

/** Fetch all payment methods ordered by sort_order */
export async function getPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('sort_order', { ascending: true });
  return { data, error };
}

/** Insert a new payment method */
export async function createPaymentMethod(payload) {
  const { data, error } = await supabase
    .from('payment_methods')
    .insert([payload])
    .select()
    .single();
  return { data, error };
}

/** Patch any fields on an existing payment method */
export async function updatePaymentMethod(id, patch) {
  const { data, error } = await supabase
    .from('payment_methods')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

/** Toggle the is_active flag */
export async function togglePaymentMethod(id, isActive) {
  return updatePaymentMethod(id, { is_active: isActive });
}

/** Hard delete a payment method (guard seeded rows in the UI, not here) */
export async function deletePaymentMethod(id) {
  const { error } = await supabase
    .from('payment_methods')
    .delete()
    .eq('id', id);
  return { error };
}
