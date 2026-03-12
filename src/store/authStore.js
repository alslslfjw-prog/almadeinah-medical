/**
 * @module store/authStore
 * @description Zustand store for authentication state.
 * 
 * This is the single source of truth for the authenticated user and role.
 * Populated by the `useAuth` hook on app mount.
 */

import { create } from 'zustand';

const useAuthStore = create((set) => ({
    /** @type {import('@supabase/supabase-js').User | null} */
    user: null,

    /** @type {'admin' | 'patient' | null} */
    role: null,

    /** True while the initial session is being resolved on app mount. */
    isLoading: true,

    /** True if the user is fully authenticated. */
    isAuthenticated: false,

    /**
     * Set the authenticated user and their role.
     * @param {import('@supabase/supabase-js').User | null} user
     * @param {'admin' | 'patient' | null} role
     */
    setUser: (user, role) =>
        set({
            user,
            role,
            isLoading: false,
            isAuthenticated: !!user,
        }),

    /** Called when session loading completes but no user is found. */
    setUnauthenticated: () =>
        set({ user: null, role: null, isLoading: false, isAuthenticated: false }),

    /** Set isLoading=true while an async profile fetch is in-flight. */
    setAuthLoading: () =>
        set({ isLoading: true }),

    /** Clear store on sign-out. */
    clearAuth: () =>
        set({ user: null, role: null, isLoading: false, isAuthenticated: false }),
}));

export default useAuthStore;
