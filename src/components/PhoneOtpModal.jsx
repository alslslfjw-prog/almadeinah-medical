/**
 * PhoneOtpModal — Inline phone authentication modal.
 *
 * Shown when an unauthenticated user tries to book an appointment.
 * Handles the full OTP flow WITHOUT navigating away, so the
 * selected booking data in the parent component is preserved.
 *
 * Props:
 *   onSuccess()  — called after OTP verified successfully
 *   onClose()    — called when user dismisses the modal
 */

import React, { useState, useRef } from 'react';
import { X, Phone, ShieldCheck, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { signInWithPhone, verifyPhoneOtp } from '../api/auth';

const COUNTRY_CODE = '+967';

export default function PhoneOtpModal({ onSuccess, onClose }) {
    const [step, setStep]       = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone]     = useState('');      // 9 raw digits
    const [otp, setOtp]         = useState('');      // 6-digit code
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const otpRefs               = useRef([]);

    const phoneE164 = COUNTRY_CODE + phone.replace(/\D/g, '').slice(0, 9);

    // ── Step 1: send OTP ──────────────────────────────────────────────────────
    const handleSendOtp = async e => {
        e.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 9) {
            setError('يرجى إدخال رقم هاتف مكوّن من 9 أرقام.');
            return;
        }
        setError('');
        setLoading(true);
        const { error: authErr } = await signInWithPhone(phoneE164);
        setLoading(false);
        if (authErr) {
            // DEBUG: show raw error
            setError(`[DEBUG] ${authErr.message ?? JSON.stringify(authErr)}`);
            return;
        }
        setStep('otp');
    };

    // ── Step 2: verify OTP ────────────────────────────────────────────────────
    const handleVerifyOtp = async e => {
        e.preventDefault();
        if (otp.length < 6) { setError('يرجى إدخال رمز التحقق المكوّن من 6 أرقام.'); return; }
        setError('');
        setLoading(true);
        const { error: authErr } = await verifyPhoneOtp(phoneE164, otp);
        setLoading(false);
        if (authErr) {
            setError(`[DEBUG] ${authErr.message ?? JSON.stringify(authErr)}`);
            return;
        }
        // onSuccess — parent handles navigation / booking continuation
        onSuccess();
    };

    // Single-char OTP boxes — auto-advance on input
    const handleOtpChar = (i, val) => {
        const digits = val.replace(/\D/g, '');
        if (!digits) return;
        const chars = otp.split('');
        chars[i] = digits[0];
        const next = chars.join('');
        setOtp(next);
        if (i < 5) otpRefs.current[i + 1]?.focus();
        if (next.length === 6) setError('');
    };

    const handleOtpKeyDown = (i, e) => {
        if (e.key === 'Backspace') {
            const chars = otp.split('');
            chars[i] = '';
            setOtp(chars.join(''));
            if (i > 0) otpRefs.current[i - 1]?.focus();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="bg-gradient-to-l from-teal-600 to-teal-500 px-6 py-5 text-white relative">
                    <button onClick={onClose}
                        className="absolute top-4 left-4 text-teal-200 hover:text-white transition">
                        <X size={20} />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            {step === 'phone' ? <Phone size={20} /> : <ShieldCheck size={20} />}
                        </div>
                        <div>
                            <h2 className="font-bold text-base">
                                {step === 'phone' ? 'تسجيل الدخول للمتابعة' : 'أدخل رمز التحقق'}
                            </h2>
                            <p className="text-teal-100 text-xs mt-0.5">
                                {step === 'phone'
                                    ? 'سنرسل رمز تحقق عبر WhatsApp'
                                    : `تم الإرسال إلى ${COUNTRY_CODE}${phone}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Step 1 — phone */}
                    {step === 'phone' && (
                        <form onSubmit={handleSendOtp} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-2">
                                    رقم الهاتف (WhatsApp)
                                </label>
                                <div className="flex gap-2 items-center" dir="ltr">
                                    <span className="px-3 py-3 bg-slate-100 rounded-xl text-slate-600 font-mono text-sm font-bold border border-slate-200 shrink-0">
                                        +967
                                    </span>
                                    <input
                                        type="tel" inputMode="numeric" maxLength={9}
                                        placeholder="77 000 0000"
                                        value={phone}
                                        onChange={e => {
                                            setPhone(e.target.value.replace(/\D/g, '').slice(0, 9));
                                            setError('');
                                        }}
                                        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 font-mono text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-xs">{error}</p>}

                            <button type="submit" disabled={loading || phone.replace(/\D/g,'').length < 9}
                                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
                                {loading
                                    ? <><Loader2 size={18} className="animate-spin" /> جارٍ الإرسال...</>
                                    : <><Phone size={18} /> إرسال رمز التحقق</>}
                            </button>

                            <p className="text-center text-xs text-slate-400">
                                ستصلك رسالة WhatsApp تحتوي على رمز مكوّن من 6 أرقام
                            </p>
                        </form>
                    )}

                    {/* Step 2 — OTP */}
                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOtp} className="space-y-5">
                            {/* 6-box OTP input */}
                            <div>
                                <label className="block text-sm font-bold text-slate-600 mb-3 text-center">
                                    رمز التحقق
                                </label>
                                <div className="flex gap-2 justify-center" dir="ltr">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <input
                                            key={i}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text" inputMode="numeric"
                                            maxLength={1}
                                            value={otp[i] ?? ''}
                                            onChange={e => handleOtpChar(i, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(i, e)}
                                            className="w-11 h-12 text-center text-xl font-black border-2 border-slate-200 rounded-xl focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-slate-50 transition"
                                            autoFocus={i === 0}
                                        />
                                    ))}
                                </div>
                            </div>

                            {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                            <button type="submit" disabled={loading || otp.length < 6}
                                className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
                                {loading
                                    ? <><Loader2 size={18} className="animate-spin" /> جارٍ التحقق...</>
                                    : <><CheckCircle size={18} /> تأكيد الرمز</>}
                            </button>

                            <div className="flex items-center justify-between text-xs text-slate-400">
                                <button type="button"
                                    onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
                                    className="flex items-center gap-1 hover:text-slate-600 transition">
                                    <ArrowLeft size={12} /> تغيير الرقم
                                </button>
                                <button type="button"
                                    onClick={() => { setOtp(''); handleSendOtp({ preventDefault: () => {} }); }}
                                    className="hover:text-teal-600 transition">
                                    إعادة الإرسال
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
