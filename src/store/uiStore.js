/**
 * @module store/uiStore
 * @description Zustand store for global UI state — toasts, modals, loading overlays.
 */

import { create } from 'zustand';

const useUiStore = create((set, get) => ({
    // ─── Toast Notifications ──────────────────────────────────────────────────
    /** @type {Array<{ id: string, type: 'success'|'error'|'info', message: string }>} */
    toasts: [],

    /**
     * Show a toast notification (auto-dismissed after `duration` ms).
     * @param {{ type?: 'success'|'error'|'info', message: string, duration?: number }} opts
     */
    addToast: ({ type = 'info', message, duration = 4000 }) => {
        const id = `toast-${Date.now()}`;
        set((state) => ({ toasts: [...state.toasts, { id, type, message }] }));
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
        }, duration);
    },

    removeToast: (id) =>
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

    // ─── Global Loading Overlay ───────────────────────────────────────────────
    isGlobalLoading: false,
    setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

    // ─── Modal ────────────────────────────────────────────────────────────────
    /** @type {{ id: string, props: object } | null} */
    activeModal: null,
    openModal: (id, props = {}) => set({ activeModal: { id, props } }),
    closeModal: () => set({ activeModal: null }),
}));

export default useUiStore;
