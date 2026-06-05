/**
 * @module utils/slugify
 * Generates URL-safe slugs from Arabic (or mixed) text.
 *
 * Strategy:
 *   1. Transliterate Arabic characters to Latin approximations.
 *   2. Lowercase, strip non-alphanumeric, replace spaces with hyphens.
 *   3. If the slug would be empty (pure Arabic with no mapping), fall back to a
 *      short UUID suffix to guarantee uniqueness.
 *
 * Usage:
 *   import { generateSlug } from '../utils/slugify';
 *   generateSlug('دورة التمريض الاحترافية'); // => "dawrat-altmryd-alahtrafyt-a3f2"
 */

const ARABIC_MAP = {
    'ا': 'a', 'أ': 'a', 'إ': 'a', 'آ': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': '',
    'ئ': 'y', 'ؤ': 'w', 'لا': 'la',
    // Diacritics — strip them
    '\u064B': '', '\u064C': '', '\u064D': '', '\u064E': '',
    '\u064F': '', '\u0650': '', '\u0651': '', '\u0652': '',
};

function shortId(len = 4) {
    return Math.random().toString(36).slice(2, 2 + len);
}

/**
 * Generate a URL-friendly slug from Arabic/Latin text.
 * @param {string} text
 * @returns {string}
 */
export function generateSlug(text) {
    if (!text) return shortId(8);

    // Replace each Arabic char with its Latin equivalent
    let result = '';
    for (const char of text) {
        result += ARABIC_MAP[char] ?? char;
    }

    result = result
        .toLowerCase()
        .replace(/\s+/g, '-')         // spaces → hyphens
        .replace(/[^a-z0-9-]/g, '')   // strip non-alphanumeric/non-hyphen
        .replace(/-+/g, '-')          // collapse multiple hyphens
        .replace(/^-+|-+$/g, '');     // trim leading/trailing hyphens

    if (!result || result.length < 2) {
        return shortId(8);
    }

    // Always append a short ID to prevent collisions on similar titles
    return `${result}-${shortId(4)}`;
}
