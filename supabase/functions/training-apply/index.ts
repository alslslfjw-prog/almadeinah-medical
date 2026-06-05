import { createClient } from 'npm:@supabase/supabase-js@2';

const BUCKET_NAME = 'training-application-uploads';
const MAX_FILES = 5;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACTIVE_APPLICATION_STATUSES = ['submitted', 'under_review', 'accepted'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonRecord = Record<string, unknown>;

type UploadInput = {
  name: string;
  type: string;
  size: number;
  content: Blob;
};

type ParsedSubmission = {
  courseId: string;
  courseSlug: string;
  applicantName: string;
  applicantPhone: string;
  whatsappPhone: string;
  applicantEmail: string | null;
  answers: JsonRecord;
  files: UploadInput[];
};

type CourseRecord = {
  id: string;
  title: string;
  slug: string;
  status: string;
  seats: number | null;
  deadline: string | null;
  application_count?: number | null;
};

type AttachmentRecord = {
  bucket: string;
  path: string;
  original_name: string;
  content_type: string;
  size: number;
};

class TrainingError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'training_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonRecord : {};
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new TrainingError(`Missing required secret: ${name}`, 500, 'missing_secret');
  return value;
}

function parseJsonField(value: unknown, fallback: JsonRecord): JsonRecord {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value));
    } catch {
      throw new TrainingError('صيغة الإجابات غير صحيحة.', 400, 'invalid_answers');
    }
  }
  return asRecord(value);
}

function normalizePhone(value: unknown) {
  const raw = getString(value);
  const digits = raw.replace(/\D/g, '');
  const canonical = digits.startsWith('00') ? digits.slice(2) : digits;

  if (canonical.length < 8) {
    throw new TrainingError('رقم الهاتف غير صحيح.', 400, 'invalid_phone');
  }

  return {
    stored: canonical,
    whatsapp: raw.startsWith('+') || digits.startsWith('00') ? `+${canonical}` : canonical,
  };
}

function validateEmail(value: unknown) {
  const email = getString(value).toLowerCase();
  if (!email) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TrainingError('البريد الإلكتروني غير صحيح.', 400, 'invalid_email');
  }
  return email;
}

function safeFileName(name: string) {
  const fallback = `attachment-${crypto.randomUUID()}`;
  const fileName = name.split(/[\\/]/).pop()?.trim() || fallback;
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
  return sanitized || fallback;
}

function decodeBase64File(file: JsonRecord): UploadInput {
  const name = getString(file.name) || `attachment-${crypto.randomUUID()}`;
  const type = getString(file.type) || getString(file.contentType) || 'application/octet-stream';
  const encoded = getString(file.contentBase64) || getString(file.base64) || getString(file.data);

  if (!encoded) {
    throw new TrainingError('محتوى الملف غير موجود.', 400, 'invalid_file');
  }

  const base64 = encoded.includes(',') ? encoded.split(',').pop() ?? '' : encoded;
  let bytes: Uint8Array;

  try {
    const binary = atob(base64);
    bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    throw new TrainingError('صيغة الملف المرفق غير صحيحة.', 400, 'invalid_file');
  }

  return {
    name,
    type,
    size: bytes.byteLength,
    content: new Blob([bytes], { type }),
  };
}

function parseJsonFiles(value: unknown): UploadInput[] {
  if (!Array.isArray(value)) return [];
  return value.map((file) => decodeBase64File(asRecord(file)));
}

function formText(form: FormData, ...names: string[]) {
  for (const name of names) {
    const value = form.get(name);
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

async function parseSubmission(req: Request): Promise<ParsedSubmission> {
  const contentType = req.headers.get('Content-Type')?.toLowerCase() ?? '';
  let payload: JsonRecord = {};
  let files: UploadInput[] = [];

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    payload = {
      courseId: formText(form, 'courseId', 'course_id'),
      courseSlug: formText(form, 'courseSlug', 'course_slug', 'slug'),
      applicantName: formText(form, 'applicantName', 'applicant_name', 'name'),
      applicantPhone: formText(form, 'applicantPhone', 'applicant_phone', 'phone'),
      applicantEmail: formText(form, 'applicantEmail', 'applicant_email', 'email'),
      answers: form.get('answers'),
    };

    for (const [, value] of form.entries()) {
      if (value instanceof File && value.size > 0) {
        files.push({
          name: value.name || `attachment-${files.length + 1}`,
          type: value.type || 'application/octet-stream',
          size: value.size,
          content: value,
        });
      }
    }
  } else {
    payload = await req.json() as JsonRecord;
    files = parseJsonFiles(payload.files ?? payload.attachments);
  }

  const courseId = getString(payload.courseId ?? payload.course_id);
  const courseSlug = getString(payload.courseSlug ?? payload.course_slug ?? payload.slug);
  const applicantName = getString(payload.applicantName ?? payload.applicant_name ?? payload.name);
  const phone = normalizePhone(payload.applicantPhone ?? payload.applicant_phone ?? payload.phone);
  const applicantEmail = validateEmail(payload.applicantEmail ?? payload.applicant_email ?? payload.email);
  const answers = parseJsonField(payload.answers, {});

  if (!courseId && !courseSlug) {
    throw new TrainingError('الدورة التدريبية مطلوبة.', 400, 'missing_course');
  }
  if (!applicantName) {
    throw new TrainingError('اسم المتقدم مطلوب.', 400, 'missing_applicant_name');
  }

  if (files.length > MAX_FILES) {
    throw new TrainingError('عدد الملفات المرفقة أكبر من المسموح.', 400, 'too_many_files');
  }

  for (const file of files) {
    if (file.size > MAX_FILE_BYTES) {
      throw new TrainingError('حجم أحد الملفات المرفقة أكبر من المسموح.', 400, 'file_too_large');
    }
  }

  return {
    courseId,
    courseSlug,
    applicantName,
    applicantPhone: phone.stored,
    whatsappPhone: phone.whatsapp,
    applicantEmail,
    answers,
    files,
  };
}

async function getCourse(
  supabaseAdmin: ReturnType<typeof createClient>,
  submission: ParsedSubmission,
): Promise<CourseRecord> {
  if (submission.courseSlug) {
    const { data, error } = await supabaseAdmin
      .rpc('get_course_by_slug', { p_slug: submission.courseSlug })
      .maybeSingle();

    if (error) throw new TrainingError('تعذر قراءة بيانات الدورة التدريبية.', 500, 'course_lookup_failed');
    if (!data) throw new TrainingError('الدورة التدريبية غير موجودة أو غير متاحة.', 404, 'course_not_found');
    return data as CourseRecord;
  }

  const { data, error } = await supabaseAdmin
    .from('training_courses')
    .select('id, title, slug, status, seats, deadline')
    .eq('id', submission.courseId)
    .maybeSingle();

  if (error) throw new TrainingError('تعذر قراءة بيانات الدورة التدريبية.', 500, 'course_lookup_failed');
  if (!data) throw new TrainingError('الدورة التدريبية غير موجودة أو غير متاحة.', 404, 'course_not_found');
  return data as CourseRecord;
}

async function countActiveApplications(supabaseAdmin: ReturnType<typeof createClient>, courseId: string) {
  const { count, error } = await supabaseAdmin
    .from('training_applications')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .in('status', ACTIVE_APPLICATION_STATUSES);

  if (error) throw new TrainingError('تعذر التحقق من المقاعد المتاحة.', 500, 'seat_check_failed');
  return count ?? 0;
}

async function ensureCourseCanAcceptApplications(
  supabaseAdmin: ReturnType<typeof createClient>,
  course: CourseRecord,
) {
  if (course.status !== 'published') {
    throw new TrainingError('هذه الدورة غير متاحة للتقديم حاليا.', 409, 'course_not_open');
  }

  const today = new Date().toISOString().slice(0, 10);
  if (course.deadline && course.deadline < today) {
    throw new TrainingError('انتهى موعد التقديم لهذه الدورة.', 409, 'deadline_passed');
  }

  const activeCount = typeof course.application_count === 'number'
    ? course.application_count
    : await countActiveApplications(supabaseAdmin, course.id);

  if (course.seats !== null && activeCount >= course.seats) {
    throw new TrainingError('عذرا، اكتمل عدد المقاعد المتاحة لهذه الدورة.', 409, 'course_full');
  }
}

async function ensureRateLimit(
  supabaseAdmin: ReturnType<typeof createClient>,
  courseId: string,
  applicantPhone: string,
) {
  const { count, error } = await supabaseAdmin
    .from('training_applications')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .eq('applicant_phone', applicantPhone);

  if (error) throw new TrainingError('تعذر التحقق من عدد الطلبات السابقة.', 500, 'rate_check_failed');
  if ((count ?? 0) >= 3) {
    throw new TrainingError('لقد وصلت إلى الحد الأقصى للتقديم على هذه الدورة.', 429, 'rate_limited');
  }
}

async function uploadFiles(
  supabaseAdmin: ReturnType<typeof createClient>,
  courseId: string,
  applicationId: string,
  files: UploadInput[],
): Promise<AttachmentRecord[]> {
  const attachments: AttachmentRecord[] = [];

  for (const file of files) {
    const fileName = safeFileName(file.name);
    const path = `${courseId}/${applicationId}/${crypto.randomUUID()}-${fileName}`;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(path, file.content, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      await cleanupUploadedFiles(supabaseAdmin, attachments);
      throw new TrainingError('تعذر رفع أحد الملفات المرفقة.', 500, 'file_upload_failed');
    }

    attachments.push({
      bucket: BUCKET_NAME,
      path,
      original_name: file.name,
      content_type: file.type,
      size: file.size,
    });
  }

  return attachments;
}

async function cleanupUploadedFiles(
  supabaseAdmin: ReturnType<typeof createClient>,
  attachments: AttachmentRecord[],
) {
  const paths = attachments.map((attachment) => attachment.path).filter(Boolean);
  if (!paths.length) return;

  const { error } = await supabaseAdmin.storage.from(BUCKET_NAME).remove(paths);
  if (error) console.error('training upload cleanup failed', error.message);
}

function whatsappEnabled() {
  const raw = (
    Deno.env.get('WHATSAPP_NOTIFICATIONS_ENABLED') ??
    Deno.env.get('TRAINING_WHATSAPP_ENABLED') ??
    Deno.env.get('ULTRAMSG_ENABLED') ??
    'false'
  ).toLowerCase();
  return ['1', 'true', 'yes', 'on', 'enabled'].includes(raw);
}

function whatsappMessage(submission: ParsedSubmission, course: CourseRecord, applicationId: string) {
  const customTemplate = Deno.env.get('TRAINING_WHATSAPP_MESSAGE_TEMPLATE');
  if (customTemplate) {
    return customTemplate
      .replaceAll('{{name}}', submission.applicantName)
      .replaceAll('{{course}}', course.title)
      .replaceAll('{{application_id}}', applicationId);
  }

  return [
    `مرحبا ${submission.applicantName}`,
    `تم استلام طلبك للتقديم على دورة: ${course.title}.`,
    `رقم الطلب: ${applicationId}`,
    'سنقوم بالتواصل معك بعد مراجعة البيانات.',
  ].join('\n');
}

function timeoutMs() {
  const value = Number(Deno.env.get('TRAINING_WHATSAPP_TIMEOUT_MS') ?? '8000');
  return Number.isFinite(value) && value > 0 ? value : 8000;
}

function ultraMsgErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return 'UltraMsg request timed out.';
  }
  if (error instanceof Error) return error.message;
  return 'UltraMsg request failed.';
}

async function updateWhatsappStatus(
  supabaseAdmin: ReturnType<typeof createClient>,
  applicationId: string,
  payload: {
    sent: boolean;
    error: string | null;
  },
) {
  const { error } = await supabaseAdmin
    .from('training_applications')
    .update({
      wa_notification_sent: payload.sent,
      wa_notification_sent_at: payload.sent ? new Date().toISOString() : null,
      wa_notification_error: payload.error,
    })
    .eq('id', applicationId);

  if (error) console.error('training whatsapp status update failed', error.message);
}

async function sendWhatsappNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  applicationId: string,
  submission: ParsedSubmission,
  course: CourseRecord,
) {
  if (!whatsappEnabled()) {
    const error = 'WhatsApp notifications disabled by kill switch.';
    await updateWhatsappStatus(supabaseAdmin, applicationId, { sent: false, error });
    return { enabled: false, sent: false, error };
  }

  const instanceId = getString(Deno.env.get('ULTRAMSG_INSTANCE_ID'));
  const token = getString(Deno.env.get('ULTRAMSG_TOKEN'));

  if (!instanceId || !token) {
    const error = 'UltraMsg is enabled but ULTRAMSG_INSTANCE_ID or ULTRAMSG_TOKEN is missing.';
    await updateWhatsappStatus(supabaseAdmin, applicationId, { sent: false, error });
    return { enabled: true, sent: false, error };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());

  try {
    const response = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        token,
        to: submission.whatsappPhone,
        body: whatsappMessage(submission, course, applicationId),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responsePayload: JsonRecord = {};
    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch {
      responsePayload = { response: responseText };
    }

    if (!response.ok || responsePayload.error || responsePayload.sent === false) {
      throw new Error(`UltraMsg HTTP ${response.status}: ${responseText || response.statusText}`);
    }

    await updateWhatsappStatus(supabaseAdmin, applicationId, { sent: true, error: null });
    return { enabled: true, sent: true, error: null };
  } catch (error) {
    const message = ultraMsgErrorMessage(error);
    await updateWhatsappStatus(supabaseAdmin, applicationId, { sent: false, error: message });
    return { enabled: true, sent: false, error: message };
  } finally {
    clearTimeout(timer);
  }
}

function insertErrorStatus(error: { message?: string }) {
  const message = error.message ?? '';
  if (message.includes('الحد الأقصى')) return { status: 429, code: 'rate_limited' };
  if (message.includes('اكتمل عدد المقاعد')) return { status: 409, code: 'course_full' };
  if (message.includes('غير متاحة') || message.includes('انتهى موعد')) return { status: 409, code: 'course_not_open' };
  return { status: 500, code: 'application_create_failed' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({
      success: false,
      error: 'Method not allowed',
      error_code: 'method_not_allowed',
      details: { code: 'method_not_allowed', message: 'Method not allowed' },
    }, 405);
  }

  let uploadedAttachments: AttachmentRecord[] = [];

  try {
    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const submission = await parseSubmission(req);
    const course = await getCourse(supabaseAdmin, submission);

    await ensureCourseCanAcceptApplications(supabaseAdmin, course);
    await ensureRateLimit(supabaseAdmin, course.id, submission.applicantPhone);

    const applicationId = crypto.randomUUID();
    uploadedAttachments = await uploadFiles(supabaseAdmin, course.id, applicationId, submission.files);

    const { data: application, error: insertError } = await supabaseAdmin
      .from('training_applications')
      .insert({
        id: applicationId,
        course_id: course.id,
        applicant_name: submission.applicantName,
        applicant_phone: submission.applicantPhone,
        applicant_email: submission.applicantEmail,
        answers: submission.answers,
        file_attachments: uploadedAttachments,
        status: 'submitted',
      })
      .select('id, course_id, applicant_name, applicant_phone, applicant_email, status, file_attachments, created_at')
      .single();

    if (insertError) {
      await cleanupUploadedFiles(supabaseAdmin, uploadedAttachments);
      console.error('training application insert failed', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
      });
      const mapped = insertErrorStatus(insertError);
      throw new TrainingError(insertError.message, mapped.status, mapped.code);
    }

    const whatsapp = await sendWhatsappNotification(supabaseAdmin, applicationId, submission, course);
    console.log('training application created', { applicationId, courseId: course.id });

    return jsonResponse({
      success: true,
      application_id: applicationId,
      applicationId,
      data: {
        application,
        whatsapp,
      },
    });
  } catch (error) {
    const err = error instanceof TrainingError
      ? error
      : new TrainingError('تعذر إرسال طلب التدريب.', 500, 'unexpected_error');

    console.error('training-apply failed', {
      code: err.code,
      status: err.status,
      message: err.message,
    });

    return jsonResponse({
      success: false,
      error: err.message,
      error_code: err.code,
      details: {
        code: err.code,
        message: err.message,
      },
    }, err.status);
  }
});
