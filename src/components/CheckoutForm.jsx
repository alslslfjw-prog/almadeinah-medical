/**
 * CheckoutForm - reusable patient booking form.
 * Used by Checkout.jsx and the Patient Dashboard modal.
 *
 * FIX: All inner `const X = () => (...)` component declarations have been
 * converted to plain JSX variables (`const xJSX = (...)`).
 * Defining components inside a render function gives them a new identity on
 * every render, causing React to unmount/remount them and lose input focus.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    Calendar, Clock, User, Phone, CheckCircle,
    MapPin, CreditCard, Building2, UserCircle,
    ShieldCheck, Send, RefreshCw, Loader2,
} from 'lucide-react';
import { useAppointments } from '../hooks/useAppointments';
import { usePayment } from '../hooks/usePayment';
import useAuthStore from '../store/authStore';
import { getPaymentMethods } from '../api/payments';

const ALQUTABI_PROVIDER_ID = 'alqutabi_bank';
const MORNING_MANUAL_PAYMENT_WARNING = 'تنبيه: يجب الحضور للمركز في نفس يوم الموعد الساعة 8:00 صباحاً لتأكيد حجزك ودفع الرسوم. سيتم إلغاء الحجز تلقائياً في حال عدم تأكيد الدفع من قبل الاستقبال.';
const EVENING_MANUAL_PAYMENT_WARNING = 'تنبيه: يجب الحضور للمركز في نفس يوم الموعد الساعة 4:00 عصراً لتأكيد حجزك ودفع الرسوم. سيتم إلغاء الحجز تلقائياً في حال عدم تأكيد الدفع من قبل الاستقبال.';

function makeIdempotencyKey() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getAppointmentStartMinutes(bookingData) {
    const raw = String(bookingData?.slotStart || bookingData?.time || '').trim();
    const start = raw.split(/\s*-\s*/)[0]?.trim() || raw;
    const match = start.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AP]M|[ap]m|ص|م)?/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const marker = match[3]?.toLowerCase();

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if ((marker === 'pm' || marker === 'م') && hours < 12) hours += 12;
    if ((marker === 'am' || marker === 'ص') && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

export default function CheckoutForm({ bookingData = {}, prefill = {}, onSuccess, compact = false }) {
    const { user, isAuthenticated } = useAuthStore();
    const { createAppointment, isLoading: loading } = useAppointments();
    const {
        status: paymentStatus,
        paymentSessionId,
        expiresAt,
        error: paymentError,
        initiateAlqutabiPayment,
        confirmAlqutabiPayment,
        resendAlqutabiOtp,
        reset: resetPayment,
    } = usePayment();

    const [paymentMethods, setPaymentMethods] = useState([]);
    const [idempotencyKey, setIdempotencyKey] = useState(makeIdempotencyKey);
    const [bankData, setBankData] = useState({
        customerAccountNumber: '',
        paymentCode: '',
        otp: '',
    });
    const [formData, setFormData] = useState({
        name: prefill.name ?? '',
        gender: prefill.gender ?? '',
        birthDate: prefill.birthDate ?? '',
        phone: prefill.phone ? prefill.phone.replace(/\D/g, '').slice(0, 9) : '',
        address: prefill.address ?? '',
        paymentMethod: '',
    });

    useEffect(() => {
        getPaymentMethods().then(({ data }) => {
            const activeMethods = (data ?? []).filter(method => method.is_active);
            if (activeMethods.length) {
                setPaymentMethods(activeMethods);
                setFormData(f => ({ ...f, paymentMethod: f.paymentMethod || activeMethods[0].provider_id }));
            }
        });
    }, []);

    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            name: prefill.name || prev.name,
            gender: prefill.gender || prev.gender,
            birthDate: prefill.birthDate || prev.birthDate,
            phone: prefill.phone ? prefill.phone.replace(/\D/g, '').slice(0, 9) : prev.phone,
            address: prefill.address || prev.address,
        }));
    }, [prefill.name, prefill.phone, prefill.gender, prefill.birthDate, prefill.address]);

    const selectedMethod = useMemo(
        () => paymentMethods.find(m => m.provider_id === formData.paymentMethod),
        [paymentMethods, formData.paymentMethod],
    );
    const isAlqutabi = selectedMethod?.type === 'api' && selectedMethod.provider_id === ALQUTABI_PROVIDER_ID;
    const isUnsupportedApi = selectedMethod?.type === 'api' && !isAlqutabi;
    const otpStep = paymentStatus === 'otp_required' || paymentStatus === 'confirming';
    const busy = loading || paymentStatus === 'initiating' || paymentStatus === 'confirming';
    const appointmentStartMinutes = useMemo(() => getAppointmentStartMinutes(bookingData), [bookingData]);
    const manualPaymentWarning = appointmentStartMinutes !== null && appointmentStartMinutes >= 12 * 60
        ? EVENING_MANUAL_PAYMENT_WARNING
        : MORNING_MANUAL_PAYMENT_WARNING;

    const set = key => e => setFormData(p => ({ ...p, [key]: e.target.value }));
    const setBank = key => e => {
        const value = e.target.value.replace(/\D/g, '');
        setBankData(p => ({ ...p, [key]: value }));
    };

    const cleanPhone = () => formData.phone.replace(/\D/g, '');

    const validatePatient = () => {
        if (cleanPhone().length < 9) {
            alert('يرجى إدخال رقم هاتف صحيح (9 أرقام على الأقل)');
            return false;
        }
        return true;
    };

    const appointmentPayload = () => {
        const doctorId = bookingData.doctor?.id ?? null;
        const scanId = bookingData.type === 'scans' ? (bookingData.scanId ?? null) : null;
        const serviceName = bookingData.doctor?.name ?? bookingData.primarySelection ?? null;
        const doctorTimeSlotId = bookingData.doctorTimeSlotId ?? bookingData.doctor_time_slot_id ?? null;
        const scanTimeSlotId = bookingData.scanTimeSlotId ?? bookingData.scan_time_slot_id ?? null;

        return {
            patient_name: formData.name,
            phone_number: cleanPhone(),
            appointment_date: bookingData.date || null,
            appointment_time: bookingData.time || null,
            doctor_time_slot_id: doctorTimeSlotId,
            scan_time_slot_id: scanTimeSlotId,
            doctor_id: doctorId,
            scan_id: scanId,
            status: 'pending',
            patient_user_id: user?.id ?? null,
            service_name: serviceName,
            type: bookingData.type ?? null,
            total_price_yer: bookingData.priceYER > 0 ? bookingData.priceYER : null,
            payment_method_provider_id: selectedMethod?.provider_id ?? null,
            payment_status: selectedMethod?.type === 'manual' ? 'manual_pending' : null,
        };
    };

    const handleManualBooking = async () => {
        const { success: ok, error } = await createAppointment(appointmentPayload());
        if (ok) onSuccess(formData.name);
        else alert('حدث خطأ أثناء الحجز: ' + (error?.message ?? JSON.stringify(error)));
    };

    const handleInitiatePayment = async () => {
        if (!isAuthenticated || !user?.id) {
            alert('يرجى تسجيل الدخول لإتمام الدفع الإلكتروني.');
            return;
        }
        if (!bankData.customerAccountNumber || !bankData.paymentCode) {
            alert('يرجى إدخال رقم الحساب وكود الدفع من تطبيق بنك القطيبي.');
            return;
        }

        const result = await initiateAlqutabiPayment({
            bookingData,
            patient: {
                name: formData.name,
                phone: cleanPhone(),
                gender: formData.gender,
                birthDate: formData.birthDate,
                address: formData.address,
            },
            customerAccountNumber: bankData.customerAccountNumber,
            paymentCode: bankData.paymentCode,
            idempotencyKey,
        });

        if (!result.success && result.error?.code !== 'rate_limited') {
            setIdempotencyKey(makeIdempotencyKey());
        }
    };

    const handleConfirmOtp = async () => {
        if (!paymentSessionId) return;
        if (!bankData.otp || bankData.otp.length < 4) {
            alert('يرجى إدخال رمز التحقق OTP.');
            return;
        }

        const result = await confirmAlqutabiPayment({
            paymentSessionId,
            customerAccountNumber: bankData.customerAccountNumber,
            paymentCode: bankData.paymentCode,
            otp: bankData.otp,
        });

        if (result.success) onSuccess(formData.name);
    };

    const handleResendOtp = async () => {
        if (!paymentSessionId) return;
        await resendAlqutabiOtp({
            paymentSessionId,
            customerAccountNumber: bankData.customerAccountNumber,
            paymentCode: bankData.paymentCode,
            otp: bankData.otp || '0',
        });
    };

    const handleSubmit = async e => {
        e.preventDefault();
        if (!validatePatient()) return;
        if (isUnsupportedApi) return;
        if (otpStep) { await handleConfirmOtp(); return; }
        if (isAlqutabi) { await handleInitiatePayment(); return; }
        await handleManualBooking();
    };

    const choosePaymentMethod = (providerId) => {
        setFormData(p => ({ ...p, paymentMethod: providerId }));
        setBankData({ customerAccountNumber: '', paymentCode: '', otp: '' });
        setIdempotencyKey(makeIdempotencyKey());
        resetPayment();
    };

    const fieldCls = 'w-full bg-gray-50 border border-gray-200 text-gray-800 py-3.5 px-4 pr-12 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition';

    // ─────────────────────────────────────────────────────────────────────────
    // JSX variables (NOT components) — converting to components caused focus
    // loss because React unmounted & remounted inputs on every state update.
    // ─────────────────────────────────────────────────────────────────────────

    const summaryJSX = (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
            <h3 className="text-base font-bold text-gray-800 border-b border-gray-100 pb-3">تفاصيل الموعد</h3>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                    <User size={18} />
                </div>
                <div>
                    <p className="text-xs text-gray-400">الخدمة</p>
                    <p className="font-bold text-gray-800 text-sm">
                        {bookingData.doctor?.name ?? bookingData.primarySelection ?? '-'}
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
                        : 'مجانا'}
                </span>
            </div>
        </div>
    );

    const paymentMethodsJSX = paymentMethods.length > 0 && (
        <div>
            <label className="block text-gray-700 font-bold mb-3 text-sm">طريقة الدفع</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {paymentMethods.map(method => {
                    const selected = formData.paymentMethod === method.provider_id;
                    return (
                        <button
                            type="button"
                            key={method.provider_id}
                            onClick={() => choosePaymentMethod(method.provider_id)}
                            className={`text-right rounded-xl border-2 p-4 flex items-center gap-3 transition-all ${selected ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-teal-200'}`}
                        >
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
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const manualDetailsJSX = (() => {
        if (!selectedMethod || selectedMethod.type !== 'manual') return null;
        const c = selectedMethod.config ?? {};
        return (
            <div className="space-y-2">
                <div className="p-3 bg-amber-50 text-amber-900 text-sm rounded-lg border border-amber-100 font-semibold leading-7">
                    {manualPaymentWarning}
                </div>
                {(c.instructions_ar || c.account_number || c.bank_name) && (
                    <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-100 space-y-1">
                        {c.instructions_ar && <p>{c.instructions_ar}</p>}
                        {c.bank_name && <p>البنك: <strong>{c.bank_name}</strong></p>}
                        {c.account_number && <p>رقم الحساب: <strong>{c.account_number}</strong></p>}
                    </div>
                )}
            </div>
        );
    })();

    const alqutabiFieldsJSX = isAlqutabi ? (
        <div className="space-y-4 rounded-2xl border border-teal-100 bg-teal-50/60 p-4">
            <div className="flex items-start gap-2 text-xs text-teal-800">
                <ShieldCheck size={15} className="mt-0.5 shrink-0" />
                <span>سيتم إرسال طلب الدفع للبنك من الخادم فقط، ثم يصلك رمز OTP عبر واتساب.</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">رقم حسابك في بنك القطيبي</label>
                    <input
                        required={isAlqutabi}
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        disabled={otpStep}
                        value={bankData.customerAccountNumber}
                        onChange={setBank('customerAccountNumber')}
                        className="w-full bg-white border border-teal-100 text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                        placeholder="55036158"
                    />
                </div>
                <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">كود الدفع من تطبيق البنك</label>
                    <input
                        required={isAlqutabi}
                        type="tel"
                        inputMode="numeric"
                        dir="ltr"
                        disabled={otpStep}
                        value={bankData.paymentCode}
                        onChange={setBank('paymentCode')}
                        className="w-full bg-white border border-teal-100 text-gray-800 py-3.5 px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-gray-100"
                        placeholder="318297"
                    />
                </div>
            </div>
        </div>
    ) : null;

    const otpPanelJSX = otpStep ? (
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 space-y-4">
            <div>
                <p className="font-bold text-amber-900 text-sm">تم إرسال رمز OTP</p>
                <p className="text-xs text-amber-700 mt-1">
                    أدخل الرمز الذي وصلك من بنك القطيبي. تنتهي مهلة الدفع
                    {expiresAt ? ` في ${new Date(expiresAt).toLocaleTimeString('ar-YE', { hour: '2-digit', minute: '2-digit' })}` : ' خلال دقائق'}.
                </p>
            </div>
            <input
                required={otpStep}
                type="tel"
                inputMode="numeric"
                dir="ltr"
                value={bankData.otp}
                onChange={setBank('otp')}
                className="w-full bg-white border border-amber-100 text-gray-800 py-3.5 px-4 rounded-xl text-center tracking-[0.4em] font-black text-lg focus:outline-none focus:ring-2 focus:ring-amber-400"
                placeholder="000000"
            />
            <button
                type="button"
                onClick={handleResendOtp}
                disabled={busy}
                className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 hover:text-amber-900 disabled:opacity-50"
            >
                <RefreshCw size={13} />
                إعادة إرسال الرمز
            </button>
        </div>
    ) : null;

    const formJSX = (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 md:p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-1">بيانات المريض</h3>
            <p className="text-gray-400 text-xs mb-6">يرجى مراجعة بياناتك أو تعديلها قبل التأكيد.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-gray-700 font-bold mb-2 text-sm">الاسم الرباعي</label>
                    <div className="relative">
                        <input required type="text" placeholder="أدخل الاسم بالكامل"
                            value={formData.name} onChange={set('name')} className={fieldCls} />
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    </div>
                </div>

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

                {paymentMethodsJSX}
                {manualDetailsJSX}
                {alqutabiFieldsJSX}
                {otpPanelJSX}

                {isUnsupportedApi && (
                    <p className="text-center text-xs text-amber-600 font-semibold">
                        هذه البوابة غير مفعلة حالياً.
                    </p>
                )}
                {paymentError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                        {paymentError}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={busy || isUnsupportedApi}
                    className="w-full bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white font-bold py-4 rounded-xl shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {busy ? (
                        <><Loader2 size={18} className="animate-spin" />جار المعالجة...</>
                    ) : otpStep ? (
                        <><CheckCircle size={18} />تأكيد رمز الدفع</>
                    ) : isAlqutabi ? (
                        <><Send size={18} />إرسال طلب الدفع</>
                    ) : (
                        'تأكيد الحجز نهائياً'
                    )}
                </button>
            </form>
        </div>
    );

    if (compact) {
        return (
            <div className="space-y-4">
                {summaryJSX}
                {formJSX}
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-4 order-1 md:order-2">
                <div className="sticky top-24">{summaryJSX}</div>
            </div>
            <div className="md:col-span-8 order-2 md:order-1">{formJSX}</div>
        </div>
    );
}
