/**
 * DynamicFormRenderer.jsx
 *
 * Renders a dynamic application form from a `form_schema` JSONB array.
 * Each field descriptor shape:
 *   {
 *     id: string,           -- stable UUID key
 *     type: 'text' | 'textarea' | 'phone' | 'email' | 'select' | 'file' | 'checkbox',
 *     label: string,
 *     placeholder?: string,
 *     required: boolean,
 *     options?: string[],   -- only for type=select
 *     accept?: string,      -- only for type=file (e.g. "image/*,.pdf")
 *     order: number,
 *   }
 *
 * Props:
 *   schema      {Array}   -- the form_schema array from the course
 *   answers     {Object}  -- { [fieldId]: value } — controlled from parent
 *   files       {Object}  -- { [fieldId]: File } — controlled from parent
 *   onChange    {fn}      -- (fieldId, value) => void
 *   onFileChange {fn}     -- (fieldId, file|null) => void
 *   errors      {Object}  -- { [fieldId]: string } — validation errors
 *   disabled    {boolean}
 */

import React, { useRef } from 'react';
import {
    Type, AlignLeft, Phone, Mail, ChevronDown, Paperclip,
    CheckSquare, Upload, X, FileText
} from 'lucide-react';

const TYPE_ICONS = {
    text:     <Type size={14} />,
    textarea: <AlignLeft size={14} />,
    phone:    <Phone size={14} />,
    email:    <Mail size={14} />,
    select:   <ChevronDown size={14} />,
    file:     <Paperclip size={14} />,
    checkbox: <CheckSquare size={14} />,
};

const inputBase = 'w-full bg-slate-50 border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:bg-white transition';
const inputNormal = `${inputBase} border-slate-200`;
const inputError = `${inputBase} border-red-300 bg-red-50 focus:ring-red-300`;

export default function DynamicFormRenderer({
    schema = [],
    answers = {},
    files = {},
    onChange,
    onFileChange,
    errors = {},
    disabled = false,
}) {
    const sorted = [...schema].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    if (sorted.length === 0) return null;

    return (
        <div className="space-y-5">
            {sorted.map(field => (
                <FieldRenderer
                    key={field.id}
                    field={field}
                    value={answers[field.id] ?? ''}
                    file={files[field.id] ?? null}
                    onChange={val => onChange(field.id, val)}
                    onFileChange={file => onFileChange(field.id, file)}
                    error={errors[field.id]}
                    disabled={disabled}
                />
            ))}
        </div>
    );
}

// ── Individual Field Renderer ─────────────────────────────────────────────────

function FieldRenderer({ field, value, file, onChange, onFileChange, error, disabled }) {
    const fileInputRef = useRef(null);
    const hasError = !!error;

    const Label = () => (
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
            <span className="inline-flex items-center gap-1.5">
                <span className="text-teal-500">{TYPE_ICONS[field.type]}</span>
                {field.label}
            </span>
            {field.required && <span className="text-red-500 mr-1">*</span>}
        </label>
    );

    const ErrorMsg = () => hasError ? (
        <p className="text-xs text-red-600 font-semibold mt-1">{error}</p>
    ) : null;

    // ── Text ────────────────────────────────────────────────────────────────
    if (field.type === 'text') {
        return (
            <div>
                <Label />
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    disabled={disabled}
                    className={hasError ? inputError : inputNormal}
                />
                <ErrorMsg />
            </div>
        );
    }

    // ── Textarea ────────────────────────────────────────────────────────────
    if (field.type === 'textarea') {
        return (
            <div>
                <Label />
                <textarea
                    rows={4}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={field.placeholder ?? ''}
                    disabled={disabled}
                    className={`${hasError ? inputError : inputNormal} resize-none`}
                />
                <ErrorMsg />
            </div>
        );
    }

    // ── Phone ───────────────────────────────────────────────────────────────
    if (field.type === 'phone') {
        return (
            <div>
                <Label />
                <div className="flex">
                    <span className="flex items-center px-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-xl text-sm text-slate-500 font-medium">
                        +967
                    </span>
                    <input
                        type="tel"
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={field.placeholder ?? '7xxxxxxxx'}
                        disabled={disabled}
                        className={`flex-1 ${hasError ? inputError : inputNormal} rounded-r-none`}
                        dir="ltr"
                    />
                </div>
                <ErrorMsg />
            </div>
        );
    }

    // ── Email ───────────────────────────────────────────────────────────────
    if (field.type === 'email') {
        return (
            <div>
                <Label />
                <input
                    type="email"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={field.placeholder ?? 'example@email.com'}
                    disabled={disabled}
                    className={hasError ? inputError : inputNormal}
                    dir="ltr"
                />
                <ErrorMsg />
            </div>
        );
    }

    // ── Select ──────────────────────────────────────────────────────────────
    if (field.type === 'select') {
        return (
            <div>
                <Label />
                <div className="relative">
                    <select
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        disabled={disabled}
                        className={`${hasError ? inputError : inputNormal} appearance-none pr-4`}
                    >
                        <option value="">-- اختر --</option>
                        {(field.options ?? []).map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                    <ChevronDown size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <ErrorMsg />
            </div>
        );
    }

    // ── Checkbox (single yes/no) ─────────────────────────────────────────────
    if (field.type === 'checkbox') {
        return (
            <div>
                <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="mt-0.5">
                        <input
                            type="checkbox"
                            checked={value === 'true' || value === true}
                            onChange={e => onChange(e.target.checked ? 'true' : '')}
                            disabled={disabled}
                            className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-400"
                        />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 leading-snug">
                        {field.label}
                        {field.required && <span className="text-red-500 mr-1">*</span>}
                    </span>
                </label>
                <ErrorMsg />
            </div>
        );
    }

    // ── File Upload ──────────────────────────────────────────────────────────
    if (field.type === 'file') {
        return (
            <div>
                <Label />
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={field.accept ?? '*/*'}
                    onChange={e => onFileChange(e.target.files?.[0] ?? null)}
                    disabled={disabled}
                    className="hidden"
                />
                {file ? (
                    <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                        <FileText size={18} className="text-teal-600 shrink-0" />
                        <span className="text-sm font-medium text-teal-800 truncate flex-1">{file.name}</span>
                        <span className="text-xs text-teal-500 shrink-0">
                            {(file.size / 1024).toFixed(0)} KB
                        </span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => { onFileChange(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                className="text-teal-500 hover:text-red-500 transition shrink-0"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={disabled}
                        className={`w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-6 transition
                            ${hasError ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-teal-400 hover:bg-teal-50'}
                            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <Upload size={22} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-500">
                            {field.placeholder ?? 'انقر لرفع ملف'}
                        </span>
                        {field.accept && (
                            <span className="text-xs text-slate-400">{field.accept}</span>
                        )}
                    </button>
                )}
                <ErrorMsg />
            </div>
        );
    }

    return null;
}
