/**
 * PackagesCMS — Standalone page for medical_packages table.
 * باقات الفحوصات — NO inner tabs, NO lab tests references.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Save, Loader2, Search, Upload, Image as ImageIcon, Package } from 'lucide-react';
import { getMedicalPackages, createPackage, updatePackage, deletePackage, uploadPackageImage } from '../../../api/scans';

const EMPTY = {
    title: '', description: '', price: '', tests_count: '',
    discount_text: '', detailed_prep: '', features: [], tests_included: [], image_url: '',
};

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
                <h3 className="font-bold text-lg text-slate-800 mb-1">حذف الباقة</h3>
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

export default function PackagesCMS() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [imgFile, setImgFile] = useState(null);
    const [imgPrev, setImgPrev] = useState('');
    const [saving, setSaving] = useState(false);
    const [err, setErr] = useState('');
    const [delItem, setDelItem] = useState(null);
    const [delBusy, setDelBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const { data } = await getMedicalPackages();
        setPackages(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setEditId(null); setForm(EMPTY); setImgFile(null); setImgPrev(''); setErr(''); setOpen(true); };
    const openEdit = p => {
        setEditId(p.id);
        setForm({
            title: p.title ?? '', description: p.description ?? '',
            price: p.price ?? '', tests_count: p.tests_count ?? '',
            discount_text: p.discount_text ?? '', detailed_prep: p.detailed_prep ?? '',
            features: Array.isArray(p.features) ? p.features : [],
            tests_included: Array.isArray(p.tests_included) ? p.tests_included : [],
            image_url: p.image_url ?? '',
        });
        setImgFile(null); setImgPrev(p.image_url ?? ''); setErr(''); setOpen(true);
    };
    const closePanel = () => { setOpen(false); setErr(''); };
    const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const onImgChange = e => { const f = e.target.files?.[0]; if (!f) return; setImgFile(f); setImgPrev(URL.createObjectURL(f)); };

    const handleSave = async () => {
        setErr('');
        if (!form.title.trim()) { setErr('اسم الباقة مطلوب'); return; }
        setSaving(true);
        try {
            let imageUrl = form.image_url;
            if (imgFile) {
                const { url, error: ue } = await uploadPackageImage(imgFile);
                if (ue) { setErr('فشل رفع الصورة: ' + ue.message); return; }
                imageUrl = url;
            }
            const payload = {
                title: form.title.trim(),
                description: form.description.trim() || null,
                price: form.price !== '' ? Number(form.price) : null,
                tests_count: form.tests_count !== '' ? Number(form.tests_count) : null,
                discount_text: form.discount_text.trim() || null,
                detailed_prep: form.detailed_prep.trim() || null,
                features: form.features.length ? form.features : null,
                tests_included: form.tests_included.length ? form.tests_included : null,
                image_url: imageUrl || null,
            };
            const { error } = editId ? await updatePackage(editId, payload) : await createPackage(payload);
            if (error) { setErr(error.message); return; }
            closePanel(); await load();
        } finally { setSaving(false); }
    };

    const handleDelete = async () => {
        setDelBusy(true);
        const { error } = await deletePackage(delItem.id);
        setDelBusy(false);
        if (!error) { setPackages(p => p.filter(x => x.id !== delItem.id)); setDelItem(null); }
    };

    const filtered = packages.filter(p => p.title?.includes(search));

    return (
        <div className="p-6" dir="rtl">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">باقات الفحوصات</h1>
                    <p className="text-sm text-slate-400 mt-0.5">إدارة الباقات الطبية المتاحة للمرضى</p>
                </div>
                <button onClick={openAdd} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition">
                    <Plus size={15} /> إضافة باقة
                </button>
            </div>

            <div className="relative mb-4">
                <Search size={15} className="absolute top-3 right-3 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم..."
                    className="w-full border border-slate-200 rounded-xl py-2.5 pr-9 pl-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white" />
            </div>

            {loading ? (
                <div className="flex justify-center py-24"><Loader2 className="animate-spin text-teal-500" size={28} /></div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
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
                            {filtered.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                    <td className="px-4 py-3">
                                        {p.image_url
                                            ? <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover border border-slate-100" />
                                            : <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center"><Package size={16} className="text-slate-300" /></div>
                                        }
                                    </td>
                                    <td className="px-4 py-3 font-semibold text-slate-800">{p.title}</td>
                                    <td className="px-4 py-3 text-slate-600">{p.price ? `${Number(p.price).toLocaleString('ar-YE')} ر.ي` : '—'}</td>
                                    <td className="px-4 py-3 text-center text-slate-500">{p.tests_count ?? '—'}</td>
                                    <td className="px-4 py-3">{p.discount_text && <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold">{p.discount_text}</span>}</td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2 justify-center">
                                            <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"><Pencil size={15} /></button>
                                            <button onClick={() => setDelItem(p)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-slate-400">لا توجد باقات</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {open && (
                <div className="fixed inset-0 z-50 flex" dir="rtl">
                    <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
                    <div className="w-full max-w-xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                            <h2 className="font-bold text-lg text-slate-800">{editId ? 'تعديل الباقة' : 'إضافة باقة جديدة'}</h2>
                            <button onClick={closePanel} className="p-1.5 hover:bg-slate-100 rounded-lg transition"><X size={18} /></button>
                        </div>
                        <div className="flex-1 px-6 py-5 space-y-5 text-sm">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">صورة الباقة</label>
                                <div className="flex items-center gap-4">
                                    {imgPrev
                                        ? <img src={imgPrev} alt="preview" className="w-20 h-20 rounded-xl object-cover border border-slate-200" />
                                        : <div className="w-20 h-20 rounded-xl bg-slate-100 flex items-center justify-center"><ImageIcon size={28} className="text-slate-300" /></div>
                                    }
                                    <label className="cursor-pointer flex items-center gap-2 bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 px-4 py-2 rounded-lg text-xs font-bold transition">
                                        <Upload size={14} /> رفع صورة
                                        <input type="file" accept="image/*" className="hidden" onChange={onImgChange} />
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">اسم الباقة <span className="text-red-500">*</span></label>
                                <input value={form.title} onChange={e => setField('title', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">الوصف</label>
                                <textarea rows={3} value={form.description} onChange={e => setField('description', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">السعر (ريال)</label><input type="number" value={form.price} onChange={e => setField('price', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">عدد الفحوصات</label><input type="number" value={form.tests_count} onChange={e => setField('tests_count', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" /></div>
                                <div><label className="block text-xs font-bold text-slate-500 mb-1">نص الخصم</label><input value={form.discount_text} onChange={e => setField('discount_text', e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50" placeholder="وفر 20%" /></div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">تعليمات التحضير</label>
                                <textarea rows={2} value={form.detailed_prep} onChange={e => setField('detailed_prep', e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 resize-none" />
                            </div>
                            <ChipEditor label="المميزات" chips={form.features} onChange={v => setField('features', v)} placeholder="أضف ميزة..." />
                            <ChipEditor label="الفحوصات المضمنة" chips={form.tests_included} onChange={v => setField('tests_included', v)} placeholder="اسم الفحص..." />
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

            {delItem && <DeleteModal name={delItem.title} busy={delBusy} onConfirm={handleDelete} onCancel={() => setDelItem(null)} />}
        </div>
    );
}
