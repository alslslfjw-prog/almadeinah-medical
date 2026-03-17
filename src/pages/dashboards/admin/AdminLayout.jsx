/**
 * AdminLayout — Main shell for the Admin Dashboard.
 * Provides: responsive collapsible sidebar, top header with admin info,
 * and a <Outlet /> for nested route content.
 *
 * Navigation tabs defined by Dashboards_Blueprint.md:
 *   Overview, Appointments, Finance, CMS (Blog/Clinics/Labs/Packages),
 *   Doctors, Users, Payment Gateways
 */

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, CalendarDays, BadgeDollarSign,
    BookOpen, Users, Stethoscope, CreditCard,
    ChevronRight, ChevronLeft, Menu, X, LogOut,
    Newspaper, FlaskConical, Package, Building2, Star,
    ShieldCheck, Settings
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import useAuthStore from '../../../store/authStore';

// ── Sidebar navigation items ──────────────────────────────────────────────────
const NAV_ITEMS = [
    {
        label: 'نظرة عامة',
        icon: LayoutDashboard,
        to: '/dashboard/admin',
        end: true,
    },
    {
        label: 'المواعيد',
        icon: CalendarDays,
        to: '/dashboard/admin/appointments',
    },
    {
        label: 'المالية',
        icon: BadgeDollarSign,
        to: '/dashboard/admin/finance',
    },
    {
        label: 'إدارة المحتوى',
        icon: BookOpen,
        separator: true,
        children: [
            { label: 'المقالات', icon: Newspaper, to: '/dashboard/admin/cms/blog' },
            { label: 'العيادات', icon: Building2, to: '/dashboard/admin/cms/clinics' },
            { label: 'الفحوصات', icon: FlaskConical, to: '/dashboard/admin/cms/labs' },
            { label: 'الباقات', icon: Package, to: '/dashboard/admin/cms/packages' },
        ],
    },
    {
        label: 'الأطباء',
        icon: Stethoscope,
        to: '/dashboard/admin/doctors',
    },
    {
        label: 'المستخدمون',
        icon: Users,
        to: '/dashboard/admin/users',
    },
    {
        label: 'بوابات الدفع',
        icon: CreditCard,
        to: '/dashboard/admin/gateways',
    },
    {
        label: 'الإعدادات العامة',
        icon: Settings,
        to: '/dashboard/admin/settings',
    },
];

// ── NavLink helper ────────────────────────────────────────────────────────────
function SidebarLink({ to, icon: Icon, label, collapsed, end }) {
    return (
        <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 group
        ${isActive
                    ? 'bg-teal-500 text-white shadow-md shadow-teal-200'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                }`
            }
        >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
        </NavLink>
    );
}

export default function AdminLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const { signOut } = useAuth();
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    // ── Sidebar content (shared between mobile drawer and desktop sidebar)
    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Logo / Brand */}
            <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center shrink-0">
                    <ShieldCheck size={20} className="text-white" />
                </div>
                {!collapsed && (
                    <div>
                        <p className="text-sm font-extrabold text-slate-800 leading-tight">لوحة الإدارة</p>
                        <p className="text-xs text-slate-400">Almadeinah Medical</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {NAV_ITEMS.map((item) => {
                    if (item.children) {
                        return (
                            <div key={item.label}>
                                {!collapsed && (
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 pt-4 pb-1">
                                        {item.label}
                                    </p>
                                )}
                                {item.children.map((child) => (
                                    <SidebarLink key={child.to} {...child} collapsed={collapsed} />
                                ))}
                            </div>
                        );
                    }
                    return <SidebarLink key={item.to} {...item} collapsed={collapsed} />;
                })}
            </nav>

            {/* Footer — user info + logout */}
            <div className={`p-3 border-t border-slate-100 ${collapsed ? 'flex justify-center' : ''}`}>
                {!collapsed && (
                    <div className="flex items-center gap-3 px-3 py-2 mb-2 bg-slate-50 rounded-xl">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                            {user?.email?.[0]?.toUpperCase() ?? 'A'}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-700 truncate">{user?.email ?? 'Admin'}</p>
                            <p className="text-xs text-teal-600 font-semibold">مدير النظام</p>
                        </div>
                    </div>
                )}
                <button
                    onClick={handleSignOut}
                    className={`flex items-center gap-2 text-sm font-semibold text-red-500 hover:text-red-700 transition px-3 py-2 rounded-xl hover:bg-red-50 w-full ${collapsed ? 'justify-center' : ''}`}
                >
                    <LogOut size={16} />
                    {!collapsed && 'تسجيل الخروج'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 flex" dir="rtl">

            {/* ── Mobile overlay ───────────────────────────────────────────────────── */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* ── Mobile drawer ────────────────────────────────────────────────────── */}
            <aside className={`
        fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transition-transform duration-300 lg:hidden
        ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 transition"
                >
                    <X size={20} />
                </button>
                <SidebarContent />
            </aside>

            {/* ── Desktop sidebar ──────────────────────────────────────────────────── */}
            <aside className={`
        hidden lg:flex flex-col bg-white border-l border-slate-100 shadow-sm
        transition-all duration-300 shrink-0
        ${collapsed ? 'w-16' : 'w-64'}
      `}>
                <SidebarContent />
            </aside>

            {/* ── Main area ─────────────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Top header */}
                <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between px-4 md:px-6 h-14">
                        {/* Left: hamburger (mobile) + collapse toggle (desktop) */}
                        <div className="flex items-center gap-2">
                            {/* Mobile hamburger */}
                            <button
                                onClick={() => setMobileOpen(true)}
                                className="lg:hidden text-slate-500 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                            >
                                <Menu size={20} />
                            </button>
                            {/* Desktop collapse toggle */}
                            <button
                                onClick={() => setCollapsed(!collapsed)}
                                className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition"
                            >
                                {collapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                            </button>
                        </div>

                        {/* Center: breadcrumb hint */}
                        <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <ShieldCheck size={16} className="text-teal-500" />
                            <span>لوحة تحكم الإدارة</span>
                        </div>

                        {/* Right: admin badge */}
                        <div className="flex items-center gap-2">
                            <span className="hidden sm:inline-block text-xs font-bold text-white bg-teal-500 px-3 py-1 rounded-full">
                                مدير
                            </span>
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm">
                                {user?.email?.[0]?.toUpperCase() ?? 'A'}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content via Outlet */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
