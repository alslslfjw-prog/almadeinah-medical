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
    Search, Upload, CalendarDays, Clock, User2,
} from 'lucide-react';
import {
    getDoctors, createDoctor, updateDoctor, deleteDoctor, uploadDoctorImage,
} from '../../../api/doctors';
import {
    createDoctorSchedules,
    deleteDoctorSchedule,
    getDoctorSchedules,
    updateDoctorSchedule,
} from '../../../api/doctorSchedules';
import { getClinics } from '../../../api/clinics';
import {
    SATURDAY_FIRST_WEEK_DAYS,
    getArabicDayName,
    getDatesInRange,
    toLocalDateKey,
} from '../../../utils/doctorScheduleDates';

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

const DEFAULT_RANGE_WEEKDAYS = SATURDAY_FIRST_WEEK_DAYS
    .filter(day => day.jsDay !== 5)
    .map(day => day.jsDay);

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
    home_page_order: null,
    priority: 100,
    price: 0,
};

const DEFAULT_SHIFT = {
    specific_date: toLocalDateKey(new Date()),
    start_time: '08:00',
    end_time: '16:00',
    slot_duration_minutes: 10,
    shift_label: '',
    notes: '',
};

const DEFAULT_RANGE_SHIFT = {
    start_date: toLocalDateKey(new Date()),
    end_date: toLocalDateKey(new Date()),
    start_time: '08:00',
    end_time: '16:00',
    slot_duration_minutes: 10,
    shift_label: '',
    notes: '',
    weekdays: DEFAULT_RANGE_WEEKDAYS,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert a 24-hour time string ("HH:MM") to a 12-hour Arabic AM/PM string.
 * e.g. "08:00" → "08:00 ص" | "16:00" → "04:00 م"
 */
function to12hArabic(time24) {
    if (!time24) return '';
    const [hStr, mStr] = String(time24).slice(0, 5).split(':');
    const h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    const period = h < 12 ? 'ص' : 'م';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function formatShiftTime(schedule) {
    return `${to12hArabic(schedule.start_time)} - ${to12hArabic(schedule.end_time)}`;
}

function timeToMinutes(time24) {
    if (!time24) return null;
    const [hStr, mStr] = String(time24).slice(0, 5).split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
}

function getSlotSummary(shift) {
    const start = timeToMinutes(shift.start_time);
    const end = timeToMinutes(shift.end_time);
    const duration = Number(shift.slot_duration_minutes);
    if (start === null || end === null || end <= start || !Number.isInteger(duration) || duration < 5) {
        return { count: 0, unusedMinutes: 0 };
    }

    const total = end - start;
    const count = Math.floor(total / duration);
    return {
        count,
        unusedMinutes: total - count * duration,
    };
}

function isValidSlotDuration(value) {
    const duration = Number(value);
    return Number.isInteger(duration) && duration >= 5 && duration <= 120;
}

function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
}

function getScheduleWindow() {
    const today = new Date();
    return {
        from: toLocalDateKey(today),
        to: toLocalDateKey(addDays(today, 120)),
    };
}

function mapScheduleError(error) {
    if (!error) return '';
    const message = error.message ?? String(error);
    if (
        message.includes("Could not find the table 'public.doctor_date_schedules'") ||
        message.includes('doctor_date_schedules') && message.includes('schema cache')
    ) {
        return 'جدول مواعيد الأطباء الجديد غير موجود في Supabase بعد. شغّل ملف migration ثم أعد تحميل الصفحة.';
    }
    if (message.includes('doctor_date_schedules_time_order')) {
        return 'وقت نهاية الدوام يجب أن يكون بعد وقت البداية';
    }
    if (message.includes('doctor_date_schedules_slot_duration_range') || message.includes('Slot duration must be between')) {
        return 'مدة الموعد يجب أن تكون بين 5 و120 دقيقة';
    }
    if (message.includes('active slot bookings') || message.includes('active bookings')) {
        return 'لا يمكن تعديل أو حذف هذه الوردية لأنها تحتوي على حجوزات نشطة';
    }
    if (message.includes('doctor_date_schedules_no_overlap') || message.includes('conflicting key value')) {
        return 'يوجد تعارض مع دوام آخر للطبيب في نفس التاريخ';
    }
    return message;
}

function isValidShiftTime(start, end) {
    return Boolean(start && end && end > start);
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

    // Date-based schedules
    const [doctorSchedules, setDoctorSchedules] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [singleShift, setSingleShift] = useState(DEFAULT_SHIFT);
    const [rangeShift, setRangeShift] = useState(DEFAULT_RANGE_SHIFT);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [scheduleActionLoading, setScheduleActionLoading] = useState(false);

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

    const loadSchedulesForDoctor = useCallback(async (doctorId) => {
        if (!doctorId) {
            setDoctorSchedules([]);
            return;
        }

        setSchedulesLoading(true);
        const { from, to } = getScheduleWindow();
        const { data, error } = await getDoctorSchedules(doctorId, from, to);
        if (error) setSaveError(mapScheduleError(error));
        setDoctorSchedules(data ?? []);
        setSchedulesLoading(false);
    }, []);

    // ── Panel helpers ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditId(null);
        setForm(EMPTY_FORM);
        setImageFile(null);
        setImagePreview('');
        setChipInput('');
        setSaveError('');
        setShowCustom(false);
        setDoctorSchedules([]);
        setSingleShift(DEFAULT_SHIFT);
        setRangeShift(DEFAULT_RANGE_SHIFT);
        setEditingSchedule(null);
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
            home_page_order: doc.home_page_order ?? null,
            priority: doc.priority ?? 100,
            price: doc.price ?? 0,
        });
        setImageFile(null);
        setImagePreview(doc.image_url ?? '');
        setChipInput('');
        setSaveError('');
        setSingleShift(DEFAULT_SHIFT);
        setRangeShift(DEFAULT_RANGE_SHIFT);
        setEditingSchedule(null);
        setPanelOpen(true);
        loadSchedulesForDoctor(doc.id);
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

    // ── Date-based schedules ──────────────────────────────────────────────────
    const resetScheduleInputs = () => {
        setSingleShift(DEFAULT_SHIFT);
        setRangeShift(DEFAULT_RANGE_SHIFT);
        setEditingSchedule(null);
    };

    const addPendingSchedules = (rows) => {
        setDoctorSchedules(prev => [
            ...prev,
            ...rows.map((row, index) => ({
                ...row,
                id: `pending-${Date.now()}-${index}`,
                _pending: true,
            })),
        ].sort((a, b) =>
            `${a.specific_date} ${a.start_time}`.localeCompare(`${b.specific_date} ${b.start_time}`)
        ));
    };

    const persistScheduleRows = async (rows) => {
        if (!editId) {
            addPendingSchedules(rows);
            return true;
        }

        const payload = rows.map(row => ({ ...row, doctor_id: editId }));
        const { error } = await createDoctorSchedules(payload);
        if (error) {
            setSaveError(mapScheduleError(error));
            return false;
        }
        await loadSchedulesForDoctor(editId);
        return true;
    };

    const handleAddSingleShift = async () => {
        setSaveError('');
        if (!singleShift.specific_date) { setSaveError('يرجى اختيار التاريخ'); return; }
        if (!isValidShiftTime(singleShift.start_time, singleShift.end_time)) {
            setSaveError('وقت نهاية الدوام يجب أن يكون بعد وقت البداية');
            return;
        }

        if (!isValidSlotDuration(singleShift.slot_duration_minutes)) {
            setSaveError('مدة الموعد يجب أن تكون بين 5 و120 دقيقة');
            return;
        }
        if (getSlotSummary(singleShift).count < 1) {
            setSaveError('مدة الوردية أقصر من مدة الموعد');
            return;
        }

        setScheduleActionLoading(true);
        const ok = await persistScheduleRows([singleShift]);
        setScheduleActionLoading(false);
        if (ok) setSingleShift(DEFAULT_SHIFT);
    };

    const handleAddRangeShift = async () => {
        setSaveError('');
        if (!rangeShift.start_date || !rangeShift.end_date) { setSaveError('يرجى اختيار بداية ونهاية النطاق'); return; }
        if (rangeShift.start_date > rangeShift.end_date) { setSaveError('تاريخ نهاية النطاق يجب أن يكون بعد البداية'); return; }
        if (!rangeShift.weekdays.length) { setSaveError('يرجى اختيار يوم واحد على الأقل'); return; }
        if (!isValidShiftTime(rangeShift.start_time, rangeShift.end_time)) {
            setSaveError('وقت نهاية الدوام يجب أن يكون بعد وقت البداية');
            return;
        }

        if (!isValidSlotDuration(rangeShift.slot_duration_minutes)) {
            setSaveError('مدة الموعد يجب أن تكون بين 5 و120 دقيقة');
            return;
        }
        if (getSlotSummary(rangeShift).count < 1) {
            setSaveError('مدة الوردية أقصر من مدة الموعد');
            return;
        }

        const rows = getDatesInRange(rangeShift.start_date, rangeShift.end_date)
            .filter(day => rangeShift.weekdays.includes(day.jsDay))
            .map(day => ({
                doctor_id: editId,
                specific_date: day.dateKey,
                start_time: rangeShift.start_time,
                end_time: rangeShift.end_time,
                slot_duration_minutes: rangeShift.slot_duration_minutes,
                shift_label: rangeShift.shift_label,
                notes: rangeShift.notes,
            }));

        if (!rows.length) { setSaveError('لا توجد تواريخ مطابقة للأيام المختارة داخل النطاق'); return; }

        setScheduleActionLoading(true);
        const ok = await persistScheduleRows(rows);
        setScheduleActionLoading(false);
        if (ok) setRangeShift(DEFAULT_RANGE_SHIFT);
    };

    const toggleRangeWeekday = (jsDay) => {
        setRangeShift(prev => ({
            ...prev,
            weekdays: prev.weekdays.includes(jsDay)
                ? prev.weekdays.filter(day => day !== jsDay)
                : [...prev.weekdays, jsDay],
        }));
    };

    const handleDeleteSchedule = async (schedule) => {
        setSaveError('');
        if (schedule._pending) {
            setDoctorSchedules(prev => prev.filter(item => item.id !== schedule.id));
            return;
        }

        setScheduleActionLoading(true);
        const { error } = await deleteDoctorSchedule(schedule.id);
        setScheduleActionLoading(false);
        if (error) { setSaveError(mapScheduleError(error)); return; }
        setDoctorSchedules(prev => prev.filter(item => item.id !== schedule.id));
    };

    const handleSaveScheduleEdit = async () => {
        if (!editingSchedule) return;
        setSaveError('');
        if (!editingSchedule.specific_date) { setSaveError('يرجى اختيار التاريخ'); return; }
        if (!isValidShiftTime(editingSchedule.start_time, editingSchedule.end_time)) {
            setSaveError('وقت نهاية الدوام يجب أن يكون بعد وقت البداية');
            return;
        }

        if (!isValidSlotDuration(editingSchedule.slot_duration_minutes ?? 10)) {
            setSaveError('مدة الموعد يجب أن تكون بين 5 و120 دقيقة');
            return;
        }
        if (getSlotSummary(editingSchedule).count < 1) {
            setSaveError('مدة الوردية أقصر من مدة الموعد');
            return;
        }

        if (editingSchedule._pending) {
            setDoctorSchedules(prev => prev.map(item =>
                item.id === editingSchedule.id ? editingSchedule : item
            ));
            setEditingSchedule(null);
            return;
        }

        setScheduleActionLoading(true);
        const { error } = await updateDoctorSchedule(editingSchedule.id, editingSchedule);
        setScheduleActionLoading(false);
        if (error) { setSaveError(mapScheduleError(error)); return; }
        setEditingSchedule(null);
        await loadSchedulesForDoctor(editId);
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
                home_page_order: form.home_page_order,
                priority: Number(form.priority) || 100,
                price: form.price !== '' ? Number(form.price) : 0,
            };

            if (editId) {
                const { error } = await updateDoctor(editId, payload);
                if (error) { setSaveError(error.message); return; }
            } else {
                const { data: createdDoctor, error } = await createDoctor(payload);
                if (error) { setSaveError(error.message); return; }
                const pendingSchedules = doctorSchedules
                    .filter(schedule => schedule._pending)
                    .map(schedule => ({
                        doctor_id: createdDoctor.id,
                        specific_date: schedule.specific_date,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        slot_duration_minutes: schedule.slot_duration_minutes ?? 10,
                        shift_label: schedule.shift_label,
                        notes: schedule.notes,
                    }));

                if (pendingSchedules.length) {
                    const { error: schedulesError } = await createDoctorSchedules(pendingSchedules);
                    if (schedulesError) { setSaveError(mapScheduleError(schedulesError)); return; }
                }
            }

            closePanel();
            resetScheduleInputs();
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

                            {/* Date-based schedules */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="block text-xs font-bold text-slate-500">جدول الدوام بالتاريخ</label>
                                    <span className="text-[11px] text-slate-400">الأسبوع يبدأ من السبت</span>
                                </div>

                                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-3">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">تاريخ محدد</label>
                                            <input
                                                type="date"
                                                min={toLocalDateKey(new Date())}
                                                value={singleShift.specific_date}
                                                onChange={e => setSingleShift(s => ({ ...s, specific_date: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">وصف اختياري</label>
                                            <input
                                                value={singleShift.shift_label}
                                                onChange={e => setSingleShift(s => ({ ...s, shift_label: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                placeholder="صباحي / مسائي"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">من</label>
                                            <input
                                                type="time"
                                                value={singleShift.start_time}
                                                onChange={e => setSingleShift(s => ({ ...s, start_time: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                            />
                                        </div>
                                        <span className="text-slate-400 text-xs pb-2">—</span>
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">إلى</label>
                                            <input
                                                type="time"
                                                value={singleShift.end_time}
                                                onChange={e => setSingleShift(s => ({ ...s, end_time: e.target.value }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleAddSingleShift}
                                            disabled={scheduleActionLoading}
                                            className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-60 transition"
                                        >
                                            إضافة
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-2 items-end">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">مدة الموعد</label>
                                            <input
                                                type="number"
                                                min="5"
                                                max="120"
                                                step="5"
                                                value={singleShift.slot_duration_minutes}
                                                onChange={e => setSingleShift(s => ({ ...s, slot_duration_minutes: Number(e.target.value) }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                            />
                                        </div>
                                        <div className="text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg px-3 py-2">
                                            سيتم إنشاء {getSlotSummary(singleShift).count} موعد
                                            {getSlotSummary(singleShift).unusedMinutes > 0 ? `، ويتبقى ${getSlotSummary(singleShift).unusedMinutes} دقيقة غير مستخدمة` : ''}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl p-3 border border-slate-100 space-y-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <CalendarDays size={14} className="text-teal-500" />
                                        إضافة نطاق تواريخ
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="date"
                                            min={toLocalDateKey(new Date())}
                                            value={rangeShift.start_date}
                                            onChange={e => setRangeShift(s => ({ ...s, start_date: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        />
                                        <input
                                            type="date"
                                            min={rangeShift.start_date}
                                            value={rangeShift.end_date}
                                            onChange={e => setRangeShift(s => ({ ...s, end_date: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {SATURDAY_FIRST_WEEK_DAYS.map(day => {
                                            const selected = rangeShift.weekdays.includes(day.jsDay);
                                            return (
                                                <button
                                                    key={day.jsDay}
                                                    type="button"
                                                    onClick={() => toggleRangeWeekday(day.jsDay)}
                                                    className={`px-2 py-1 rounded-lg border text-[11px] font-bold transition ${
                                                        selected
                                                            ? 'bg-teal-50 border-teal-200 text-teal-700'
                                                            : 'bg-slate-50 border-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    {day.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <input
                                            type="time"
                                            value={rangeShift.start_time}
                                            onChange={e => setRangeShift(s => ({ ...s, start_time: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        />
                                        <input
                                            type="time"
                                            value={rangeShift.end_time}
                                            onChange={e => setRangeShift(s => ({ ...s, end_time: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        />
                                    </div>
                                    <div className="grid grid-cols-[120px_1fr] gap-2 items-end">
                                        <div>
                                            <label className="block text-[11px] font-bold text-slate-500 mb-1">مدة الموعد</label>
                                            <input
                                                type="number"
                                                min="5"
                                                max="120"
                                                step="5"
                                                value={rangeShift.slot_duration_minutes}
                                                onChange={e => setRangeShift(s => ({ ...s, slot_duration_minutes: Number(e.target.value) }))}
                                                className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                            />
                                        </div>
                                        <div className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                                            سيتم إنشاء {getSlotSummary(rangeShift).count} موعد لكل يوم
                                            {getSlotSummary(rangeShift).unusedMinutes > 0 ? `، ويتبقى ${getSlotSummary(rangeShift).unusedMinutes} دقيقة غير مستخدمة` : ''}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-[1fr_auto] gap-2">
                                        <input
                                            value={rangeShift.shift_label}
                                            onChange={e => setRangeShift(s => ({ ...s, shift_label: e.target.value }))}
                                            className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                            placeholder="وصف اختياري للنطاق"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddRangeShift}
                                            disabled={scheduleActionLoading}
                                            className="bg-blue-900 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-60 transition"
                                        >
                                            إنشاء
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                        <Clock size={14} className="text-teal-500" />
                                        الورديات القادمة
                                    </div>
                                    {schedulesLoading ? (
                                        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3">جاري تحميل الورديات...</div>
                                    ) : doctorSchedules.length === 0 ? (
                                        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3">لا توجد ورديات قادمة بعد</div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {doctorSchedules.map(schedule => {
                                                const isEditing = editingSchedule?.id === schedule.id;
                                                const slotSummary = getSlotSummary(schedule);
                                                return (
                                                    <div key={schedule.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2">
                                                        {isEditing ? (
                                                            <>
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                    <input
                                                                        type="date"
                                                                        value={editingSchedule.specific_date}
                                                                        onChange={e => setEditingSchedule(s => ({ ...s, specific_date: e.target.value }))}
                                                                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                                    />
                                                                    <input
                                                                        type="time"
                                                                        value={editingSchedule.start_time?.slice(0, 5)}
                                                                        onChange={e => setEditingSchedule(s => ({ ...s, start_time: e.target.value }))}
                                                                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                                    />
                                                                    <input
                                                                        type="time"
                                                                        value={editingSchedule.end_time?.slice(0, 5)}
                                                                        onChange={e => setEditingSchedule(s => ({ ...s, end_time: e.target.value }))}
                                                                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        min="5"
                                                                        max="120"
                                                                        step="5"
                                                                        value={editingSchedule.slot_duration_minutes ?? 10}
                                                                        onChange={e => setEditingSchedule(s => ({ ...s, slot_duration_minutes: Number(e.target.value) }))}
                                                                        className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                                        title="مدة الموعد بالدقائق"
                                                                    />
                                                                </div>
                                                                <input
                                                                    value={editingSchedule.shift_label ?? ''}
                                                                    onChange={e => setEditingSchedule(s => ({ ...s, shift_label: e.target.value }))}
                                                                    className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                                    placeholder="وصف اختياري"
                                                                />
                                                                <div className="text-[11px] text-slate-500 bg-white border border-slate-100 rounded-lg px-2 py-1.5">
                                                                    سيتم إنشاء {getSlotSummary(editingSchedule).count} موعد
                                                                    {getSlotSummary(editingSchedule).unusedMinutes > 0 ? `، ويتبقى ${getSlotSummary(editingSchedule).unusedMinutes} دقيقة غير مستخدمة` : ''}
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <button type="button" onClick={handleSaveScheduleEdit} className="flex-1 bg-teal-600 text-white rounded-lg py-1.5 text-xs font-bold">حفظ الوردية</button>
                                                                    <button type="button" onClick={() => setEditingSchedule(null)} className="px-3 border border-slate-200 rounded-lg py-1.5 text-xs font-bold text-slate-500">إلغاء</button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-slate-700 text-xs">
                                                                        {getArabicDayName(schedule.specific_date)}، {schedule.specific_date}
                                                                        {schedule._pending ? <span className="text-amber-600 mr-1">(سيحفظ مع الطبيب)</span> : null}
                                                                    </div>
                                                                    <div className="text-teal-700 text-xs font-bold mt-1">{formatShiftTime(schedule)}</div>
                                                                    <div className="text-slate-400 text-[11px] mt-1">
                                                                        {schedule.slot_duration_minutes ?? 10} دقيقة · {slotSummary.count} مواعيد
                                                                    </div>
                                                                    {schedule.shift_label ? <div className="text-slate-400 text-[11px] mt-1">{schedule.shift_label}</div> : null}
                                                                </div>
                                                                <div className="flex gap-1 flex-shrink-0">
                                                                    <button type="button" onClick={() => setEditingSchedule(schedule)} className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-500 hover:bg-white">تعديل</button>
                                                                    <button type="button" onClick={() => handleDeleteSchedule(schedule)} className="px-2 py-1 text-[11px] font-bold rounded-lg border border-red-100 text-red-500 hover:bg-red-50">حذف</button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
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
