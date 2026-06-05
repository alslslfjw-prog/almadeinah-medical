/**
 * FormBuilderFieldCard.jsx
 *
 * A single, draggable field card inside the FormBuilder.
 * Renders inline editing controls for label, placeholder, required toggle,
 * select options, and file accept types.
 *
 * Props:
 *   field       {object}  — the field descriptor
 *   index       {number}  — position in the list (for display)
 *   dragHandleProps {object} — spread onto the drag handle element
 *   onUpdate    {fn}      — (fieldId, changes) => void
 *   onDelete    {fn}      — (fieldId) => void
 */

import React, { useState } from 'react';
import {
    GripVertical, Trash2, ChevronDown, Plus, X,
    Type, AlignLeft, Phone, Mail, Paperclip, CheckSquare, ToggleLeft
} from 'lucide-react';

const TYPE_META = {
    text:     { label: 'نص قصير',        icon: Type,        color: 'bg-blue-50 text-blue-600' },
    textarea: { label: 'نص طويل',         icon: AlignLeft,   color: 'bg-purple-50 text-purple-600' },
    phone:    { label: 'رقم جوال',        icon: Phone,       color: 'bg-green-50 text-green-600' },
    email:    { label: 'بريد إلكتروني',   icon: Mail,        color: 'bg-orange-50 text-orange-600' },
    select:   { label: 'قائمة اختيار',   icon: ChevronDown, color: 'bg-teal-50 text-teal-600' },
    file:     { label: 'رفع ملف',         icon: Paperclip,   color: 'bg-rose-50 text-rose-600' },
    checkbox: { label: 'موافقة / تأكيد', icon: CheckSquare, color: 'bg-amber-50 text-amber-600' },
};

const inputSm = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition font-medium';

export default function FormBuilderFieldCard({ field, index, dragHandleProps, onUpdate, onDelete }) {
    const meta = TYPE_META[field.type] ?? TYPE_META.text;
    const Icon = meta.icon;
    const [newOption, setNewOption] = useState('');

    const update = (changes) => onUpdate(field.id, changes);

    const addOption = () => {
        if (!newOption.trim()) return;
        update({ options: [...(field.options ?? []), newOption.trim()] });
        setNewOption('');
    };

    const removeOption = (idx) => {
        update({ options: (field.options ?? []).filter((_, i) => i !== idx) });
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden group hover:border-teal-300 transition">

            {/* Card Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                {/* Drag handle */}
                <div
                    {...dragHandleProps}
                    className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition shrink-0"
                    title="اسحب لإعادة الترتيب"
                >
                    <GripVertical size={18} />
                </div>

                {/* Field type badge */}
                <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
                    <Icon size={12} />
                    {meta.label}
                </div>

                <span className="text-xs text-slate-400 font-medium">حقل #{index + 1}</span>

                {/* Required toggle */}
                <div className="mr-auto flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">إجباري</span>
                    <button
                        onClick={() => update({ required: !field.required })}
                        className={`relative inline-flex w-9 h-5 rounded-full transition-colors duration-200 ${field.required ? 'bg-teal-500' : 'bg-slate-300'}`}
                        title={field.required ? 'اجعله اختيارياً' : 'اجعله إجبارياً'}
                    >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${field.required ? 'translate-x-0.5' : '-translate-x-4'}`} />
                    </button>
                </div>

                {/* Delete */}
                <button
                    onClick={() => onDelete(field.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                    title="حذف الحقل"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">

                {/* Label */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">عنوان السؤال</label>
                    <input
                        type="text"
                        value={field.label}
                        onChange={e => update({ label: e.target.value })}
                        placeholder="اكتب السؤال هنا..."
                        className={inputSm}
                    />
                </div>

                {/* Placeholder — not for checkbox */}
                {field.type !== 'checkbox' && field.type !== 'file' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">نص التلميح (placeholder)</label>
                        <input
                            type="text"
                            value={field.placeholder ?? ''}
                            onChange={e => update({ placeholder: e.target.value })}
                            placeholder="نص اختياري يظهر داخل الحقل..."
                            className={inputSm}
                        />
                    </div>
                )}

                {/* Select options */}
                {field.type === 'select' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">خيارات القائمة</label>
                        <div className="space-y-1.5 mb-2">
                            {(field.options ?? []).map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                                    <span className="flex-1 text-sm font-medium text-slate-700">{opt}</span>
                                    <button onClick={() => removeOption(idx)} className="text-slate-300 hover:text-red-500 transition">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                            {(field.options ?? []).length === 0 && (
                                <p className="text-xs text-slate-400 italic">لا توجد خيارات بعد. أضف خياراً أدناه.</p>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newOption}
                                onChange={e => setNewOption(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addOption()}
                                placeholder="اكتب خياراً واضغط Enter أو +"
                                className={`${inputSm} flex-1`}
                            />
                            <button
                                onClick={addOption}
                                className="px-3 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition"
                            >
                                <Plus size={15} />
                            </button>
                        </div>
                    </div>
                )}

                {/* File accept types */}
                {field.type === 'file' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">أنواع الملفات المقبولة</label>
                        <input
                            type="text"
                            value={field.accept ?? ''}
                            onChange={e => update({ accept: e.target.value })}
                            placeholder="مثال: image/*,.pdf,.doc"
                            className={inputSm}
                            dir="ltr"
                        />
                        <p className="text-xs text-slate-400 mt-1">اتركه فارغاً لقبول جميع أنواع الملفات</p>
                    </div>
                )}

            </div>
        </div>
    );
}
