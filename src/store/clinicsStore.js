/**
 * @module store/clinicsStore
 * @description Persistent Zustand store for public clinics data.
 */

import { create } from 'zustand';
import { getClinics } from '../api/clinics';

const useClinicsStore = create((set) => ({
    clinics: [],
    isLoading: false,
    error: null,

    fetchClinics: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await getClinics();
        set({
            clinics: data ?? [],
            isLoading: false,
            error: error?.message ?? null,
        });
    },
}));

export default useClinicsStore;
