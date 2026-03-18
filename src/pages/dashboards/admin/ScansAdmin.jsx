/**
 * ScansAdmin — Admin CMS for the `scans` table.
 * Features: searchable table, slide-in panel with image upload + chip arrays, delete confirm.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, X, Save, Loader2,
    Search, Upload, Image as ImageIcon,
} from 'lucide-react';
import {
    getScans, createScan, updateScan, deleteScan, uploadScanImage,
} from '../../../api/scans';

// ── Empty form ────────────────────────────────────────────────────────────────
const EMPTY_FORM = {
    name: '',
    short_description: '',
    description: '',
    price: '',
    duration: '',
    icon_class: 'fas fa-x-ray',
    uses: [],   // jsonb array
    advantages: [],   // jsonb array
    preparation: '',
    benefits: '',
    image_url: '',
};

// ── Chip editor sub-component ─────────────────────────────────────────────────
function ChipEditor({ label, chips, onChange }) {
    const [input, setInput] = useState('');
    const add = () => {
        const v = input.trim();
        if (!v || chips.includes(v)) { setInput(''); return; }
        onChange([...chips, v]);
        setInput('');
    };
    const remove = (chip) => onChange(chips.filter(c => c !== chip));
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {chips.map(chip => (
                    <span key={chip} className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-xs font-medium">
                        {chip}
                        <button onClick={() => remove(chip)} className="hover:text-red-500 transition"><X size={12} /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    placeholder="اكتب قيمة ثم اضغط Enter أو إضافة"
                />
                <button onClick={add} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">
                    + إضافة
                </button>
            </div>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ScansAdmin() {
    const [scans, setScans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Panel
    const [panelOpen, setPanelOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState('');

    // Delete
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await getScans();
        setScans(data ?? []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Panel helpers ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditId(null); setForm(EMPTY_FORM); setImageFile(null);
        setImagePreview(''); setSaveError(''); setPanelOpen(true);
    };
    const openEdit = (scan) => {
        setEditId(scan.id);
        setForm({
            name: scan.name ?? '',
            short_description: scan.short_description ?? '',
            description: scan.description ?? '',
            price: scan.price ?? '',
            duration: scan.duration ?? '',
            icon_class: scan.icon_class ?? 'fas fa-x-ray',
            uses: Array.isArray(scan.uses) ? scan.uses : [],
            advantages: Array.isArray(scan.advantages) ? scan.advantages : [],
            preparation: scan.preparation ?? '',
            benefits: scan.benefits ?? '',
            image_url: scan.image_url ?? '',
        });
        setImageFile(null);
        setImagePreview(scan.image_url ?? '');
        setSaveError(''); setPanelOpen(true);
    };
    const closePanel = () => { setPanelOpen(false); setSaveError(''); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // ── Image ─────────────────────────────────────────────────────────────────
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        setSaveError('');
        if (!form.name.trim()) { setSaveError('اسم الأشعة مطلوب'); return; }
        setSaving(true);
        try {
            let imageUrl = form.image_url;
            if (imageFile) {
                const { url, error: uploadErr } = await uploadScanImage(imageFile);
                if (uploadErr) { setSaveError('فشل رفع الصورة: ' + uploadErr.message); return; }
                imageUrl = url;
            }
            const payload = {
                name: form.name.trim(),
                short_description: form.short_description.trim() || null,
                description: form.description.trim() || null,
                price: form.price !== '' ? Number(form.price) : null,
                duration: form.duration.trim() || null,
                icon_class: form.icon_class.trim() || null,
                uses: form.uses.length ? form.uses : null,
                advantages: form.advantages.length ? form.advantages : null,
                preparation: form.preparation.trim() || null,
                benefits: form.benefits.trim() || null,
                image_url: imageUrl || null,
            };
            if (editId) {
                const { error } = await updateScan(editId, payload);
                if (error) { setSaveError(error.message); return; }
            } else {
                const { error } = await createScan(payload);
                if (error) { setSaveError(error.message); return; }
            }
            closePanel();
            await fetchAll();
        } finally { setSaving(false); }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deleteScan(deleteTarget.id);
        setDeleting(false);
        if (!error) { setScans(prev => prev.filter(s => s.id !== deleteTarget.id)); setDeleteTarget(null); }
    };

    const filtered = scans.filter(s => s.name?.includes(search) || s.short_description?.includes(search));

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة الأشعة التشخيصية</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{scans.length} نوع أشعة في النظام</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm shadow-sm">
                    <Plus size={16} /> إضافة أشعة
                </button>
            </div>

            {/* Search */}
            <div className="relative mb-5">
                <Search size={16} className="absolute top-3 right-3 text-slate-400" />
                <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {/* Table */}
            {loading ? (
                <div className="flex justify-center py-20 text-teal-600"><Loader2 className="animate-spin" size={30} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">الصورة</th>
                                <th className="px-4 py-3 text-right">الاسم</th>
                                <th className="px-4 py-3 text-right">السعر</th>
                                <th className="px-4 py-3 text-right">المدة</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(scan => (
                                <tr key={scan.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        {scan.image_url
                                            ? <img src={scan.image_url} alt={scan.name} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                                            : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon size={18} className="text-slate-300" /></div>
                                        }
                                    </td>
                                    <td className="px-4 py-3">
                                        <p className="font-semibold text-slate-800">{scan.name}</p>
                                        {scan.short_description && <p className="text-xs text-slate-400 truncate max-w-xs">{scan.short_description}</p>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-medium">{scan.price && Number(scan.price) > 0 ? `$ ${Number(scan.price).toLocaleString('en-US')}` : '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{scan.duration ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openEdit(scan)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setDeleteTarget(scan)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={5} className="py-16 text-center text-slate-400">لا توجد نتائج</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Slide-in Panel ───────────────────────────────────────────────── */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{editId ? 'تعديل الأشعة' : 'إضافة أشعة جديدة'}</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>

                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            {/* Image */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">صورة الأشعة</label>
                                <div className="flex items-center gap-4">
                                    {imagePreview
                                        ? <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                                        : <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" /></div>
                                    }
                                    <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 px-4 py-2 rounded-lg transition text-xs font-bold">
                                        <Upload size={14} /> رفع صورة
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                    </label>
                                </div>
                            </div>

                            {/* Name + Icon */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم <span className="text-red-500">*</span></label>
                                    <input value={form.name} onChange={e => setField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="أشعة الصدر" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">كلاس الأيقونة</label>
                                    <input value={form.icon_class} onChange={e => setField('icon_class', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" placeholder="fas fa-x-ray" />
                                </div>
                            </div>

                            {/* Price + Duration */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">سعر الأشعة (دولار أمريكي $)</label>
                                    <input type="number" min="0" value={form.price} onChange={e => setField('price', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">المدة</label>
                                    <input value={form.duration} onChange={e => setField('duration', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="30 دقيقة" />
                                </div>
                            </div>

                            {/* Short description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">وصف مختصر</label>
                                <input value={form.short_description} onChange={e => setField('short_description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="جملة تعريفية قصيرة" />
                            </div>

                            {/* Full description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف الكامل</label>
                                <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>

                            {/* Preparation */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التحضير</label>
                                <textarea rows={2} value={form.preparation} onChange={e => setField('preparation', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" placeholder="تعليمات ما قبل الفحص..." />
                            </div>

                            {/* Benefits text */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الفوائد (نص)</label>
                                <input value={form.benefits} onChange={e => setField('benefits', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>

                            {/* Uses chips */}
                            <ChipEditor label="الاستخدامات (uses)" chips={form.uses} onChange={v => setField('uses', v)} />

                            {/* Advantages chips */}
                            <ChipEditor label="المزايا (advantages)" chips={form.advantages} onChange={v => setField('advantages', v)} />

                            {saveError && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{saveError}</p>}
                        </div>

                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={closePanel} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Delete Confirm ───────────────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-600" /></div>
                        <h3 className="font-bold text-lg text-slate-800 mb-1">حذف الأشعة</h3>
                        <p className="text-slate-500 text-sm mb-5">هل أنت متأكد من حذف <span className="font-bold text-slate-700">{deleteTarget.name}</span>؟</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} disabled={deleting}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2">
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : null}
                                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
                            </button>
                            <button onClick={() => setDeleteTarget(null)} className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
