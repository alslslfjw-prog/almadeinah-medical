import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { signUpWithEmail } from '../api/auth';

export default function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('كلمتا المرور غير متطابقتين.');
            return;
        }
        if (formData.password.length < 8) {
            setError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.');
            return;
        }

        setSubmitting(true);
        const { error: authError } = await signUpWithEmail({
            email: formData.email,
            password: formData.password,
        });

        if (authError) {
            setError(authError.message?.includes('already registered')
                ? 'هذا البريد الإلكتروني مسجّل بالفعل. حاول تسجيل الدخول.'
                : authError.message);
            setSubmitting(false);
        } else {
            setSuccess(true);
        }
    };

    const logoUrl = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-teal-700 flex items-center justify-center p-4 font-sans" dir="rtl">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-10 max-w-md w-full text-center">
                    <div className="w-20 h-20 bg-teal-400/20 text-teal-300 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">تم إنشاء الحساب!</h2>
                    <p className="text-blue-200 text-sm mb-6">
                        تم إرسال رابط التأكيد إلى <strong className="text-white">{formData.email}</strong>.<br />
                        يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full bg-teal-500 hover:bg-teal-400 text-white font-bold py-3 rounded-xl transition"
                    >
                        الذهاب لتسجيل الدخول
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-teal-700 flex items-center justify-center p-4 font-sans" dir="rtl">

            <div className="absolute top-0 left-0 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

            <div className="relative w-full max-w-md">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">

                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <Link to="/">
                            <img src={logoUrl} alt="مركز المدينة الطبي" className="h-16 w-auto object-contain" />
                        </Link>
                    </div>

                    <h1 className="text-2xl font-bold text-white text-center mb-1">إنشاء حساب جديد</h1>
                    <p className="text-blue-200 text-center text-sm mb-8">سجّل معنا للاستمتاع بمزايا الحجز الإلكتروني</p>

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
                            <label className="block text-sm font-semibold text-blue-100 mb-2">كلمة المرور</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    placeholder="8 أحرف كحد أدنى"
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-semibold text-blue-100 mb-2">تأكيد كلمة المرور</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    required
                                    autoComplete="new-password"
                                    placeholder="أعد كتابة كلمة المرور"
                                    value={formData.confirmPassword}
                                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                    className="w-full bg-white/10 border border-white/20 text-white placeholder-blue-300 rounded-xl py-3.5 px-4 pr-11 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                                />
                                <Lock size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300" />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-teal-900/50 mt-2"
                        >
                            {submitting ? (
                                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> جارٍ إنشاء الحساب...</>
                            ) : (
                                <><UserPlus size={20} /> إنشاء حساب</>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-blue-200 text-sm mt-6">
                        لديك حساب بالفعل؟{' '}
                        <Link to="/login" className="text-teal-300 font-bold hover:text-white transition">
                            تسجيل الدخول
                        </Link>
                    </p>
                    <div className="text-center mt-4">
                        <Link to="/" className="text-blue-300 hover:text-white text-xs transition">
                            ← العودة إلى الموقع
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
