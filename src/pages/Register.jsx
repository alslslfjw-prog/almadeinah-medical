/**
 * Register — Phone-based patient onboarding.
 * Step 1: Full name + phone number
 * Step 2: OTP verification
 * On success: saves full_name to profile → redirects to patient dashboard
 */
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Phone, User, ShieldCheck, Loader2, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { signInWithPhone, verifyPhoneOtp } from '../api/auth';
import { updateMyProfile } from '../api/patient';

const LOGO_URL = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";
const COUNTRY_CODE = '+967';

const inputCls = "w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition";

export default function Register() {
    const navigate = useNavigate();

    const [step, setStep]           = useState(1); // 1 = info, 2 = otp
    const [fullName, setFullName]   = useState('');
    const [phone, setPhone]         = useState('');
    const [otp, setOtp]             = useState('');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');
    const otpRefs = useRef([]);

    const phoneE164 = COUNTRY_CODE + phone.replace(/\D/g, '').slice(0, 9);

    // Step 1: validate → send OTP
    const handleSendOtp = async e => {
        e.preventDefault();
        setError('');
        if (!fullName.trim()) { setError('يرجى إدخال الاسم الكامل.'); return; }
        if (phone.replace(/\D/g, '').length < 9) { setError('يرجى إدخال رقم هاتف صحيح مكوّن من 9 أرقام.'); return; }
        setLoading(true);
        const { error: authErr } = await signInWithPhone(phoneE164);
        setLoading(false);
        if (authErr) {
            setError(authErr.message?.includes('rate')
                ? 'لقد تجاوزت الحد المسموح. يرجى الانتظار ثم المحاولة.'
                : 'حدث خطأ أثناء الإرسال. يرجى المحاولة مجدداً.');
            return;
        }
        setStep(2);
    };

    // Step 2: verify OTP → save name → redirect
    const handleVerifyOtp = async e => {
        e.preventDefault();
        setError('');
        if (otp.length < 6) { setError('يرجى إدخال رمز التحقق المكوّن من 6 أرقام.'); return; }
        setLoading(true);
        const { error: authErr } = await verifyPhoneOtp(phoneE164, otp);
        if (authErr) {
            setError('رمز التحقق غير صحيح أو منتهي الصلاحية.');
            setLoading(false);
            return;
        }
        // Session is now active — save the full_name to the profile
        await updateMyProfile({ full_name: fullName.trim(), phone: phone.replace(/\D/g,'') });
        setLoading(false);
        navigate('/dashboard/patient', { replace: true });
    };

    const handleOtpChar = (i, val) => {
        const d = val.replace(/\D/g, '');
        if (!d) return;
        const chars = otp.split('');
        chars[i] = d[0];
        const next = chars.join('');
        setOtp(next);
        if (i < 5) otpRefs.current[i + 1]?.focus();
    };
    const handleOtpKey = (i, e) => {
        if (e.key === 'Backspace') {
            const chars = otp.split('');
            chars[i] = '';
            setOtp(chars.join(''));
            if (i > 0) otpRefs.current[i - 1]?.focus();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-teal-700 flex items-center justify-center p-4 font-sans" dir="rtl">

            <div className="absolute top-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">

                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <Link to="/"><img src={LOGO_URL} alt="مركز المدينة الطبي" className="h-16 w-auto object-contain" /></Link>
                    </div>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 mb-7">
                        {[1, 2].map(s => (
                            <React.Fragment key={s}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition ${step >= s ? 'bg-teal-500 text-white' : 'bg-white/20 text-blue-300'}`}>
                                    {step > s ? <CheckCircle size={16} /> : s}
                                </div>
                                {s < 2 && <div className={`flex-1 h-0.5 rounded transition ${step > s ? 'bg-teal-500' : 'bg-white/20'}`} />}
                            </React.Fragment>
                        ))}
                    </div>

                    {/* Step 1 — Name + Phone */}
                    {step === 1 && (
                        <>
                            <h1 className="text-2xl font-bold text-white text-center mb-1">إنشاء حساب جديد</h1>
                            <p className="text-blue-200 text-center text-sm mb-7">سجّل معنا للاستمتاع بمزايا الحجز الإلكتروني</p>

                            {error && (
                                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 mb-4 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />{error}
                                </div>
                            )}

                            <form onSubmit={handleSendOtp} className="space-y-5">
                                {/* Full name */}
                                <div>
                                    <label className="block text-sm font-semibold text-blue-100 mb-2">الاسم الكامل</label>
                                    <div className="relative">
                                        <input type="text" required placeholder="أدخل اسمك الرباعي"
                                            value={fullName} onChange={e => { setFullName(e.target.value); setError(''); }}
                                            className={inputCls} autoFocus />
                                        <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                    </div>
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-semibold text-blue-100 mb-2">رقم الهاتف (واتساب)</label>
                                    <div className="flex gap-2" dir="ltr">
                                        <span className="px-3 py-3.5 bg-white/10 border border-white/20 rounded-xl text-blue-200 font-mono text-sm font-bold shrink-0">+967</span>
                                        <input type="tel" inputMode="numeric" maxLength={9}
                                            placeholder="77 000 0000"
                                            value={phone}
                                            onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,9)); setError(''); }}
                                            className="flex-1 bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-400 transition" />
                                    </div>
                                </div>

                                <button type="submit" disabled={loading}
                                    className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50 mt-2">
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> جارٍ الإرسال...</> : <><Phone size={18} /> إرسال رمز التحقق</>}
                                </button>
                            </form>

                            <p className="text-center text-blue-200 text-sm mt-5">
                                لديك حساب بالفعل؟{' '}
                                <Link to="/login" className="text-teal-300 font-bold hover:text-white transition">تسجيل الدخول</Link>
                            </p>
                        </>
                    )}

                    {/* Step 2 — OTP */}
                    {step === 2 && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-14 h-14 bg-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                    <ShieldCheck size={28} className="text-teal-400" />
                                </div>
                                <h1 className="text-xl font-bold text-white mb-1">أدخل رمز التحقق</h1>
                                <p className="text-blue-200 text-sm">تم الإرسال إلى {COUNTRY_CODE}{phone} عبر WhatsApp</p>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 mb-4 text-sm">
                                    <AlertCircle size={16} className="shrink-0" />{error}
                                </div>
                            )}

                            <form onSubmit={handleVerifyOtp} className="space-y-5">
                                <div className="flex gap-2 justify-center" dir="ltr">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <input key={i}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text" inputMode="numeric" maxLength={1}
                                            value={otp[i] ?? ''}
                                            onChange={e => handleOtpChar(i, e.target.value)}
                                            onKeyDown={e => handleOtpKey(i, e)}
                                            className="w-11 h-12 text-center text-xl font-black bg-white/10 border-2 border-white/20 rounded-xl text-white focus:outline-none focus:border-teal-400 transition"
                                            autoFocus={i === 0} />
                                    ))}
                                </div>

                                <button type="submit" disabled={loading || otp.length < 6}
                                    className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50">
                                    {loading ? <><Loader2 size={18} className="animate-spin" /> جارٍ إنشاء الحساب...</> : <><CheckCircle size={18} /> تأكيد وإنشاء الحساب</>}
                                </button>

                                <div className="flex justify-between text-sm text-blue-300 mt-1">
                                    <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); }}
                                        className="flex items-center gap-1 hover:text-white transition">
                                        <ArrowLeft size={13} /> تعديل البيانات
                                    </button>
                                    <button type="button"
                                        onClick={() => { setOtp(''); signInWithPhone(phoneE164); }}
                                        className="hover:text-teal-300 transition">
                                        إعادة الإرسال
                                    </button>
                                </div>
                            </form>
                        </>
                    )}

                    <div className="text-center mt-5">
                        <Link to="/" className="text-blue-300 hover:text-white text-xs transition">← العودة إلى الموقع</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
