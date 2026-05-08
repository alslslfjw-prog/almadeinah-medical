/**
 * @module hooks/usePayment
 * @description Hook for managing the Alqutabi OTP payment state machine.
 * Calls api/payments/index.js (Edge Functions only - no secret keys here).
 */

import { useState, useCallback } from 'react';
import {
    initiateAlqutabiPayment as apiInitiateAlqutabiPayment,
    confirmAlqutabiPayment as apiConfirmAlqutabiPayment,
    resendAlqutabiOtp as apiResendAlqutabiOtp,
} from '../api/payments/index.js';
import useUiStore from '../store/uiStore';

/** @typedef {'idle'|'initiating'|'otp_required'|'confirming'|'paid'|'failed'|'expired'} PaymentStatus */

export function usePayment() {
    /** @type {[PaymentStatus, Function]} */
    const [status, setStatus] = useState('idle');
    const [paymentSessionId, setPaymentSessionId] = useState(null);
    const [appointmentId, setAppointmentId] = useState(null);
    const [expiresAt, setExpiresAt] = useState(null);
    const [error, setError] = useState(null);
    const addToast = useUiStore((s) => s.addToast);

    const readErrorMessage = (err) => err?.message || err?.error_description || 'تعذر إتمام عملية الدفع';

    const initiateAlqutabiPayment = useCallback(async (payload) => {
        setStatus('initiating');
        setError(null);

        const { data, error: err } = await apiInitiateAlqutabiPayment(payload);

        if (err) {
            setStatus('failed');
            const message = readErrorMessage(err);
            setError(message);
            addToast({ type: 'error', message: `فشل الدفع: ${message}` });
            return { success: false, error: err };
        }

        setStatus(data?.status === 'paid' ? 'paid' : 'otp_required');
        setPaymentSessionId(data?.paymentSessionId ?? null);
        setAppointmentId(data?.appointmentId ?? null);
        setExpiresAt(data?.expiresAt ?? null);
        addToast({ type: 'success', message: data?.message || 'تم إرسال رمز التحقق إلى واتساب العميل.' });
        return { success: true, data };
    }, [addToast]);

    const confirmAlqutabiPayment = useCallback(async (payload) => {
        setStatus('confirming');
        setError(null);

        const { data, error: err } = await apiConfirmAlqutabiPayment(payload);

        if (err) {
            const message = readErrorMessage(err);
            const expired = err?.code === 'expired' || err?.status === 410;
            setStatus(expired ? 'expired' : 'otp_required');
            setError(message);
            addToast({ type: 'error', message });
            return { success: false, error: err };
        }

        setStatus('paid');
        setPaymentSessionId(data?.paymentSessionId ?? payload.paymentSessionId ?? null);
        setAppointmentId(data?.appointmentId ?? null);
        addToast({ type: 'success', message: 'تم الدفع وتأكيد الحجز بنجاح.' });
        return { success: true, data };
    }, [addToast]);

    const resendAlqutabiOtp = useCallback(async (payload) => {
        const { data, error: err } = await apiResendAlqutabiOtp(payload);
        if (err) {
            const message = readErrorMessage(err);
            setError(message);
            addToast({ type: 'error', message });
            return { success: false, error: err };
        }
        setStatus('otp_required');
        addToast({ type: 'success', message: data?.message || 'تمت إعادة إرسال رمز التحقق.' });
        return { success: true, data };
    }, [addToast]);

    const reset = useCallback(() => {
        setStatus('idle');
        setPaymentSessionId(null);
        setAppointmentId(null);
        setExpiresAt(null);
        setError(null);
    }, []);

    return {
        status,
        paymentSessionId,
        appointmentId,
        expiresAt,
        error,
        initiateAlqutabiPayment,
        confirmAlqutabiPayment,
        resendAlqutabiOtp,
        reset,
    };
}
