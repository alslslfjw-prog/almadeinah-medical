/**
 * @module hooks/useClinics
 * @description Thin hooks that read from the persistent clinicsStore.
 * Data survives component remount — no blank flash on navigation.
 */

import { useEffect, useState } from 'react';
import useClinicsStore from '../store/clinicsStore';
import { getClinicById, getServicesByClinic } from '../api/clinics';

/**
 * Fetch all clinics (sorted by sort_order).
 */
export function useClinics() {
    const { clinics, isLoading, error, fetchClinics } = useClinicsStore();

    useEffect(() => {
        fetchClinics();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return { clinics, isLoading, error };
}

/**
 * Fetch a single clinic with its doctors and services.
 * @param {number|string} id
 */
export function useClinicById(id) {
    const [clinic, setClinic] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        getClinicById(id).then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setClinic(data);
        });
    }, [id]);

    return { clinic, isLoading, error };
}

/**
 * Fetch services for a clinic.
 * @param {number} clinicId
 */
export function useServicesByClinic(clinicId) {
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!clinicId) return;
        getServicesByClinic(clinicId).then(({ data }) => {
            setServices(data ?? []);
            setIsLoading(false);
        });
    }, [clinicId]);

    return { services, isLoading };
}
