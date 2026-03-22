/**
 * PatientLayout — Main shell for the Patient Dashboard.
 * Mobile-first sticky header with tab navigation.
 * Completely separate from the Admin layout — no sidebar.
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, User, LogOut, Menu, X, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import useAuthStore from '../../../store/authStore';

const TABS = [
    { to: '/dashboard/patient',              label: 'الرئيسية',      icon: LayoutDashboard, end: true },
    { to: '/dashboard/patient/appointments', label: 'مواعيدي',       icon: CalendarDays },
    { to: '/dashboard/patient/profile',      label: 'ملفي الشخصي',   icon: User },
];

export default function PatientLayout() {
    const { signOut } = useAuth();
    const { user } = useAuthStore();
    const navigate   = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const displayName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? 'مريض';

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">

            {/* ── Sticky Top Bar ─────────────────────────────────────────── */}
            <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4">
                    <div className="flex items-center justify-between h-14">

                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
                                <ShieldCheck size={16} className="text-white" />
                            </div>
                            <span className="text-sm font-extrabold text-slate-800 hidden sm:block">مركز المدينة الطبي</span>
                        </div>

                        {/* Desktop tabs */}
                        <nav className="hidden md:flex items-center gap-1">
                            {TABS.map(t => (
                                <NavLink key={t.to} to={t.to} end={t.end}
                                    className={({ isActive }) =>
                                        `flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`
                                    }>
                                    <t.icon size={15} /> {t.label}
                                </NavLink>
                            ))}
                        </nav>

                        {/* Right: name + logout */}
                        <div className="flex items-center gap-3">
                            <span className="hidden sm:block text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                {displayName}
                            </span>
                            <button onClick={handleSignOut}
                                className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-500 transition">
                                <LogOut size={14} /> خروج
                            </button>
                            {/* Mobile hamburger */}
                            <button onClick={() => setMenuOpen(o => !o)} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition">
                                {menuOpen ? <X size={20} /> : <Menu size={20} />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile dropdown menu */}
                    {menuOpen && (
                        <div className="md:hidden border-t border-slate-100 py-2 space-y-0.5">
                            {TABS.map(t => (
                                <NavLink key={t.to} to={t.to} end={t.end}
                                    onClick={() => setMenuOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`
                                    }>
                                    <t.icon size={16} /> {t.label}
                                </NavLink>
                            ))}
                            <button onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 rounded-lg transition">
                                <LogOut size={16} /> تسجيل الخروج
                            </button>
                        </div>
                    )}
                </div>

                {/* Mobile bottom tab bar */}
                <nav className="md:hidden flex border-t border-slate-100">
                    {TABS.map(t => (
                        <NavLink key={t.to} to={t.to} end={t.end}
                            className={({ isActive }) =>
                                `flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold transition ${isActive ? 'text-teal-600' : 'text-slate-400'}`
                            }>
                            <t.icon size={18} />
                            {t.label}
                        </NavLink>
                    ))}
                </nav>
            </header>

            {/* ── Page content ───────────────────────────────────────────── */}
            <main className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8">
                <Outlet />
            </main>
        </div>
    );
}
