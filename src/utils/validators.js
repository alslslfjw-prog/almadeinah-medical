/**
 * @module utils/validators
 * @description Pure form validation helpers. No side-effects.
 */

/**
 * Validate a Yemeni/Saudi mobile phone number (basic).
 * Accepts formats: 7xxxxxxxx, 05xxxxxxxx, +9675xxxxxxxx
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
    const cleaned = phone.replace(/\s+/g, '');
    return /^(\+?967|0)?7[0-9]{8}$/.test(cleaned) ||
        /^(\+?966|0)?5[0-9]{8}$/.test(cleaned);
}

/**
 * Validate a standard email address.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/**
 * Ensure a password meets minimum security requirements.
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
export function validatePassword(password) {
    if (!password || password.length < 8) {
        return { valid: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' };
    }
    return { valid: true, message: '' };
}

/**
 * Validate that a date string is not in the past.
 * @param {string} dateStr  e.g. '2026-03-10'
 * @returns {boolean}
 */
export function isFutureDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
}

/**
 * Check that a required string field is non-empty.
 * @param {string} value
 * @returns {boolean}
 */
export function isRequired(value) {
    return typeof value === 'string' && value.trim().length > 0;
}
