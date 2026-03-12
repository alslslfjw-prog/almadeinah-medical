/**
 * @module store/cartStore
 * @description Zustand store for the booking cart / appointment selection state.
 * 
 * Holds the in-progress booking data as the patient navigates the appointment flow.
 * Cleared after a successful booking.
 */

import { create } from 'zustand';

const useCartStore = create((set) => ({
    /** @type {'doctors' | 'scans' | 'clinics' | 'examinations' | null} */
    bookingType: null,

    /** The primary entity being booked (doctor object, scan object, etc.) */
    selectedItem: null,

    /** Selected appointment date string (YYYY-MM-DD) */
    selectedDate: null,

    /** Selected appointment time string (HH:MM) */
    selectedTime: null,

    /** Payment method selected at checkout */
    paymentMethod: 'center',

    /**
     * Begin a new booking flow.
     * @param {'doctors' | 'scans' | 'clinics' | 'examinations'} type
     * @param {object} item - The doctor, scan, etc. being booked
     */
    initBooking: (type, item) =>
        set({ bookingType: type, selectedItem: item, selectedDate: null, selectedTime: null }),

    setDate: (date) => set({ selectedDate: date }),
    setTime: (time) => set({ selectedTime: time }),
    setPaymentMethod: (method) => set({ paymentMethod: method }),

    /** Clear cart after successful booking or cancellation. */
    clearCart: () =>
        set({
            bookingType: null,
            selectedItem: null,
            selectedDate: null,
            selectedTime: null,
            paymentMethod: 'center',
        }),
}));

export default useCartStore;
