/**
 * TrainingApplicationsAdmin.jsx — Admin Applications Viewer
 *
 * Route: /dashboard/admin/training/:id/applications
 *
 * Features:
 *   - Fetches course + all applications
 *   - Data table with applicant name, phone, email, date, status badge
 *   - Click row → side drawer showing full answers, file links, status editor
 *   - CSV export
 *   - WhatsApp notification status chip
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowRight, GraduationCap, Users, Loader2, X, MessageCircle,
    CheckCircle, Clock, XCircle, AlertCircle, Download, Phone, Mail,
    Calendar, FileText, ChevronDown, Save
} from 'lucide-react';
import { getCourseById, getApplicationsForCourse, updateApplication, getSignedUrl } from '../../../api/training';
import { exportApplicationsToCSV } from '../../../utils/trainingExport';

// ── Constants ─────────────────────────────────────────────────────────────────

const APP_STATUS = {
    pending:    { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700',  icon: Clock },
    reviewed:   { label: 'تمت المراجعة', color: 'bg-blue-100 text-blue-700',    icon: AlertCircle },
    accepted:   { label: 'مقبول',         color: 'bg-green-100 text-green-700',  icon: CheckCircle },
    rejected:   { label: 'مرفوض',         color: 'bg-red-100 text-red-700',      icon: XCircle },
    waitlisted: { label: 'قائمة الانتظار', color: 'bg-purple-100 text-purple-700', icon: Clock },
};

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-YE', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainingApplicationsAdmin() {
    const { id } = useParams();
    const [course, setCourse] = useState(null);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [courseRes, appsRes] = await Promise.all([
            getCourseById(id),
            getApplicationsForCourse(id),
        ]);
        setCourse(courseRes.data);
        setApplications(appsRes.data ?? []);
        setLoading(false);
    }, [id]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const updateAppInState = (updated) => {
        setApplications(prev => prev.map(a => a.id === updated.id ? updated : a));
        setSelectedApp(updated);
    };

    const filtered = statusFilter === 'all'
        ? applications
        : applications.filter(a => a.status === statusFilter);

    const handleExport = () => {
        if (!course || applications.length === 0) return;
        exportApplicationsToCSV(applications, course.form_schema ?? [], course.title);
    };

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <Link
                        to="/dashboard/admin/training"
                        className="p-2 rounded-xl text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                    >
                        <ArrowRight size={18} />
                    </Link>
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                        <Users size={20} className="text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">الطلبات الواردة</h1>
                        <p className="text-sm text-slate-400 truncate max-w-xs">
                            {course?.title ?? '—'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status filter */}
                    <div className="relative">
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl py-2 px-4 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                        >
                            <option value="all">جميع الطلبات ({applications.length})</option>
                            {Object.entries(APP_STATUS).map(([k, v]) => (
                                <option key={k} value={k}>
                                    {v.label} ({applications.filter(a => a.status === k).length})
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>

                    {/* CSV Export */}
                    <button
                        onClick={handleExport}
                        disabled={applications.length === 0}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-teal-400 text-slate-600 hover:text-teal-700 font-bold px-4 py-2 rounded-xl transition text-sm disabled:opacity-50"
                    >
                        <Download size={16} />
                        تصدير CSV
                    </button>
                </div>
            </div>

            {/* ── Stats row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { key: 'all', label: 'الكل', count: applications.length, color: 'bg-slate-100 text-slate-700' },
                    ...Object.entries(APP_STATUS).map(([k, v]) => ({
                        key: k, label: v.label,
                        count: applications.filter(a => a.status === k).length,
                        color: v.color,
                    }))
                ].map(item => (
                    <button
                        key={item.key}
                        onClick={() => setStatusFilter(item.key)}
                        className={`rounded-xl p-3 text-center border-2 transition ${
                            statusFilter === item.key ? 'border-teal-500 shadow-md' : 'border-transparent'
                        } ${item.color}`}
                    >
                        <p className="font-extrabold text-xl">{item.count}</p>
                        <p className="text-xs font-semibold">{item.label}</p>
                    </button>
                ))}
            </div>

            {/* ── Table ─────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <Loader2 size={22} className="animate-spin text-teal-500" />
                        <span className="text-sm font-medium">جارٍ تحميل الطلبات...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                        <Users size={36} className="text-slate-200" />
                        <p className="font-semibold">لا توجد طلبات</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5">المتقدم</th>
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5 hidden md:table-cell">الجوال</th>
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5 hidden lg:table-cell">تاريخ التقديم</th>
                                    <th className="text-center font-bold text-slate-500 px-5 py-3.5">واتساب</th>
                                    <th className="text-center font-bold text-slate-500 px-5 py-3.5">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(app => {
                                    const sc = APP_STATUS[app.status] ?? APP_STATUS.pending;
                                    const Ico = sc.icon;
                                    return (
                                        <tr
                                            key={app.id}
                                            onClick={() => setSelectedApp(app)}
                                            className="hover:bg-teal-50/30 transition cursor-pointer"
                                        >
                                            <td className="px-5 py-4">
                                                <p className="font-bold text-slate-800">{app.applicant_name}</p>
                                                {app.applicant_email && (
                                                    <p className="text-xs text-slate-400 mt-0.5">{app.applicant_email}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <span className="flex items-center gap-1.5 text-xs text-slate-600 font-medium" dir="ltr">
                                                    <Phone size={12} className="text-teal-500" />
                                                    {app.applicant_phone}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 hidden lg:table-cell">
                                                <span className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                    <Calendar size={12} />
                                                    {fmtDate(app.submitted_at)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                                                    app.wa_notification_sent
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    <MessageCircle size={11} />
                                                    {app.wa_notification_sent ? 'أُرسل' : 'لم يُرسل'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${sc.color}`}>
                                                    <Ico size={11} />
                                                    {sc.label}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Application Detail Drawer ──────────────────────────────────── */}
            {selectedApp && (
                <ApplicationDrawer
                    application={selectedApp}
                    course={course}
                    onClose={() => setSelectedApp(null)}
                    onUpdate={updateAppInState}
                />
            )}
        </div>
    );
}

// ── Application Detail Drawer ─────────────────────────────────────────────────

function ApplicationDrawer({ application, course, onClose, onUpdate }) {
    const [status, setStatus] = useState(application.status);
    const [notes, setNotes] = useState(application.admin_notes ?? '');
    const [saving, setSaving] = useState(false);
    const [fileUrls, setFileUrls] = useState({});

    const schema = course?.form_schema ?? [];

    // Load signed URLs for file attachments
    useEffect(() => {
        const attachments = application.file_attachments ?? [];
        if (attachments.length === 0) return;

        Promise.all(attachments.map(async (att) => {
            const path = att.url?.replace(/^.*training-uploads\//, '') ?? '';
            const { url } = await getSignedUrl(path, 3600);
            return [att.fieldId, url];
        })).then(pairs => {
            setFileUrls(Object.fromEntries(pairs));
        });
    }, [application.file_attachments]);

    const handleSave = async () => {
        setSaving(true);
        const { data } = await updateApplication(application.id, { status, admin_notes: notes });
        setSaving(false);
        if (data) onUpdate(data);
    };

    const sc = APP_STATUS[status] ?? APP_STATUS.pending;

    return (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer */}
            <div className="absolute top-0 left-0 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                    <div>
                        <h2 className="font-extrabold text-slate-800">{application.applicant_name}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">{fmtDate(application.submitted_at)}</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Contact info */}
                    <div className="bg-teal-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
                            <Phone size={14} className="text-teal-500" />
                            <span dir="ltr">{application.applicant_phone}</span>
                        </div>
                        {application.applicant_email && (
                            <div className="flex items-center gap-2 text-sm font-medium text-teal-800">
                                <Mail size={14} className="text-teal-500" />
                                <span dir="ltr">{application.applicant_email}</span>
                            </div>
                        )}
                    </div>

                    {/* WhatsApp status */}
                    <div className={`flex items-center gap-2 text-sm font-semibold px-3 py-2.5 rounded-xl ${
                        application.wa_notification_sent
                            ? 'bg-green-50 text-green-700'
                            : 'bg-slate-50 text-slate-500'
                    }`}>
                        <MessageCircle size={15} />
                        {application.wa_notification_sent
                            ? `تم إرسال رسالة واتساب في ${fmtDate(application.wa_notification_sent_at)}`
                            : 'لم تُرسل رسالة واتساب'}
                        {application.wa_notification_error && (
                            <span className="text-red-500 text-xs">({application.wa_notification_error})</span>
                        )}
                    </div>

                    {/* Dynamic answers */}
                    {schema.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">إجابات النموذج</p>
                            <div className="space-y-4">
                                {[...schema].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(field => {
                                    const answer = application.answers?.[field.id];
                                    if (field.type === 'file') {
                                        const att = (application.file_attachments ?? []).find(a => a.fieldId === field.id);
                                        return (
                                            <div key={field.id}>
                                                <p className="text-xs font-bold text-slate-500 mb-1">{field.label}</p>
                                                {att ? (
                                                    <a
                                                        href={fileUrls[field.id] ?? '#'}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 text-sm font-medium text-teal-600 hover:text-teal-800 bg-teal-50 px-3 py-2 rounded-lg transition"
                                                    >
                                                        <FileText size={14} />
                                                        {att.name ?? 'فتح الملف'}
                                                    </a>
                                                ) : (
                                                    <p className="text-xs text-slate-400 italic">لم يُرفق ملف</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={field.id}>
                                            <p className="text-xs font-bold text-slate-500 mb-1">{field.label}</p>
                                            <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2 leading-relaxed">
                                                {answer?.toString() || <span className="text-slate-400 italic">لا إجابة</span>}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Status + Notes editor */}
                    <div className="space-y-4 border-t border-slate-100 pt-4">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">إجراءات الإدارة</p>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">حالة الطلب</label>
                            <div className="relative">
                                <select
                                    value={status}
                                    onChange={e => setStatus(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 appearance-none"
                                >
                                    {Object.entries(APP_STATUS).map(([k, v]) => (
                                        <option key={k} value={k}>{v.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-1.5">ملاحظات داخلية</label>
                            <textarea
                                rows={3}
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="ملاحظات خاصة بالإدارة — لن يراها المتقدم..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 transition resize-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center gap-3">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-200 transition"
                    >
                        إغلاق
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="mr-auto flex items-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm"
                    >
                        {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        {saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}
                    </button>
                </div>
            </div>
        </div>
    );
}
