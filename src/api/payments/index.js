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

async function invokeAlqutabiPayment(body) {
    const { data, error } = await supabase.functions.invoke('alqutabi-payment', {
        body,
    });

    if (error) {
        let serverError = null;
        try {
            serverError = await error.context?.json?.();
        } catch {
            serverError = null;
        }
        return { data: null, error: serverError?.error ?? error };
    }
    if (data?.success === false) {
        return {
            data: null,
            error: data.error ?? { message: 'Payment request failed' },
        };
    }
    return { data: data?.data ?? data, error: null };
}

export async function initiateAlqutabiPayment(payload) {
    return invokeAlqutabiPayment({
        action: 'initiate',
        ...payload,
    });
}

export async function confirmAlqutabiPayment(payload) {
    return invokeAlqutabiPayment({
        action: 'confirm',
        ...payload,
    });
}

export async function resendAlqutabiOtp(payload) {
    return invokeAlqutabiPayment({
        action: 'resend_otp',
        ...payload,
    });
}
