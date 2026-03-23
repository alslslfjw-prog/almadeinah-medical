/**
 * PatientProfile — View and edit the patient's personal information.
 */

import React, { useState, useEffect } from 'react';
import { User, Phone, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getMyProfile, updateMyProfile } from '../../../api/patient';
import useAuthStore from '../../../store/authStore';

const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400';

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function PatientProfile() {
    const { user } = useAuthStore();
    const [profile, setProfile]     = useState(null);
    const [form, setForm]           = useState({});
    const [loading, setLoading]     = useState(true);
    const [saving, setSaving]       = useState(false);
    const [saveMsg, setSaveMsg]     = useState(null); // { type, text }

    useEffect(() => {
        getMyProfile().then(({ data }) => {
            setProfile(data);
            setForm({
                full_name:     data?.full_name     ?? '',
                phone:         data?.phone         ?? '',
                gender:        data?.gender         ?? '',
                date_of_birth: data?.date_of_birth ?? '',
                address:       data?.address       ?? '',
            });
            setLoading(false);
        });
    }, []);

    const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

    const handleSave = async e => {
        e.preventDefault();
        setSaving(true);
        setSaveMsg(null);
        const { error } = await updateMyProfile(form);
        setSaving(false);
        setSaveMsg(error
            ? { type: 'error', text: error.message ?? 'فشل الحفظ. حاول مجدداً.' }
            : { type: 'success', text: 'تم حفظ بياناتك بنجاح.' }
        );
        if (!error) setProfile(p => ({ ...p, ...form }));
        setTimeout(() => setSaveMsg(null), 4000);
    };


    if (loading) return (
        <div className="flex justify-center py-24"><Loader2 size={24} className="animate-spin text-teal-500" /></div>
    );

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white text-xl font-black">
                    {getInitials(profile?.full_name)}
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800">{profile?.full_name || 'مريض'}</h1>
                    <p className="text-sm text-slate-400 flex items-center gap-1">
                        <Phone size={13} /> {user?.phone ? user.phone : (profile?.phone || '—')}
                    </p>
                </div>
            </div>

            {/* Profile form */}
            <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-slate-700 flex items-center gap-2"><User size={16} /> البيانات الشخصية</h2>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">الاسم الكامل</label>
                    <input type="text" value={form.full_name} onChange={set('full_name')} placeholder="الاسم الكامل" className={inputCls} />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">رقم الهاتف (هوية الحساب)</label>
                    <input type="tel" disabled dir="ltr"
                        value={user?.phone ?? profile?.phone ?? ''}
                        className={inputCls} />
                    <p className="text-xs text-slate-400 mt-1">رقم الهاتف هو هوية حسابك ولا يمكن تغييره من هنا.</p>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">رقم الهاتف</label>
                    <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')} placeholder="+967777000000" className={inputCls} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">الجنس</label>
                        <select value={form.gender} onChange={set('gender')} className={inputCls}>
                            <option value="">— اختر —</option>
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5">تاريخ الميلاد</label>
                        <input type="date" dir="ltr" value={form.date_of_birth} onChange={set('date_of_birth')} className={inputCls} />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">العنوان</label>
                    <input type="text" value={form.address} onChange={set('address')} placeholder="المدينة، الحي، الشارع" className={inputCls} />
                </div>

                {saveMsg && (
                    <div className={`flex items-center gap-2 text-sm rounded-xl px-3 py-2 ${saveMsg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {saveMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                        {saveMsg.text}
                    </div>
                )}

                <button type="submit" disabled={saving}
                    className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> جارٍ الحفظ...</> : <><CheckCircle size={15} /> حفظ التغييرات</>}
                </button>
            </form>

        </div>
    );
}
