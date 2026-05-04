import { useCallback, useEffect, useState } from 'react';
import {
    getDoctorSchedules,
    getDoctorSchedulesForDate,
    getDoctorSlotsForDate,
} from '../api/doctorSchedules';

export function useDoctorSchedules(doctorId, fromDate, toDate) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!doctorId || !fromDate || !toDate) {
            setSchedules([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getDoctorSchedules(doctorId, fromDate, toDate);
        setSchedules(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [doctorId, fromDate, toDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { schedules, isLoading, error, refetch };
}

export function useDoctorSchedulesForDate(doctorId, specificDate) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!doctorId || !specificDate) {
            setSchedules([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getDoctorSchedulesForDate(doctorId, specificDate);
        setSchedules(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [doctorId, specificDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { schedules, isLoading, error, refetch };
}

export function useDoctorSlotsForDate(doctorId, specificDate) {
    const [slots, setSlots] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!doctorId || !specificDate) {
            setSlots([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getDoctorSlotsForDate(doctorId, specificDate);
        setSlots(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [doctorId, specificDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { slots, isLoading, error, refetch };
}
