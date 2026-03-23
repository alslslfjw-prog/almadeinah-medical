import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Phone, ShieldCheck, Loader2, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isStaff } from '../lib/roles';
import { signInWithPhone, verifyPhoneOtp } from '../api/auth';

const LOGO_URL = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";
const COUNTRY_CODE = '+967';

// ── Shared input style ────────────────────────────────────────────────────────
const inputCls = "w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 focus:outline-none focus:ring-2 focus:ring-teal-400 transition";

export default function Login() {
    const navigate   = useNavigate();
    const location   = useLocation();
    const { signIn, sendPasswordReset, isAuthenticated, role, isLoading } = useAuth();

    // Tabs: 'patient' (phone OTP) | 'staff' (email+password)
    const searchParams = new URLSearchParams(location.search);
    const [tab, setTab] = useState(searchParams.get('mode') === 'staff' ? 'staff' : 'patient');

    const from = location.state?.from ?? null;

    // ── Auth redirect (unchanged logic) ───────────────────────────────────────
    useEffect(() => {
        if (!isLoading && isAuthenticated && role !== null) {
            const roleDashboard = isStaff(role) ? '/dashboard/admin' : '/dashboard/patient';
            const staffMode = isStaff(role);
            const canFollow =
                from &&
                ((staffMode  && from.startsWith('/dashboard/admin'))       ||
                 (staffMode  && !from.startsWith('/dashboard/'))           ||
                 (!staffMode && !from.startsWith('/dashboard/admin')));
            navigate(canFollow ? from : roleDashboard, { replace: true });
        }
    }, [isAuthenticated, isLoading, role, navigate, from]);

    // ── Patient OTP state ─────────────────────────────────────────────────────
    const [phone, setPhone]       = useState('');
    const [otpStep, setOtpStep]   = useState(false);    // false = phone, true = otp
    const [otp, setOtp]           = useState('');
    const [pLoading, setPLoading] = useState(false);
    const [pError, setPError]     = useState('');
    const otpRefs = useRef([]);

    const phoneE164 = COUNTRY_CODE + phone.replace(/\D/g, '').slice(0, 9);

    const handleSendOtp = async e => {
        e?.preventDefault();
        const digits = phone.replace(/\D/g, '');
        if (digits.length < 9) { setPError('يرجى إدخال رقم هاتف مكوّن من 9 أرقام.'); return; }
        setPError(''); setPLoading(true);
        const { error } = await signInWithPhone(phoneE164);
        setPLoading(false);
        if (error) {
            // DEBUG: show raw error so we can diagnose
            setPError(`[DEBUG] ${error.message ?? JSON.stringify(error)}`);
            return;
        }
        setOtpStep(true);
    };

    const handleVerifyOtp = async e => {
        e.preventDefault();
        if (otp.length < 6) { setPError('يرجى إدخال رمز التحقق المكوّن من 6 أرقام.'); return; }
        setPError(''); setPLoading(true);
        const { error } = await verifyPhoneOtp(phoneE164, otp);
        setPLoading(false);
        if (error) { setPError(`[DEBUG] ${error.message ?? JSON.stringify(error)}`); return; }
        // Auth listener fires → useEffect above handles redirect
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

    // ── Staff email/password state ────────────────────────────────────────────
    const [formData, setFormData]       = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [sError, setSError]           = useState('');
    const [sSubmitting, setSSubmitting] = useState(false);
    const [forgotView, setForgotView]   = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotError, setForgotError]   = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);

    const handleStaffLogin = async e => {
        e.preventDefault(); setSError(''); setSSubmitting(true);
        const { error: authError } = await signIn(formData);
        if (authError) {
            setSError(authError.message?.includes('Invalid login')
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                : authError.message);
            setSSubmitting(false);
        }
    };

    const handleForgot = async e => {
        e.preventDefault(); setForgotError(''); setForgotLoading(true);
        const { error } = await sendPasswordReset(forgotEmail);
        setForgotLoading(false);
        if (error) {
            const m = error.message ?? '';
            setForgotError(
                m.includes('rate limit')  ? 'تجاوزت الحد المسموح. انتظر قليلاً.' :
                m.includes('not found')   ? 'لا يوجد حساب بهذا البريد.' :
                'حدث خطأ. حاول مجدداً.'
            );
        } else { setForgotSuccess(true); }
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

                    {/* Tabs */}
                    <div className="flex bg-white/10 rounded-2xl p-1 mb-7">
                        {[
                            { key: 'patient', label: 'للمرضى', icon: <Phone size={15} /> },
                            { key: 'staff',   label: 'للموظفين', icon: <Lock size={15} /> },
                        ].map(t => (
                            <button key={t.key}
                                onClick={() => { setTab(t.key); setPError(''); setSError(''); setForgotView(false); }}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition ${tab === t.key ? 'bg-white text-teal-700 shadow' : 'text-blue-200 hover:text-white'}`}>
                                {t.icon} {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Patient tab — Phone OTP ── */}
                    {tab === 'patient' && (
                        <>
                            {!otpStep ? (
                                <>
                                    <h1 className="text-xl font-bold text-white text-center mb-1">تسجيل الدخول</h1>
                                    <p className="text-blue-200 text-center text-sm mb-6">أدخل رقم هاتفك — سنرسل رمزاً عبر WhatsApp</p>
                                    <form onSubmit={handleSendOtp} className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-blue-100 mb-2">رقم الهاتف (واتساب)</label>
                                            <div className="flex gap-2" dir="ltr">
                                                <span className="px-3 py-3.5 bg-white/10 border border-white/20 rounded-xl text-blue-200 font-mono text-sm font-bold shrink-0">+967</span>
                                                <input type="tel" inputMode="numeric" maxLength={9}
                                                    placeholder="77 000 0000"
                                                    value={phone}
                                                    onChange={e => { setPhone(e.target.value.replace(/\D/g,'').slice(0,9)); setPError(''); }}
                                                    className={`${inputCls} font-mono tracking-widest`}
                                                    autoFocus />
                                            </div>
                                        </div>
                                        {pError && <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 text-sm"><AlertCircle size={16} className="shrink-0" />{pError}</div>}
                                        <button type="submit" disabled={pLoading || phone.replace(/\D/g,'').length < 9}
                                            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50">
                                            {pLoading ? <><Loader2 size={18} className="animate-spin" /> جارٍ الإرسال...</> : <><Phone size={18} /> إرسال رمز التحقق</>}
                                        </button>
                                    </form>
                                    <p className="text-center text-blue-200 text-sm mt-5">
                                        ليس لديك حساب؟{' '}
                                        <Link to="/register" className="text-teal-300 font-bold hover:text-white transition">إنشاء حساب</Link>
                                    </p>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold text-white text-center mb-1">أدخل رمز التحقق</h1>
                                    <p className="text-blue-200 text-center text-sm mb-6">تم الإرسال إلى {COUNTRY_CODE}{phone}</p>
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
                                        {pError && <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 text-sm"><AlertCircle size={16} className="shrink-0" />{pError}</div>}
                                        <button type="submit" disabled={pLoading || otp.length < 6}
                                            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50">
                                            {pLoading ? <><Loader2 size={18} className="animate-spin" /> جارٍ التحقق...</> : <><CheckCircle size={18} /> تأكيد الرمز</>}
                                        </button>
                                        <div className="flex justify-between text-sm text-blue-300">
                                            <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setPError(''); }} className="flex items-center gap-1 hover:text-white transition"><ArrowLeft size={13} /> تغيير الرقم</button>
                                            <button type="button" onClick={() => { setOtp(''); handleSendOtp(); }} className="hover:text-teal-300 transition">إعادة الإرسال</button>
                                        </div>
                                    </form>
                                </>
                            )}
                        </>
                    )}

                    {/* ── Staff tab — Email + Password ── */}
                    {tab === 'staff' && (
                        <>
                            {!forgotView ? (
                                <>
                                    <h1 className="text-xl font-bold text-white text-center mb-1">دخول الموظفين</h1>
                                    <p className="text-blue-200 text-center text-sm mb-6">للإداريين والكوادر الطبية فقط</p>
                                    <form onSubmit={handleStaffLogin} className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-semibold text-blue-100 mb-2">البريد الإلكتروني</label>
                                            <div className="relative">
                                                <input type="email" required autoComplete="email" placeholder="example@email.com"
                                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    className={`${inputCls} pr-11`} />
                                                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-blue-100 mb-2">كلمة المرور</label>
                                            <div className="relative">
                                                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                                                    placeholder="••••••••"
                                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    className={`${inputCls} pr-11 pl-11`} />
                                                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition">
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </div>
                                        {sError && <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 text-sm"><AlertCircle size={16} className="shrink-0" />{sError}</div>}
                                        <button type="submit" disabled={sSubmitting}
                                            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50">
                                            {sSubmitting ? <><Loader2 size={18} className="animate-spin" /> جارٍ الدخول...</> : <><LogIn size={18} /> تسجيل الدخول</>}
                                        </button>
                                    </form>
                                    <div className="text-center mt-4">
                                        <button onClick={() => setForgotView(true)} className="text-blue-300 hover:text-teal-300 text-sm transition">
                                            نسيت كلمة المرور؟
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h1 className="text-xl font-bold text-white text-center mb-1">استعادة كلمة المرور</h1>
                                    <p className="text-blue-200 text-center text-sm mb-6">أدخل بريدك لإرسال رابط الاستعادة</p>
                                    {!forgotSuccess ? (
                                        <form onSubmit={handleForgot} className="space-y-4">
                                            <div className="relative">
                                                <input type="email" required placeholder="example@email.com"
                                                    value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                                    className={`${inputCls} pr-11`} autoFocus />
                                                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                            </div>
                                            {forgotError && <div className="flex items-center gap-2 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 text-sm"><AlertCircle size={16} className="shrink-0" />{forgotError}</div>}
                                            <button type="submit" disabled={forgotLoading}
                                                className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition">
                                                {forgotLoading ? <><Loader2 size={18} className="animate-spin" /> جارٍ الإرسال...</> : 'إرسال رابط الاستعادة'}
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="text-center"><CheckCircle size={40} className="text-teal-400 mx-auto mb-3" /><p className="text-white font-bold mb-1">تم الإرسال!</p><p className="text-blue-200 text-sm">تحقق من بريدك الإلكتروني.</p></div>
                                    )}
                                    <button onClick={() => { setForgotView(false); setForgotSuccess(false); }} className="flex items-center gap-1 text-blue-300 hover:text-white text-sm mt-4 mx-auto transition">
                                        <ArrowLeft size={13} /> العودة لتسجيل الدخول
                                    </button>
                                </>
                            )}
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
