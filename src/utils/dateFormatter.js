/**
 * @module utils/dateFormatter
 * @description Arabic-aware date and time formatting utilities.
 * All user-facing dates must go through these helpers — no inline Date formatting in components.
 */

/** Arabic day names */
const AR_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/** Arabic month names */
const AR_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

/**
 * Format a date string as Arabic long-form date.
 * @param {string|Date} dateInput  e.g. '2026-03-08'
 * @returns {string}               e.g. 'الأحد، 8 مارس 2026'
 */
export function formatDateArabic(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    const day = AR_DAYS[date.getDay()];
    const month = AR_MONTHS[date.getMonth()];
    return `${day}، ${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * Format a date string as short Arabic date (no day name).
 * @param {string|Date} dateInput
 * @returns {string}  e.g. '8 مارس 2026'
 */
export function formatDateShortArabic(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);
    return `${date.getDate()} ${AR_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a time string (HH:MM or HH:MM:SS) for display.
 * @param {string} timeInput  e.g. '09:30:00'
 * @returns {string}          e.g. '9:30 ص'
 */
export function formatTimeArabic(timeInput) {
    if (!timeInput) return '';
    const [h, m] = timeInput.split(':').map(Number);
    const period = h < 12 ? 'ص' : 'م';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Format a UTC timestamp as a relative Arabic time string ("منذ X دقيقة").
 * @param {string|Date} dateInput
 * @returns {string}
 */
export function formatRelativeArabic(dateInput) {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'الآن';
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `منذ ${diffHrs} ساعة`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `منذ ${diffDays} يوم`;
    return formatDateShortArabic(dateInput);
}
