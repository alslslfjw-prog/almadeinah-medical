/**
 * Training.jsx — Public Course Board
 *
 * Displays all published training courses in a responsive card grid.
 * Features:
 *   - Hero section with gradient
 *   - Filter chips: All | Open | Closing Soon | Closed
 *   - Animated course cards with deadline countdown
 *   - Loading skeleton and empty states
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Users, Calendar, GraduationCap, ChevronLeft, Search, BookOpen } from 'lucide-react';
import { getPublishedCourses } from '../api/training';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDeadlineInfo(deadline) {
    if (!deadline) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dl = new Date(deadline);
    const diffMs = dl - today;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'انتهى التسجيل', color: 'bg-slate-100 text-slate-500', urgent: false, closed: true };
    if (diffDays === 0) return { label: 'آخر يوم!', color: 'bg-red-100 text-red-600', urgent: true, closed: false };
    if (diffDays <= 7) return { label: `${diffDays} أيام متبقية`, color: 'bg-orange-100 text-orange-600', urgent: true, closed: false };
    return { label: `${diffDays} يوم متبقٍ`, color: 'bg-teal-50 text-teal-700', urgent: false, closed: false };
}

function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-pulse">
            <div className="h-52 bg-slate-200" />
            <div className="p-5 space-y-3">
                <div className="h-5 bg-slate-200 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
                <div className="h-10 bg-slate-100 rounded-xl mt-4" />
            </div>
        </div>
    );
}

const FILTERS = [
    { key: 'all', label: 'الكل' },
    { key: 'open', label: 'مفتوح التسجيل' },
    { key: 'closing', label: 'يُغلق قريباً' },
    { key: 'closed', label: 'مغلق' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Training() {
    const navigate = useNavigate();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        getPublishedCourses().then(({ data }) => {
            setCourses(data ?? []);
            setLoading(false);
        });
    }, []);

    const filtered = useMemo(() => {
        let result = courses;
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(c =>
                c.title?.toLowerCase().includes(q) ||
                c.description?.toLowerCase().includes(q) ||
                c.location?.toLowerCase().includes(q)
            );
        }
        if (activeFilter !== 'all') {
            result = result.filter(c => {
                const info = getDeadlineInfo(c.deadline);
                if (activeFilter === 'closed') return info?.closed || c.status === 'closed';
                if (activeFilter === 'closing') return info?.urgent && !info?.closed;
                if (activeFilter === 'open') return !info?.closed && !info?.urgent;
                return true;
            });
        }
        return result;
    }, [courses, search, activeFilter]);

    return (
        <div className="font-sans text-gray-800 bg-gray-50 min-h-screen" dir="rtl">

            {/* ── Hero ──────────────────────────────────────────────────────────── */}
            <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-teal-600 text-white py-20 overflow-hidden">
                {/* Decorative blobs */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-72 h-72 bg-teal-400/20 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

                <div className="container mx-auto px-6 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 text-sm font-medium mb-6">
                        <GraduationCap size={16} className="text-teal-300" />
                        <span>برامج التدريب والتأهيل المهني</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
                        طوّر مهاراتك
                        <span className="text-teal-300"> الطبية</span>
                    </h1>
                    <p className="text-blue-100 text-lg mb-10 max-w-xl mx-auto">
                        برامج تدريبية متخصصة في مجالات الرعاية الصحية، مُعتمدة ومُقدَّمة من نخبة متميزة من الخبراء
                    </p>

                    {/* Search bar */}
                    <div className="max-w-lg mx-auto relative">
                        <Search size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="ابحث عن برنامج تدريبي..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="w-full bg-white text-slate-800 rounded-full py-4 px-6 pr-14 shadow-xl focus:outline-none focus:ring-4 focus:ring-teal-400/40 font-medium"
                        />
                    </div>
                </div>
            </section>

            {/* ── Stats Strip ──────────────────────────────────────────────────── */}
            <section className="bg-white border-b border-slate-100">
                <div className="container mx-auto px-6 py-4 flex flex-wrap justify-center gap-8 text-center">
                    {[
                        { icon: GraduationCap, label: 'برنامج متاح', value: courses.length },
                        { icon: Users, label: 'متدرب مسجّل', value: '+٢٠٠' },
                        { icon: BookOpen, label: 'ساعة تدريبية', value: '+٥٠٠' },
                    ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                                <Icon size={17} className="text-teal-600" />
                            </div>
                            <div className="text-right">
                                <p className="font-extrabold text-slate-800 text-lg leading-none">{value}</p>
                                <p className="text-xs text-slate-400 font-medium">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Filter Chips ─────────────────────────────────────────────────── */}
            <section className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
                <div className="container mx-auto px-6 py-3 flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    {FILTERS.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setActiveFilter(f.key)}
                            className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition border ${
                                activeFilter === f.key
                                    ? 'bg-teal-600 text-white border-teal-600 shadow-md'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-teal-500 hover:text-teal-600'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <span className="mr-auto text-xs text-slate-400 font-medium shrink-0">
                        {filtered.length} برنامج
                    </span>
                </div>
            </section>

            {/* ── Course Grid ───────────────────────────────────────────────────── */}
            <section className="container mx-auto px-6 py-12">
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center">
                            <GraduationCap size={36} className="text-slate-300" />
                        </div>
                        <p className="font-bold text-slate-600 text-lg">لا توجد برامج متاحة حالياً</p>
                        <p className="text-sm text-slate-400">جرّب البحث بكلمات مختلفة أو تحقق لاحقاً</p>
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="text-teal-600 font-bold text-sm underline mt-1"
                            >
                                مسح البحث
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(course => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                onClick={() => navigate(`/training/${course.slug}`)}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

// ── Course Card ───────────────────────────────────────────────────────────────

function CourseCard({ course, onClick }) {
    const deadlineInfo = getDeadlineInfo(course.deadline);
    const isClosed = deadlineInfo?.closed || course.status === 'closed';
    const topics = course.topics ?? [];

    return (
        <div
            onClick={!isClosed ? onClick : undefined}
            className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex flex-col transition duration-300 group
                ${isClosed ? 'opacity-60 cursor-default' : 'hover:shadow-xl hover:-translate-y-1 cursor-pointer'}`}
        >
            {/* Cover image */}
            <div className="relative h-52 bg-gradient-to-br from-teal-100 to-blue-100 overflow-hidden">
                {course.cover_image ? (
                    <img
                        src={course.cover_image}
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <GraduationCap size={52} className="text-teal-300/60" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

                {/* Deadline chip */}
                {deadlineInfo && (
                    <span className={`absolute top-3 right-3 text-xs font-bold px-3 py-1 rounded-full ${deadlineInfo.color}`}>
                        {deadlineInfo.label}
                    </span>
                )}

                {/* Duration badge */}
                {course.duration && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full px-3 py-1 text-xs font-medium">
                        <Clock size={12} />
                        {course.duration}
                    </div>
                )}
            </div>

            {/* Body */}
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-extrabold text-slate-800 text-base mb-2 group-hover:text-teal-600 transition line-clamp-2">
                    {course.title}
                </h3>
                {course.description && (
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {course.description}
                    </p>
                )}

                {/* Meta chips */}
                <div className="flex flex-wrap gap-2 mb-4">
                    {course.location && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <MapPin size={12} className="text-teal-500" />
                            {course.location}
                        </span>
                    )}
                    {course.seats && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Users size={12} className="text-teal-500" />
                            {course.seats} مقعد
                        </span>
                    )}
                    {course.deadline && (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                            <Calendar size={12} className="text-teal-500" />
                            {new Date(course.deadline).toLocaleDateString('ar-YE', { day: 'numeric', month: 'short' })}
                        </span>
                    )}
                </div>

                {/* Topic tags */}
                {topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {topics.slice(0, 3).map((t, i) => (
                            <span key={i} className="text-xs bg-teal-50 text-teal-700 font-semibold px-2.5 py-1 rounded-full">
                                {t}
                            </span>
                        ))}
                        {topics.length > 3 && (
                            <span className="text-xs bg-slate-100 text-slate-500 font-semibold px-2.5 py-1 rounded-full">
                                +{topics.length - 3}
                            </span>
                        )}
                    </div>
                )}

                {/* CTA */}
                <div className="mt-auto">
                    {isClosed ? (
                        <div className="w-full text-center py-2.5 rounded-xl bg-slate-100 text-slate-400 text-sm font-bold">
                            التسجيل مغلق
                        </div>
                    ) : (
                        <button className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white py-2.5 rounded-xl text-sm font-bold transition shadow-md shadow-teal-200/50">
                            اعرف أكثر وسجّل
                            <ChevronLeft size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
