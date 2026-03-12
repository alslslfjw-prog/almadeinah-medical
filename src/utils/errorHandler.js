/**
 * @module utils/errorHandler
 * @description Centralized Supabase error message parser.
 * Translates Supabase/PostgREST error codes into user-friendly Arabic messages.
 */

/** Map of Supabase/PostgREST error codes to Arabic user messages. */
const ERROR_MESSAGES = {
    // Auth errors
    'invalid_credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'email_not_confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً.',
    'user_already_exists': 'هذا البريد الإلكتروني مسجل بالفعل.',
    'weak_password': 'كلمة المرور ضعيفة. يجب أن تكون 8 أحرف على الأقل.',
    // Database / RLS errors
    '42501': 'ليس لديك صلاحية للوصول إلى هذه البيانات.',
    '23503': 'لا يمكن تنفيذ هذه العملية — البيانات مرتبطة بسجلات أخرى.',
    '23505': 'هذا السجل موجود بالفعل.',
    'PGRST116': 'لم يتم العثور على النتيجة المطلوبة.',
    // Network
    'Failed to fetch': 'تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.',
};

/**
 * Parse a Supabase error object (or plain Error) and return a user-friendly Arabic message.
 * @param {object|Error|null} error
 * @returns {string}
 */
export function parseSupabaseError(error) {
    if (!error) return '';

    const code = error.code || error.error_code || error.message || '';

    // Check error map
    for (const [key, msg] of Object.entries(ERROR_MESSAGES)) {
        if (code.includes(key)) return msg;
    }

    // Fallback to raw message (dev-mode)
    if (import.meta.env.DEV) {
        console.error('[Supabase Error]', error);
    }

    return error.message || 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.';
}
