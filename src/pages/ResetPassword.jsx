import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

const LOGO_URL = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";
const SESSION_TIMEOUT_MS = 10_000;

export default function ResetPassword() {
    const navigate = useNavigate();
    const { updatePassword } = useAuth();

    // ─── Session gate ──────────────────────────────────────────────────────────
    const [sessionState, setSessionState] = useState('waiting'); // 'waiting' | 'ready' | 'expired'

    useEffect(() => {
        let cancelled = false;

        // Hard timeout for truly expired/invalid links
        const timer = setTimeout(() => {
            if (!cancelled) setSessionState(prev => prev === 'waiting' ? 'expired' : prev);
        }, SESSION_TIMEOUT_MS);

        // ── PRIMARY CHECK ──────────────────────────────────────────────────────
        // Supabase SDK processes the #access_token hash synchronously at init time,
        // BEFORE React mounts. getSession() already has the parsed session in memory.
        // Checking the hash for 'type=recovery' confirms this is a reset flow (not
        // a regular logged-in user landing here by mistake).
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (cancelled) return;
            const isRecovery = window.location.hash.includes('type=recovery');
            if (session && isRecovery) {
                clearTimeout(timer);
                setSessionState('ready');
            }
        });

        // ── FALLBACK ───────────────────────────────────────────────────────────
        // Kept in case the user lands here via a slower redirect where the event
        // fires after component mount (e.g. server-side redirects, PKCE flow).
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (cancelled) return;
            if (event === 'PASSWORD_RECOVERY') {
                clearTimeout(timer);
                setSessionState('ready');
            }
        });

        return () => {
            cancelled = true;
            clearTimeout(timer);
            subscription.unsubscribe();
        };
    }, []);

    // Auto-redirect after success
    useEffect(() => {
        if (sessionState === 'done') {
            const t = setTimeout(() => navigate('/login', { replace: true }), 3000);
            return () => clearTimeout(t);
        }
    }, [sessionState, navigate]);

    // ─── Form state ───────────────────────────────────────────────────────────
    const [password, setPassword]           = useState('');
    const [confirm, setConfirm]             = useState('');
    const [showPw, setShowPw]               = useState(false);
    const [showCf, setShowCf]               = useState(false);
    const [error, setError]                 = useState('');
    const [submitting, setSubmitting]       = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
            return;
        }
        if (password !== confirm) {
            setError('كلمتا المرور غير متطابقتين.');
            return;
        }

        setSubmitting(true);
        const { error: updateError } = await updatePassword(password);
        setSubmitting(false);

        if (updateError) {
            setError(updateError.message ?? 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
        } else {
            setSessionState('done');
        }
    };

    // ─── Render helpers ───────────────────────────────────────────────────────
    const PasswordInput = ({ id, label, value, onChange, show, onToggle, placeholder, autoComplete }) => (
        <div>
            <label className="block text-sm font-semibold text-blue-100 mb-2">{label}</label>
            <div className="relative">
                <input
                    id={id}
                    type={show ? 'text' : 'password'}
                    required
                    autoComplete={autoComplete}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 pl-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                />
                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                <button
                    type="button"
                    onClick={onToggle}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300 hover:text-white transition"
                >
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-teal-700 flex items-center justify-center p-4 font-sans" dir="rtl">

            {/* Decorative blobs */}
            <div className="absolute top-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">

                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Link to="/">
                            <img src={LOGO_URL} alt="مركز المدينة الطبي" className="h-16 w-auto object-contain" />
                        </Link>
                    </div>

                    {/* ── Waiting for session ── */}
                    {sessionState === 'waiting' && (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <Loader2 size={40} className="text-teal-300 animate-spin" />
                            <p className="text-blue-200 text-sm text-center">جاري التحقق من الرابط...</p>
                        </div>
                    )}

                    {/* ── Expired / invalid link ── */}
                    {sessionState === 'expired' && (
                        <div className="text-center py-4">
                            <h1 className="text-xl font-bold text-white mb-3">رابط منتهي الصلاحية</h1>
                            <p className="text-blue-200 text-sm mb-6">
                                انتهت صلاحية هذا الرابط أو تم استخدامه بالفعل. يرجى طلب رابط جديد.
                            </p>
                            <Link
                                to="/login"
                                className="inline-block bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 px-6 rounded-xl transition"
                            >
                                العودة لتسجيل الدخول
                            </Link>
                        </div>
                    )}

                    {/* ── New password form ── */}
                    {sessionState === 'ready' && (
                        <>
                            <h1 className="text-2xl font-bold text-white text-center mb-1">تعيين كلمة مرور جديدة</h1>
                            <p className="text-blue-200 text-center text-sm mb-8">أدخل كلمة المرور الجديدة وتأكيدها أدناه</p>

                            {error && (
                                <div className="flex items-center gap-3 bg-red-500/20 border border-red-400/30 text-red-200 rounded-xl p-3 mb-6 text-sm">
                                    <AlertCircle size={18} className="shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <PasswordInput
                                    id="new-password"
                                    label="كلمة المرور الجديدة"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    show={showPw}
                                    onToggle={() => setShowPw(p => !p)}
                                    placeholder="8 أحرف على الأقل"
                                    autoComplete="new-password"
                                />
                                <PasswordInput
                                    id="confirm-password"
                                    label="تأكيد كلمة المرور"
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    show={showCf}
                                    onToggle={() => setShowCf(p => !p)}
                                    placeholder="أعد إدخال كلمة المرور"
                                    autoComplete="new-password"
                                />

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50 mt-2"
                                >
                                    {submitting
                                        ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جاري الحفظ...</>
                                        : 'حفظ كلمة المرور الجديدة'
                                    }
                                </button>
                            </form>
                        </>
                    )}

                    {/* ── Success ── */}
                    {sessionState === 'done' && (
                        <div className="text-center py-4">
                            <CheckCircle size={52} className="text-teal-300 mx-auto mb-4" />
                            <h1 className="text-xl font-bold text-white mb-2">تم تعيين كلمة المرور بنجاح!</h1>
                            <p className="text-blue-200 text-sm">سيتم توجيهك لصفحة تسجيل الدخول خلال ثوانٍ...</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
