/**
 * ClinicsAdmin — Admin CMS screen for managing clinics and their services.
 *
 * Features:
 *  - Data table: name, color swatch, icon, sort_order, service count
 *  - Slide-in panel for Create / Edit with color + icon selects
 *  - Inline services CRUD: add / delete clinic_services rows live
 *  - Delete clinic with confirmation dialog
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, X, Save, Loader2,
    Search, Building2, Tag,
} from 'lucide-react';
import {
    getClinics, createClinic, updateClinic, deleteClinic,
    getServicesByClinic, createService, deleteService,
} from '../../../api/clinics';

// ── Constants ─────────────────────────────────────────────────────────────────
const COLOR_OPTIONS = [
    { value: 'green', label: 'أخضر', hex: '#10b981' },
    { value: 'blue', label: 'أزرق', hex: '#3b82f6' },
    { value: 'red', label: 'أحمر', hex: '#ef4444' },
    { value: 'cyan', label: 'سماوي', hex: '#06b6d4' },
    { value: 'pink', label: 'وردي', hex: '#ec4899' },
    { value: 'purple', label: 'بنفسجي', hex: '#8b5cf6' },
    { value: 'yellow', label: 'أصفر', hex: '#f59e0b' },
    { value: 'indigo', label: 'نيلي', hex: '#6366f1' },
    { value: 'rose', label: 'وردي غامق', hex: '#f43f5e' },
    { value: 'teal', label: 'زيتي', hex: '#14b8a6' },
    { value: 'orange', label: 'برتقالي', hex: '#f97316' },
    { value: 'gray', label: 'رمادي', hex: '#6b7280' },
];

const ICON_OPTIONS = [
    'Heart', 'Smile', 'Brain', 'Bone', 'Eye', 'Baby', 'Stethoscope',
    'Ear', 'Droplet', 'Sparkles', 'Apple', 'Scissors', 'Ribbon',
    'Microscope', 'Siren', 'Building2', 'Camera', 'Syringe', 'Wind',
    'HeartPulse', 'Salad',
];

const EMPTY_FORM = {
    name: '',
    description: '',
    color: 'blue',
    icon_name: 'Stethoscope',
    clinic_number: '',
    sort_order: 10,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClinicsAdmin() {
    const [clinics, setClinics] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Inline services (only when editing)
    const [services, setServices] = useState([]);
    const [serviceInput, setServiceInput] = useState('');
    const [addingService, setAddingService] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchClinics = useCallback(async () => {
        setLoading(true);
        const { data } = await getClinics();
        setClinics(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchClinics(); }, [fetchClinics]);

    // ── Panel helpers ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditId(null);
        setForm(EMPTY_FORM);
        setServices([]);
        setServiceInput('');
        setSaveError('');
        setPanelOpen(true);
    };

    const openEdit = async (clinic) => {
        setEditId(clinic.id);
        setForm({
            name: clinic.name ?? '',
            description: clinic.description ?? '',
            color: clinic.color ?? 'blue',
            icon_name: clinic.icon_name ?? 'Stethoscope',
            clinic_number: clinic.clinic_number ?? '',
            sort_order: clinic.sort_order ?? 10,
        });
        setServiceInput('');
        setSaveError('');
        setPanelOpen(true);

        // Load services for this clinic
        const { data } = await getServicesByClinic(clinic.id);
        setServices(data ?? []);
    };

    const closePanel = () => { setPanelOpen(false); setSaveError(''); setServices([]); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // ── Services inline CRUD ───────────────────────────────────────────────────
    const handleAddService = async () => {
        const name = serviceInput.trim();
        if (!name || !editId) return;
        setAddingService(true);
        const { data, error } = await createService(editId, name);
        setAddingService(false);
        if (!error && data) {
            setServices(prev => [...prev, data]);
            setServiceInput('');
        }
    };

    const handleDeleteService = async (svc) => {
        const { error } = await deleteService(svc.id);
        if (!error) setServices(prev => prev.filter(s => s.id !== svc.id));
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveError('');
        if (!form.name.trim()) { setSaveError('اسم العيادة مطلوب'); return; }

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || null,
                color: form.color,
                icon_name: form.icon_name,
                clinic_number: form.clinic_number || null,
                sort_order: Number(form.sort_order) || 10,
            };

            if (editId) {
                const { error } = await updateClinic(editId, payload);
                if (error) { setSaveError(error.message); return; }
            } else {
                const { error } = await createClinic(payload);
                if (error) { setSaveError(error.message); return; }
            }

            closePanel();
            await fetchClinics();
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deleteClinic(deleteTarget.id);
        setDeleting(false);
        if (!error) {
            setClinics(prev => prev.filter(c => c.id !== deleteTarget.id));
            setDeleteTarget(null);
        }
    };

    // ── Color swatch helper ────────────────────────────────────────────────────
    const colorHex = (val) => COLOR_OPTIONS.find(c => c.value === val)?.hex ?? '#3b82f6';

    const filtered = clinics.filter(c => c.name?.includes(search));

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة العيادات</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{clinics.length} عيادة في النظام</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm shadow-sm"
                >
                    <Plus size={16} /> إضافة عيادة
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search size={16} className="absolute top-3 right-3 text-slate-400" />
                <input
                    type="text"
                    placeholder="بحث بالاسم..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20 text-teal-600">
                    <Loader2 className="animate-spin" size={30} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">اللون</th>
                                <th className="px-4 py-3 text-right">الاسم</th>
                                <th className="px-4 py-3 text-right">الأيقونة</th>
                                <th className="px-4 py-3 text-center">الترتيب</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(clinic => (
                                <tr key={clinic.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        <div
                                            className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                                            style={{ backgroundColor: colorHex(clinic.color) }}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-800">{clinic.name}</p>
                                        {clinic.description && (
                                            <p className="text-xs text-slate-400 truncate max-w-xs">{clinic.description}</p>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-lg font-mono">
                                            {clinic.icon_name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500">{clinic.sort_order}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button
                                                onClick={() => openEdit(clinic)}
                                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                            ><Pencil size={15} /></button>
                                            <button
                                                onClick={() => setDeleteTarget(clinic)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                            ><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr><td colSpan={5} className="py-16 text-center text-slate-400">لا توجد عيادات</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Slide-in Panel ───────────────────────────────────────────────── */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />

                    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">
                                {editId ? 'تعديل العيادة' : 'إضافة عيادة جديدة'}
                            </h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Form */}
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            {/* Name */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم العيادة <span className="text-red-500">*</span></label>
                                <input
                                    value={form.name}
                                    onChange={e => setField('name', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    placeholder="عيادة القلب والأوعية"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                                <textarea
                                    rows={2}
                                    value={form.description}
                                    onChange={e => setField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none"
                                    placeholder="وصف مختصر عن العيادة..."
                                />
                            </div>

                            {/* Color + Icon */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اللون</label>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-8 h-8 rounded-full border-2 border-slate-200 shadow-sm flex-shrink-0"
                                            style={{ backgroundColor: colorHex(form.color) }}
                                        />
                                        <select
                                            value={form.color}
                                            onChange={e => setField('color', e.target.value)}
                                            className="flex-1 border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-xs"
                                        >
                                            {COLOR_OPTIONS.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الأيقونة</label>
                                    <select
                                        value={form.icon_name}
                                        onChange={e => setField('icon_name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 text-xs font-mono"
                                    >
                                        {ICON_OPTIONS.map(ic => (
                                            <option key={ic} value={ic}>{ic}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Clinic number + Sort order */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">رقم العيادة</label>
                                    <input
                                        value={form.clinic_number}
                                        onChange={e => setField('clinic_number', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        placeholder="101"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الترتيب</label>
                                    <input
                                        type="number"
                                        value={form.sort_order}
                                        onChange={e => setField('sort_order', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    />
                                </div>
                            </div>

                            {/* ── Inline Services (edit mode only) ─────────────────── */}
                            {editId && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                                        <Tag size={13} /> الخدمات المقدمة
                                    </label>
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1.5">
                                        {services.length === 0 && (
                                            <p className="text-xs text-slate-400 text-center py-2">لا توجد خدمات — أضف خدمة أدناه</p>
                                        )}
                                        {services.map(svc => (
                                            <div key={svc.id} className="flex items-center justify-between bg-white border border-slate-100 px-3 py-2 rounded-lg">
                                                <span className="text-xs text-slate-700">{svc.service_name}</span>
                                                <button
                                                    onClick={() => handleDeleteService(svc)}
                                                    className="text-slate-300 hover:text-red-500 transition"
                                                ><X size={14} /></button>
                                            </div>
                                        ))}
                                        {/* Add service input */}
                                        <div className="flex gap-2 pt-1">
                                            <input
                                                value={serviceInput}
                                                onChange={e => setServiceInput(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddService())}
                                                className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
                                                placeholder="اسم الخدمة..."
                                            />
                                            <button
                                                onClick={handleAddService}
                                                disabled={addingService || !serviceInput.trim()}
                                                className="bg-teal-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-teal-700 transition flex items-center gap-1"
                                            >
                                                {addingService ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                                                إضافة
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">
                                        💡 الخدمات تُحفظ فوراً — لا حاجة للضغط على "حفظ" بعد إضافتها
                                    </p>
                                </div>
                            )}

                            {saveError && (
                                <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                    {saveError}
                                </p>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm"
                            >
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={closePanel} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ───────────────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                            <Trash2 size={22} className="text-red-600" />
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">حذف العيادة</h3>
                        <p className="text-slate-500 text-sm mb-5">
                            هل أنت متأكد من حذف <span className="font-bold text-slate-700">{deleteTarget.name}</span>؟
                            سيتم حذف جميع الخدمات المرتبطة بها.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2"
                            >
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : null}
                                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm"
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
