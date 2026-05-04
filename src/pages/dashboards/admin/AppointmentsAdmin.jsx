/**
 * AppointmentsAdmin — Full booking management screen.
 *
 * Features:
 *  - Live table with filter by status tabs + date range + patient name search
 *  - Inline quick-action buttons: Confirm, Complete
 *  - Edit slide-in panel: reschedule date/time, patient info, status override
 *  - Delete confirm modal (hard delete)
 *
 * State: local useState only — no Zustand, no cache.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Calendar, Clock, Phone, User, Search,
    CheckCircle2, Flag, Pencil, Trash2, X,
    Save, Loader2, Filter, ChevronDown,
} from 'lucide-react';
import {
    getAllAppointments,
    updateAppointment,
    updateAppointmentStatus,
    deleteAppointment,
} from '../../../api/appointments';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_TABS = [
    { value: '', label: 'الكل' },
    { value: 'pending', label: 'قيد الانتظار' },
    { value: 'confirmed', label: 'مؤكد' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'cancelled', label: 'ملغى' },
];

const STATUS_STYLES = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'قيد الانتظار' },
    confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مؤكد' },
    completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'مكتمل' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-600', label: 'ملغى' },
};

const TYPE_LABELS = {
    doctors: 'أطباء',
    clinics: 'عيادات',
    scans: 'أشعة',
    lab: 'مختبر',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
}

function fmtTime(t) {
    if (!t) return '—';
    // appointment_time is now TEXT: may be an Arabic shift label ("05:00 ص - 09:00 م")
    // or a plain HH:MM string from scans/lab bookings
    if (/[\u0600-\u06FF]/.test(t)) return t;          // Arabic string — display as-is
    if (String(t).includes(' - ')) {
        return String(t)
            .split(' - ')
            .map(part => fmtTime(part))
            .join(' - ');
    }
    const parts = t.split(':').map(Number);
    if (parts.length < 2 || isNaN(parts[0])) return t; // unknown format — display as-is
    const h = parts[0], m = parts[1];
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`;
}

function serviceName(appt) {
    if (appt.service_name) return appt.service_name;
    if (appt.doctors?.name) return appt.doctors.name;
    if (appt.scans?.name) return appt.scans.name;
    return '—';
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
    const s = STATUS_STYLES[status] ?? { bg: 'bg-slate-100', text: 'text-slate-500', label: status };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${s.bg} ${s.text}`}>
            {s.label}
        </span>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AppointmentsAdmin() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({ status: '', from: '', to: '' });

    // Edit panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Quick-action inline loading
    const [actionLoading, setActionLoading] = useState(null); // appointment id

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await getAllAppointments({
            status: filters.status || undefined,
            from: filters.from || undefined,
            to: filters.to || undefined,
        });
        setAppointments(data ?? []);
        setLoading(false);
    }, [filters]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Local search filter ────────────────────────────────────────────────────
    const filtered = appointments.filter(a =>
        !search ||
        a.patient_name?.toLowerCase().includes(search.toLowerCase()) ||
        a.phone_number?.includes(search)
    );

    // ── Quick actions ──────────────────────────────────────────────────────────
    const quickStatus = async (appt, newStatus) => {
        setActionLoading(appt.id);
        await updateAppointmentStatus(appt.id, newStatus);
        setAppointments(prev => prev.map(a =>
            a.id === appt.id ? { ...a, status: newStatus } : a
        ));
        setActionLoading(null);
    };

    // ── Edit panel ─────────────────────────────────────────────────────────────
    const openEdit = (appt) => {
        setEditTarget(appt);
        setForm({
            patient_name: appt.patient_name ?? '',
            phone_number: appt.phone_number ?? '',
            appointment_date: appt.appointment_date ?? '',
            appointment_time: appt.appointment_time ?? '',
            status: appt.status ?? 'pending',
        });
        setSaveError('');
        setPanelOpen(true);
    };
    const closePanel = () => { setPanelOpen(false); setSaveError(''); setEditTarget(null); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setSaveError('');
        if (!form.patient_name.trim()) { setSaveError('اسم المريض مطلوب'); return; }
        setSaving(true);
        const payload = {
            patient_name: form.patient_name.trim(),
            phone_number: form.phone_number.trim() || null,
            appointment_date: form.appointment_date || null,
            appointment_time: form.appointment_time || null,
            status: form.status,
        };
        const { error } = await updateAppointment(editTarget.id, payload);
        setSaving(false);
        if (error) { setSaveError(error.message); return; }
        setAppointments(prev => prev.map(a =>
            a.id === editTarget.id ? { ...a, ...payload } : a
        ));
        closePanel();
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deleteAppointment(deleteTarget.id);
        setDeleting(false);
        if (!error) {
            setAppointments(prev => prev.filter(a => a.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    // ── KPI counts ──────────────────────────────────────────────────────────────
    const counts = {
        pending: appointments.filter(a => a.status === 'pending').length,
        confirmed: appointments.filter(a => a.status === 'confirmed').length,
        completed: appointments.filter(a => a.status === 'completed').length,
        cancelled: appointments.filter(a => a.status === 'cancelled').length,
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6 space-y-6" dir="rtl">

            {/* ── Page header ─────────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة المواعيد</h1>
                    <p className="text-sm text-slate-400 mt-0.5">{appointments.length} حجز في النظام</p>
                </div>
            </div>

            {/* ── KPI summary cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { key: 'pending', icon: Clock, label: 'قيد الانتظار', color: 'text-amber-500', bg: 'bg-amber-50' },
                    { key: 'confirmed', icon: CheckCircle2, label: 'مؤكدة', color: 'text-blue-500', bg: 'bg-blue-50' },
                    { key: 'completed', icon: Flag, label: 'مكتملة', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { key: 'cancelled', icon: X, label: 'ملغاة', color: 'text-red-500', bg: 'bg-red-50' },
                ].map(({ key, icon: Icon, label, color, bg }) => (
                    <button
                        key={key}
                        onClick={() => setFilters(f => ({ ...f, status: f.status === key ? '' : key }))}
                        className={`flex items-center gap-3 rounded-2xl p-4 border transition cursor-pointer text-right
                            ${filters.status === key ? 'border-teal-400 ring-2 ring-teal-200' : 'border-slate-100 bg-white hover:border-slate-200 shadow-sm'}`}
                    >
                        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                            <Icon size={18} className={color} />
                        </div>
                        <div>
                            <p className="text-2xl font-black text-slate-800">{counts[key]}</p>
                            <p className="text-xs text-slate-500 font-medium">{label}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* ── Filters row ──────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col lg:flex-row gap-3 items-start lg:items-center">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                    <Search size={15} className="absolute top-3 right-3 text-slate-400" />
                    <input
                        type="text"
                        placeholder="بحث بالاسم أو رقم الهاتف..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    />
                </div>

                {/* Status tabs */}
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1 shrink-0">
                    {STATUS_TABS.map(tab => (
                        <button
                            key={tab.value}
                            onClick={() => setFilters(f => ({ ...f, status: tab.value }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap
                                ${filters.status === tab.value ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Date range */}
                <div className="flex items-center gap-2 shrink-0">
                    <Filter size={14} className="text-slate-400" />
                    <input
                        type="date"
                        value={filters.from}
                        onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
                        className="border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    />
                    <span className="text-slate-400 text-xs">—</span>
                    <input
                        type="date"
                        value={filters.to}
                        onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
                        className="border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    />
                    {(filters.from || filters.to) && (
                        <button onClick={() => setFilters(f => ({ ...f, from: '', to: '' }))} className="text-slate-400 hover:text-red-500 transition">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Table ────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-teal-600 gap-3">
                        <Loader2 className="animate-spin" size={24} />
                        <span className="text-sm font-medium">جارٍ تحميل المواعيد...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                        <Calendar size={40} className="text-slate-200" />
                        <p className="font-semibold text-sm">لا توجد مواعيد مطابقة</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase">المريض</th>
                                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase hidden md:table-cell">الخدمة</th>
                                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase hidden lg:table-cell">التاريخ والوقت</th>
                                    <th className="text-right px-5 py-3.5 font-bold text-slate-500 text-xs uppercase hidden md:table-cell">السعر</th>
                                    <th className="text-center px-5 py-3.5 font-bold text-slate-500 text-xs uppercase">الحالة</th>
                                    <th className="text-center px-5 py-3.5 font-bold text-slate-500 text-xs uppercase">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(appt => (
                                    <tr key={appt.id} className="hover:bg-slate-50/70 transition">

                                        {/* Patient */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                                                    <User size={16} className="text-teal-500" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{appt.patient_name}</p>
                                                    <a href={`tel:${appt.phone_number}`}
                                                        className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1 mt-0.5 transition" dir="ltr">
                                                        <Phone size={11} />
                                                        {appt.phone_number ?? '—'}
                                                    </a>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Service */}
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            <p className="font-semibold text-slate-700 text-sm">{serviceName(appt)}</p>
                                            {appt.type && (
                                                <span className="text-xs text-slate-400 font-medium">
                                                    {TYPE_LABELS[appt.type] ?? appt.type}
                                                </span>
                                            )}
                                        </td>

                                        {/* Date & Time */}
                                        <td className="px-5 py-4 hidden lg:table-cell">
                                            <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                                                <Calendar size={13} className="text-slate-400 shrink-0" />
                                                {fmtDate(appt.appointment_date)}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                                                <Clock size={13} className="shrink-0" />
                                                {fmtTime(appt.appointment_time)}
                                            </div>
                                        </td>

                                        {/* Price */}
                                        <td className="px-5 py-4 hidden md:table-cell">
                                            {appt.total_price_yer > 0 ? (
                                                <span className="font-bold text-teal-600 text-sm">
                                                    {Number(appt.total_price_yer).toLocaleString('ar-YE')} <span className="font-normal text-slate-400 text-xs">ر.ي</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">مجاناً</span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-5 py-4 text-center">
                                            <StatusBadge status={appt.status} />
                                        </td>

                                        {/* Actions */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center justify-center gap-1.5">
                                                {/* Confirm — only for pending */}
                                                {appt.status === 'pending' && (
                                                    <button
                                                        onClick={() => quickStatus(appt, 'confirmed')}
                                                        disabled={actionLoading === appt.id}
                                                        title="تأكيد الموعد"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-40"
                                                    >
                                                        {actionLoading === appt.id
                                                            ? <Loader2 size={15} className="animate-spin" />
                                                            : <CheckCircle2 size={15} />}
                                                    </button>
                                                )}
                                                {/* Complete — only for confirmed */}
                                                {appt.status === 'confirmed' && (
                                                    <button
                                                        onClick={() => quickStatus(appt, 'completed')}
                                                        disabled={actionLoading === appt.id}
                                                        title="إتمام الموعد"
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40"
                                                    >
                                                        {actionLoading === appt.id
                                                            ? <Loader2 size={15} className="animate-spin" />
                                                            : <Flag size={15} />}
                                                    </button>
                                                )}
                                                {/* Edit */}
                                                <button
                                                    onClick={() => openEdit(appt)}
                                                    title="تعديل"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                                                >
                                                    <Pencil size={15} />
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => setDeleteTarget(appt)}
                                                    title="حذف"
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Edit Slide-in Panel ───────────────────────────────────────── */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">تعديل الموعد</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>

                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            {/* Patient name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم المريض</label>
                                <input
                                    value={form.patient_name}
                                    onChange={e => setField('patient_name', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">رقم الهاتف</label>
                                <input
                                    value={form.phone_number}
                                    onChange={e => setField('phone_number', e.target.value)}
                                    dir="ltr"
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                />
                            </div>

                            {/* Date + Time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                        <Calendar size={12} className="inline ml-1" />
                                        التاريخ
                                    </label>
                                    <input
                                        type="date"
                                        value={form.appointment_date}
                                        onChange={e => setField('appointment_date', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">
                                        <Clock size={12} className="inline ml-1" />
                                        الوقت
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="الوردية أو وقت التبيين..."
                                        value={form.appointment_time}
                                        onChange={e => setField('appointment_time', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-xs"
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                                <div className="relative">
                                    <select
                                        value={form.status}
                                        onChange={e => setField('status', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 appearance-none"
                                    >
                                        <option value="pending">قيد الانتظار</option>
                                        <option value="confirmed">مؤكد</option>
                                        <option value="completed">مكتمل</option>
                                        <option value="cancelled">ملغى</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Service info (read-only) */}
                            {editTarget && (
                                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-1.5">
                                    <p className="text-xs font-bold text-slate-400 uppercase">معلومات الحجز (للعرض فقط)</p>
                                    <p className="text-sm text-slate-700 font-semibold">{serviceName(editTarget)}</p>
                                    {editTarget.type && <p className="text-xs text-slate-400">{TYPE_LABELS[editTarget.type] ?? editTarget.type}</p>}
                                    <p className="text-xs text-slate-400">رقم الحجز: #{editTarget.id}</p>
                                </div>
                            )}

                            {saveError && (
                                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>
                            )}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                            </button>
                            <button
                                onClick={closePanel}
                                className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm Modal ──────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                            <Trash2 size={22} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">حذف الموعد</h3>
                        <p className="text-slate-500 text-sm mb-5">
                            هل أنت متأكد من حذف موعد{' '}
                            <span className="font-bold text-slate-700">{deleteTarget.patient_name}</span>؟
                            <br />
                            <span className="text-xs text-red-500">لا يمكن التراجع عن هذا الإجراء.</span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                            >
                                {deleting && <Loader2 size={15} className="animate-spin" />}
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
