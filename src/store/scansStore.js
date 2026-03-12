/**
 * @module store/scansStore
 * @description Persistent Zustand store for public scans data.
 */

import { create } from 'zustand';
import { getScans } from '../api/scans';

const useScansStore = create((set) => ({
    scans: [],
    isLoading: false,
    error: null,

    fetchScans: async () => {
        set({ isLoading: true, error: null });
        const { data, error } = await getScans();
        set({
            scans: data ?? [],
            isLoading: false,
            error: error?.message ?? null,
        });
    },
}));

export default useScansStore;
