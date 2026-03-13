/**
 * LabsAdmin — Two-tab Admin CMS:
 *   Tab 1: Medical Packages (medical_packages table)
 *   Tab 2: Medical Tests Guide (medical_tests_guide table)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Plus, Pencil, Trash2, X, Save, Loader2,
    Search, Upload, Image as ImageIcon, Package, FlaskConical,
} from 'lucide-react';
import {
    getMedicalPackages, createPackage, updatePackage, deletePackage, uploadPackageImage,
    getMedicalTestsGuide, createTestGuide, updateTestGuide, deleteTestGuide,
} from '../../../api/scans';

// ── Empty forms ───────────────────────────────────────────────────────────────
const EMPTY_PKG = {
    title:        '',
    description:  '',
    price:        '',
    tests_count:  '',
    discount_text:'',
    detailed_prep:'',
    features:     [],
    tests_included:[],
    image_url:    '',
};

const EMPTY_TEST = {
    name:     '',
    category: '',
    about:    '',
    reasons:  [],
    prep:     '',
};

// ── Chip editor ───────────────────────────────────────────────────────────────
function ChipEditor({ label, chips, onChange, placeholder = 'اكتب قيمة ثم Enter أو إضافة' }) {
    const [input, setInput] = useState('');
    const add = () => {
        const v = input.trim();
        if (!v || chips.includes(v)) { setInput(''); return; }
        onChange([...chips, v]); setInput('');
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
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    placeholder={placeholder} />
                <button onClick={add} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">+ إضافة</button>
            </div>
        </div>
    );
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteModal({ target, onConfirm, onCancel, deleting, entityName }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-600" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">حذف {entityName}</h3>
                <p className="text-slate-500 text-sm mb-5">هل أنت متأكد من حذف <span className="font-bold text-slate-700">{target}</span>؟</p>
                <div className="flex gap-3">
                    <button onClick={onConfirm} disabled={deleting}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2">
                        {deleting && <Loader2 size={15} className="animate-spin" />}
                        {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
                    </button>
                    <button onClick={onCancel} className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

// ── TAB 1: Packages ───────────────────────────────────────────────────────────
function PackagesTab() {
    const [packages, setPackages] = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');

    const [panelOpen,    setPanelOpen]    = useState(false);
    const [editId,       setEditId]       = useState(null);
    const [form,         setForm]         = useState(EMPTY_PKG);
    const [imageFile,    setImageFile]    = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const [saving,       setSaving]       = useState(false);
    const [saveError,    setSaveError]    = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await getMedicalPackages();
        setPackages(data ?? []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openCreate = () => {
        setEditId(null); setForm(EMPTY_PKG);
        setImageFile(null); setImagePreview(''); setSaveError(''); setPanelOpen(true);
    };
    const openEdit = (pkg) => {
        setEditId(pkg.id);
        setForm({
            title:         pkg.title          ?? '',
            description:   pkg.description    ?? '',
            price:         pkg.price          ?? '',
            tests_count:   pkg.tests_count    ?? '',
            discount_text: pkg.discount_text  ?? '',
            detailed_prep: pkg.detailed_prep  ?? '',
            features:      Array.isArray(pkg.features)       ? pkg.features       : [],
            tests_included:Array.isArray(pkg.tests_included) ? pkg.tests_included : [],
            image_url:     pkg.image_url      ?? '',
        });
        setImageFile(null); setImagePreview(pkg.image_url ?? '');
        setSaveError(''); setPanelOpen(true);
    };
    const closePanel = () => { setPanelOpen(false); setSaveError(''); };
    const setField   = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file); setImagePreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSaveError('');
        if (!form.title.trim()) { setSaveError('اسم الباقة مطلوب'); return; }
        setSaving(true);
        try {
            let imageUrl = form.image_url;
            if (imageFile) {
                const { url, error: uploadErr } = await uploadPackageImage(imageFile);
                if (uploadErr) { setSaveError('فشل رفع الصورة: ' + uploadErr.message); return; }
                imageUrl = url;
            }
            const payload = {
                title:         form.title.trim(),
                description:   form.description.trim()   || null,
                price:         form.price !== '' ? Number(form.price) : null,
                tests_count:   form.tests_count !== '' ? Number(form.tests_count) : null,
                discount_text: form.discount_text.trim()  || null,
                detailed_prep: form.detailed_prep.trim()  || null,
                features:      form.features.length        ? form.features        : null,
                tests_included:form.tests_included.length  ? form.tests_included  : null,
                image_url:     imageUrl                    || null,
            };
            const { error } = editId ? await updatePackage(editId, payload) : await createPackage(payload);
            if (error) { setSaveError(error.message); return; }
            closePanel(); await fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deletePackage(deleteTarget.id);
        setDeleting(false);
        if (!error) { setPackages(prev => prev.filter(p => p.id !== deleteTarget.id)); setDeleteTarget(null); }
    };

    const filtered = packages.filter(p => p.title?.includes(search));

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-slate-500">{packages.length} باقة في النظام</p>
                <button onClick={openCreate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm">
                    <Plus size={15} /> إضافة باقة
                </button>
            </div>

            <div className="relative mb-4">
                <Search size={15} className="absolute top-3 right-3 text-slate-400" />
                <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-teal-600"><Loader2 className="animate-spin" size={28} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">الصورة</th>
                                <th className="px-4 py-3 text-right">الاسم</th>
                                <th className="px-4 py-3 text-right">السعر</th>
                                <th className="px-4 py-3 text-center">عدد الفحوصات</th>
                                <th className="px-4 py-3 text-right">الخصم</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(pkg => (
                                <tr key={pkg.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        {pkg.image_url
                                            ? <img src={pkg.image_url} alt={pkg.title} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                                            : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                                        }
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-800">{pkg.title}</td>
                                    <td className="px-4 py-3 text-slate-600">{pkg.price ? `${Number(pkg.price).toLocaleString('ar-YE')} ر.ي` : '—'}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{pkg.tests_count ?? '—'}</td>
                                    <td className="px-4 py-3">
                                        {pkg.discount_text && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">{pkg.discount_text}</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openEdit(pkg)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setDeleteTarget(pkg)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-slate-400">لا توجد باقات</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Panel */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{editId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            {/* Image */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">صورة الباقة</label>
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
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الباقة <span className="text-red-500">*</span></label>
                                <input value={form.title} onChange={e => setField('title', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="باقة الفحص الشامل" />
                            </div>
                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                                <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            {/* Price + Count + Discount */}
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">السعر (ريال)</label>
                                    <input type="number" value={form.price} onChange={e => setField('price', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">عدد الفحوصات</label>
                                    <input type="number" value={form.tests_count} onChange={e => setField('tests_count', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">نص الخصم</label>
                                    <input value={form.discount_text} onChange={e => setField('discount_text', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="وفر 20%" />
                                </div>
                            </div>
                            {/* Detailed prep */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">تعليمات التحضير</label>
                                <textarea rows={2} value={form.detailed_prep} onChange={e => setField('detailed_prep', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            {/* Features chips */}
                            <ChipEditor label="المميزات (features)" chips={form.features} onChange={v => setField('features', v)} placeholder="أضف ميزة..." />
                            {/* Tests included chips */}
                            <ChipEditor label="الفحوصات المضمنة (tests_included)" chips={form.tests_included} onChange={v => setField('tests_included', v)} placeholder="اسم الفحص..." />

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

            {deleteTarget && (
                <DeleteModal target={deleteTarget.title} entityName="الباقة" deleting={deleting}
                    onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
            )}
        </div>
    );
}

// ── TAB 2: Tests Guide ────────────────────────────────────────────────────────
function TestsGuideTab() {
    const [tests,    setTests]    = useState([]);
    const [loading,  setLoading]  = useState(true);
    const [search,   setSearch]   = useState('');

    const [panelOpen, setPanelOpen] = useState(false);
    const [editId,    setEditId]    = useState(null);
    const [form,      setForm]      = useState(EMPTY_TEST);
    const [saving,    setSaving]    = useState(false);
    const [saveError, setSaveError] = useState('');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting,     setDeleting]     = useState(false);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const { data } = await getMedicalTestsGuide();
        setTests(data ?? []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openCreate = () => { setEditId(null); setForm(EMPTY_TEST); setSaveError(''); setPanelOpen(true); };
    const openEdit = (t) => {
        setEditId(t.id);
        setForm({
            name:     t.name     ?? '',
            category: t.category ?? '',
            about:    t.about    ?? '',
            reasons:  Array.isArray(t.reasons) ? t.reasons : [],
            prep:     t.prep     ?? '',
        });
        setSaveError(''); setPanelOpen(true);
    };
    const closePanel = () => { setPanelOpen(false); setSaveError(''); };
    const setField   = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setSaveError('');
        if (!form.name.trim()) { setSaveError('اسم الفحص مطلوب'); return; }
        setSaving(true);
        try {
            const payload = {
                name:     form.name.trim(),
                category: form.category.trim() || null,
                about:    form.about.trim()    || null,
                reasons:  form.reasons.length  ? form.reasons : null,
                prep:     form.prep.trim()     || null,
            };
            const { error } = editId ? await updateTestGuide(editId, payload) : await createTestGuide(payload);
            if (error) { setSaveError(error.message); return; }
            closePanel(); await fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        const { error } = await deleteTestGuide(deleteTarget.id);
        setDeleting(false);
        if (!error) { setTests(prev => prev.filter(t => t.id !== deleteTarget.id)); setDeleteTarget(null); }
    };

    const filtered = tests.filter(t => t.name?.includes(search) || t.category?.includes(search));

    return (
        <div>
            <div className="flex items-center justify-between mb-5">
                <p className="text-sm text-slate-500">{tests.length} فحص في الدليل</p>
                <button onClick={openCreate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm">
                    <Plus size={15} /> إضافة فحص
                </button>
            </div>

            <div className="relative mb-4">
                <Search size={15} className="absolute top-3 right-3 text-slate-400" />
                <input type="text" placeholder="بحث بالاسم أو الفئة..." value={search} onChange={e => setSearch(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {loading ? (
                <div className="flex justify-center py-16 text-teal-600"><Loader2 className="animate-spin" size={28} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">اسم الفحص</th>
                                <th className="px-4 py-3 text-right">الفئة</th>
                                <th className="px-4 py-3 text-center">الأسباب</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3 font-semibold text-slate-800">{t.name}</td>
                                    <td className="px-4 py-3">
                                        {t.category && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{t.category}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{Array.isArray(t.reasons) ? t.reasons.length : 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد نتائج</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Panel */}
            {panelOpen && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{editId ? 'تعديل الفحص' : 'إضافة فحص جديد'}</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم الفحص <span className="text-red-500">*</span></label>
                                    <input value={form.name} onChange={e => setField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="تحليل الدم الشامل" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الفئة</label>
                                    <input value={form.category} onChange={e => setField('category', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="دم · بول · هرمونات" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">عن الفحص</label>
                                <textarea rows={3} value={form.about} onChange={e => setField('about', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التحضير</label>
                                <textarea rows={2} value={form.prep} onChange={e => setField('prep', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" placeholder="الصيام 8 ساعات قبل الفحص..." />
                            </div>
                            <ChipEditor label="أسباب الفحص (reasons)" chips={form.reasons} onChange={v => setField('reasons', v)} placeholder="أضف سبباً..." />

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

            {deleteTarget && (
                <DeleteModal target={deleteTarget.name} entityName="الفحص" deleting={deleting}
                    onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
            )}
        </div>
    );
}

// ── Root: LabsAdmin with tabs ─────────────────────────────────────────────────
export default function LabsAdmin() {
    const [tab, setTab] = useState('packages');

    return (
        <div className="p-6" dir="rtl">
            {/* Page header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">الفحوصات وباقات الفحوصات</h1>
                <p className="text-sm text-slate-500 mt-0.5">إدارة الباقات الطبية ودليل الفحوصات</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6">
                <button
                    onClick={() => setTab('packages')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${tab === 'packages' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={15} /> الباقات الطبية
                </button>
                <button
                    onClick={() => setTab('tests')}
                    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${tab === 'tests' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <FlaskConical size={15} /> دليل الفحوصات
                </button>
            </div>

            {/* Tab content */}
            {tab === 'packages' ? <PackagesTab /> : <TestsGuideTab />}
        </div>
    );
}
