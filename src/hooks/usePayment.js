/**
 * @module hooks/usePayment
 * @description Hook for managing the payment flow state machine.
 * Calls api/payments/index.js (Edge Functions only — no secret keys here).
 *
 * Usage:
 *   const { status, initiatePayment, reset } = usePayment();
 */

import { useState, useCallback } from 'react';
import { initiatePayment as apiInitiatePayment, verifyPayment as apiVerifyPayment } from '../api/payments';
import useUiStore from '../store/uiStore';

/** @typedef {'idle'|'processing'|'success'|'failed'} PaymentStatus */

export function usePayment() {
    /** @type {[PaymentStatus, Function]} */
    const [status, setStatus] = useState('idle');
    const [transactionId, setTransactionId] = useState(null);
    const [error, setError] = useState(null);
    const addToast = useUiStore((s) => s.addToast);

    /**
     * Trigger a payment via the secure Edge Function.
     * @param {{
     *   appointmentId: number,
     *   amount: number,
     *   currency: string,
     *   method: string,
     *   customerName: string,
     *   customerPhone: string,
     * }} payload
     * @returns {Promise<{ success: boolean, transactionId?: string }>}
     */
    const initiatePayment = useCallback(async (payload) => {
        setStatus('processing');
        setError(null);

        const { data, error: err } = await apiInitiatePayment(payload);

        if (err) {
            setStatus('failed');
            setError(err.message);
            addToast({ type: 'error', message: `فشل الدفع: ${err.message}` });
            return { success: false };
        }

        setStatus('success');
        setTransactionId(data?.transactionId ?? null);
        addToast({ type: 'success', message: 'تم الدفع بنجاح!' });
        return { success: true, transactionId: data?.transactionId };
    }, [addToast]);

    /**
     * Poll/verify a payment by transaction ID.
     * @param {string} txId
     */
    const verifyPayment = useCallback(async (txId) => {
        const { data, error: err } = await apiVerifyPayment(txId);
        if (err) return { verified: false, error: err.message };
        return { verified: data?.status === 'paid', data };
    }, []);

    /** Reset the payment state machine back to idle. */
    const reset = useCallback(() => {
        setStatus('idle');
        setTransactionId(null);
        setError(null);
    }, []);

    return { status, transactionId, error, initiatePayment, verifyPayment, reset };
}
