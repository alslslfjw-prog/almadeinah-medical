/**
 * TrainingCourseEditor.jsx — Admin Create / Edit Course Page
 *
 * Routes:
 *   /dashboard/admin/training/new       → create mode
 *   /dashboard/admin/training/:id/edit  → edit mode (loads course by ID)
 *
 * Two-panel layout:
 *   Left  — Course details (title, slug, image, description, meta)
 *   Right — FormBuilder (drag-and-drop form schema editor)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    Save, Loader2, ArrowRight, GraduationCap, Image as ImageIcon,
    Upload, Tag, X, Globe, EyeOff, Lock, ChevronDown, AlertTriangle
} from 'lucide-react';
import {
    getCourseById, createCourse, updateCourse, uploadCoverImage
} from '../../../api/training';
import FormBuilder from '../../../components/FormBuilder';
import { generateSlug } from '../../../utils/slugify';

// ── Constants ─────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
    title: '',
    slug: '',
    description: '',
    cover_image: '',
    duration: '',
    schedule: '',
    location: '',
    seats: '',
    deadline: '',
    topics: [],
    status: 'draft',
    form_schema: [],
};

const STATUS_OPTIONS = [
    { value: 'draft',     label: 'مسودة',          icon: EyeOff, color: 'text-amber-600' },
    { value: 'published', label: 'منشور للعامة',   icon: Globe,  color: 'text-green-600' },
    { value: 'closed',    label: 'مغلق التسجيل',   icon: Lock,   color: 'text-slate-500' },
];

const inputCls = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition';

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainingCourseEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [form, setForm] = useState(EMPTY_FORM);
    const [imgFile, setImgFile] = useState(null);
    const [imgPrev, setImgPrev] = useState('');
    const [topicInput, setTopicInput] = useState('');

    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);

    // Load course for editing
    const loadCourse = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const { data, error } = await getCourseById(id);
        setLoading(false);
        if (error || !data) { navigate('/dashboard/admin/training'); return; }

        setForm({
            title:       data.title       ?? '',
            slug:        data.slug        ?? '',
            description: data.description ?? '',
            cover_image: data.cover_image ?? '',
            duration:    data.duration    ?? '',
            schedule:    data.schedule    ?? '',
            location:    data.location    ?? '',
            seats:       data.seats       ?? '',
            deadline:    data.deadline    ?? '',
            topics:      data.topics      ?? [],
            status:      data.status      ?? 'draft',
            form_schema: data.form_schema ?? [],
        });
        setImgPrev(data.cover_image ?? '');
        setSlugTouched(true); // don't auto-regenerate slug in edit mode
    }, [id, navigate]);

    useEffect(() => { loadCourse(); }, [loadCourse]);

    // ── Field handlers ────────────────────────────────────────────────────────
    const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    const handleTitleChange = (val) => {
        setField('title', val);
        if (!slugTouched) {
            setField('slug', generateSlug(val));
        }
    };

    const handleSlugChange = (val) => {
        setSlugTouched(true);
        setField('slug', val.toLowerCase().replace(/\s/g, '-').replace(/[^a-z0-9-]/g, ''));
    };

    const handleImgChange = (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setImgFile(f);
        setImgPrev(URL.createObjectURL(f));
    };

    const addTopic = () => {
        const t = topicInput.trim();
        if (!t || form.topics.includes(t)) return;
        setField('topics', [...form.topics, t]);
        setTopicInput('');
    };

    const removeTopic = (t) => setField('topics', form.topics.filter(x => x !== t));

    const handleSchemaChange = (newSchema) => setField('form_schema', newSchema);

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveError('');
        if (!form.title.trim())  { setSaveError('عنوان البرنامج مطلوب'); return; }
        if (!form.slug.trim())   { setSaveError('الرابط المختصر (slug) مطلوب'); return; }

        setSaving(true);

        let coverUrl = form.cover_image;
        if (imgFile) {
            const { url, error: uploadErr } = await uploadCoverImage(imgFile);
            if (uploadErr) { setSaving(false); setSaveError('فشل رفع الصورة: ' + uploadErr.message); return; }
            coverUrl = url;
        }

        const payload = {
            ...form,
            cover_image: coverUrl || null,
            seats: form.seats ? parseInt(form.seats, 10) : null,
            deadline: form.deadline || null,
        };

        const { error } = isEdit
            ? await updateCourse(id, payload)
            : await createCourse(payload);

        setSaving(false);
        if (error) { setSaveError(error.message ?? 'حدث خطأ أثناء الحفظ'); return; }
        navigate('/dashboard/admin/training');
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-24" dir="rtl">
                <Loader2 size={30} className="animate-spin text-teal-500" />
            </div>
        );
    }

    const currentStatus = STATUS_OPTIONS.find(o => o.value === form.status) ?? STATUS_OPTIONS[0];
    const StatusIcon = currentStatus.icon;

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Page Header ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to="/dashboard/admin/training"
                        className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                    >
                        <ArrowRight size={18} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                        <GraduationCap size={20} className="text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">
                            {isEdit ? 'تعديل البرنامج' : 'برنامج تدريبي جديد'}
                        </h1>
                        <p className="text-sm text-slate-400">
                            {isEdit ? `تعديل: ${form.title || '—'}` : 'أنشئ برنامجاً جديداً ونموذج تسجيله'}
                        </p>
                    </div>
                </div>

                {/* Save button + error */}
                <div className="flex items-center gap-3">
                    {saveError && (
                        <p className="text-xs text-red-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={13} /> {saveError}
                        </p>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-bold px-6 py-2.5 rounded-xl transition shadow-md shadow-teal-200 text-sm"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saving ? 'جارٍ الحفظ...' : 'حفظ البرنامج'}
                    </button>
                </div>
            </div>

            {/* ── Two-Panel Grid ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">

                {/* ── LEFT: Course Details ───────────────────────────────────── */}
                <div className="space-y-5">

                    {/* Cover Image */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                        <h2 className="font-extrabold text-slate-700 text-sm mb-4 border-r-4 border-teal-500 pr-3">
                            صورة الغلاف
                        </h2>
                        <div className="flex items-center gap-5">
                            <div className="w-28 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-teal-100 to-blue-100 shrink-0 flex items-center justify-center">
                                {imgPrev
                                    ? <img src={imgPrev} alt="cover" className="w-full h-full object-cover" />
                                    : <ImageIcon size={28} className="text-teal-300" />}
                            </div>
                            <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 px-4 py-2.5 rounded-xl text-sm font-bold transition">
                                <Upload size={16} />
                                {imgPrev ? 'تغيير الصورة' : 'رفع صورة'}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImgChange} />
                            </label>
                        </div>
                    </div>

                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                        <h2 className="font-extrabold text-slate-700 text-sm border-r-4 border-teal-500 pr-3">
                            معلومات البرنامج
                        </h2>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">
                                عنوان البرنامج <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.title}
                                onChange={e => handleTitleChange(e.target.value)}
                                placeholder="مثال: دورة التمريض الاحترافي المتقدم"
                                className={inputCls}
                            />
                        </div>

                        {/* Slug */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">
                                الرابط المختصر (Slug) <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-400">
                                <span className="px-3 text-xs text-slate-400 font-mono whitespace-nowrap border-l border-slate-200 py-3">/training/</span>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={e => handleSlugChange(e.target.value)}
                                    placeholder="course-slug"
                                    className="flex-1 bg-transparent py-3 px-3 text-sm font-mono focus:outline-none"
                                    dir="ltr"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">يُستخدم في رابط الصفحة. يُنشأ تلقائياً من العنوان.</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">وصف البرنامج</label>
                            <textarea
                                rows={4}
                                value={form.description}
                                onChange={e => setField('description', e.target.value)}
                                placeholder="اكتب وصفاً تفصيلياً للبرنامج، أهدافه، والفئة المستهدفة..."
                                className={`${inputCls} resize-none`}
                            />
                        </div>

                        {/* Duration + Schedule (2-col) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">المدة</label>
                                <input type="text" value={form.duration} onChange={e => setField('duration', e.target.value)} placeholder="مثال: ٣ أشهر" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">الجدول الزمني</label>
                                <input type="text" value={form.schedule} onChange={e => setField('schedule', e.target.value)} placeholder="مثال: السبت والثلاثاء ٦-٨ م" className={inputCls} />
                            </div>
                        </div>

                        {/* Location + Seats (2-col) */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">المكان</label>
                                <input type="text" value={form.location} onChange={e => setField('location', e.target.value)} placeholder="مثال: مركز المدينة الطبي" className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-1.5">عدد المقاعد</label>
                                <input type="number" min="0" value={form.seats} onChange={e => setField('seats', e.target.value)} placeholder="اتركه فارغاً = غير محدود" className={inputCls} />
                            </div>
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">آخر موعد للتسجيل</label>
                            <input type="date" value={form.deadline} onChange={e => setField('deadline', e.target.value)} className={inputCls} />
                        </div>

                        {/* Topics */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">
                                <Tag size={13} className="inline mb-0.5 ml-1 text-teal-500" />
                                المحاور والموضوعات
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={topicInput}
                                    onChange={e => setTopicInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                                    placeholder="اكتب موضوعاً واضغط Enter"
                                    className={`${inputCls} flex-1`}
                                />
                                <button onClick={addTopic} className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition">
                                    إضافة
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {form.topics.map(t => (
                                    <span key={t} className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 font-semibold text-xs px-3 py-1.5 rounded-full border border-teal-100">
                                        {t}
                                        <button onClick={() => removeTopic(t)} className="text-teal-400 hover:text-red-500 transition">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                                {form.topics.length === 0 && (
                                    <p className="text-xs text-slate-400 italic">لا توجد موضوعات بعد</p>
                                )}
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">حالة البرنامج</label>
                            <div className="relative">
                                <select
                                    value={form.status}
                                    onChange={e => setField('status', e.target.value)}
                                    className={`${inputCls} appearance-none`}
                                >
                                    {STATUS_OPTIONS.map(o => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                                <StatusIcon size={15} className={`absolute left-10 top-1/2 -translate-y-1/2 pointer-events-none ${currentStatus.color}`} />
                                <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                                {form.status === 'draft' && 'المسودة غير مرئية للزوار. انشر البرنامج عند الجاهزية.'}
                                {form.status === 'published' && 'البرنامج مرئي للعموم ونموذج التسجيل مفعّل.'}
                                {form.status === 'closed' && 'يظهر البرنامج لكن التسجيل مغلق.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Form Builder ────────────────────────────────────── */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h2 className="font-extrabold text-slate-700 text-sm mb-4 border-r-4 border-teal-500 pr-3">
                        بناء نموذج التسجيل
                    </h2>
                    <p className="text-xs text-slate-400 mb-5 leading-relaxed">
                        صمّم نموذج التسجيل الخاص بهذا البرنامج. الحقول الأساسية (الاسم، الجوال، البريد) تُجمَع تلقائياً دائماً.
                        أضف هنا الأسئلة الإضافية المخصصة.
                    </p>
                    <FormBuilder
                        schema={form.form_schema}
                        onChange={handleSchemaChange}
                        courseTitle={form.title}
                    />
                </div>

            </div>
        </div>
    );
}
