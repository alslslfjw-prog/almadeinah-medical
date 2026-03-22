/**
 * UsersAdmin — Admin UI for managing staff accounts and patient profiles.
 * Tab 1: Staff — invite, view, edit roles
 * Tab 2: Patients — view and edit profile information
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Users, UserPlus, X, Loader2, CheckCircle,
    AlertCircle, Shield, Pencil, UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import {
    getAllStaff, updateUserRole, inviteStaffMember, STAFF_ROLES,
    getAllPatients, updatePatientProfile, deleteUser,
} from '../../../api/users';

// ── Shared helpers ────────────────────────────────────────────────────────────

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function Avatar({ name, size = 'md' }) {
    const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-9 h-9 text-xs';
    return (
        <div className={`${sz} rounded-full bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center text-white font-black flex-shrink-0`}>
            {getInitials(name)}
        </div>
    );
}

function RoleBadge({ role }) {
    const def = STAFF_ROLES.find(r => r.value === role) ?? { label: role, color: 'bg-slate-100 text-slate-500' };
    return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${def.color}`}>{def.label}</span>;
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold ${toast.type === 'success' ? 'bg-teal-600 text-white' : 'bg-red-600 text-white'}`}>
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {toast.msg}
        </div>
    );
}

function EmptyState({ icon: Icon, message }) {
    return (
        <div className="text-center py-24">
            <Icon size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">{message}</p>
        </div>
    );
}

// ── Add Staff Modal ───────────────────────────────────────────────────────────

/** Generate a readable placeholder password for the admin to use or replace */
function generatePlaceholderPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const seg = (n) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `${seg(4)}-${seg(4)}-${seg(4)}`;
}

function AddStaffModal({ onClose, onSuccess }) {
    const [form, setForm] = useState({
        full_name: '', email: '', role: 'receptionist',
        password: generatePlaceholderPassword(),
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [createdPassword, setCreatedPassword] = useState(null); // success state
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.full_name.trim() || !form.email.trim()) { setError('يرجى ملء جميع الحقول المطلوبة.'); return; }
        if (form.password.trim().length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل.'); return; }
        setSubmitting(true);
        const { data, error: err } = await inviteStaffMember({ ...form, password: form.password.trim() });
        setSubmitting(false);
        if (err) {
            const msg = err.message ?? '';
            setError(
                msg.includes('already registered') || msg.includes('already been registered') || msg.includes('Email address is already')
                    ? 'هذا البريد الإلكتروني مسجّل مسبقاً في النظام.' :
                    msg.includes('invalid') && msg.toLowerCase().includes('email')
                        ? 'صيغة البريد الإلكتروني غير صحيحة.' :
                        msg.includes('password') && msg.includes('weak')
                            ? 'كلمة المرور ضعيفة جداً. استخدم مزيجاً من الأحرف والأرقام.' :
                            (msg || 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.')
            );
        } else {
            // Show the "copy password" success screen
            setCreatedPassword(data?.tempPassword ?? form.password.trim());
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(createdPassword).catch(() => { });
        setCopied(true);
    };

    const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50';

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center">
                            <UserPlus size={18} className="text-teal-600" />
                        </div>
                        <h2 className="font-bold text-slate-800">
                            {createdPassword ? 'تم إنشاء الحساب 🎉' : 'إضافة موظف جديد'}
                        </h2>
                    </div>
                    {!createdPassword && (
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                    )}
                </div>

                {/* ── Success screen ── */}
                {createdPassword ? (
                    <div className="p-6 space-y-5">
                        <div className="bg-teal-50 rounded-2xl p-4 space-y-3 text-center">
                            <CheckCircle size={36} className="text-teal-500 mx-auto" />
                            <p className="text-sm font-bold text-slate-700">تم إنشاء حساب <span className="text-teal-600">{form.full_name}</span> بنجاح!</p>
                            <p className="text-xs text-slate-500">احفظ كلمة المرور المؤقتة التالية وشاركها مع الموظف ليتمكن من تسجيل الدخول:</p>
                            <div className="bg-white border-2 border-dashed border-teal-300 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                                <span className="font-mono font-bold text-lg text-slate-800 tracking-widest select-all">{createdPassword}</span>
                                <button onClick={handleCopy}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition ${copied ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700 hover:bg-teal-200'}`}>
                                    {copied ? <><CheckCircle size={13} /> تم النسخ!</> : <>نسخ</>}
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3 text-center">
                            ⚠️ لن تتمكن من رؤية هذه الكلمة مرة أخرى. تأكد من نسخها قبل الإغلاق.
                        </p>
                        <button onClick={onSuccess}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-sm transition">
                            حسناً، تم النسخ
                        </button>
                    </div>
                ) : (
                    /* ── Form ── */
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">الاسم الكامل <span className="text-red-400">*</span></label>
                            <input type="text" required placeholder="محمد أحمد" value={form.full_name}
                                onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">البريد الإلكتروني <span className="text-red-400">*</span></label>
                            <input type="email" required dir="ltr" placeholder="staff@example.com" value={form.email}
                                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">الدور الوظيفي</label>
                            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">
                                كلمة المرور المؤقتة
                                <span className="text-slate-400 font-normal text-xs mr-1">(سيتم مشاركتها مع الموظف)</span>
                            </label>
                            <input type="text" dir="ltr" value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                className={`${inputCls} font-mono tracking-wider`} />
                            <p className="text-xs text-slate-400 mt-1">8 أحرف كحد أدنى. يمكنك تعديلها أو الإبقاء على القيمة المولَّدة تلقائياً.</p>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                <AlertCircle size={15} className="shrink-0" /> {error}
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={submitting}
                                className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition">
                                {submitting ? <><Loader2 size={15} className="animate-spin" /> جارٍ الإنشاء...</> : 'إنشاء الحساب'}
                            </button>
                            <button type="button" onClick={onClose}
                                className="px-5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition">
                                إلغاء
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}


// ── Edit Patient Modal ────────────────────────────────────────────────────────

function EditPatientModal({ patient, onClose, onSave }) {
    const [form, setForm] = useState({
        full_name: patient.full_name ?? '',
        phone: patient.phone ?? '',
        gender: patient.gender ?? '',
        date_of_birth: patient.date_of_birth ?? '',
        address: patient.address ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        const { error: err } = await updatePatientProfile(patient.id, form);
        setSaving(false);
        if (err) {
            setError(err.message ?? 'حدث خطأ أثناء الحفظ.');
        } else {
            onSave({ ...patient, ...form });
        }
    };

    const inputCls = 'w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50';

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <Avatar name={patient.full_name} />
                        <div>
                            <h2 className="font-bold text-slate-800">تعديل بيانات المريض</h2>
                            <p className="text-xs text-slate-400">{patient.email || '—'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition"><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Full name */}
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">الاسم الكامل</label>
                        <input type="text" value={form.full_name} onChange={set('full_name')}
                            placeholder="الاسم الكامل" className={inputCls} />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">رقم الهاتف</label>
                        <input type="tel" dir="ltr" value={form.phone} onChange={set('phone')}
                            placeholder="+967777000000" className={inputCls} />
                    </div>

                    {/* Gender + DOB row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">الجنس</label>
                            <select value={form.gender} onChange={set('gender')} className={inputCls}>
                                <option value="">— غير محدد —</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">تاريخ الميلاد</label>
                            <input type="date" dir="ltr" value={form.date_of_birth} onChange={set('date_of_birth')}
                                className={inputCls} />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1.5">العنوان</label>
                        <input type="text" value={form.address} onChange={set('address')}
                            placeholder="المدينة، الحي، الشارع" className={inputCls} />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                            <AlertCircle size={15} className="shrink-0" /> {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={saving}
                            className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition">
                            {saving ? <><Loader2 size={15} className="animate-spin" /> جارٍ الحفظ...</> : <><CheckCircle size={15} /> حفظ التغييرات</>}
                        </button>
                        <button type="button" onClick={onClose}
                            className="px-5 border border-slate-200 text-slate-600 font-semibold rounded-xl text-sm hover:bg-slate-50 transition">
                            إلغاء
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Staff Tab ─────────────────────────────────────────────────────────────────

function StaffTab({ currentUserId, onAddClick, showToast }) {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        getAllStaff().then(({ data }) => { setStaff(data ?? []); setLoading(false); });
    }, []);

    const handleRoleChange = async (id, newRole) => {
        setSaving(true);
        const { error } = await updateUserRole(id, newRole);
        setSaving(false);
        setEditingId(null);
        if (error) showToast('error', 'فشل تحديث الدور.');
        else {
            setStaff(prev => prev.map(s => s.id === id ? { ...s, role: newRole } : s));
            showToast('success', 'تم تحديث الدور بنجاح.');
        }
    };

    const handleDelete = async (id) => {
        setDeleting(true);
        const { error } = await deleteUser(id);
        setDeleting(false);
        setConfirmDeleteId(null);
        if (error) showToast('error', 'فشل حذف المستخدم: ' + error.message);
        else {
            setStaff(prev => prev.filter(s => s.id !== id));
            showToast('success', 'تم حذف المستخدم بنجاح.');
        }
    };

    const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

    if (loading) return (
        <div className="flex items-center justify-center py-24 gap-3 text-teal-600">
            <Loader2 className="animate-spin" size={22} />
            <span className="text-sm font-medium">جارٍ تحميل المستخدمين...</span>
        </div>
    );
    if (staff.length === 0) return <EmptyState icon={Users} message="لا يوجد موظفون مضافون بعد." />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
                <thead className="bg-slate-50 text-xs text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                        <th className="text-right px-6 py-3">الموظف</th>
                        <th className="text-right px-4 py-3">البريد الإلكتروني</th>
                        <th className="text-center px-4 py-3">الدور</th>
                        <th className="text-center px-4 py-3">تاريخ الإضافة</th>
                        <th className="text-center px-4 py-3">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {staff.map(s => {
                        const isSelf = s.id === currentUserId;
                        return (
                            <tr key={s.id} className={`hover:bg-slate-50/50 transition ${isSelf ? 'bg-teal-50/30' : ''}`}>
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={s.full_name} />
                                        <div>
                                            <p className="font-semibold text-slate-700">{s.full_name || '—'}</p>
                                            {isSelf && (
                                                <span className="text-xs text-teal-600 font-semibold flex items-center gap-1">
                                                    <Shield size={11} /> أنت
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{s.email || '—'}</td>
                                <td className="px-4 py-3.5 text-center"><RoleBadge role={s.role} /></td>
                                <td className="px-4 py-3.5 text-center text-slate-400 text-xs">{formatDate(s.created_at)}</td>
                                <td className="px-4 py-3.5 text-center">
                                    {isSelf ? (
                                        <span className="text-xs text-slate-300 italic">لا يمكن تعديل حسابك</span>
                                    ) : confirmDeleteId === s.id ? (
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            <span className="text-xs text-red-600 font-bold">هل أنت متأكد؟</span>
                                            <button onClick={() => handleDelete(s.id)} disabled={deleting}
                                                className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                                {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
                                                تأكيد الحذف
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(null)}
                                                className="text-xs border border-slate-200 text-slate-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">إلغاء</button>
                                        </div>
                                    ) : editingId === s.id ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <select defaultValue={s.role} disabled={saving}
                                                onChange={e => handleRoleChange(s.id, e.target.value)}
                                                className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white">
                                                {STAFF_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                            </select>
                                            <button onClick={() => setEditingId(null)} className="text-slate-400 hover:text-slate-600">
                                                <X size={15} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setEditingId(s.id)}
                                                className="text-xs text-teal-600 hover:text-teal-800 font-semibold border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition">
                                                تعديل الدور
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(s.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                                                حذف
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

// ── Patients Tab ──────────────────────────────────────────────────────────────

const GENDER_LABEL = { male: 'ذكر', female: 'أنثى' };

function PatientsTab({ showToast }) {
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editTarget, setEditTarget] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        getAllPatients().then(({ data }) => { setPatients(data ?? []); setLoading(false); });
    }, []);

    const handleSave = (updated) => {
        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
        setEditTarget(null);
        showToast('success', 'تم تحديث بيانات المريض بنجاح.');
    };

    const handleDelete = async (id) => {
        setDeleting(true);
        const { error } = await deleteUser(id);
        setDeleting(false);
        setConfirmDeleteId(null);
        if (error) showToast('error', 'فشل حذف المستخدم: ' + error.message);
        else {
            setPatients(prev => prev.filter(p => p.id !== id));
            showToast('success', 'تم حذف بيانات المريض بنجاح.');
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    if (loading) return (
        <div className="flex items-center justify-center py-24 gap-3 text-teal-600">
            <Loader2 className="animate-spin" size={22} />
            <span className="text-sm font-medium">جارٍ تحميل بيانات المرضى...</span>
        </div>
    );
    if (patients.length === 0) return <EmptyState icon={UserCheck} message="لا يوجد مرضى مسجّلون بعد." />;

    return (
        <>
            <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[800px]">
                    <thead className="bg-slate-50 text-xs text-slate-500 font-bold border-b border-slate-100">
                        <tr>
                            <th className="text-right px-6 py-3">المريض</th>
                            <th className="text-right px-4 py-3">البريد الإلكتروني</th>
                            <th className="text-center px-4 py-3">الهاتف</th>
                            <th className="text-center px-4 py-3">الجنس</th>
                            <th className="text-center px-4 py-3">تاريخ الميلاد</th>
                            <th className="text-center px-4 py-3">تاريخ التسجيل</th>
                            <th className="text-center px-4 py-3">إجراءات</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {patients.map(p => (
                            <tr key={p.id} className="hover:bg-slate-50/50 transition">
                                <td className="px-6 py-3.5">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={p.full_name} size="sm" />
                                        <p className="font-semibold text-slate-700">{p.full_name || '—'}</p>
                                    </div>
                                </td>
                                <td className="px-4 py-3.5 text-slate-500 font-mono text-xs">{p.email || '—'}</td>
                                <td className="px-4 py-3.5 text-center text-slate-500 font-mono text-xs">{p.phone || '—'}</td>
                                <td className="px-4 py-3.5 text-center">
                                    {p.gender
                                        ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${p.gender === 'male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                            {GENDER_LABEL[p.gender] ?? p.gender}
                                        </span>
                                        : <span className="text-slate-300 text-xs">—</span>}
                                </td>
                                <td className="px-4 py-3.5 text-center text-slate-400 text-xs">{formatDate(p.date_of_birth)}</td>
                                <td className="px-4 py-3.5 text-center text-slate-400 text-xs">{formatDate(p.created_at)}</td>
                                <td className="px-4 py-3.5 text-center">
                                    {confirmDeleteId === p.id ? (
                                        <div className="flex items-center justify-center gap-2 flex-wrap">
                                            <span className="text-xs text-red-600 font-bold">هل أنت متأكد؟</span>
                                            <button onClick={() => handleDelete(p.id)} disabled={deleting}
                                                className="text-xs bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition">
                                                {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
                                                تأكيد الحذف
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(null)}
                                                className="text-xs border border-slate-200 text-slate-600 font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">إلغاء</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setEditTarget(p)}
                                                className="text-xs text-teal-600 hover:text-teal-800 font-semibold border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-50 transition flex items-center gap-1.5">
                                                <Pencil size={12} /> تعديل
                                            </button>
                                            <button onClick={() => setConfirmDeleteId(p.id)}
                                                className="text-xs text-red-500 hover:text-red-700 font-semibold border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-50 transition">
                                                حذف
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editTarget && (
                <EditPatientModal
                    patient={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleSave}
                />
            )}
        </>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = [
    { id: 'staff', label: 'كادر العمل', icon: Users },
    { id: 'patients', label: 'المرضى', icon: UserCheck },
];

export default function UsersAdmin() {
    const { user } = useAuth();
    const [tab, setTab] = useState('staff');
    const [showModal, setShowModal] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((type, msg) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 3500);
    }, []);

    const handleInviteSuccess = () => {
        setShowModal(false);
        showToast('success', 'تم إرسال الدعوة! سيظهر المستخدم في القائمة فور قبول الدعوة.');
    };

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <Toast toast={toast} />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">إدارة المستخدمين</h1>
                    <p className="text-sm text-slate-400 mt-0.5">إدارة حسابات الكادر الوظيفي وبيانات المرضى</p>
                </div>
                {tab === 'staff' && (
                    <button onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm">
                        <UserPlus size={17} /> إضافة موظف جديد
                    </button>
                )}
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
                {TABS.map(t => {
                    const Icon = t.icon;
                    const active = tab === t.id;
                    return (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition ${active ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            <Icon size={16} /> {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Role legend (staff tab only) */}
            {tab === 'staff' && (
                <div className="flex flex-wrap gap-2">
                    {STAFF_ROLES.map(r => (
                        <span key={r.value} className={`text-xs font-bold px-3 py-1 rounded-full ${r.color}`}>{r.label}</span>
                    ))}
                </div>
            )}

            {/* Table card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {tab === 'staff' && <StaffTab currentUserId={user?.id} onAddClick={() => setShowModal(true)} showToast={showToast} />}
                {tab === 'patients' && <PatientsTab showToast={showToast} />}
            </div>

            {showModal && <AddStaffModal onClose={() => setShowModal(false)} onSuccess={handleInviteSuccess} />}
        </div>
    );
}
