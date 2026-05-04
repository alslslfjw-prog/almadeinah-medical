/**
 * CheckoutForm — Reusable patient booking form.
 * Used by both Checkout.jsx (full-page) and the Patient Dashboard modal.
 *
 * Props:
 *   bookingData  — { type, primarySelection, date, time, priceYER, doctor }
 *   prefill      — { name?, phone?, gender?, birthDate?, address? }  (from profile)
 *   onSuccess    — callback(patientName: string) called after confirmed booking
 *   compact      — if true, renders as a single scrollable column (modal mode)
 */

import React, { useEffect, useState } from 'react';
import {
    Calendar, Clock, User, Phone, CheckCircle,
    MapPin, CreditCard, Building2, UserCircle,
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import useAuthStore from '../store/authStore';
import { getPaymentMethods } from '../api/payments';

export default function CheckoutForm({ bookingData = {}, prefill = {}, onSuccess, compact = false }) {
    const { user } = useAuthStore();
    const { createAppointment, isLoading: loading } = useAppointments();

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [formData, setFormData] = useState({
        name:          prefill.name      ?? '',
        gender:        prefill.gender    ?? '',
        birthDate:     prefill.birthDate ?? '',
        phone:         prefill.phone     ? prefill.phone.replace(/\D/g, '').slice(0, 9) : '',
        address:       prefill.address   ?? '',
        paymentMethod: '',
    });

    useEffect(() => {
        getPaymentMethods().then(({ data }) => {
            if (data?.length) {
                setPaymentMethods(data);
                setFormData(f => ({ ...f, paymentMethod: data[0].provider_id }));
            }
        });
    }, []);

    // Sync prefill → formData when async profile data arrives after mount.
    // (Checkout.jsx fetches the profile asynchronously; by the time useState
    //  runs the initial value, prefill is still empty. This effect re-applies
    //  the values once they load, without overwriting anything the user typed.)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            name:      prefill.name      || prev.name,
            gender:    prefill.gender    || prev.gender,
            birthDate: prefill.birthDate || prev.birthDate,
            phone:     prefill.phone
                           ? prefill.phone.replace(/\D/g, '').slice(0, 9)
                           : prev.phone,
            address:   prefill.address   || prev.address,
        }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prefill.name, prefill.phone, prefill.gender, prefill.birthDate, prefill.address]);

    const set = key => e => setFormData(p => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async e => {
        e.preventDefault();
        const cleanPhone = formData.phone.replace(/\D/g, '');
        if (cleanPhone.length < 9) {
            alert('يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)');
            return;
        }
        const doctorId    = bookingData.doctor?.id ?? null;
        const scanId      = bookingData.type === 'scans' ? (bookingData.scanId ?? null) : null;
        const serviceName = bookingData.doctor?.name ?? bookingData.primarySelection ?? null;
        const doctorTimeSlotId = bookingData.doctorTimeSlotId ?? bookingData.doctor_time_slot_id ?? null;
        const scanTimeSlotId = bookingData.scanTimeSlotId ?? bookingData.scan_time_slot_id ?? null;

        const { success: ok, error } = await createAppointment({
            patient_name:     formData.name,
            phone_number:     cleanPhone,
            appointment_date: bookingData.date || null,
            appointment_time: bookingData.time || null,
            doctor_time_slot_id: doctorTimeSlotId,
            scan_time_slot_id: scanTimeSlotId,
            doctor_id:        doctorId,
            scan_id:          scanId,
            status:           'pending',
            patient_user_id:  user?.id ?? null,
            service_name:     serviceName,
            type:             bookingData.type ?? null,
            total_price_yer:  bookingData.priceYER > 0 ? bookingData.priceYER : null,
        });

        if (ok) onSuccess(formData.name);
        else alert('حدث خطأ أثناء الحجز: ' + (error?.message ?? JSON.stringify(error)));
    };

    const fieldCls = 'w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition';

    // ── Booking summary mini-card (always shown) ──────────────────────────────
    const Summary = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3">تفاصيل الموعد</h3>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} />
                </div>
                <div>
                    <p className="text-xs text-gray-400">الخدمة</p>
                    <p className="font-bold text-gray-800 text-sm">
                        {bookingData.doctor?.name ?? bookingData.primarySelection ?? '—'}
                    </p>
                </div>
            </div>
            {(bookingData.date || bookingData.time) && (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">الموعد</p>
                        <p className="font-bold text-gray-800 text-sm">{bookingData.date}</p>
                        {bookingData.time && (
                            <p className="text-teal-600 text-xs font-semibold flex items-center gap-1 mt-0.5">
                                <Clock size={12} /> {bookingData.time}
                            </p>
                        )}
                    </div>
                </div>
            )}
            <div className="pt-3 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">
                    {bookingData.priceYER > 0 ? 'سعر الخدمة' : 'رسوم الحجز'}
                </span>
                <span className={`font-bold ${bookingData.priceYER > 0 ? 'text-teal-600' : 'text-gray-700'}`}>
                    {bookingData.priceYER > 0
                        ? `${bookingData.priceYER.toLocaleString('ar-YE')} ر.ي`
                        : 'مجاناً'}
                </span>
            </div>
        </div>
    );

    // ── Patient form ──────────────────────────────────────────────────────────
    const Form = () => (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">بيانات المريض</h3>
            <p className="text-gray-400 text-xs mb-6">يرجى مراجعة بياناتك أو تعديلها قبل التأكيد.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name */}
                <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">الاسم الرباعي</label>
                    <div className="relative">
                        <input required type="text" placeholder="أدخل الاسم بالكامل"
                            value={formData.name} onChange={set('name')} className={fieldCls} />
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

                {/* Gender + DOB */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">الجنس</label>
                        <div className="relative">
                            <select required value={formData.gender} onChange={set('gender')}
                                className={`${fieldCls} appearance-none cursor-pointer`}>
                                <option value="">اختر الجنس...</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                            </select>
                            <UserCircle className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">تاريخ الميلاد</label>
                        <input required type="date" max={new Date().toISOString().split('T')[0]}
                            value={formData.birthDate} onChange={set('birthDate')}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 transition" />
                    </div>
                </div>

                {/* Phone + Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">رقم الهاتف (واتساب)</label>
                        <div className="relative">
                            <input required type="tel" inputMode="numeric" placeholder="77xxxxxxx"
                                maxLength={9} value={formData.phone}
                                onChange={e => {
                                    const digits = e.target.value.replace(/\D/g, '').slice(0, 9);
                                    setFormData(p => ({ ...p, phone: digits }));
                                }}
                                className={fieldCls} />
                            <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-700 font-bold mb-2 text-sm">عنوان السكن</label>
                        <div className="relative">
                            <input required type="text" placeholder="المدينة - الحي"
                                value={formData.address} onChange={set('address')} className={fieldCls} />
                            <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        </div>
                    </div>
                </div>

                {/* Payment methods */}
                {paymentMethods.length > 0 && (
                    <div>
                        <label className="block text-gray-700 font-bold mb-3 text-sm">طريقة الدفع</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {paymentMethods.map(method => {
                                const selected = formData.paymentMethod === method.provider_id;
                                return (
                                    <div key={method.provider_id}
                                        onClick={() => setFormData(p => ({ ...p, paymentMethod: method.provider_id }))}
                                        className={`cursor-pointer rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${selected ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'}`}>
                                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${selected ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                            {method.type === 'api' ? <CreditCard size={18} /> : <Building2 size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`font-bold text-sm truncate ${selected ? 'text-teal-900' : 'text-gray-700'}`}>
                                                {method.name_ar}
                                            </p>
                                            {method.config?.instructions_ar && (
                                                <p className="text-xs text-gray-400 truncate">{method.config.instructions_ar}</p>
                                            )}
                                        </div>
                                        {selected && <CheckCircle size={18} className="shrink-0 text-teal-500" />}
                                    </div>
                                );
                            })}
                        </div>
                        {/* Manual method bank details */}
                        {(() => {
                            const sel = paymentMethods.find(m => m.provider_id === formData.paymentMethod);
                            if (!sel || sel.type !== 'manual') return null;
                            const c = sel.config ?? {};
                            if (!c.instructions_ar && !c.account_number && !c.bank_name) return null;
                            return (
                                <div className="mt-3 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 space-y-1">
                                    {c.instructions_ar && <p>{c.instructions_ar}</p>}
                                    {c.bank_name && <p>البنك: <strong>{c.bank_name}</strong></p>}
                                    {c.account_number && <p>رقم الحساب: <strong>{c.account_number}</strong></p>}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* Submit */}
                {(() => {
                    const selMethod = paymentMethods.find(m => m.provider_id === formData.paymentMethod);
                    const isApiMethod = selMethod?.type === 'api';
                    return (
                        <>
                            <button type="submit" disabled={loading || isApiMethod}
                                className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {loading
                                    ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ التأكيد...</>
                                    : 'تأكيد الحجز نهائياً'}
                            </button>
                            {isApiMethod && (
                                <p className="text-center text-xs text-amber-600 font-semibold mt-2">⚙️ الربط الإلكتروني قيد التجهيز حالياً</p>
                            )}
                        </>
                    );
                })()}
            </form>
        </div>
    );

    if (compact) {
        // Modal mode: summary on top, form below, single column
        return (
            <div className="space-y-4">
                <Summary />
                <Form />
            </div>
        );
    }

    // Full-page mode: two-column grid (matches original Checkout.jsx layout)
    return (
        <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4 order-1 md:order-2">
                <div className="sticky top-24"><Summary /></div>
            </div>
            <div className="md:col-span-8 order-2 md:order-1"><Form /></div>
        </div>
    );
}
