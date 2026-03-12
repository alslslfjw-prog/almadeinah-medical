/**
 * @module hooks/useAuth
 *
 * TWO exports:
 *   useAuthListener()  — registers ONE onAuthStateChange listener. Call only from <AuthInitializer>.
 *   useAuth()          — reads auth state + signIn/signOut actions. No listener, no useEffect.
 *
 * ─── Auth Loading Rule ────────────────────────────────────────────────────────
 * setAuthLoading() (isLoading: true) is called in EXACTLY ONE place: INITIAL_SESSION.
 * All other events (SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED) update state silently
 * without ever showing a full-page loading spinner.
 *
 * This prevents the F5 / window-focus deadlock where SIGNED_IN fires AFTER
 * INITIAL_SESSION is already resolving, causing a second spinner cycle.
 *
 * ─── Timeout Safety ──────────────────────────────────────────────────────────
 * fetchRoleWithBackoff has a hard 5-second total timeout. If the profiles table
 * query hangs (e.g. auth.uid() not yet set inside RLS during Supabase init),
 * it bails out and defaults to 'patient' — isLoading is ALWAYS reset to false.
 */

import { useEffect, useCallback } from 'react';
import useAuthStore from '../store/authStore';
import {
    onAuthStateChange,
    signInWithEmail,
    signOut as apiSignOut,
    getUserProfile,
} from '../api/auth';

// ── Profile fetch with hard 5-second timeout ──────────────────────────────────
const FETCH_TIMEOUT_MS = 5000;

async function fetchRoleWithTimeout(userId) {
    const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => {
            console.warn('[useAuth] ⏱️ Profile fetch timed out — defaulting to "patient"');
            resolve({ data: null, error: new Error('timeout') });
        }, FETCH_TIMEOUT_MS)
    );

    // Race: profile fetch vs 5-second hard timeout
    const { data, error } = await Promise.race([
        getUserProfile(userId),
        timeoutPromise,
    ]);

    if (data?.role) {
        console.log('[useAuth] ✅ Role resolved:', data.role);
        return data.role;
    }

    console.warn('[useAuth] ⚠️ Profile fetch failed or timed out:', error?.message ?? 'null data');
    return 'patient'; // safe default
}

// ── EXPORT 1: Listener — call ONCE from AuthInitializer only ──────────────────
export function useAuthListener() {
    const { setUser, setUnauthenticated, setAuthLoading, clearAuth } = useAuthStore();

    useEffect(() => {
        const { unsubscribe } = onAuthStateChange(async (event, session) => {
            console.log('[useAuth] Auth event:', event, '| has session:', !!session);

            // ── INITIAL_SESSION ───────────────────────────────────────────────
            // The ONLY event that shows a loading spinner. Fires once on app boot.
            if (event === 'INITIAL_SESSION') {
                if (session?.user) {
                    setAuthLoading(); // isLoading: true
                    try {
                        const role = await fetchRoleWithTimeout(session.user.id);
                        setUser(session.user, role);
                    } finally {
                        // try/finally guarantees isLoading is ALWAYS reset
                        // setUser() already does this, but finally is a hard stop-gap
                        if (useAuthStore.getState().isLoading) {
                            console.warn('[useAuth] finally: forcing isLoading: false');
                            useAuthStore.getState().setUnauthenticated();
                        }
                    }
                } else {
                    setUnauthenticated();
                }

            // ── SIGNED_IN ─────────────────────────────────────────────────────
            // NO setAuthLoading() here — update state silently. The user is already
            // on the page; a spinner here would flash the UI unnecessarily and can
            // create race conditions with the INITIAL_SESSION spinner.
            } else if (event === 'SIGNED_IN') {
                if (!session?.user) return;

                const existingRole = useAuthStore.getState().role;
                if (existingRole) {
                    // Duplicate event — just refresh the user object (new token)
                    setUser(session.user, existingRole);
                    return;
                }

                // First SIGNED_IN with no cached role — fetch it silently
                try {
                    const role = await fetchRoleWithTimeout(session.user.id);
                    setUser(session.user, role);
                } catch (err) {
                    console.error('[useAuth] SIGNED_IN fetch error:', err);
                    setUser(session.user, 'patient');
                }

            // ── TOKEN_REFRESHED / USER_UPDATED ────────────────────────────────
            // Window focus / background tab wake-up / silent JWT refresh.
            // NEVER touch isLoading — update silently.
            } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (!session?.user) return;
                const existingRole = useAuthStore.getState().role ?? 'patient';
                setUser(session.user, existingRole); // silent, no spinner

            // ── SIGNED_OUT ────────────────────────────────────────────────────
            } else if (event === 'SIGNED_OUT') {
                clearAuth();
            }
        });

        return unsubscribe;
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}

// ── EXPORT 2: State reader + actions (safe for any component) ─────────────────
export function useAuth() {
    const { user, role, isLoading, isAuthenticated, clearAuth } = useAuthStore();

    const signIn = useCallback(async (credentials) => {
        return await signInWithEmail(credentials);
    }, []);

    const signOut = useCallback(async () => {
        const result = await apiSignOut();
        if (!result.error) clearAuth();
        return result;
    }, [clearAuth]);

    return { user, role, isLoading, isAuthenticated, signIn, signOut };
}
