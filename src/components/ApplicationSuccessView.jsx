/**
 * ApplicationSuccessView.jsx
 *
 * Full-page animated success screen shown after a training application is submitted.
 *
 * Props:
 *   courseName {string}  — the name of the course the user applied to
 *   phone      {string}  — the applicant's phone number
 *   onReset    {fn}      — called when user clicks "العودة إلى البرامج"
 */

import React, { useEffect, useState } from 'react';
import { CheckCircle, GraduationCap, MessageCircle, ArrowRight } from 'lucide-react';

export default function ApplicationSuccessView({ courseName, phone, onReset }) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 50);
        return () => clearTimeout(t);
    }, []);

    const masked = phone
        ? phone.slice(0, 4) + '****' + phone.slice(-3)
        : '***';

    return (
        <div className={`flex flex-col items-center justify-center py-16 px-6 text-center transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>

            {/* Animated checkmark circle */}
            <div className="relative mb-6">
                <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center animate-pulse-once">
                    <CheckCircle size={52} className="text-teal-500" strokeWidth={1.5} />
                </div>
                {/* Ring animation */}
                <div className="absolute inset-0 rounded-full border-4 border-teal-200 animate-ping opacity-30" />
            </div>

            <h2 className="text-2xl font-extrabold text-slate-800 mb-3">
                تم إرسال طلبك بنجاح! 🎉
            </h2>

            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5 mb-6 max-w-sm w-full">
                <div className="flex items-center gap-3 justify-center mb-3">
                    <GraduationCap size={20} className="text-teal-600" />
                    <p className="font-bold text-teal-800 text-sm">{courseName}</p>
                </div>
                <div className="flex items-center gap-2 justify-center text-sm text-teal-700">
                    <MessageCircle size={16} className="text-green-500" />
                    <span>
                        سيتم إرسال رسالة تأكيد على واتساب إلى{' '}
                        <span className="font-bold" dir="ltr">{masked}</span>
                    </span>
                </div>
            </div>

            <p className="text-slate-500 text-sm leading-relaxed max-w-xs mb-8">
                سيتواصل معك فريق مركز المدينة الطبي خلال أيام قليلة لتأكيد التسجيل وإرشادك للخطوات التالية.
            </p>

            <button
                onClick={onReset}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-7 py-3 rounded-full transition shadow-lg shadow-teal-200/50"
            >
                <ArrowRight size={18} />
                العودة إلى البرامج
            </button>
        </div>
    );
}
