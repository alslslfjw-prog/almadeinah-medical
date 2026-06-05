/**
 * TrainingAdmin.jsx — Admin Training Module Index
 *
 * Route: /dashboard/admin/training
 *
 * Features:
 *   - Table of all courses (all statuses)
 *   - Status badge, deadline, applicants count
 *   - Actions: Edit, View Applications, Publish/Close, Delete
 *   - "إنشاء دورة جديدة" CTA
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Plus, Pencil, Trash2, Users, GraduationCap, Loader2,
    Calendar, CheckCircle, XCircle, Clock, Eye, ExternalLink
} from 'lucide-react';
import { getAllCourses, deleteCourse, updateCourse, getApplicationsForCourse } from '../../../api/training';

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
    draft:     { label: 'مسودة',   color: 'bg-amber-100 text-amber-700',  icon: Clock },
    published: { label: 'منشور',   color: 'bg-green-100 text-green-700',  icon: CheckCircle },
    closed:    { label: 'مغلق',    color: 'bg-slate-100 text-slate-600',  icon: XCircle },
};

function fmtDate(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ar-YE', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function TrainingAdmin() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [appCounts, setAppCounts] = useState({});  // { courseId: count }
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [togglingId, setTogglingId] = useState(null);

    const fetchCourses = useCallback(async () => {
        setLoading(true);
        const { data } = await getAllCourses();
        const list = data ?? [];
        setCourses(list);
        setLoading(false);

        // Fetch applicant counts for each course
        const counts = {};
        await Promise.all(list.map(async (c) => {
            const { data: apps } = await getApplicationsForCourse(c.id);
            counts[c.id] = apps?.length ?? 0;
        }));
        setAppCounts(counts);
    }, []);

    useEffect(() => { fetchCourses(); }, [fetchCourses]);

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        await deleteCourse(deleteTarget.id);
        setDeleting(false);
        setDeleteTarget(null);
        fetchCourses();
    };

    const handleToggleStatus = async (course) => {
        const next = course.status === 'published' ? 'closed' : 'published';
        setTogglingId(course.id);
        await updateCourse(course.id, { status: next });
        setTogglingId(null);
        setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: next } : c));
    };

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Page Header ───────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                        <GraduationCap size={20} className="text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-extrabold text-slate-800">التدريب والتأهيل</h1>
                        <p className="text-sm text-slate-400">{courses.length} برنامج محفوظ</p>
                    </div>
                </div>
                <Link
                    to="/dashboard/admin/training/new"
                    className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-md shadow-teal-200"
                >
                    <Plus size={18} />
                    إنشاء دورة جديدة
                </Link>
            </div>

            {/* ── Table ─────────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                        <Loader2 size={22} className="animate-spin text-teal-500" />
                        <span className="text-sm font-medium">جارٍ تحميل البرامج...</span>
                    </div>
                ) : courses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                        <GraduationCap size={40} className="text-slate-200" />
                        <p className="font-semibold">لا توجد برامج بعد</p>
                        <Link to="/dashboard/admin/training/new" className="text-teal-500 text-sm font-bold underline">
                            أنشئ أول برنامج تدريبي
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100">
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5">البرنامج</th>
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5 hidden md:table-cell">الحالة</th>
                                    <th className="text-right font-bold text-slate-500 px-5 py-3.5 hidden lg:table-cell">آخر موعد</th>
                                    <th className="text-center font-bold text-slate-500 px-5 py-3.5">المتقدمون</th>
                                    <th className="text-center font-bold text-slate-500 px-5 py-3.5">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {courses.map(course => {
                                    const sc = STATUS_CONFIG[course.status] ?? STATUS_CONFIG.draft;
                                    const Ico = sc.icon;
                                    return (
                                        <tr key={course.id} className="hover:bg-slate-50/70 transition">
                                            {/* Name + duration */}
                                            <td className="px-5 py-4 max-w-xs">
                                                <div>
                                                    <p className="font-bold text-slate-800 truncate">{course.title}</p>
                                                    {course.duration && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{course.duration}</p>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-5 py-4 hidden md:table-cell">
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${sc.color}`}>
                                                    <Ico size={12} />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            {/* Deadline */}
                                            <td className="px-5 py-4 hidden lg:table-cell">
                                                <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                                    <Calendar size={13} />
                                                    {fmtDate(course.deadline)}
                                                </span>
                                            </td>
                                            {/* Applicants count */}
                                            <td className="px-5 py-4 text-center">
                                                <Link
                                                    to={`/dashboard/admin/training/${course.id}/applications`}
                                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full transition"
                                                >
                                                    <Users size={13} />
                                                    {appCounts[course.id] ?? '—'}
                                                </Link>
                                            </td>
                                            {/* Actions */}
                                            <td className="px-5 py-4">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* Preview public page */}
                                                    <a
                                                        href={`/training/${course.slug}?preview=true`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                                        title="معاينة"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </a>
                                                    {/* Edit */}
                                                    <button
                                                        onClick={() => navigate(`/dashboard/admin/training/${course.id}/edit`)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                                                        title="تعديل"
                                                    >
                                                        <Pencil size={15} />
                                                    </button>
                                                    {/* Toggle publish */}
                                                    <button
                                                        onClick={() => handleToggleStatus(course)}
                                                        disabled={togglingId === course.id}
                                                        className={`p-2 rounded-lg transition text-slate-400 ${
                                                            course.status === 'published'
                                                                ? 'hover:text-orange-600 hover:bg-orange-50'
                                                                : 'hover:text-green-600 hover:bg-green-50'
                                                        }`}
                                                        title={course.status === 'published' ? 'إغلاق التسجيل' : 'نشر البرنامج'}
                                                    >
                                                        {togglingId === course.id
                                                            ? <Loader2 size={15} className="animate-spin" />
                                                            : course.status === 'published'
                                                                ? <XCircle size={15} />
                                                                : <CheckCircle size={15} />}
                                                    </button>
                                                    {/* Delete */}
                                                    <button
                                                        onClick={() => setDeleteTarget(course)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                                        title="حذف"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Delete Confirm Dialog ─────────────────────────────────────── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center space-y-4">
                        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <Trash2 size={24} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-slate-800 text-lg">حذف البرنامج؟</h3>
                            <p className="text-slate-500 text-sm mt-1">
                                هل أنت متأكد من حذف "<span className="font-bold text-slate-700">{deleteTarget.title}</span>"؟
                                <br />سيتم حذف جميع الطلبات المرتبطة به.
                            </p>
                        </div>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 transition"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-500 hover:bg-red-600 text-white transition flex items-center gap-2"
                            >
                                {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
