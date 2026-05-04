import { useCallback, useEffect, useState } from 'react';
import {
    getScanSchedules,
    getScanSchedulesForDate,
    getScanSlotsForDate,
} from '../api/scanSchedules';

export function useScanSchedules(scanId, fromDate, toDate) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!scanId || !fromDate || !toDate) {
            setSchedules([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getScanSchedules(scanId, fromDate, toDate);
        setSchedules(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [scanId, fromDate, toDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { schedules, isLoading, error, refetch };
}

export function useScanSchedulesForDate(scanId, specificDate) {
    const [schedules, setSchedules] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!scanId || !specificDate) {
            setSchedules([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getScanSchedulesForDate(scanId, specificDate);
        setSchedules(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [scanId, specificDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { schedules, isLoading, error, refetch };
}

export function useScanSlotsForDate(scanId, specificDate) {
    const [slots, setSlots] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const refetch = useCallback(async () => {
        if (!scanId || !specificDate) {
            setSlots([]);
            return;
        }

        setIsLoading(true);
        setError(null);
        const { data, error: err } = await getScanSlotsForDate(scanId, specificDate);
        setSlots(data ?? []);
        setError(err?.message ?? null);
        setIsLoading(false);
    }, [scanId, specificDate]);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { slots, isLoading, error, refetch };
}
