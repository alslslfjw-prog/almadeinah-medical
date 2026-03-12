/**
 * @module hooks/useDoctors
 * @description Thin hooks that read from the persistent doctorsStore.
 * Data survives component remount — no blank flash when navigating back.
 */

import { useEffect } from 'react';
import useDoctorsStore from '../store/doctorsStore';
import { getDoctorById } from '../api/doctors';
import { useState } from 'react';

/**
 * Fetch all doctors (optionally filtered).
 * @param {{ withClinic?: boolean, clinicId?: number, category?: string }} [opts]
 */
export function useDoctors(opts = {}) {
    const { doctors, isLoading, error, fetchDoctors } = useDoctorsStore();

    useEffect(() => {
        fetchDoctors(opts);
    }, [JSON.stringify(opts)]); // eslint-disable-line react-hooks/exhaustive-deps

    return { doctors, isLoading, error, refetch: () => fetchDoctors(opts, true) };
}

/**
 * Fetch a single doctor by ID.
 * @param {number|string} id
 */
export function useDoctorById(id) {
    const [doctor, setDoctor] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        getDoctorById(id).then(({ data, error: err }) => {
            setIsLoading(false);
            if (err) { setError(err.message); return; }
            setDoctor(data);
        });
    }, [id]);

    return { doctor, isLoading, error };
}

/**
 * Fetch featured doctors for the homepage widget.
 * @param {number} [limit=6]
 */
export function useFeaturedDoctors(limit = 6) {
    const { featuredDoctors, fetchFeaturedDoctors } = useDoctorsStore();
    const [isLoading, setIsLoading] = useState(featuredDoctors.length === 0);

    useEffect(() => {
        if (featuredDoctors.length === 0) {
            fetchFeaturedDoctors(limit).then(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, [limit]); // eslint-disable-line react-hooks/exhaustive-deps

    return { doctors: featuredDoctors, isLoading };
}
