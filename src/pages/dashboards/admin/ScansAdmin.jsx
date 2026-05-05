/**
 * ScansAdmin — Admin CMS for scans + scan_categories.
 * 2 tabs: الفئات الرئيسية (category CRUD) | خدمات الأشعة (scan CRUD with category assignment)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, Tag, CalendarDays, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import {
    getScans, createScan, updateScan, deleteScan,
    getScanCategories, createScanCategory, updateScanCategory, deleteScanCategory,
    uploadScanCategoryImage,
} from '../../../api/scans';
import {
    createScanSchedules,
    deleteScanSchedule,
    getScanSchedules,
    updateScanSchedule,
} from '../../../api/scanSchedules';
import {
    SATURDAY_FIRST_WEEK_DAYS,
    getArabicDayName,
    getDatesInRange,
    toLocalDateKey,
} from '../../../utils/doctorScheduleDates';

// ── ChipEditor ────────────────────────────────────────────────────────────────
function ChipEditor({ label, chips, onChange }) {
    const [input, setInput] = useState('');
    const add = () => {
        const v = input.trim();
        if (!v || chips.includes(v)) { setInput(''); return; }
        onChange([...chips, v]); setInput('');
    };
    const remove = (chip) => onChange(chips.filter(c => c !== chip));
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {chips.map(chip => (
                    <span key={chip} className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-xs font-medium">
                        {chip}
                        <button type="button" onClick={() => remove(chip)} className="hover:text-red-500 transition"><X size={12} /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    placeholder="اكتب قيمة ثم اضغط Enter أو إضافة" />
                <button type="button" onClick={add} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">+ إضافة</button>
            </div>
        </div>
    );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ title, name, onConfirm, onCancel, busy }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-600" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">{title}</h3>
                <p className="text-slate-500 text-sm mb-5">هل أنت متأكد من حذف <span className="font-bold text-slate-700">«{name}»</span>؟</p>
                <div className="flex gap-3">
                    <button onClick={onConfirm} disabled={busy}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2">
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {busy ? 'جارٍ الحذف...' : 'نعم، احذف'}
                    </button>
                    <button onClick={onCancel} className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

// ── EMPTY forms ───────────────────────────────────────────────────────────────
const EMPTY_SCAN = {
    name: '', short_description: '', description: '',
    price: '', icon_class: 'fas fa-x-ray',
    preparation: '', benefits: [], category_id: '',
};
const EMPTY_CAT = { name: '', icon_class: 'fas fa-x-ray', image_url: '', display_order: 0 };

const DEFAULT_SHIFT = {
    specific_date: toLocalDateKey(new Date()),
    start_time: '08:00',
    end_time: '16:00',
    slot_duration_minutes: 10,
    shift_label: '',
    notes: '',
};
const DEFAULT_RANGE_WEEKDAYS = [6, 0, 1, 2, 3, 4];
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

function to12hArabic(time24) {
    if (!time24) return '';
    const [hStr, mStr] = String(time24).slice(0, 5).split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return time24;
    const period = h < 12 ? 'ص' : 'م';
    const h12 = h % 12 || 12;
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
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
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
    return {
        count: Math.floor(total / duration),
        unusedMinutes: total % duration,
    };
}

function isValidShiftTime(start, end) {
    const startMinutes = timeToMinutes(start);
    const endMinutes = timeToMinutes(end);
    return startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;
}

function isValidSlotDuration(value) {
    const duration = Number(value);
    return Number.isInteger(duration) && duration >= 5 && duration <= 120;
}

function getScheduleWindow() {
    const today = new Date();
    const end = new Date(today);
    end.setDate(today.getDate() + 90);
    return {
        from: toLocalDateKey(today),
        to: toLocalDateKey(end),
    };
}

function mapScanScheduleError(error) {
    if (!error) return '';
    const message = error.message ?? String(error);
    if (
        message.includes("Could not find the table 'public.scan_date_schedules'") ||
        (message.includes('scan_date_schedules') && message.includes('schema cache'))
    ) {
        return 'جدول مواعيد الأشعة الجديد غير موجود في Supabase بعد. شغّل ملف migration ثم أعد تحميل الصفحة.';
    }
    if (message.includes('scan_date_schedules_time_order')) return 'وقت نهاية الدوام يجب أن يكون بعد وقت البداية';
    if (message.includes('scan_date_schedules_slot_duration_range')) return 'مدة الموعد يجب أن تكون بين 5 و120 دقيقة';
    if (message.includes('active slot bookings') || message.includes('active bookings')) {
        return 'لا يمكن تعديل أو حذف هذه الوردية لأنها تحتوي على حجوزات نشطة';
    }
    if (message.includes('scan_date_schedules_no_overlap') || message.includes('conflicting key value')) {
        return 'يوجد تعارض مع دوام آخر لنفس الأشعة في نفس التاريخ';
    }
    return message;
}

// ═════════════════════════════════════════════════════════════════════════════
export default function ScansAdmin() {
    const [activeTab, setActiveTab] = useState('scans'); // 'scans' | 'categories'

    // ── Shared data ──────────────────────────────────────────────────────────
    const [scans,      setScans]      = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');

    // ── Scan panel state ─────────────────────────────────────────────────────
    const [scanPanel,  setScanPanel]  = useState(false);
    const [scanEditId, setScanEditId] = useState(null);
    const [scanForm,   setScanForm]   = useState(EMPTY_SCAN);
    const [scanSaving, setScanSaving] = useState(false);
    const [scanErr,    setScanErr]    = useState('');
    const [scanDel,    setScanDel]    = useState(null);
    const [scanDelBusy,setScanDelBusy]= useState(false);
    const [scanSchedules, setScanSchedules] = useState([]);
    const [schedulesLoading, setSchedulesLoading] = useState(false);
    const [singleShift, setSingleShift] = useState(DEFAULT_SHIFT);
    const [rangeShift, setRangeShift] = useState(DEFAULT_RANGE_SHIFT);
    const [editingSchedule, setEditingSchedule] = useState(null);
    const [scheduleActionLoading, setScheduleActionLoading] = useState(false);

    // ── Category panel state ─────────────────────────────────────────────────
    const [catPanel,   setCatPanel]   = useState(false);
    const [catEditId,  setCatEditId]  = useState(null);
    const [catForm,    setCatForm]    = useState(EMPTY_CAT);
    const [catImgFile, setCatImgFile] = useState(null);
    const [catImgPrev, setCatImgPrev] = useState('');
    const [catSaving,  setCatSaving]  = useState(false);
    const [catErr,     setCatErr]     = useState('');
    const [catDel,     setCatDel]     = useState(null);
    const [catDelBusy, setCatDelBusy] = useState(false);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [{ data: s }, { data: c }] = await Promise.all([getScans(), getScanCategories()]);
        setScans(s ?? []);
        setCategories(c ?? []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const loadSchedulesForScan = useCallback(async (scanId) => {
        if (!scanId) {
            setScanSchedules([]);
            return;
        }

        setSchedulesLoading(true);
        const { from, to } = getScheduleWindow();
        const { data, error } = await getScanSchedules(scanId, from, to);
        if (error) setScanErr(mapScanScheduleError(error));
        setScanSchedules(data ?? []);
        setSchedulesLoading(false);
    }, []);

    const addPendingSchedules = (rows) => {
        setScanSchedules(prev => [
            ...prev,
            ...rows.map((row, index) => ({
                ...row,
                id: `pending-${Date.now()}-${index}`,
                _pending: true,
            })),
        ].sort((a, b) => `${a.specific_date} ${a.start_time}`.localeCompare(`${b.specific_date} ${b.start_time}`)));
    };

    const persistScheduleRows = async (rows) => {
        if (!scanEditId) {
            addPendingSchedules(rows);
            return true;
        }

        const payload = rows.map(row => ({ ...row, scan_id: scanEditId }));
        const { error } = await createScanSchedules(payload);
        if (error) {
            setScanErr(mapScanScheduleError(error));
            return false;
        }
        await loadSchedulesForScan(scanEditId);
        return true;
    };

    const handleAddSingleShift = async () => {
        setScanErr('');
        if (!singleShift.specific_date) { setScanErr('يرجى اختيار التاريخ'); return; }
        if (!isValidShiftTime(singleShift.start_time, singleShift.end_time)) { setScanErr('وقت نهاية الدوام يجب أن يكون بعد وقت البداية'); return; }
        if (!isValidSlotDuration(singleShift.slot_duration_minutes)) { setScanErr('مدة الموعد يجب أن تكون بين 5 و120 دقيقة'); return; }
        if (getSlotSummary(singleShift).count < 1) { setScanErr('مدة الوردية أقصر من مدة الموعد'); return; }

        setScheduleActionLoading(true);
        const ok = await persistScheduleRows([singleShift]);
        setScheduleActionLoading(false);
        if (ok) setSingleShift(DEFAULT_SHIFT);
    };

    const handleAddRangeShift = async () => {
        setScanErr('');
        if (!rangeShift.start_date || !rangeShift.end_date) { setScanErr('يرجى اختيار بداية ونهاية النطاق'); return; }
        if (rangeShift.start_date > rangeShift.end_date) { setScanErr('تاريخ نهاية النطاق يجب أن يكون بعد البداية'); return; }
        if (!rangeShift.weekdays.length) { setScanErr('يرجى اختيار يوم واحد على الأقل'); return; }
        if (!isValidShiftTime(rangeShift.start_time, rangeShift.end_time)) { setScanErr('وقت نهاية الدوام يجب أن يكون بعد وقت البداية'); return; }
        if (!isValidSlotDuration(rangeShift.slot_duration_minutes)) { setScanErr('مدة الموعد يجب أن تكون بين 5 و120 دقيقة'); return; }
        if (getSlotSummary(rangeShift).count < 1) { setScanErr('مدة الوردية أقصر من مدة الموعد'); return; }

        const rows = getDatesInRange(rangeShift.start_date, rangeShift.end_date)
            .filter(day => rangeShift.weekdays.includes(day.jsDay))
            .map(day => ({
                scan_id: scanEditId,
                specific_date: day.dateKey,
                start_time: rangeShift.start_time,
                end_time: rangeShift.end_time,
                slot_duration_minutes: rangeShift.slot_duration_minutes,
                shift_label: rangeShift.shift_label,
                notes: rangeShift.notes,
            }));

        if (!rows.length) { setScanErr('لا توجد تواريخ مطابقة للأيام المختارة داخل النطاق'); return; }

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

    const handleSaveScheduleEdit = async () => {
        if (!editingSchedule) return;
        setScanErr('');
        if (!editingSchedule.specific_date) { setScanErr('يرجى اختيار التاريخ'); return; }
        if (!isValidShiftTime(editingSchedule.start_time, editingSchedule.end_time)) { setScanErr('وقت نهاية الدوام يجب أن يكون بعد وقت البداية'); return; }
        if (!isValidSlotDuration(editingSchedule.slot_duration_minutes)) { setScanErr('مدة الموعد يجب أن تكون بين 5 و120 دقيقة'); return; }
        if (getSlotSummary(editingSchedule).count < 1) { setScanErr('مدة الوردية أقصر من مدة الموعد'); return; }

        if (editingSchedule._pending) {
            setScanSchedules(prev => prev.map(item => item.id === editingSchedule.id ? editingSchedule : item));
            setEditingSchedule(null);
            return;
        }

        setScheduleActionLoading(true);
        const { error } = await updateScanSchedule(editingSchedule.id, editingSchedule);
        setScheduleActionLoading(false);
        if (error) { setScanErr(mapScanScheduleError(error)); return; }
        setEditingSchedule(null);
        await loadSchedulesForScan(scanEditId);
    };

    const handleDeleteSchedule = async (schedule) => {
        setScanErr('');
        if (schedule._pending) {
            setScanSchedules(prev => prev.filter(item => item.id !== schedule.id));
            if (editingSchedule?.id === schedule.id) setEditingSchedule(null);
            return;
        }

        setScheduleActionLoading(true);
        const { error } = await deleteScanSchedule(schedule.id);
        setScheduleActionLoading(false);
        if (error) { setScanErr(mapScanScheduleError(error)); return; }
        await loadSchedulesForScan(scanEditId);
    };

    // ── Scan helpers ─────────────────────────────────────────────────────────
    const openScanCreate = () => {
        setScanEditId(null);
        setScanForm(EMPTY_SCAN);
        setScanErr('');
        setScanSchedules([]);
        setSingleShift(DEFAULT_SHIFT);
        setRangeShift(DEFAULT_RANGE_SHIFT);
        setEditingSchedule(null);
        setScanPanel(true);
    };
    const openScanEdit = (s) => {
        setScanEditId(s.id);
        setScanForm({
            name:              s.name              ?? '',
            short_description: s.short_description ?? '',
            description:       s.description       ?? '',
            price:             s.price             ?? '',
            icon_class:        s.icon_class        ?? 'fas fa-x-ray',
            preparation:       s.preparation       ?? '',
            benefits:          s.benefits ? s.benefits.split('\n').filter(Boolean) : [],
            category_id:       s.category_id       ?? '',
        });
        setSingleShift(DEFAULT_SHIFT);
        setRangeShift(DEFAULT_RANGE_SHIFT);
        setEditingSchedule(null);
        setScanErr('');
        setScanPanel(true);
        loadSchedulesForScan(s.id);
    };
    const setScanField = (k, v) => setScanForm(p => ({ ...p, [k]: v }));

    const handleScanSave = async () => {
        setScanErr('');
        if (!scanForm.name.trim()) { setScanErr('اسم الأشعة مطلوب'); return; }
        setScanSaving(true);
        try {
            const payload = {
                name:              scanForm.name.trim(),
                short_description: scanForm.short_description.trim() || null,
                description:       scanForm.description.trim()       || null,
                price:             scanForm.price !== '' ? Number(scanForm.price) : null,
                icon_class:        scanForm.icon_class.trim()        || null,
                preparation:       scanForm.preparation.trim()       || null,
                benefits:          scanForm.benefits.length ? scanForm.benefits.join('\n') : null,
                category_id:       scanForm.category_id !== '' ? Number(scanForm.category_id) : null,
            };
            if (scanEditId) {
                const { error } = await updateScan(scanEditId, payload);
                if (error) { setScanErr(error.message); return; }
            } else {
                const { data: createdScan, error } = await createScan(payload);
                if (error) { setScanErr(error.message); return; }

                const pendingSchedules = scanSchedules
                    .filter(schedule => schedule._pending)
                    .map(schedule => ({
                        scan_id: createdScan.id,
                        specific_date: schedule.specific_date,
                        start_time: schedule.start_time,
                        end_time: schedule.end_time,
                        slot_duration_minutes: schedule.slot_duration_minutes ?? 10,
                        shift_label: schedule.shift_label,
                        notes: schedule.notes,
                    }));

                if (pendingSchedules.length) {
                    const { error: schedulesError } = await createScanSchedules(pendingSchedules);
                    if (schedulesError) { setScanErr(mapScanScheduleError(schedulesError)); return; }
                }
            }

            setScanPanel(false);
            setScanSchedules([]);
            setEditingSchedule(null);
            await fetchAll();
        } finally { setScanSaving(false); }
    };

    const handleScanDelete = async () => {
        setScanDelBusy(true);
        const { error } = await deleteScan(scanDel.id);
        setScanDelBusy(false);
        if (!error) { setScans(p => p.filter(s => s.id !== scanDel.id)); setScanDel(null); }
    };

    // ── Category helpers ─────────────────────────────────────────────────────
    const openCatCreate = () => {
        setCatEditId(null);
        setCatForm(EMPTY_CAT);
        setCatImgFile(null);
        setCatImgPrev('');
        setCatErr('');
        setCatPanel(true);
    };
    const openCatEdit = (c) => {
        setCatEditId(c.id);
        setCatForm({ name: c.name ?? '', icon_class: c.icon_class ?? '', image_url: c.image_url ?? '', display_order: c.display_order ?? 0 });
        setCatImgFile(null);
        setCatImgPrev(c.image_url ?? '');
        setCatErr(''); setCatPanel(true);
    };
    const setCatField = (k, v) => setCatForm(p => ({ ...p, [k]: v }));
    const onCatImgChange = e => {
        const f = e.target.files?.[0];
        if (!f) return;
        setCatImgFile(f);
        setCatImgPrev(URL.createObjectURL(f));
    };

    const handleCatSave = async () => {
        setCatErr('');
        if (!catForm.name.trim()) { setCatErr('اسم الفئة مطلوب'); return; }
        setCatSaving(true);
        try {
            let imageUrl = catForm.image_url;
            if (catImgFile) {
                const { url, error: uploadError } = await uploadScanCategoryImage(catImgFile);
                if (uploadError) { setCatErr('فشل رفع الصورة: ' + uploadError.message); return; }
                imageUrl = url;
            }
            const payload = {
                name:          catForm.name.trim(),
                icon_class:    catForm.icon_class.trim()  || null,
                image_url:     imageUrl || null,
                display_order: Number(catForm.display_order) || 0,
            };
            const { error } = catEditId ? await updateScanCategory(catEditId, payload) : await createScanCategory(payload);
            if (error) { setCatErr(error.message); return; }
            setCatPanel(false); await fetchAll();
        } finally { setCatSaving(false); }
    };

    const handleCatDelete = async () => {
        setCatDelBusy(true);
        const { error } = await deleteScanCategory(catDel.id);
        setCatDelBusy(false);
        if (!error) { setCategories(p => p.filter(c => c.id !== catDel.id)); setCatDel(null); }
    };

    const filtered = scans.filter(s => s.name?.includes(search) || s.short_description?.includes(search));

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة الأشعة التشخيصية</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{scans.length} خدمة · {categories.length} فئة</p>
                </div>
                <button
                    onClick={activeTab === 'scans' ? openScanCreate : openCatCreate}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm shadow-sm">
                    <Plus size={16} />
                    {activeTab === 'scans' ? 'إضافة أشعة' : 'إضافة فئة'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                {[
                    { key: 'scans',      label: 'خدمات الأشعة' },
                    { key: 'categories', label: 'الفئات الرئيسية' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === t.key ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-teal-600"><Loader2 className="animate-spin" size={30} /></div>
            ) : activeTab === 'scans' ? (
                <>
                    {/* Search */}
                    <div className="relative mb-5">
                        <Search size={16} className="absolute top-3 right-3 text-slate-400" />
                        <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                    </div>

                    {/* Scans Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[520px]">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-right">الاسم</th>
                                    <th className="px-4 py-3 text-right">الفئة</th>
                                    <th className="px-4 py-3 text-right">السعر</th>
                                    <th className="px-4 py-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(scan => (
                                    <tr key={scan.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-800">{scan.name}</p>
                                            {scan.short_description && <p className="text-xs text-slate-400 truncate max-w-xs">{scan.short_description}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {scan.scan_categories?.name
                                                ? <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{scan.scan_categories.name}</span>
                                                : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">
                                            {scan.price && Number(scan.price) > 0 ? `$ ${Number(scan.price).toLocaleString('en-US')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => openScanEdit(scan)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                                <button onClick={() => setScanDel(scan)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد نتائج</td></tr>}
                            </tbody>
                        </table>
                        </div>{/* /overflow-x-auto */}
                    </div>
                </>
            ) : (
                /* Categories Table */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">اسم الفئة</th>
                                <th className="px-4 py-3 text-right">كلاس الأيقونة</th>
                                <th className="px-4 py-3 text-right">الترتيب</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} className="text-teal-400 shrink-0" />
                                            <span className="font-semibold text-slate-800">{cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{cat.icon_class || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{cat.display_order}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openCatEdit(cat)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setCatDel(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد فئات</td></tr>}
                        </tbody>
                    </table>
                    </div>{/* /overflow-x-auto */}
                </div>
            )}

            {/* ── SCAN Slide-in Panel ──────────────────────────────────────────── */}
            {scanPanel && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setScanPanel(false)} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{scanEditId ? 'تعديل الأشعة' : 'إضافة أشعة جديدة'}</h2>
                            <button onClick={() => setScanPanel(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الفئة الرئيسية</label>
                                <select value={scanForm.category_id} onChange={e => setScanField('category_id', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                    <option value="">— بدون فئة —</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Name + Icon */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم <span className="text-red-500">*</span></label>
                                    <input value={scanForm.name} onChange={e => setScanField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">كلاس الأيقونة</label>
                                    <input value={scanForm.icon_class} onChange={e => setScanField('icon_class', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" />
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">سعر الأشعة (دولار أمريكي $)</label>
                                <input type="number" min="0" value={scanForm.price} onChange={e => setScanField('price', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="0" />
                            </div>

                            {/* Short desc */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">وصف مختصر</label>
                                <input value={scanForm.short_description} onChange={e => setScanField('short_description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>

                            {/* Full desc */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف الكامل</label>
                                <textarea rows={3} value={scanForm.description} onChange={e => setScanField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>

                            {/* Preparation */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التحضير</label>
                                <textarea rows={2} value={scanForm.preparation} onChange={e => setScanField('preparation', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>

                            {/* Benefits */}
                            <ChipEditor label="الفوائد" chips={scanForm.benefits} onChange={v => setScanField('benefits', v)} />

                            {/* Date-based scan schedules */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <label className="block text-xs font-bold text-slate-500">جدول مواعيد الأشعة بالتاريخ</label>
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
                                        <span className="text-slate-400 text-xs pb-2">-</span>
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
                                    ) : scanSchedules.length === 0 ? (
                                        <div className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-3">لا توجد ورديات قادمة بعد</div>
                                    ) : (
                                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                            {scanSchedules.map(schedule => {
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
                                                                    <button type="button" onClick={handleSaveScheduleEdit} disabled={scheduleActionLoading} className="flex-1 bg-teal-600 text-white rounded-lg py-1.5 text-xs font-bold disabled:opacity-60">حفظ الوردية</button>
                                                                    <button type="button" onClick={() => setEditingSchedule(null)} className="px-3 border border-slate-200 rounded-lg py-1.5 text-xs font-bold text-slate-500">إلغاء</button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-slate-700 text-xs">
                                                                        {getArabicDayName(schedule.specific_date)}، {schedule.specific_date}
                                                                        {schedule._pending ? <span className="text-amber-600 mr-1">(سيحفظ مع الأشعة)</span> : null}
                                                                    </div>
                                                                    <div className="text-teal-700 text-xs font-bold mt-1">{formatShiftTime(schedule)}</div>
                                                                    <div className="text-slate-400 text-[11px] mt-1">
                                                                        {schedule.slot_duration_minutes ?? 10} دقيقة · {slotSummary.count} مواعيد
                                                                    </div>
                                                                    {schedule.shift_label ? <div className="text-slate-400 text-[11px] mt-1">{schedule.shift_label}</div> : null}
                                                                </div>
                                                                <div className="flex gap-1 flex-shrink-0">
                                                                    <button type="button" onClick={() => setEditingSchedule(schedule)} className="px-2 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-500 hover:bg-white">تعديل</button>
                                                                    <button type="button" onClick={() => handleDeleteSchedule(schedule)} disabled={scheduleActionLoading} className="px-2 py-1 text-[11px] font-bold rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-60">حذف</button>
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

                            {scanErr && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{scanErr}</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleScanSave} disabled={scanSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm">
                                {scanSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {scanSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setScanPanel(false)} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CATEGORY Slide-in Panel ──────────────────────────────────────── */}
            {catPanel && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setCatPanel(false)} />
                    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{catEditId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h2>
                            <button onClick={() => setCatPanel(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الفئة <span className="text-red-500">*</span></label>
                                <input value={catForm.name} onChange={e => setCatField('name', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="الأشعة المقطعية" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">كلاس الأيقونة (Font Awesome)</label>
                                <input value={catForm.icon_class} onChange={e => setCatField('icon_class', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" placeholder="fas fa-x-ray" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">صورة الغلاف</label>
                                <div className="flex items-center gap-4">
                                    {catImgPrev
                                        ? <img src={catImgPrev} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                                        : <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" /></div>
                                    }
                                    <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 px-4 py-2 rounded-lg text-xs font-bold transition">
                                        <Upload size={14} /> رفع صورة
                                        <input type="file" accept="image/*" className="hidden" onChange={onCatImgChange} />
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ترتيب العرض</label>
                                <input type="number" min="0" value={catForm.display_order} onChange={e => setCatField('display_order', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>

                            {catErr && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{catErr}</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleCatSave} disabled={catSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm">
                                {catSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {catSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setCatPanel(false)} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete modals */}
            {scanDel && <DeleteModal title="حذف الأشعة" name={scanDel.name} busy={scanDelBusy} onConfirm={handleScanDelete} onCancel={() => setScanDel(null)} />}
            {catDel  && <DeleteModal title="حذف الفئة"  name={catDel.name}  busy={catDelBusy}  onConfirm={handleCatDelete}  onCancel={() => setCatDel(null)} />}
        </div>
    );
}
