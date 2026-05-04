/**
 * @module hooks/useAppointments
 * @description Hook for appointment data fetching and mutations.
 * 
 * Wraps api/appointments.js with loading/error state management.
 */

import { useState, useCallback } from 'react';
import {
    createAppointment as apiCreateAppointment,
    getMyAppointments as apiGetMyAppointments,
    getAllAppointments as apiGetAllAppointments,
    updateAppointmentStatus as apiUpdateStatus,
    cancelAppointment as apiCancelAppointment,
} from '../api/appointments';
import useUiStore from '../store/uiStore';

function mapAppointmentError(err) {
    const message = err?.message ?? String(err ?? '');
    if (
        message.includes('Selected time slot is already booked') ||
        message.includes('appointments_active_doctor_time_slot_idx') ||
        message.includes('duplicate key value')
    ) {
        return 'هذا الموعد حُجز للتو. يرجى اختيار وقت آخر.';
    }
    if (message.includes('Selected time slot is blocked')) {
        return 'هذا الموعد غير متاح حالياً. يرجى اختيار وقت آخر.';
    }
    return message;
}

export function useAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const addToast = useUiStore((s) => s.addToast);

    // ─── Fetch my appointments (patient) ───────────────────────────────────
    const fetchMyAppointments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const { data, error: err } = await apiGetMyAppointments();
        setIsLoading(false);
        if (err) { setError(err.message); return; }
        setAppointments(data ?? []);
    }, []);

    // ─── Fetch all appointments (admin) ────────────────────────────────────
    const fetchAllAppointments = useCallback(async (filters = {}) => {
        setIsLoading(true);
        setError(null);
        const { data, error: err } = await apiGetAllAppointments(filters);
        setIsLoading(false);
        if (err) { setError(err.message); return; }
        setAppointments(data ?? []);
    }, []);

    // ─── Create appointment ─────────────────────────────────────────────────
    const createAppointment = useCallback(async (payload) => {
        setIsLoading(true);
        const { data, error: err } = await apiCreateAppointment(payload);
        setIsLoading(false);
        if (err) {
            const friendlyMessage = mapAppointmentError(err);
            addToast({ type: 'error', message: `خطأ في الحجز: ${friendlyMessage}` });
            return { success: false, error: { ...err, message: friendlyMessage } };
        }
        addToast({ type: 'success', message: 'تم الحجز بنجاح!' });
        return { success: true, data };
    }, [addToast]);

    // ─── Update status (admin) ──────────────────────────────────────────────
    const updateStatus = useCallback(async (id, status) => {
        const { data, error: err } = await apiUpdateStatus(id, status);
        if (err) {
            addToast({ type: 'error', message: err.message });
            return { success: false };
        }
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
        return { success: true, data };
    }, [addToast]);

    // ─── Cancel (patient) ───────────────────────────────────────────────────
    const cancelAppointment = useCallback(async (id) => {
        const { error: err } = await apiCancelAppointment(id);
        if (err) {
            addToast({ type: 'error', message: err.message });
            return { success: false };
        }
        setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
        addToast({ type: 'info', message: 'تم إلغاء الموعد.' });
        return { success: true };
    }, [addToast]);

    return {
        appointments,
        isLoading,
        error,
        fetchMyAppointments,
        fetchAllAppointments,
        createAppointment,
        updateStatus,
        cancelAppointment,
    };
}
