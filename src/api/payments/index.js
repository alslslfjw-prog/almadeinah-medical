/**
 * @module api/payments/index
 * @description Payment gateway orchestrator.
 *
 * ⚠️  SECURITY RULE (gemini.mmd — Rule 4):
 *   ALL payment gateway secret keys live server-side in the Supabase Edge Function.
 *   This module ONLY calls `supabase.functions.invoke()` — never a payment API directly.
 *   No secret keys, no card data, no PCI-sensitive info should be handled here.
 */

import { supabase } from '../../lib/supabaseClient';

/**
 * Initiate a payment by calling the `process-payment` Edge Function.
 * The Edge Function holds the gateway secret key (set via `supabase secrets set`).
 *
 * @param {{
 *   appointmentId: number,
 *   amount: number,           // in smallest currency unit (e.g., halalas)
 *   currency: string,         // e.g. 'SAR', 'YER'
 *   method: string,           // e.g. 'card', 'stc_pay'
 *   customerName: string,
 *   customerPhone: string,
 * }} payload
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function initiatePayment(payload) {
    const { data, error } = await supabase.functions.invoke('process-payment', {
        body: payload,
    });
    return { data, error };
}

/**
 * Verify a payment status by transaction ID (calls Edge Function).
 * @param {string} transactionId
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function verifyPayment(transactionId) {
    const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { transactionId },
    });
    return { data, error };
}
