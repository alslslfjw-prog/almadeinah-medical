/**
 * PatientAppointments — Full appointment history with filter tabs and cancellation.
 * Cancel button only appears on 'pending' appointments.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, Loader2, AlertCircle, X } from 'lucide-react';
import { getMyAppointments, cancelMyAppointment } from '../../../api/patient';

// ── Shared helpers ────────────────────────────────────────────────────────────

const STATUS_MAP = {
    pending:   { label: 'قيد الانتظار', cls: 'bg-amber-100 text-amber-700',  border: 'border-r-amber-400' },
    confirmed: { label: 'تم التأكيد',   cls: 'bg-green-100 text-green-700',  border: 'border-r-green-400' },
    completed: { label: 'مكتمل',        cls: 'bg-blue-100 text-blue-700',    border: 'border-r-blue-400'  },
    cancelled: { label: 'ملغى',         cls: 'bg-slate-100 text-slate-400',  border: 'border-r-slate-300' },
};

const TYPE_LABEL = {
    doctor:  'طبيب',
    lab:     'مختبر',
    scan:    'أشعة',
    package: 'باقة',
    clinic:  'عيادة',
};

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-SA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function formatAppointmentTime(value) {
    if (!value) return '';
    const text = String(value);
    if (text.includes(' - ')) {
        return text
            .split(' - ')
            .map(part => part.slice(0, 5))
            .join(' - ');
    }
    return text.length > 5 && text.includes(':') ? text.slice(0, 5) : text;
}

function formatPrice(amount) {
    if (!amount) return null;
    return new Intl.NumberFormat('ar-YE').format(amount) + ' ر.ي';
}

// ── Appointment Card ──────────────────────────────────────────────────────────

function AppointmentCard({ appt, onCancel }) {
    const status = STATUS_MAP[appt.status] ?? STATUS_MAP.pending;
    const canCancel = appt.status === 'pending';
    const [confirming, setConfirming] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const handleCancel = async () => {
        setCancelling(true);
        await onCancel(appt.id);
        setCancelling(false);
        setConfirming(false);
    };

    const serviceName = appt.service_name || appt.doctors?.name || appt.scans?.name || '—';

    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm border-r-4 ${status.border} overflow-hidden`}>
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${status.cls}`}>
                                {status.label}
                            </span>
                            {appt.type && (
                                <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                                    {TYPE_LABEL[appt.type] ?? appt.type}
                                </span>
                            )}
                        </div>
                        <p className="font-bold text-slate-800 truncate">{serviceName}</p>
                        {appt.doctors?.clinics?.name && (
                            <p className="text-xs text-slate-400">{appt.doctors.clinics.name}</p>
                        )}
                    </div>
                    {formatPrice(appt.total_price_yer) && (
                        <p className="text-sm font-black text-teal-600 shrink-0">{formatPrice(appt.total_price_yer)}</p>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                        <CalendarDays size={12} /> {formatDate(appt.appointment_date)}
                    </span>
                    {appt.appointment_time && (
                        <span className="flex items-center gap-1">
                            <Clock size={12} /> {formatAppointmentTime(appt.appointment_time)}
                        </span>
                    )}
                </div>

                {/* Cancel section (pending only) */}
                {canCancel && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                        {confirming ? (
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-slate-600 font-medium flex-1">هل تريد إلغاء هذا الموعد؟</p>
                                <button onClick={handleCancel} disabled={cancelling}
                                    className="text-xs bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                    {cancelling ? <Loader2 size={12} className="animate-spin" /> : null}
                                    تأكيد الإلغاء
                                </button>
                                <button onClick={() => setConfirming(false)}
                                    className="text-xs border border-slate-200 text-slate-500 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
                                    تراجع
                                </button>
                            </div>
                        ) : (
                            <button onClick={() => setConfirming(true)}
                                className="flex items-center gap-1.5 text-xs text-red-500 font-semibold hover:text-red-700 transition">
                                <X size={13} /> إلغاء الموعد
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS = [
    { id: 'upcoming', label: 'القادمة' },
    { id: 'past',     label: 'السابقة' },
    { id: 'all',      label: 'الكل' },
];

export default function PatientAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState('');
    const [activeTab, setActiveTab]       = useState('upcoming');

    const load = useCallback(async () => {
        setLoading(true);
        const { data, error: err } = await getMyAppointments();
        if (err) setError(err.message);
        setAppointments(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const today = new Date().toISOString().split('T')[0];

    const filtered = appointments.filter(a => {
        if (activeTab === 'upcoming') return a.appointment_date >= today && a.status !== 'cancelled';
        if (activeTab === 'past')     return a.appointment_date < today || a.status === 'completed' || a.status === 'cancelled';
        return true;
    });

    const handleCancel = async (id) => {
        const { error: err } = await cancelMyAppointment(id);
        if (!err) setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelled' } : a));
    };

    return (
        <div className="space-y-5">
            <div>
                <h1 className="text-xl font-black text-slate-800">مواعيدي</h1>
                <p className="text-sm text-slate-400 mt-0.5">سجل كامل بجميع مواعيدك</p>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)}
                        className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${activeTab === t.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-teal-500" /></div>
            ) : error ? (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 rounded-xl p-4">
                    <AlertCircle size={16} />{error}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-16">
                    <CalendarDays size={40} className="text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm font-medium">
                        {activeTab === 'upcoming' ? 'لا توجد مواعيد قادمة' : 'لا توجد مواعيد سابقة'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(a => (
                        <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} />
                    ))}
                </div>
            )}
        </div>
    );
}
