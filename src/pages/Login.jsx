import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { isStaff } from '../lib/roles';

export default function Login() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signIn, sendPasswordReset, isAuthenticated, role, isLoading } = useAuth();

    // ── View: 'login' | 'forgot' ───────────────────────────────────────────────
    const [view, setView] = useState('login');

    // Login form state
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Forgot-password form state
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSubmitting, setForgotSubmitting] = useState(false);
    const [forgotError, setForgotError] = useState('');
    const [forgotSuccess, setForgotSuccess] = useState(false);

    // Where to send user after login — respect the "from" state if redirected here
    const from = location.state?.from ?? null;

    // If already authenticated AND role is resolved, redirect to the right dashboard.
    // We wait for role !== null to avoid redirecting before fetchProfileWithRetry completes.
    useEffect(() => {
        if (!isLoading && isAuthenticated && role !== null) {
            // All staff roles go to the admin dashboard; patients go to the patient dashboard
            const roleDashboard = isStaff(role) ? '/dashboard/admin' : '/dashboard/patient';

            // Validate `from` to prevent stale cross-role redirect poisoning
            const staffMode = isStaff(role);
            const canFollow =
                from &&
                ((staffMode  && from.startsWith('/dashboard/admin'))          || // staff → admin path
                 (staffMode  && !from.startsWith('/dashboard/'))              || // staff → other path
                 (!staffMode && !from.startsWith('/dashboard/admin')));          // patient → non-admin path

            navigate(canFollow ? from : roleDashboard, { replace: true });
        }
    }, [isAuthenticated, isLoading, role, navigate, from]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const { error: authError } = await signIn(formData);

        if (authError) {
            setError(authError.message?.includes('Invalid login')
                ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
                : authError.message);
            setSubmitting(false);
        }
        // On success, the useAuth listener fires → authStore updates → useEffect above redirects
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        setForgotError('');
        setForgotSubmitting(true);
        const { error } = await sendPasswordReset(forgotEmail);
        setForgotSubmitting(false);
        if (error) {
            const msg = error.message ?? '';
            const arabicError =
                msg.includes('rate limit') ? 'لقد تجاوزت الحد المسموح به من المحاولات. يرجى الانتظار قليلاً قبل المحاولة مجدداً.' :
                msg.includes('User not found') ? 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني.' :
                'حدث خطأ. يرجى المحاولة مرة أخرى.';
            setForgotError(arabicError);
        } else {
            setForgotSuccess(true);
        }
    };

    const logoUrl = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-teal-700 flex items-center justify-center p-4 font-sans" dir="rtl">

            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md">

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">

                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Link to="/">
                            <img src={logoUrl} alt="مركز المدينة الطبي" className="h-16 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* ── FORGOT PASSWORD VIEW ── */}
                    {view === 'forgot' && (
                        <>
                            <h1 className="text-2xl font-bold text-white text-center mb-1">استعادة كلمة المرور</h1>
                            <p className="text-blue-200 text-center text-sm mb-8">أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين</p>

                            {forgotError && (
                                <div className="flex items-center gap-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 mb-6 text-sm">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span>{forgotError}</span>
                                </div>
                            )}

                            {forgotSuccess ? (
                                <div className="flex flex-col items-center gap-3 py-4 text-center">
                                    <CheckCircle size={48} className="text-teal-300" />
                                    <p className="text-white font-bold">تم إرسال الرابط بنجاح!</p>
                                    <p className="text-blue-200 text-sm">يرجى التحقق من بريدك الإلكتروني واتباع التعليمات لإعادة تعيين كلمة المرور.</p>
                                    <button
                                        onClick={() => { setView('login'); setForgotSuccess(false); setForgotEmail(''); }}
                                        className="mt-4 text-teal-300 text-sm hover:text-white transition flex items-center gap-1"
                                    >
                                        <ArrowRight size={14} /> العودة لتسجيل الدخول
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleForgotSubmit} className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-semibold text-blue-100 mb-2">البريد الإلكتروني</label>
                                        <div className="relative">
                                            <input
                                                type="email"
                                                required
                                                autoComplete="email"
                                                placeholder="example@email.com"
                                                value={forgotEmail}
                                                onChange={(e) => setForgotEmail(e.target.value)}
                                                className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                            />
                                            <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={forgotSubmitting}
                                        className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50"
                                    >
                                        {forgotSubmitting
                                            ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الإرسال...</>
                                            : 'إرسال رابط الاستعادة'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => { setView('login'); setForgotError(''); }}
                                        className="w-full text-center text-blue-300 hover:text-white text-sm transition flex items-center justify-center gap-1"
                                    >
                                        <ArrowRight size={14} /> العودة لتسجيل الدخول
                                    </button>
                                </form>
                            )}
                        </>
                    )}

                    {/* ── LOGIN VIEW ── */}
                    {view === 'login' && (
                        <>
                    <h1 className="text-2xl font-bold text-white text-center mb-1">مرحباً بعودتك</h1>
                    <p className="text-blue-200 text-center text-sm mb-8">سجّل دخولك للوصول إلى لوحة التحكم</p>

                    {/* Error Banner */}
                    {error && (
                        <div className="flex items-center gap-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 mb-6 text-sm">
                            <AlertCircle size={18} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-semibold text-blue-100 mb-2">البريد الإلكتروني</label>
                            <div className="relative">
                                <input
                                    type="email"
                                    required
                                    autoComplete="email"
                                    placeholder="example@email.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                />
                                <Mail size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold text-blue-100">كلمة المرور</label>
                                <button
                                    type="button"
                                    onClick={() => { setView('forgot'); setError(''); }}
                                    className="text-teal-300 text-xs hover:text-white transition"
                                >
                                    نسيت كلمة المرور؟
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 pl-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                />
                                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting || isLoading}
                            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50 mt-2"
                        >
                            {submitting ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ تسجيل الدخول...</>
                            ) : (
                                <><LogIn size={20} /> تسجيل الدخول</>
                            )}
                        </button>
                    </form>

                    {/* Register link */}
                    <p className="text-center text-blue-200 text-sm mt-6">
                        ليس لديك حساب؟{' '}
                        <Link to="/register" className="text-teal-300 font-bold hover:text-white transition">
                            إنشاء حساب جديد
                        </Link>
                    </p>

                    {/* Back to site */}
                    <div className="text-center mt-4">
                        <Link to="/" className="text-blue-300 hover:text-white text-xs transition">
                            ← العودة إلى الموقع
                        </Link>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
