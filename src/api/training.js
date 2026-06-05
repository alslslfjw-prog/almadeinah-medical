/**
 * @module api/training
 * @description All Supabase data operations for the Training & Qualifications feature.
 *
 * Tables:
 *   - training_courses    (id uuid, title, slug, description, cover_image, duration,
 *                          schedule, location, seats, deadline date, topics jsonb,
 *                          status text, form_schema jsonb, created_by uuid, created_at, updated_at)
 *   - training_applications (id uuid, course_id uuid, applicant_name, applicant_phone,
 *                             applicant_email, answers jsonb, file_attachments jsonb,
 *                             status text, admin_notes, wa_notification_sent bool,
 *                             wa_notification_sent_at, wa_notification_error, submitted_at, updated_at)
 *
 * Submission (file upload + WhatsApp) is handled by the Edge Function `training-apply`.
 */

import { supabase } from '../lib/supabaseClient';

// ─── COURSES — PUBLIC ──────────────────────────────────────────────────────────

/**
 * Fetch all published courses (public listing).
 */
export async function getPublishedCourses() {
    const { data, error } = await supabase
        .from('training_courses')
        .select('id, title, slug, description, cover_image, duration, schedule, location, seats, deadline, topics, status, created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
    return { data, error };
}

/**
 * Fetch a single course by slug (public detail page).
 * Used for applicant-facing detail/form page.
 */
export async function getCourseBySlug(slug) {
    const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('slug', slug)
        .in('status', ['published', 'closed'])
        .single();
    return { data, error };
}

/**
 * Fetch a course by slug for admin preview (bypasses status filter).
 */
export async function getCourseBySlugAdmin(slug) {
    const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('slug', slug)
        .single();
    return { data, error };
}

/**
 * Count accepted/pending applications for a course (to check seat availability).
 * @param {string} courseId
 */
export async function getCourseApplicationCount(courseId) {
    const { count, error } = await supabase
        .from('training_applications')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .in('status', ['pending', 'reviewed', 'accepted', 'waitlisted']);
    return { count: count ?? 0, error };
}

// ─── COURSES — ADMIN ───────────────────────────────────────────────────────────

/**
 * Fetch ALL courses for the admin dashboard (all statuses).
 */
export async function getAllCourses() {
    const { data, error } = await supabase
        .from('training_courses')
        .select('id, title, slug, duration, deadline, status, seats, created_at')
        .order('created_at', { ascending: false });
    return { data, error };
}

/**
 * Fetch a single course by ID (admin edit form).
 * @param {string} id uuid
 */
export async function getCourseById(id) {
    const { data, error } = await supabase
        .from('training_courses')
        .select('*')
        .eq('id', id)
        .single();
    return { data, error };
}

/**
 * Create a new training course.
 * @param {object} payload
 */
export async function createCourse(payload) {
    const { data, error } = await supabase
        .from('training_courses')
        .insert([sanitizeCoursePayload(payload)])
        .select()
        .single();
    return { data, error };
}

/**
 * Update an existing training course.
 * @param {string} id uuid
 * @param {object} updates
 */
export async function updateCourse(id, updates) {
    const { data, error } = await supabase
        .from('training_courses')
        .update({ ...sanitizeCoursePayload(updates), updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

/**
 * Delete a training course permanently.
 * @param {string} id uuid
 */
export async function deleteCourse(id) {
    const { error } = await supabase
        .from('training_courses')
        .delete()
        .eq('id', id);
    return { error };
}

/**
 * Upload a course cover image to Supabase Storage.
 * Bucket: training-uploads (public images folder)
 * @param {File} file
 */
export async function uploadCoverImage(file) {
    try {
        const ext = file.name.split('.').pop();
        const filename = `covers/cover-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
            .from('training-uploads')
            .upload(filename, file, { upsert: true, contentType: file.type });
        if (uploadError) return { url: null, error: uploadError };
        const { data } = supabase.storage.from('training-uploads').getPublicUrl(filename);
        return { url: data.publicUrl, error: null };
    } catch (err) {
        return { url: null, error: err };
    }
}

// ─── APPLICATIONS — ADMIN ──────────────────────────────────────────────────────

/**
 * Fetch all applications for a specific course.
 * @param {string} courseId uuid
 */
export async function getApplicationsForCourse(courseId) {
    const { data, error } = await supabase
        .from('training_applications')
        .select('id, course_id, applicant_name, applicant_phone, applicant_email, answers, file_attachments, status, admin_notes, wa_notification_sent, wa_notification_sent_at, wa_notification_error, submitted_at')
        .eq('course_id', courseId)
        .order('submitted_at', { ascending: false });
    return { data, error };
}

/**
 * Update an application's status or admin notes.
 * @param {string} id uuid
 * @param {{ status?: string, admin_notes?: string }} updates
 */
export async function updateApplication(id, updates) {
    const { data, error } = await supabase
        .from('training_applications')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
    return { data, error };
}

/**
 * Get a signed URL for a private file attachment.
 * Bucket: training-application-uploads (applicant file uploads — set by the Edge Function)
 * @param {string} filePath — path relative to the bucket root
 * @param {number} [expiresIn=3600] — seconds
 */
export async function getSignedUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage
        .from('training-application-uploads')
        .createSignedUrl(filePath, expiresIn);
    return { url: data?.signedUrl ?? null, error };
}

// ─── APPLICATIONS — PUBLIC (via Edge Function) ─────────────────────────────────

/**
 * Submit a training course application.
 * Calls the `training-apply` Edge Function which handles:
 *   - File uploads to Storage
 *   - INSERT into training_applications
 *   - WhatsApp notification
 *
 * @param {string} courseId
 * @param {{ applicant_name: string, applicant_phone: string, applicant_email?: string }} identity
 * @param {Record<string, string|string[]>} answers - keyed by field.id from form_schema
 * @param {Record<string, File>} files - keyed by field.id, value is File object
 * @returns {Promise<{ success: boolean, applicationId?: string, error?: string }>}
 */
export async function submitApplication(courseId, identity, answers, files) {
    try {
        const formData = new FormData();
        formData.append('course_id', courseId);
        formData.append('applicant_name', identity.applicant_name);
        formData.append('applicant_phone', identity.applicant_phone);
        if (identity.applicant_email) {
            formData.append('applicant_email', identity.applicant_email);
        }
        formData.append('answers', JSON.stringify(answers));

        // Append each file with its field ID as the key
        for (const [fieldId, file] of Object.entries(files)) {
            formData.append(`file_${fieldId}`, file, file.name);
        }

        const { data: { session } } = await supabase.auth.getSession();
        const headers = {};
        if (session?.access_token) {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/training-apply`,
            { method: 'POST', headers, body: formData }
        );
        const json = await res.json();
        if (!res.ok) {
            return { success: false, error: json.error ?? 'حدث خطأ غير متوقع' };
        }
        return { success: true, applicationId: json.application_id };
    } catch (err) {
        return { success: false, error: err.message ?? 'تعذّر الاتصال بالخادم' };
    }
}

// ─── INTERNAL HELPERS ──────────────────────────────────────────────────────────

function sanitizeCoursePayload(p) {
    return {
        title:       p.title?.trim()       ?? '',
        slug:        p.slug?.trim()        ?? '',
        description: p.description?.trim() ?? null,
        cover_image: p.cover_image         ?? null,
        duration:    p.duration?.trim()    ?? null,
        schedule:    p.schedule?.trim()    ?? null,
        location:    p.location?.trim()    ?? null,
        seats:       p.seats              ?? null,
        deadline:    p.deadline            ?? null,
        topics:      p.topics              ?? [],
        status:      p.status              ?? 'draft',
        form_schema: p.form_schema         ?? [],
    };
}
