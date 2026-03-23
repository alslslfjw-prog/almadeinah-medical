/**
 * ScansAdmin — Admin CMS for scans + scan_categories.
 * 2 tabs: الفئات الرئيسية (category CRUD) | خدمات الأشعة (scan CRUD with category assignment)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, Tag } from 'lucide-react';
import {
    getScans, createScan, updateScan, deleteScan,
    getScanCategories, createScanCategory, updateScanCategory, deleteScanCategory,
} from '../../../api/scans';

// ── ChipEditor ────────────────────────────────────────────────────────────────
function ChipEditor({ label, chips, onChange }) {
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
                        <button type="button" onClick={() => remove(chip)} className="hover:text-red-500 transition"><X size={12} /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    placeholder="اكتب قيمة ثم اضغط Enter أو إضافة" />
                <button type="button" onClick={add} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">+ إضافة</button>
            </div>
        </div>
    );
}

// ── Delete Modal ──────────────────────────────────────────────────────────────
function DeleteModal({ title, name, onConfirm, onCancel, busy }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4"><Trash2 size={22} className="text-red-600" /></div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">{title}</h3>
                <p className="text-slate-500 text-sm mb-5">هل أنت متأكد من حذف <span className="font-bold text-slate-700">«{name}»</span>؟</p>
                <div className="flex gap-3">
                    <button onClick={onConfirm} disabled={busy}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2">
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {busy ? 'جارٍ الحذف...' : 'نعم، احذف'}
                    </button>
                    <button onClick={onCancel} className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

// ── EMPTY forms ───────────────────────────────────────────────────────────────
const EMPTY_SCAN = {
    name: '', short_description: '', description: '',
    price: '', icon_class: 'fas fa-x-ray',
    preparation: '', benefits: [], category_id: '',
};
const EMPTY_CAT = { name: '', icon_class: 'fas fa-x-ray', image_url: '', display_order: 0 };

// ═════════════════════════════════════════════════════════════════════════════
export default function ScansAdmin() {
    const [activeTab, setActiveTab] = useState('scans'); // 'scans' | 'categories'

    // ── Shared data ──────────────────────────────────────────────────────────
    const [scans,      setScans]      = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading,    setLoading]    = useState(true);
    const [search,     setSearch]     = useState('');

    // ── Scan panel state ─────────────────────────────────────────────────────
    const [scanPanel,  setScanPanel]  = useState(false);
    const [scanEditId, setScanEditId] = useState(null);
    const [scanForm,   setScanForm]   = useState(EMPTY_SCAN);
    const [scanSaving, setScanSaving] = useState(false);
    const [scanErr,    setScanErr]    = useState('');
    const [scanDel,    setScanDel]    = useState(null);
    const [scanDelBusy,setScanDelBusy]= useState(false);

    // ── Category panel state ─────────────────────────────────────────────────
    const [catPanel,   setCatPanel]   = useState(false);
    const [catEditId,  setCatEditId]  = useState(null);
    const [catForm,    setCatForm]    = useState(EMPTY_CAT);
    const [catSaving,  setCatSaving]  = useState(false);
    const [catErr,     setCatErr]     = useState('');
    const [catDel,     setCatDel]     = useState(null);
    const [catDelBusy, setCatDelBusy] = useState(false);

    // ── Fetch ────────────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [{ data: s }, { data: c }] = await Promise.all([getScans(), getScanCategories()]);
        setScans(s ?? []);
        setCategories(c ?? []);
        setLoading(false);
    }, []);
    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Scan helpers ─────────────────────────────────────────────────────────
    const openScanCreate = () => { setScanEditId(null); setScanForm(EMPTY_SCAN); setScanErr(''); setScanPanel(true); };
    const openScanEdit = (s) => {
        setScanEditId(s.id);
        setScanForm({
            name:              s.name              ?? '',
            short_description: s.short_description ?? '',
            description:       s.description       ?? '',
            price:             s.price             ?? '',
            icon_class:        s.icon_class        ?? 'fas fa-x-ray',
            preparation:       s.preparation       ?? '',
            benefits:          s.benefits ? s.benefits.split('\n').filter(Boolean) : [],
            category_id:       s.category_id       ?? '',
        });
        setScanErr(''); setScanPanel(true);
    };
    const setScanField = (k, v) => setScanForm(p => ({ ...p, [k]: v }));

    const handleScanSave = async () => {
        setScanErr('');
        if (!scanForm.name.trim()) { setScanErr('اسم الأشعة مطلوب'); return; }
        setScanSaving(true);
        try {
            const payload = {
                name:              scanForm.name.trim(),
                short_description: scanForm.short_description.trim() || null,
                description:       scanForm.description.trim()       || null,
                price:             scanForm.price !== '' ? Number(scanForm.price) : null,
                icon_class:        scanForm.icon_class.trim()        || null,
                preparation:       scanForm.preparation.trim()       || null,
                benefits:          scanForm.benefits.length ? scanForm.benefits.join('\n') : null,
                category_id:       scanForm.category_id !== '' ? Number(scanForm.category_id) : null,
            };
            const { error } = scanEditId ? await updateScan(scanEditId, payload) : await createScan(payload);
            if (error) { setScanErr(error.message); return; }
            setScanPanel(false); await fetchAll();
        } finally { setScanSaving(false); }
    };

    const handleScanDelete = async () => {
        setScanDelBusy(true);
        const { error } = await deleteScan(scanDel.id);
        setScanDelBusy(false);
        if (!error) { setScans(p => p.filter(s => s.id !== scanDel.id)); setScanDel(null); }
    };

    // ── Category helpers ─────────────────────────────────────────────────────
    const openCatCreate = () => { setCatEditId(null); setCatForm(EMPTY_CAT); setCatErr(''); setCatPanel(true); };
    const openCatEdit = (c) => {
        setCatEditId(c.id);
        setCatForm({ name: c.name ?? '', icon_class: c.icon_class ?? '', image_url: c.image_url ?? '', display_order: c.display_order ?? 0 });
        setCatErr(''); setCatPanel(true);
    };
    const setCatField = (k, v) => setCatForm(p => ({ ...p, [k]: v }));

    const handleCatSave = async () => {
        setCatErr('');
        if (!catForm.name.trim()) { setCatErr('اسم الفئة مطلوب'); return; }
        setCatSaving(true);
        try {
            const payload = {
                name:          catForm.name.trim(),
                icon_class:    catForm.icon_class.trim()  || null,
                image_url:     catForm.image_url.trim()   || null,
                display_order: Number(catForm.display_order) || 0,
            };
            const { error } = catEditId ? await updateScanCategory(catEditId, payload) : await createScanCategory(payload);
            if (error) { setCatErr(error.message); return; }
            setCatPanel(false); await fetchAll();
        } finally { setCatSaving(false); }
    };

    const handleCatDelete = async () => {
        setCatDelBusy(true);
        const { error } = await deleteScanCategory(catDel.id);
        setCatDelBusy(false);
        if (!error) { setCategories(p => p.filter(c => c.id !== catDel.id)); setCatDel(null); }
    };

    const filtered = scans.filter(s => s.name?.includes(search) || s.short_description?.includes(search));

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="p-6" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة الأشعة التشخيصية</h1>
                    <p className="text-sm text-slate-500 mt-0.5">{scans.length} خدمة · {categories.length} فئة</p>
                </div>
                <button
                    onClick={activeTab === 'scans' ? openScanCreate : openCatCreate}
                    className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-bold transition text-sm shadow-sm">
                    <Plus size={16} />
                    {activeTab === 'scans' ? 'إضافة أشعة' : 'إضافة فئة'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl mb-6 w-fit">
                {[
                    { key: 'scans',      label: 'خدمات الأشعة' },
                    { key: 'categories', label: 'الفئات الرئيسية' },
                ].map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition ${activeTab === t.key ? 'bg-white shadow-sm text-teal-700' : 'text-slate-500 hover:text-slate-700'}`}>
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex justify-center py-20 text-teal-600"><Loader2 className="animate-spin" size={30} /></div>
            ) : activeTab === 'scans' ? (
                <>
                    {/* Search */}
                    <div className="relative mb-5">
                        <Search size={16} className="absolute top-3 right-3 text-slate-400" />
                        <input type="text" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
                    </div>

                    {/* Scans Table */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[520px]">
                            <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                                <tr>
                                    <th className="px-4 py-3 text-right">الاسم</th>
                                    <th className="px-4 py-3 text-right">الفئة</th>
                                    <th className="px-4 py-3 text-right">السعر</th>
                                    <th className="px-4 py-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(scan => (
                                    <tr key={scan.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-4 py-3">
                                            <p className="font-semibold text-slate-800">{scan.name}</p>
                                            {scan.short_description && <p className="text-xs text-slate-400 truncate max-w-xs">{scan.short_description}</p>}
                                        </td>
                                        <td className="px-4 py-3">
                                            {scan.scan_categories?.name
                                                ? <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{scan.scan_categories.name}</span>
                                                : <span className="text-slate-300 text-xs">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-slate-600 font-medium">
                                            {scan.price && Number(scan.price) > 0 ? `$ ${Number(scan.price).toLocaleString('en-US')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => openScanEdit(scan)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                                <button onClick={() => setScanDel(scan)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد نتائج</td></tr>}
                            </tbody>
                        </table>
                        </div>{/* /overflow-x-auto */}
                    </div>
                </>
            ) : (
                /* Categories Table */
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[400px]">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">اسم الفئة</th>
                                <th className="px-4 py-3 text-right">كلاس الأيقونة</th>
                                <th className="px-4 py-3 text-right">الترتيب</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {categories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <Tag size={14} className="text-teal-400 shrink-0" />
                                            <span className="font-semibold text-slate-800">{cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{cat.icon_class || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">{cat.display_order}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openCatEdit(cat)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setCatDel(cat)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {categories.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد فئات</td></tr>}
                        </tbody>
                    </table>
                    </div>{/* /overflow-x-auto */}
                </div>
            )}

            {/* ── SCAN Slide-in Panel ──────────────────────────────────────────── */}
            {scanPanel && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setScanPanel(false)} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{scanEditId ? 'تعديل الأشعة' : 'إضافة أشعة جديدة'}</h2>
                            <button onClick={() => setScanPanel(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الفئة الرئيسية</label>
                                <select value={scanForm.category_id} onChange={e => setScanField('category_id', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50">
                                    <option value="">— بدون فئة —</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Name + Icon */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الاسم <span className="text-red-500">*</span></label>
                                    <input value={scanForm.name} onChange={e => setScanField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">كلاس الأيقونة</label>
                                    <input value={scanForm.icon_class} onChange={e => setScanField('icon_class', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" />
                                </div>
                            </div>

                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">سعر الأشعة (دولار أمريكي $)</label>
                                <input type="number" min="0" value={scanForm.price} onChange={e => setScanField('price', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="0" />
                            </div>

                            {/* Short desc */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">وصف مختصر</label>
                                <input value={scanForm.short_description} onChange={e => setScanField('short_description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>

                            {/* Full desc */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف الكامل</label>
                                <textarea rows={3} value={scanForm.description} onChange={e => setScanField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>

                            {/* Preparation */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التحضير</label>
                                <textarea rows={2} value={scanForm.preparation} onChange={e => setScanField('preparation', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>

                            {/* Benefits */}
                            <ChipEditor label="الفوائد" chips={scanForm.benefits} onChange={v => setScanField('benefits', v)} />

                            {scanErr && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{scanErr}</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleScanSave} disabled={scanSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm">
                                {scanSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {scanSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setScanPanel(false)} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CATEGORY Slide-in Panel ──────────────────────────────────────── */}
            {catPanel && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setCatPanel(false)} />
                    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{catEditId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h2>
                            <button onClick={() => setCatPanel(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الفئة <span className="text-red-500">*</span></label>
                                <input value={catForm.name} onChange={e => setCatField('name', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="الأشعة المقطعية" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">كلاس الأيقونة (Font Awesome)</label>
                                <input value={catForm.icon_class} onChange={e => setCatField('icon_class', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" placeholder="fas fa-x-ray" />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">رابط صورة الغلاف</label>
                                <input value={catForm.image_url} onChange={e => setCatField('image_url', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 font-mono text-xs" placeholder="https://..." dir="ltr" />
                                {catForm.image_url && <img src={catForm.image_url} alt="preview" className="mt-2 h-20 w-full object-cover rounded-lg border border-slate-200" />}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">ترتيب العرض</label>
                                <input type="number" min="0" value={catForm.display_order} onChange={e => setCatField('display_order', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>

                            {catErr && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{catErr}</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleCatSave} disabled={catSaving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold transition text-sm">
                                {catSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {catSaving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={() => setCatPanel(false)} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition text-sm">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete modals */}
            {scanDel && <DeleteModal title="حذف الأشعة" name={scanDel.name} busy={scanDelBusy} onConfirm={handleScanDelete} onCancel={() => setScanDel(null)} />}
            {catDel  && <DeleteModal title="حذف الفئة"  name={catDel.name}  busy={catDelBusy}  onConfirm={handleCatDelete}  onCancel={() => setCatDel(null)} />}
        </div>
    );
}
