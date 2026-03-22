/**
 * PatientOverview — Home tab of the Patient Dashboard.
 * Welcome banner, stats, next appointment card, and booking modal
 * powered by the real AppointmentWidget (identical UI to public site).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Clock, CheckCircle, Loader2, Plus, X, ChevronLeft } from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { getMyAppointments, getMyProfile } from '../../../api/patient';
import AppointmentWidget from '../../../components/AppointmentWidget';
import CheckoutForm from '../../../components/CheckoutForm';

// ── Shared ────────────────────────────────────────────────────────────────────

const STATUS_MAP = {
    pending:   { label: 'قيد الانتظار', cls: 'bg-amber-100 text-amber-700' },
    confirmed: { label: 'تم التأكيد',   cls: 'bg-green-100 text-green-700' },
    completed: { label: 'مكتمل',        cls: 'bg-blue-100 text-blue-700' },
    cancelled: { label: 'ملغى',         cls: 'bg-slate-100 text-slate-500' },
};

function formatDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-SA', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
}

function StatCard({ icon: Icon, label, value, color }) {
    return (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={20} className="text-white" />
            </div>
            <div>
                <p className="text-2xl font-black text-slate-800">{value}</p>
                <p className="text-xs text-slate-400 font-medium">{label}</p>
            </div>
        </div>
    );
}

// ── Booking Modal ─────────────────────────────────────────────────────────────
// Step 1: AppointmentWidget (100% identical to public site UI)
// Step 2: CheckoutForm with patient profile auto-fill

function BookingModal({ profile, onClose, onSuccess }) {
    const [bookingData, setBookingData] = useState(null); // null = step 1

    const prefill = {
        name:      profile?.full_name     ?? '',
        phone:     profile?.phone         ?? '',
        gender:    profile?.gender        ?? '',
        birthDate: profile?.date_of_birth ?? '',
        address:   profile?.address       ?? '',
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" dir="rtl">
            <div className="bg-white w-full sm:max-w-5xl rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden">

                {/* Sticky header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        {bookingData && (
                            <button onClick={() => setBookingData(null)}
                                className="text-slate-400 hover:text-slate-600 transition">
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="font-bold text-slate-800">حجز موعد جديد</h2>
                            <p className="text-xs text-slate-400">
                                {bookingData ? 'الخطوة 2 من 2 — بيانات المريض' : 'الخطوة 1 من 2 — اختيار الخدمة والموعد'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 p-4">
                    {!bookingData ? (
                        /* Step 1 — real AppointmentWidget, identical to public site */
                        <AppointmentWidget onBookingReady={setBookingData} />
                    ) : (
                        /* Step 2 — CheckoutForm with profile auto-fill */
                        <CheckoutForm
                            bookingData={bookingData}
                            prefill={prefill}
                            compact={true}
                            onSuccess={() => { onClose(); onSuccess(); }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PatientOverview() {
    const { user } = useAuthStore();
    const [appointments, setAppointments] = useState([]);
    const [profile, setProfile]           = useState(null);
    const [loading, setLoading]           = useState(true);
    const [showModal, setShowModal]       = useState(false);
    const [bookSuccess, setBookSuccess]   = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [apptRes, profRes] = await Promise.all([getMyAppointments(), getMyProfile()]);
        setAppointments(apptRes.data ?? []);
        setProfile(profRes.data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const today    = new Date().toISOString().split('T')[0];
    const upcoming = appointments.filter(a => a.appointment_date >= today && a.status !== 'cancelled');
    const nextAppt = [...upcoming].sort((a, b) => a.appointment_date.localeCompare(b.appointment_date))[0];
    const completed = appointments.filter(a => a.status === 'completed');

    // Display full_name or "مرحباً بك" — never fallback to "مريض"
    const displayName = profile?.full_name?.trim() || user?.user_metadata?.full_name?.trim() || null;

    const handleBookSuccess = () => {
        setBookSuccess(true);
        load();
        setTimeout(() => setBookSuccess(false), 5000);
    };

    return (
        <div className="space-y-6">
            {/* Welcome banner */}
            <div className="relative bg-gradient-to-l from-teal-600 to-teal-500 rounded-2xl p-6 text-white overflow-hidden">
                <div className="absolute -left-8 -top-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="absolute -left-2 -bottom-10 w-24 h-24 bg-white/5 rounded-full" />
                <div className="relative">
                    <p className="text-teal-100 text-sm font-medium mb-1">مركز المدينة الطبي</p>
                    <h1 className="text-xl sm:text-2xl font-black mb-1">
                        {displayName ? `مرحباً، ${displayName} 👋` : 'مرحباً بك 👋'}
                    </h1>
                    <p className="text-teal-100 text-sm">نتمنى لك دوام الصحة والعافية</p>
                </div>
            </div>

            {/* Success toast */}
            {bookSuccess && (
                <div className="flex items-center gap-2 bg-green-600 text-white text-sm font-semibold px-4 py-3 rounded-2xl shadow-lg">
                    <CheckCircle size={16} /> تم إرسال طلب الحجز بنجاح! سنتواصل معك قريباً لتأكيد الموعد.
                </div>
            )}

            {/* Stats + content */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 size={24} className="animate-spin text-teal-500" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard icon={CalendarDays} label="إجمالي المواعيد" value={appointments.length} color="bg-teal-500" />
                        <StatCard icon={Clock}        label="القادمة"          value={upcoming.length}     color="bg-amber-400" />
                        <StatCard icon={CheckCircle}  label="المكتملة"         value={completed.length}    color="bg-blue-500" />
                    </div>

                    {/* Next appointment */}
                    {nextAppt ? (
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">موعدك القادم</h2>
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                                <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                                    <CalendarDays size={22} className="text-teal-500" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-800 truncate">
                                        {nextAppt.service_name || nextAppt.doctors?.name || '—'}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {formatDate(nextAppt.appointment_date)}
                                        {nextAppt.appointment_time && ` · ${nextAppt.appointment_time.slice(0, 5)}`}
                                    </p>
                                </div>
                                <span className={`self-start sm:self-auto text-xs font-bold px-3 py-1 rounded-full ${STATUS_MAP[nextAppt.status]?.cls ?? 'bg-slate-100 text-slate-500'}`}>
                                    {STATUS_MAP[nextAppt.status]?.label}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                            <CalendarDays size={32} className="mx-auto mb-2 text-slate-200" />
                            <p className="text-sm font-medium">لا توجد مواعيد قادمة</p>
                        </div>
                    )}
                </>
            )}

            {/* Book CTA */}
            <button onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 active:scale-[0.98] text-white font-bold py-4 rounded-2xl shadow-md shadow-teal-200 transition text-base">
                <Plus size={20} /> احجز موعداً جديداً
            </button>

            {showModal && (
                <BookingModal
                    profile={profile}
                    onClose={() => setShowModal(false)}
                    onSuccess={handleBookSuccess}
                />
            )}
        </div>
    );
}
