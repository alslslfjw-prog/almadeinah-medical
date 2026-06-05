/**
 * FormBuilderPreview.jsx
 *
 * Live preview panel that renders the form exactly as applicants will see it.
 * Uses DynamicFormRenderer in read-only/demo mode (no real submission).
 *
 * Props:
 *   schema  {Array}   — current form_schema from the builder
 *   title   {string}  — course title to show in the preview header
 */

import React, { useState } from 'react';
import { Eye, GraduationCap } from 'lucide-react';
import DynamicFormRenderer from './DynamicFormRenderer';

export default function FormBuilderPreview({ schema = [], title = 'معاينة النموذج' }) {
    const [previewAnswers, setPreviewAnswers] = useState({});
    const [previewFiles, setPreviewFiles] = useState({});

    const handleAnswer = (fieldId, val) => setPreviewAnswers(prev => ({ ...prev, [fieldId]: val }));
    const handleFile = (fieldId, file) => setPreviewFiles(prev => ({ ...prev, [fieldId]: file }));

    if (schema.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
                    <Eye size={28} className="text-slate-300" />
                </div>
                <p className="font-semibold text-slate-500">لا توجد حقول بعد</p>
                <p className="text-xs text-slate-400">أضف حقولاً من اللوحة اليسرى لترى المعاينة هنا</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Preview header */}
            <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                    <GraduationCap size={16} className="text-teal-200" />
                    <span className="text-teal-100 text-xs font-semibold">نموذج التسجيل</span>
                </div>
                <p className="font-bold text-white text-sm">{title || 'عنوان البرنامج'}</p>
            </div>

            {/* Static identity fields preview */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 opacity-70">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">حقول أساسية (ثابتة دائماً)</p>
                {[
                    { label: 'الاسم الكامل',      required: true  },
                    { label: 'رقم الجوال (+967)', required: true  },
                ].map(({ label, required }) => (
                    <div key={label}>
                        <label className="block text-xs font-bold text-slate-500 mb-1">
                            {label}
                            {required
                                ? <span className="text-red-500 mr-1">*</span>
                                : <span className="text-slate-400 font-normal mr-1">(اختياري)</span>
                            }
                        </label>
                        <div className="h-10 bg-slate-50 border border-slate-200 rounded-lg" />
                    </div>
                ))}
            </div>

            {/* Dynamic fields */}
            <div className="bg-white border border-teal-200 rounded-xl p-4">
                <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3">الحقول الديناميكية</p>
                <DynamicFormRenderer
                    schema={schema}
                    answers={previewAnswers}
                    files={previewFiles}
                    onChange={handleAnswer}
                    onFileChange={handleFile}
                    errors={{}}
                    disabled={false}
                />
            </div>

            {/* Submit button preview */}
            <div className="h-12 bg-teal-600 rounded-xl flex items-center justify-center opacity-70">
                <span className="text-white font-bold text-sm">تقديم الطلب</span>
            </div>

            <p className="text-xs text-center text-slate-400">هذه معاينة تفاعلية للنموذج — لن يتم إرسال أي بيانات</p>
        </div>
    );
}
