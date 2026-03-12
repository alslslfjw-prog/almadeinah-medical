/**
 * @module store/doctorsStore
 * @description Persistent Zustand store for public doctors data.
 * Survives component remount — navigating back shows data without a fresh network hit.
 */

import { create } from 'zustand';
import { getDoctors, getFeaturedDoctors } from '../api/doctors';

const useDoctorsStore = create((set) => ({
    doctors: [],
    featuredDoctors: [],
    isLoading: false,
    error: null,

    fetchDoctors: async (opts = {}) => {
        set({ isLoading: true, error: null });
        const { data, error } = await getDoctors(opts);
        set({
            doctors: data ?? [],
            isLoading: false,
            error: error?.message ?? null,
        });
    },

    fetchFeaturedDoctors: async (limit = 6) => {
        const { data } = await getFeaturedDoctors(limit);
        if (data) set({ featuredDoctors: data });
    },
}));

export default useDoctorsStore;
