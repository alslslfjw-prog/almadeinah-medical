/**
 * TrainingDetails.jsx — Public Course Detail Page + Dynamic Application Form
 *
 * Route: /training/:slug
 * Supports ?preview=true for admin draft previewing (bypasses status check).
 *
 * Layout:
 *   Desktop: two-column (course info left, sticky application form right)
 *   Mobile:  stacked (info first, form below)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
    Clock, MapPin, Users, Calendar, Tag, ChevronRight,
    GraduationCap, AlertTriangle, Loader2, Send
} from 'lucide-react';
import { getCourseBySlug, getCourseBySlugAdmin, getCourseApplicationCount, submitApplication } from '../api/training';
import DynamicFormRenderer from '../components/DynamicFormRenderer';
import ApplicationSuccessView from '../components/ApplicationSuccessView';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeadlineStatus(deadline) {
    if (!deadline) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    const diff = Math.ceil((dl - today) / 86400000);
    if (diff < 0)  return { label: 'انتهت مدة التسجيل', color: 'text-slate-500', urgent: false, closed: true };
    if (diff === 0) return { label: 'آخر يوم للتسجيل!', color: 'text-red-600', urgent: true, closed: false };
    if (diff <= 7)  return { label: `ينتهي التسجيل خلال ${diff} أيام`, color: 'text-orange-600', urgent: true, closed: false };
    return { label: `آخر موعد للتسجيل: ${new Date(deadline).toLocaleDateString('ar-YE', { day: 'numeric', month: 'long' })}`, color: 'text-slate-600', urgent: false, closed: false };
}

function validateForm(identity, schema, answers, files) {
    const errs = {};
    if (!identity.applicant_name.trim()) errs._name = 'الاسم الكامل مطلوب';
    if (!identity.applicant_phone.trim()) errs._phone = 'رقم الجوال مطلوب';
    else if (!/^\d{7,12}$/.test(identity.applicant_phone.replace(/\s/g, ''))) errs._phone = 'يرجى إدخال رقم جوال صحيح';

    for (const field of schema) {
        if (!field.required) continue;
        if (field.type === 'file') {
            if (!files[field.id]) errs[field.id] = 'هذا الملف مطلوب';
        } else if (field.type === 'checkbox') {
            if (!answers[field.id] || answers[field.id] !== 'true') errs[field.id] = 'يرجى الموافقة على هذا البند';
        } else {
            if (!answers[field.id]?.toString().trim()) errs[field.id] = 'هذا الحقل مطلوب';
        }
    }
    return errs;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainingDetails() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const isPreview = searchParams.get('preview') === 'true';

    const [course, setCourse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [seatsLeft, setSeatsLeft] = useState(null);

    // Form state
    const [identity, setIdentity] = useState({ applicant_name: '', applicant_phone: '' });
    const [answers, setAnswers] = useState({});
    const [files, setFiles] = useState({});
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const fetchCourse = useCallback(async () => {
        setLoading(true);
        const fetchFn = isPreview ? getCourseBySlugAdmin : getCourseBySlug;
        const { data, error } = await fetchFn(slug);
        setLoading(false);
        if (error || !data) { setNotFound(true); return; }
        setCourse(data);

        // Check seat availability
        if (data.seats) {
            const { count } = await getCourseApplicationCount(data.id);
            setSeatsLeft(data.seats - count);
        }
    }, [slug, isPreview]);

    useEffect(() => { fetchCourse(); }, [fetchCourse]);

    // ── Form Handlers ─────────────────────────────────────────────────────────
    const handleIdentity = (key, val) => setIdentity(prev => ({ ...prev, [key]: val }));
    const handleAnswer = (fieldId, val) => setAnswers(prev => ({ ...prev, [fieldId]: val }));
    const handleFile = (fieldId, file) => setFiles(prev => ({ ...prev, [fieldId]: file }));

    const handleSubmit = async () => {
        const schema = course?.form_schema ?? [];
        const errs = validateForm(identity, schema, answers, files);
        if (Object.keys(errs).length > 0) { setErrors(errs); return; }

        setErrors({});
        setSubmitting(true);
        setSubmitError('');

        const { success, error } = await submitApplication(course.id, identity, answers, files);
        setSubmitting(false);

        if (!success) { setSubmitError(error ?? 'حدث خطأ، يرجى المحاولة مجدداً'); return; }
        setSubmitted(true);
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
                <div className="flex flex-col items-center gap-3 text-slate-400">
                    <Loader2 size={36} className="animate-spin text-teal-500" />
                    <p className="text-sm font-medium">جارٍ تحميل تفاصيل البرنامج...</p>
                </div>
            </div>
        );
    }

    // ── Not Found ─────────────────────────────────────────────────────────────
    if (notFound || !course) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gray-50 text-center px-6" dir="rtl">
                <GraduationCap size={56} className="text-slate-200" />
                <h2 className="text-xl font-bold text-slate-700">لم يُعثر على هذا البرنامج</h2>
                <p className="text-slate-400 text-sm">قد يكون البرنامج غير موجود أو تم إلغاؤه.</p>
                <Link to="/training" className="bg-teal-600 text-white font-bold px-6 py-2.5 rounded-full hover:bg-teal-700 transition text-sm">
                    العودة إلى البرامج
                </Link>
            </div>
        );
    }

    const deadlineStatus = getDeadlineStatus(course.deadline);
    const isClosed = course.status === 'closed' || deadlineStatus?.closed || seatsLeft === 0;
    const schema = course.form_schema ?? [];
    const topics = course.topics ?? [];

    // ── Submitted state ───────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50" dir="rtl">
                <div className="container mx-auto px-6 py-6">
                    <ApplicationSuccessView
                        courseName={course.title}
                        phone={identity.applicant_phone}
                        onReset={() => navigate('/training')}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 font-sans" dir="rtl">

            {/* Breadcrumb */}
            <div className="bg-white border-b border-slate-100">
                <div className="container mx-auto px-6 py-3 flex items-center gap-2 text-sm text-slate-500">
                    <Link to="/" className="hover:text-teal-600 transition">الرئيسية</Link>
                    <ChevronRight size={14} className="rotate-180" />
                    <Link to="/training" className="hover:text-teal-600 transition">التدريب والتأهيل</Link>
                    <ChevronRight size={14} className="rotate-180" />
                    <span className="text-slate-800 font-semibold truncate max-w-xs">{course.title}</span>
                </div>
            </div>

            {/* ── Hero / Cover ──────────────────────────────────────────────────── */}
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-900 to-teal-600 overflow-hidden">
                {course.cover_image && (
                    <img
                        src={course.cover_image}
                        alt={course.title}
                        className="absolute inset-0 w-full h-full object-cover opacity-40"
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                {isPreview && (
                    <div className="absolute top-4 right-4 bg-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 z-10">
                        <AlertTriangle size={13} />
                        وضع المعاينة — غير منشور
                    </div>
                )}
                <div className="absolute bottom-6 right-6 left-6">
                    <div className="inline-flex items-center gap-1.5 bg-teal-400/20 backdrop-blur-sm border border-teal-300/30 text-teal-200 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                        <GraduationCap size={13} />
                        برنامج تدريبي
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight">{course.title}</h1>
                </div>
            </div>

            {/* ── Body ──────────────────────────────────────────────────────────── */}
            <div className="container mx-auto px-6 py-10">
                <div className="flex flex-col lg:flex-row gap-10">

                    {/* ── Left: Course Info ──────────────────────────────────────── */}
                    <div className="flex-1 space-y-8">

                        {/* Meta info chips */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                                { icon: Clock,    label: 'المدة',   value: course.duration },
                                { icon: Calendar, label: 'الموعد',  value: course.schedule },
                                { icon: MapPin,   label: 'المكان',  value: course.location },
                                { icon: Users,    label: 'المقاعد', value: seatsLeft !== null ? `${seatsLeft} متبقٍ` : course.seats ? `${course.seats} مقعد` : 'غير محدود' },
                            ].filter(item => item.value).map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm">
                                    <Icon size={18} className="text-teal-500 mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">{label}</p>
                                    <p className="font-bold text-slate-700 text-sm mt-0.5">{value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Deadline badge */}
                        {deadlineStatus && (
                            <div className={`flex items-center gap-2 font-semibold text-sm ${deadlineStatus.color}`}>
                                <Calendar size={16} />
                                {deadlineStatus.label}
                            </div>
                        )}

                        {/* Description */}
                        {course.description && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h2 className="font-extrabold text-slate-800 text-lg mb-4 border-r-4 border-teal-500 pr-3">
                                    عن البرنامج
                                </h2>
                                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{course.description}</p>
                            </div>
                        )}

                        {/* Topics */}
                        {topics.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                <h2 className="font-extrabold text-slate-800 text-lg mb-4 border-r-4 border-teal-500 pr-3 flex items-center gap-2">
                                    <Tag size={18} className="text-teal-500" />
                                    المحاور والموضوعات
                                </h2>
                                <div className="flex flex-wrap gap-2">
                                    {topics.map((t, i) => (
                                        <span key={i} className="bg-teal-50 text-teal-700 font-semibold text-sm px-4 py-1.5 rounded-full border border-teal-100">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Application Form ────────────────────────────────── */}
                    <div className="w-full lg:w-[420px] shrink-0">
                        <div className="lg:sticky lg:top-24">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden">

                                {/* Form header */}
                                <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5">
                                    <h2 className="font-extrabold text-white text-lg">
                                        {isClosed ? 'التسجيل مغلق' : 'سجّل الآن'}
                                    </h2>
                                    <p className="text-teal-100 text-sm mt-1">
                                        {isClosed
                                            ? 'انتهت مدة قبول الطلبات لهذا البرنامج'
                                            : 'أكمل النموذج أدناه للتسجيل في البرنامج'}
                                    </p>
                                </div>

                                {isClosed ? (
                                    <ClosedBanner seatsLeft={seatsLeft} />
                                ) : (
                                    <div className="p-6 space-y-5">
                                        {/* ── Identity Fields (always shown) ────────────────── */}
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                                الاسم الكامل <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={identity.applicant_name}
                                                onChange={e => handleIdentity('applicant_name', e.target.value)}
                                                placeholder="اكتب اسمك كاملاً"
                                                className={`w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition ${errors._name ? 'border-red-300' : 'border-slate-200'}`}
                                            />
                                            {errors._name && <p className="text-xs text-red-600 font-semibold mt-1">{errors._name}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">
                                                رقم الجوال <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex">
                                                <span className="flex items-center px-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-sm text-slate-500 font-medium whitespace-nowrap">
                                                    +967
                                                </span>
                                                <input
                                                    type="tel"
                                                    value={identity.applicant_phone}
                                                    onChange={e => handleIdentity('applicant_phone', e.target.value)}
                                                    placeholder="7xxxxxxxx"
                                                    dir="ltr"
                                                    className={`flex-1 bg-slate-50 border rounded-xl rounded-r-none px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition ${errors._phone ? 'border-red-300' : 'border-slate-200'}`}
                                                />
                                            </div>
                                            {errors._phone && <p className="text-xs text-red-600 font-semibold mt-1">{errors._phone}</p>}
                                        </div>


                                        {/* ── Dynamic Fields (seamlessly blended) ─────────── */}
                                        {schema.length > 0 && (
                                            <DynamicFormRenderer
                                                schema={schema}
                                                answers={answers}
                                                files={files}
                                                onChange={handleAnswer}
                                                onFileChange={handleFile}
                                                errors={errors}
                                                disabled={submitting}
                                            />
                                        )}

                                        {/* Submit error */}
                                        {submitError && (
                                            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-600 text-sm font-semibold">
                                                <AlertTriangle size={16} />
                                                {submitError}
                                            </div>
                                        )}

                                        {/* Submit button */}
                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-teal-200/50 text-sm"
                                        >
                                            {submitting ? (
                                                <>
                                                    <Loader2 size={18} className="animate-spin" />
                                                    جارٍ إرسال الطلب...
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={17} />
                                                    تقديم الطلب
                                                </>
                                            )}
                                        </button>
                                        <p className="text-xs text-slate-400 text-center">
                                            بالتقديم، توافق على التواصل معك عبر الجوال المُدخل
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

// ── Closed Banner ─────────────────────────────────────────────────────────────

function ClosedBanner({ seatsLeft }) {
    return (
        <div className="p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <GraduationCap size={28} className="text-slate-400" />
            </div>
            <h3 className="font-bold text-slate-700 text-base mb-2">
                {seatsLeft === 0 ? 'اكتملت المقاعد' : 'انتهى وقت التسجيل'}
            </h3>
            <p className="text-sm text-slate-500 leading-relaxed">
                {seatsLeft === 0
                    ? 'عذراً، جميع المقاعد محجوزة لهذا البرنامج.'
                    : 'انتهت مدة استقبال الطلبات. تابعونا للاطلاع على البرامج القادمة.'}
            </p>
            <Link
                to="/training"
                className="inline-block mt-5 text-teal-600 font-bold text-sm underline"
            >
                استعرض البرامج الأخرى
            </Link>
        </div>
    );
}
