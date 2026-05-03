/**
 * LabTestsCMS — Standalone page for medical_tests_guide table.
 * دليل الفحوصات — NO inner tabs, NO packages references.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, FlaskConical } from 'lucide-react';
import { getMedicalTestsGuide, createTestGuide, updateTestGuide, deleteTestGuide } from '../../../api/scans';

const EMPTY = { name: '', category: '', about: '', reasons: [], prep: '', price: 0 };

function ChipEditor({ label, chips, onChange, placeholder }) {
    const [input, setInput] = useState('');
    const add = () => {
        const v = input.trim();
        if (!v || chips.includes(v)) { setInput(''); return; }
        onChange([...chips, v]); setInput('');
    };
    return (
        <div>
            <label className="block text-xs font-bold text-slate-500 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
                {chips.map(c => (
                    <span key={c} className="flex items-center gap-1 bg-teal-50 text-teal-700 border border-teal-200 px-3 py-1 rounded-full text-xs font-medium">
                        {c}
                        <button type="button" onClick={() => onChange(chips.filter(x => x !== c))} className="hover:text-red-500 ml-0.5"><X size={11} /></button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                    placeholder={placeholder} />
                <button type="button" onClick={add} className="bg-teal-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-teal-700 transition">+ إضافة</button>
            </div>
        </div>
    );
}

function DeleteModal({ name, onConfirm, onCancel, busy }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" dir="rtl">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                    <Trash2 size={22} className="text-red-600" />
                </div>
                <h3 className="font-bold text-lg text-slate-800 mb-1">حذف الفحص</h3>
                <p className="text-slate-500 text-sm mb-5">هل أنت متأكد من حذف <span className="font-bold text-slate-700">«{name}»</span>؟</p>
                <div className="flex gap-3">
                    <button onClick={onConfirm} disabled={busy}
                        className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition">
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        {busy ? 'جارٍ الحذف...' : 'نعم، احذف'}
                    </button>
                    <button onClick={onCancel} className="flex-1 border border-slate-200 hover:bg-slate-50 py-2.5 rounded-xl font-bold text-slate-600 text-sm transition">إلغاء</button>
                </div>
            </div>
        </div>
    );
}

export default function LabTestsCMS() {
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [delItem, setDelItem] = useState(null);
    const [delBusy, setDelBusy] = useState(false);

    // Category mode: 'select' = pick existing | 'create' = type new
    const [categoryMode, setCategoryMode] = useState('select');

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await getMedicalTestsGuide();
        setTests(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Derive sorted unique categories from already-loaded tests — no extra DB query
    const categoryOptions = useMemo(
        () => [...new Set(tests.map(t => t.category).filter(Boolean))].sort(),
        [tests]
    );

    const openAdd = () => { setEditId(null); setForm(EMPTY); setCategoryMode('select'); setErr(''); setOpen(true); };
    const openEdit = t => {
        setEditId(t.id);
        setForm({ name: t.name ?? '', category: t.category ?? '', about: t.about ?? '', reasons: Array.isArray(t.reasons) ? t.reasons : [], prep: t.prep ?? '', price: t.price ?? 0 });
        setCategoryMode('select');
        setErr(''); setOpen(true);
    };
    const closePanel = () => { setOpen(false); setErr(''); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        setErr('');
        if (!form.name.trim()) { setErr('اسم الفحص مطلوب'); return; }

        // Resolve final category value from whichever mode is active
        let finalCategory = null;
        if (categoryMode === 'select') {
            finalCategory = form.category || null;
        } else {
            const trimmed = form.category.trim();
            if (!trimmed) { setErr('يرجى إدخال اسم الفئة الجديدة'); return; }
            finalCategory = trimmed;
        }

        setSaving(true);
        try {
            const payload = {
                name:     form.name.trim(),
                category: finalCategory,
                about:    form.about.trim() || null,
                reasons:  form.reasons.length ? form.reasons : null,
                prep:     form.prep.trim() || null,
                price:    form.price !== '' ? Number(form.price) : 0,
            };
            const { error } = editId ? await updateTestGuide(editId, payload) : await createTestGuide(payload);
            if (error) { setErr(error.message); return; }
            closePanel(); await load();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setDelBusy(true);
        const { error } = await deleteTestGuide(delItem.id);
        setDelBusy(false);
        if (!error) { setTests(p => p.filter(t => t.id !== delItem.id)); setDelItem(null); }
    };

    const filtered = tests.filter(t => t.name?.includes(search) || t.category?.includes(search));

    return (
        <div className="p-6" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">دليل الفحوصات</h1>
                    <p className="text-sm text-slate-400 mt-0.5">إدارة قائمة الفحوصات الطبية المتاحة</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition">
                    <Plus size={15} /> إضافة فحص
                </button>
            </div>

            <div className="relative mb-4">
                <Search size={15} className="absolute top-3 right-3 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو الفئة..."
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="animate-spin text-teal-500" size={28} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[460px]">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                            <tr>
                                <th className="px-4 py-3 text-right">اسم الفحص</th>
                                <th className="px-4 py-3 text-right">الفئة</th>
                                <th className="px-4 py-3 text-right">سعر الفحص</th>
                                <th className="px-4 py-3 text-center">أسباب الفحص</th>
                                <th className="px-4 py-3 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3 font-semibold text-slate-800">
                                        <div className="flex items-center gap-2"><FlaskConical size={14} className="text-teal-400 shrink-0" />{t.name}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {t.category && <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">{t.category}</span>}
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 font-medium">
                                        {t.price && Number(t.price) > 0 ? `$ ${Number(t.price).toLocaleString('en-US')}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{Array.isArray(t.reasons) ? t.reasons.length : 0}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setDelItem(t)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={4} className="py-16 text-center text-slate-400">لا توجد فحوصات</td></tr>}
                        </tbody>
                    </table>
                    </div>{/* /overflow-x-auto */}
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{editId ? 'تعديل الفحص' : 'إضافة فحص جديد'}</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">اسم الفحص <span className="text-red-500">*</span></label>
                                    <input value={form.name} onChange={e => setField('name', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 mb-2">الفئة</label>

                                    {/* ── Segmented Toggle ── */}
                                    <div className="flex bg-slate-100 rounded-xl p-1 mb-3 gap-1">
                                        {[
                                            { key: 'select', label: 'اختر من القائمة' },
                                            { key: 'create', label: 'أضف فئة جديدة' },
                                        ].map(m => (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => { setCategoryMode(m.key); setField('category', ''); }}
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                                                    categoryMode === m.key
                                                        ? 'bg-white text-teal-700 shadow-sm'
                                                        : 'text-slate-500 hover:text-slate-700'
                                                }`}
                                            >
                                                {m.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* ── Mode: Select Existing ── */}
                                    {categoryMode === 'select' && (
                                        <select
                                            value={form.category}
                                            onChange={e => setField('category', e.target.value)}
                                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                        >
                                            <option value="">— بدون فئة —</option>
                                            {categoryOptions.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    )}

                                    {/* ── Mode: Create New ── */}
                                    {categoryMode === 'create' && (
                                        <input
                                            value={form.category}
                                            onChange={e => setField('category', e.target.value)}
                                            placeholder="مثال: الغدة الكظرية..."
                                            className="w-full border border-teal-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-teal-50/30"
                                            autoFocus
                                        />
                                    )}
                                </div>
                            </div>
                            {/* Price */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">سعر الفحص (دولار أمريكي $)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={form.price}
                                    onChange={e => setField('price', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">عن الفحص</label>
                                <textarea rows={3} value={form.about} onChange={e => setField('about', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">تعليمات التحضير</label>
                                <textarea rows={2} value={form.prep} onChange={e => setField('prep', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none"
                                    placeholder="الصيام 8 ساعات قبل الفحص..." />
                            </div>
                            <ChipEditor label="أسباب الفحص" chips={form.reasons} onChange={v => setField('reasons', v)} placeholder="أضف سبباً..." />
                            {err && <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{err}</p>}
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white flex gap-3">
                            <button onClick={handleSave} disabled={saving}
                                className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white py-2.5 rounded-xl font-bold text-sm transition">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saving ? 'جارٍ الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={closePanel} className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 text-sm transition">إلغاء</button>
                        </div>
                    </div>
                </div>
            )}

            {delItem && <DeleteModal name={delItem.name} busy={delBusy} onConfirm={handleDelete} onCancel={() => setDelItem(null)} />}
        </div>
    );
}
