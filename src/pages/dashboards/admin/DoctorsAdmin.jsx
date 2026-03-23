/**
 * DoctorsAdmin — Admin CMS screen for managing doctors.
 *
 * Features:
 *  - Searchable data table with featured (★) toggle, availability badge
 *  - Slide-in panel for Create / Edit
 *  - Visual weekly schedule builder (JSONB)
 *  - Sub-specialties chip editor (JSONB array)
 *  - Image upload to Supabase Storage
 *  - Delete with confirmation dialog
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, Star, StarOff, X, Save, Loader2,
    Search, Upload, CheckSquare, Square, User2,
} from 'lucide-react';
import {
    getDoctors, createDoctor, updateDoctor, deleteDoctor, uploadDoctorImage,
} from '../../../api/doctors';
import { getClinics } from '../../../api/clinics';

// ── Constants ─────────────────────────────────────────────────────────────────
// Seed list — used as fallback when the doctors table is empty
const SEED_CATEGORIES = [
    'باطنية', 'القلب', 'أطفال', 'نساء وولادة', 'عظام', 'أنف وأذن',
    'عيون', 'أسنان', 'تغذية', 'جراحة عامة', 'الأشعة التشخيصية',
    'مخ وأعصاب', 'أورام', 'أمراض دم', 'مسالك بولية', 'مختبر',
];

// Sentinel value for the "أخرى..." option
const OTHER = '__other__';

const AVAILABILITY_OPTIONS = [
    { value: 'active', label: 'متاح', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'inactive', label: 'غير متاح', color: 'bg-gray-100 text-gray-500' },
    { value: 'on_leave', label: 'إجازة', color: 'bg-amber-100 text-amber-700' },
];

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const EMPTY_FORM = {
    name: '',
    title: '',
    category: SEED_CATEGORIES[0],
    clinic_id: '',
    availability_status: 'active',
    image_url: '',
    bio: '',
    qualifications: '',
    sub_specialties: [],      // jsonb array
    schedule: {},             // jsonb object { day: 'HH:MM-HH:MM' }
    work_hours: '',
    shift: '',
    home_page_order: null,
    priority: 100,
    price: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a 24-hour time string ("HH:MM") to a 12-hour Arabic AM/PM string.
 * e.g. "08:00" → "08:00 ص" | "16:00" → "04:00 م"
 */
function to12hArabic(time24) {
    if (!time24) return '';
    const [hStr, mStr] = time24.split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h < 12 ? 'ص' : 'م';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Parse a stored time-range string back into {start, end} for the time inputs.
 * Handles both raw "08:00-16:00" and formatted "08:00 ص - 04:00 م" gracefully.
 */
function splitTimeRange(rangeStr) {
    if (!rangeStr) return { start: '08:00', end: '16:00' };
    // Raw format: "08:00-16:00"
    const rawMatch = rangeStr.match(/(\d{2}:\d{2})-(\d{2}:\d{2})/);
    if (rawMatch) return { start: rawMatch[1], end: rawMatch[2] };
    // Already formatted — try to extract HH:MM portions
    const parts = rangeStr.match(/(\d{2}:\d{2})/g);
    if (parts?.length >= 2) return { start: parts[0], end: parts[1] };
    return { start: '08:00', end: '16:00' };
}

function AvailBadge({ status }) {
    const opt = AVAILABILITY_OPTIONS.find(o => o.value === status) ?? AVAILABILITY_OPTIONS[1];
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${opt.color}`}>
            {opt.label}
        </span>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DoctorsAdmin() {
    const [doctors, setDoctors] = useState([]);
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [chipInput, setChipInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    // Custom category mode ("أخرى..." selected)
    const [showCustom, setShowCustom] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Featured limit alert
    const [featuredAlert, setFeaturedAlert] = useState('');

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [{ data: docs }, { data: cls }] = await Promise.all([
            getDoctors({ withClinic: true }),
            getClinics(),
        ]);
        setDoctors(docs ?? []);
        setClinics(cls ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Panel helpers ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditId(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        setImagePreview('');
        setChipInput('');
        setSaveError('');
        setShowCustom(false);
        setPanelOpen(true);
    };

    const openEdit = (doc) => {
        setEditId(doc.id);
        // Detect if this doctor's category is outside the known seed list
        const knownCats = [...new Set([...SEED_CATEGORIES, ...doctors.map(d => d.category).filter(Boolean)])];
        const isCustom = doc.category && !knownCats.includes(doc.category);
        setShowCustom(isCustom);
        setForm({
            name: doc.name ?? '',
            title: doc.title ?? '',
            category: doc.category ?? SEED_CATEGORIES[0],
            clinic_id: doc.clinic_id ?? '',
            availability_status: doc.availability_status ?? 'active',
            image_url: doc.image_url ?? '',
            bio: doc.bio ?? '',
            qualifications: doc.qualifications ?? '',
            sub_specialties: Array.isArray(doc.sub_specialties) ? doc.sub_specialties : [],
            schedule: doc.schedule && typeof doc.schedule === 'object' ? doc.schedule : {},
            work_hours: doc.work_hours ?? '',
            shift: doc.shift ?? '',
            home_page_order: doc.home_page_order ?? null,
            priority: doc.priority ?? 100,
            price: doc.price ?? 0,
        });
        setImageFile(null);
        setImagePreview(doc.image_url ?? '');
        setChipInput('');
        setSaveError('');
        setPanelOpen(true);
    };

    const closePanel = () => { setPanelOpen(false); setSaveError(''); setShowCustom(false); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // ── Image file handling ────────────────────────────────────────────────────
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    // ── Sub-specialties chips ──────────────────────────────────────────────────
    const addChip = () => {
        const val = chipInput.trim();
        if (!val || form.sub_specialties.includes(val)) { setChipInput(''); return; }
        setField('sub_specialties', [...form.sub_specialties, val]);
        setChipInput('');
    };
    const removeChip = (chip) =>
        setField('sub_specialties', form.sub_specialties.filter(c => c !== chip));

    // ── Schedule grid ─────────────────────────────────────────────────────────
    const toggleDay = (day) => {
        const sched = { ...form.schedule };
        if (sched[day] !== undefined) {
            delete sched[day];
        } else {
            // Default: 08:00 AM → 04:00 PM (formatted)
            sched[day] = `${to12hArabic('08:00')} - ${to12hArabic('16:00')}`;
        }
        setField('schedule', sched);
    };
    // Accept start + end time strings, format and store
    const setDayTime = (day, start, end) => {
        setField('schedule', {
            ...form.schedule,
            [day]: `${to12hArabic(start)} - ${to12hArabic(end)}`,
        });
    };

    // ── Featured toggle ────────────────────────────────────────────────────────
    const handleFeatured = async (doc) => {
        const isFeatured = doc.home_page_order !== null;
        let newOrder = null;

        if (!isFeatured) {
            const currentFeaturedCount = doctors.filter(d => d.home_page_order !== null).length;
            if (currentFeaturedCount >= 6) {
                setFeaturedAlert('عذراً، الحد الأقصى للأطباء المميزين في الصفحة الرئيسية هو 6 أطباء فقط');
                setTimeout(() => setFeaturedAlert(''), 4000);
                return;
            }
            const maxOrder = doctors
                .filter(d => d.home_page_order !== null)
                .reduce((m, d) => Math.max(m, d.home_page_order), 0);
            newOrder = maxOrder + 1;
        }

        const { error } = await updateDoctor(doc.id, { home_page_order: newOrder });
        if (!error) {
            setDoctors(prev => prev.map(d =>
                d.id === doc.id ? { ...d, home_page_order: newOrder } : d
            ));
        }
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveError('');
        if (!form.name.trim()) { setSaveError('اسم الطبيب مطلوب'); return; }
        if (!form.title.trim()) { setSaveError('اللقب العلمي مطلوب'); return; }

        setSaving(true);
        try {
            let imageUrl = form.image_url;

            // Upload new image if selected
            if (imageFile) {
                const { url, error: uploadErr } = await uploadDoctorImage(imageFile);
                if (uploadErr) { setSaveError('فشل رفع الصورة: ' + uploadErr.message); return; }
                imageUrl = url;
            }

            const payload = {
                name: form.name.trim(),
                title: form.title.trim(),
                category: form.category,
                clinic_id: form.clinic_id || null,
                availability_status: form.availability_status,
                image_url: imageUrl || null,
                bio: form.bio.trim() || null,
                qualifications: form.qualifications.trim() || null,
                sub_specialties: form.sub_specialties.length ? form.sub_specialties : null,
                schedule: Object.keys(form.schedule).length ? form.schedule : null,
                work_hours: form.work_hours.trim() || null,
                shift: form.shift.trim() || null,
                home_page_order: form.home_page_order,
                priority: Number(form.priority) || 100,
                price: form.price !== '' ? Number(form.price) : 0,
            };

            if (editId) {
                const { error } = await updateDoctor(editId, payload);
                if (error) { setSaveError(error.message); return; }
            } else {
                const { error } = await createDoctor(payload);
                if (error) { setSaveError(error.message); return; }
            }

            closePanel();
            await fetchAll(); // simple re-fetch — no over-engineering
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deleteDoctor(deleteTarget.id);
        setDeleting(false);
        if (!error) {
            setDoctors(prev => prev.filter(d => d.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    // ── Filtered list ─────────────────────────────────────────────────────────
    const filtered = doctors.filter(d =>
        d.name?.includes(search) ||
        d.title?.includes(search) ||
        d.category?.includes(search)
    );

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة الأطباء</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{doctors.length} طبيب في النظام</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm shadow-sm"
                >
                    <Plus size={16} /> إضافة طبيب
                </button>
            </div>

            {/* Featured limit MODAL */}
            {featuredAlert && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl mx-4 text-center">
                        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Star size={26} className="text-amber-500 fill-amber-400" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-3">تنبيه</h3>
                        <p className="text-slate-600 text-sm leading-relaxed mb-5">{featuredAlert}</p>
                        <button
                            onClick={() => setFeaturedAlert('')}
                            className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-2.5 rounded-xl font-bold transition text-sm"
                        >
                            حسناً
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative mb-5">
                <Search size={16} className="absolute top-3 right-3 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث بالاسم أو التخصص..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20 text-teal-600">
                    <Loader2 className="animate-spin" size={30} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[620px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">الطبيب</th>
                                <th className="px-4 py-3 text-right">التخصص</th>
                                <th className="px-4 py-3 text-right">العيادة</th>
                                <th className="px-4 py-3 text-right">سعر الكشف</th>
                                <th className="px-4 py-3 text-center">الحالة</th>
                                <th className="px-4 py-3 text-center">مميز</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50/50 transition">
                                    {/* Doctor info */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            {doc.image_url ? (
                                                <img src={doc.image_url} alt={doc.name}
                                                    className="w-10 h-10 rounded-full object-cover object-top border border-slate-100"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <User2 size={18} className="text-slate-400" />
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-slate-800">{doc.name}</p>
                                                <p className="text-xs text-slate-400">{doc.title}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-600">{doc.category}</td>
                                    <td className="px-4 py-3 text-slate-500">{doc.clinics?.name ?? '—'}</td>
                                    <td className="px-4 py-3 text-slate-600 font-medium">
                                        {doc.price && Number(doc.price) > 0
                                            ? `$ ${Number(doc.price).toLocaleString('en-US')}`
                                            : '—'
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <AvailBadge status={doc.availability_status} />
                                    </td>
                                    {/* Featured star */}
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleFeatured(doc)}
                                            title={doc.home_page_order !== null ? 'إزالة من المميزين' : 'تمييز على الصفحة الرئيسية'}
                                            className="p-1.5 rounded-lg hover:bg-amber-50 transition"
                                        >
                                            {doc.home_page_order !== null
                                                ? <Star size={18} className="text-amber-400 fill-amber-400" />
                                                : <StarOff size={18} className="text-slate-300 hover:text-amber-300" />
                                            }
                                        </button>
                                    </td>
                                    {/* Actions */}
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => openEdit(doc)}
                                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                            ><Pencil size={15} /></button>
                                            <button
                                                onClick={() => setDeleteTarget(doc)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            ><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={6} className="py-16 text-center text-slate-400">لا توجد نتائج</td></tr>
                            )}
                        </tbody>
                    </table>
                    </div>{/* /overflow-x-auto */}
                </div>
            )}

            {/* ── Slide-in Panel ───────────────────────────────────────────────── */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    {/* Backdrop */}
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />

                    {/* Panel */}
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        {/* Panel header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">
                                {editId ? 'تعديل بيانات الطبيب' : 'إضافة طبيب جديد'}
                            </h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form body */}
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            {/* Image upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">صورة الطبيب</label>
                                <div className="flex items-center gap-4">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="preview"
                                            className="w-20 h-20 rounded-xl object-cover object-top border border-slate-200"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center">
                                            <User2 size={28} className="text-slate-300" />
                                        </div>
                                    )}
                                    <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 px-4 py-2 rounded-lg transition text-xs font-bold">
                                        <Upload size={14} /> رفع صورة
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                </div>
                            </div>

                            {/* Name + Title */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.name}
                                        onChange={e => setField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="د. محمد علي"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اللقب العلمي <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.title}
                                        onChange={e => setField('title', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="استشاري قلب"
                                    />
                                </div>
                            </div>

                            {/* Category + Clinic */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">التخصص</label>
                                    {/* Dynamic select: seed list + unique categories from live doctors */}
                                    {(() => {
                                        const liveCats = doctors.map(d => d.category).filter(Boolean);
                                        const opts = [...new Set([...SEED_CATEGORIES, ...liveCats])].sort((a, b) => a.localeCompare(b, 'ar'));
                                        return (
                                            <>
                                                <select
                                                    value={showCustom ? OTHER : form.category}
                                                    onChange={e => {
                                                        if (e.target.value === OTHER) {
                                                            setShowCustom(true);
                                                            setField('category', '');
                                                        } else {
                                                            setShowCustom(false);
                                                            setField('category', e.target.value);
                                                        }
                                                    }}
                                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                                >
                                                    {opts.map(c => <option key={c} value={c}>{c}</option>)}
                                                    <option value={OTHER}>أخرى... (إضافة تخصص جديد)</option>
                                                </select>
                                                {showCustom && (
                                                    <input
                                                        autoFocus
                                                        value={form.category}
                                                        onChange={e => setField('category', e.target.value)}
                                                        className="mt-2 w-full border border-teal-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-teal-50 text-sm"
                                                        placeholder="اكتب التخصص الجديد..."
                                                    />
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">العيادة</label>
                                    <select
                                        value={form.clinic_id}
                                        onChange={e => setField('clinic_id', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    >
                                        <option value="">— بدون عيادة —</option>
                                        {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Availability + Priority */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                                    <select
                                        value={form.availability_status}
                                        onChange={e => setField('availability_status', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    >
                                        {AVAILABILITY_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">ترتيب الصفحة الرئيسية</label>
                                    <input
                                        type="number"
                                        value={form.home_page_order ?? ''}
                                        onChange={e => setField('home_page_order', e.target.value === '' ? null : Number(e.target.value))}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="فارغ = غير مميز"
                                    />
                                </div>
                            </div>

                            {/* Price (consultation fee in USD) */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">سعر الكشف (دولار أمريكي $)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="500"
                                    value={form.price}
                                    onChange={e => setField('price', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    placeholder="0"
                                />
                            </div>

                            {/* Work hours + Shift */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">ساعات العمل</label>
                                    <input
                                        value={form.work_hours}
                                        onChange={e => setField('work_hours', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="8 ص - 4 م"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الوردية</label>
                                    <input
                                        value={form.shift}
                                        onChange={e => setField('shift', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="صباحي / مسائي"
                                    />
                                </div>
                            </div>

                            {/* Bio */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">السيرة الذاتية</label>
                                <textarea
                                    rows={3}
                                    value={form.bio}
                                    onChange={e => setField('bio', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none"
                                    placeholder="نبذة عن الطبيب..."
                                />
                            </div>

                            {/* Qualifications */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">المؤهلات</label>
                                <textarea
                                    rows={2}
                                    value={form.qualifications}
                                    onChange={e => setField('qualifications', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none"
                                    placeholder="بكالوريوس طب، ماجستير قلب..."
                                />
                            </div>

                            {/* Sub-specialties chips */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">التخصصات الفرعية</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {form.sub_specialties.map(chip => (
                                        <span key={chip} className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-xs font-medium">
                                            {chip}
                                            <button onClick={() => removeChip(chip)} className="hover:text-red-500 transition">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        value={chipInput}
                                        onChange={e => setChipInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addChip())}
                                        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="اكتب تخصصاً ثم اضغط Enter أو إضافة"
                                    />
                                    <button onClick={addChip} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">
                                        + إضافة
                                    </button>
                                </div>
                            </div>

                            {/* Schedule Builder */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">جدول العمل الأسبوعي</label>
                                <div className="space-y-2 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                    {DAYS.map(day => {
                                        const isOn = form.schedule[day] !== undefined;
                                        // Parse stored string back to {start, end} for the native inputs
                                        const { start, end } = isOn ? splitTimeRange(form.schedule[day]) : { start: '08:00', end: '16:00' };
                                        return (
                                            <div key={day} className="flex items-center gap-2">
                                                {/* Day toggle */}
                                                <button
                                                    onClick={() => toggleDay(day)}
                                                    className={`flex items-center gap-1.5 min-w-[90px] text-xs font-semibold transition ${isOn ? 'text-teal-700' : 'text-slate-400'}`}
                                                >
                                                    {isOn
                                                        ? <CheckSquare size={16} className="text-teal-500" />
                                                        : <Square size={16} className="text-slate-300" />
                                                    }
                                                    {day}
                                                </button>

                                                {/* Dual time pickers */}
                                                {isOn ? (
                                                    <div className="flex items-center gap-1.5 flex-1">
                                                        <input
                                                            type="time"
                                                            value={start}
                                                            onChange={e => setDayTime(day, e.target.value, end)}
                                                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                        />
                                                        <span className="text-slate-400 text-xs font-bold flex-shrink-0">—</span>
                                                        <input
                                                            type="time"
                                                            value={end}
                                                            onChange={e => setDayTime(day, start, e.target.value)}
                                                            className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-300">إجازة</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {saveError && (
                                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {saveError}
                                </p>
                            )}
                        </div>

                        {/* Panel footer */}
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={closePanel} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ───────────────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                            <Trash2 size={22} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">حذف الطبيب</h3>
                        <p className="text-slate-500 text-sm mb-5">
                            هل أنت متأكد من حذف <span className="font-bold text-slate-700">{deleteTarget.name}</span>؟ لا يمكن التراجع.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : null}
                                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
