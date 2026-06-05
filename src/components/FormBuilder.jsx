/**
 * FormBuilder.jsx
 *
 * Admin drag-and-drop form builder panel.
 * Allows adding, reordering, and configuring dynamic form fields.
 * Renders FormBuilderFieldCard for each field.
 *
 * Uses native HTML5 drag-and-drop (no additional dependency needed).
 *
 * Props:
 *   schema    {Array}   — current form_schema (array of field descriptors)
 *   onChange  {fn}      — (newSchema) => void — called whenever schema changes
 */

import React, { useState, useRef } from 'react';
import {
    Plus, Type, AlignLeft, Phone, Mail, ChevronDown,
    Paperclip, CheckSquare, GripVertical, Eye, EyeOff, ListOrdered, Lock
} from 'lucide-react';
// Uses native crypto.randomUUID() — no external dependency needed
const uuidv4 = () => crypto.randomUUID();
import FormBuilderFieldCard from './FormBuilderFieldCard';
import FormBuilderPreview from './FormBuilderPreview';

const FIELD_TYPES = [
    { type: 'text',     label: 'نص قصير',        icon: Type,        desc: 'إجابة قصيرة في سطر واحد' },
    { type: 'textarea', label: 'نص طويل',         icon: AlignLeft,   desc: 'إجابة تفصيلية متعددة الأسطر' },
    { type: 'phone',    label: 'رقم جوال',        icon: Phone,       desc: 'حقل رقم هاتف مع بادئة +967' },
    { type: 'email',    label: 'بريد إلكتروني',   icon: Mail,        desc: 'عنوان بريد إلكتروني' },
    { type: 'select',   label: 'قائمة اختيار',   icon: ChevronDown, desc: 'اختيار من قائمة منسدلة' },
    { type: 'file',     label: 'رفع ملف',         icon: Paperclip,   desc: 'مرفق مثل صورة أو ملف PDF' },
    { type: 'checkbox', label: 'موافقة / تأكيد', icon: CheckSquare, desc: 'خانة تحقق للموافقة على بند' },
];

function createField(type, order) {
    return {
        id:          uuidv4(),
        type,
        label:       '',
        placeholder: '',
        required:    false,
        options:     type === 'select' ? [] : undefined,
        accept:      type === 'file'   ? '' : undefined,
        order,
    };
}

export default function FormBuilder({ schema = [], onChange, courseTitle = '' }) {
    const [showTypePicker, setShowTypePicker] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // ── Drag state ────────────────────────────────────────────────────────────
    const dragIndex = useRef(null);
    const dragOverIndex = useRef(null);

    const handleDragStart = (index) => { dragIndex.current = index; };
    const handleDragEnter = (index) => { dragOverIndex.current = index; };
    const handleDragEnd = () => {
        if (dragIndex.current === null || dragOverIndex.current === null) return;
        if (dragIndex.current === dragOverIndex.current) return;

        const newSchema = [...schema];
        const [moved] = newSchema.splice(dragIndex.current, 1);
        newSchema.splice(dragOverIndex.current, 0, moved);

        // Re-assign order values
        const reordered = newSchema.map((f, i) => ({ ...f, order: i }));
        onChange(reordered);
        dragIndex.current = null;
        dragOverIndex.current = null;
    };

    // ── CRUD ──────────────────────────────────────────────────────────────────
    const addField = (type) => {
        const newField = createField(type, schema.length);
        onChange([...schema, newField]);
        setShowTypePicker(false);
    };

    const updateField = (fieldId, changes) => {
        onChange(schema.map(f => f.id === fieldId ? { ...f, ...changes } : f));
    };

    const deleteField = (fieldId) => {
        const filtered = schema.filter(f => f.id !== fieldId);
        onChange(filtered.map((f, i) => ({ ...f, order: i })));
    };

    const sorted = [...schema].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    return (
        <div className="space-y-4">

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <ListOrdered size={16} className="text-teal-500" />
                    <span className="text-sm font-bold text-slate-600">
                        {schema.length} {schema.length === 1 ? 'حقل' : 'حقول'}
                    </span>
                </div>
                <div className="flex gap-2 mr-auto">
                    {/* Preview toggle */}
                    <button
                        onClick={() => setShowPreview(v => !v)}
                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition
                            ${showPreview
                                ? 'bg-teal-50 text-teal-700 border-teal-200'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'}`}
                    >
                        {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
                    </button>

                    {/* Add field button */}
                    <button
                        onClick={() => setShowTypePicker(v => !v)}
                        className="flex items-center gap-1.5 bg-teal-500 hover:bg-teal-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-sm shadow-teal-200"
                    >
                        <Plus size={15} />
                        إضافة حقل
                    </button>
                </div>
            </div>

            {/* ── Field Type Picker ─────────────────────────────────────────── */}
            {showTypePicker && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <p className="col-span-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                        اختر نوع الحقل
                    </p>
                    {FIELD_TYPES.map(({ type, label, icon: Icon, desc }) => (
                        <button
                            key={type}
                            onClick={() => addField(type)}
                            className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-teal-300 hover:bg-teal-50 transition text-right group"
                        >
                            <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center shrink-0 mt-0.5 transition">
                                <Icon size={14} className="text-slate-500 group-hover:text-teal-600 transition" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-700 group-hover:text-teal-700 transition">{label}</p>
                                <p className="text-xs text-slate-400 leading-snug mt-0.5">{desc}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Preview Panel ─────────────────────────────────────────────── */}
            {showPreview && (
                <div className="border-2 border-dashed border-teal-200 rounded-2xl p-4 bg-teal-50/30">
                    <p className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <Eye size={13} />
                        معاينة النموذج كما سيراه المتقدم
                    </p>
                    <FormBuilderPreview schema={sorted} title={courseTitle} />
                </div>
            )}

            {/* ── Locked System Fields (always at top) ─────────────── */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Lock size={11} />
                    حقول النظام الأساسية (ثابتة دائماً)
                </p>
                {[
                    { icon: Type,  label: 'الاسم الكامل',       desc: 'نص قصير • إجباري' },
                    { icon: Phone, label: 'رقم الجوال (+967)',   desc: 'رقم هاتف • إجباري' },
                ].map(({ icon: Icon, label, desc }) => (
                    <div
                        key={label}
                        className="flex items-center gap-3 bg-blue-50/70 border border-blue-100 rounded-xl px-4 py-3"
                    >
                        <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-blue-800 truncate">{label}</p>
                            <p className="text-xs text-blue-500 font-medium">{desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5 bg-blue-100 text-blue-500 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                            <Lock size={10} />
                            حقل نظام
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Field Cards (custom / draggable) ──────────────────── */}
            {sorted.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                        <Plus size={20} className="text-slate-300" />
                    </div>
                    <p className="font-semibold text-slate-500 text-sm">النموذج فارغ</p>
                    <p className="text-xs text-slate-400">انقر "إضافة حقل" لبناء نموذج التسجيل</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sorted.map((field, index) => (
                        <div
                            key={field.id}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={e => e.preventDefault()}
                            className="transition-opacity"
                        >
                            <FormBuilderFieldCard
                                field={field}
                                index={index}
                                dragHandleProps={{
                                    onMouseDown: () => {},  // handled by draggable on parent
                                }}
                                onUpdate={updateField}
                                onDelete={deleteField}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Help text */}
            {sorted.length > 0 && (
                <p className="text-xs text-slate-400 text-center flex items-center justify-center gap-1.5">
                    <GripVertical size={12} />
                    اسحب البطاقات لإعادة الترتيب
                </p>
            )}
        </div>
    );
}
