import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Phone, User, Menu, X, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Live auth state from Zustand via useAuth hook
  const { user, role, isAuthenticated, isLoading, signOut } = useAuth();

  const logoUrl = "https://jwmcjqsdsibflzsaqeek.supabase.co/storage/v1/object/public/Brand/3d77322e-f0f1-4fe5-b801-1f8709f3148f.png";
  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { name: 'الرئيسية', path: '/' },
    { name: 'عن المركز', path: '/about' },
    { name: 'الأطباء', path: '/doctors' },
    { name: 'الأشعة التشخيصية', path: '/scans' },
    { name: 'العيادات', path: '/clinics' },
    { name: 'الفحوصات', path: '/examinations' },
    { name: 'المدونة', path: '/blog' },
  ];

  const dashboardPath = role === 'admin' ? '/dashboard/admin' : '/dashboard/patient';
  const roleBadgeColor = role === 'admin'
    ? 'bg-orange-100 text-orange-700'
    : 'bg-teal-100 text-teal-700';
  const roleLabel = role === 'admin' ? 'مدير' : 'مريض';

  const handleSignOut = async () => {
    setShowUserMenu(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50 font-sans" dir="rtl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-gray-600 focus:outline-none p-2"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-90 transition">
            <img src={logoUrl} alt="مركز المدينة الطبي" className="h-12 md:h-16 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex gap-6 font-bold text-gray-600 text-sm">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`transition ${isActive(link.path) ? 'text-teal-600' : 'hover:text-teal-600'}`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* ── Action Buttons (Desktop) ────────────────────────────────── */}
          <div className="hidden md:flex gap-4 items-center">
            <a href="tel:777552666" className="hidden xl:flex items-center gap-2 text-blue-900 font-bold hover:text-teal-600 transition" dir="ltr">
              <Phone size={18} className="text-teal-500" />
              <span>777 552 666</span>
            </a>

            {/* ── NOT authenticated / still resolving ─── */}
            {(isLoading || !isAuthenticated) && (
              <Link
                to="/login"
                className="bg-teal-500 text-white px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-teal-600 transition shadow-lg shadow-teal-500/20 font-bold text-sm"
              >
                <User size={18} />
                <span>تسجيل الدخول</span>
              </Link>
            )}

            {/* ── Authenticated: user avatar / dropdown ─── */}
            {!isLoading && isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-gray-50 border border-gray-200 hover:border-teal-400 px-4 py-2 rounded-full transition"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold">
                    {user?.email?.[0]?.toUpperCase() ?? 'U'}
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${roleBadgeColor}`}>
                    {roleLabel}
                  </span>
                  <ChevronDown size={14} className={`text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <div className="absolute left-0 top-12 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn">
                    <p className="px-4 pt-1 pb-3 text-xs text-gray-400 border-b border-gray-100 truncate">{user?.email}</p>
                    <Link
                      to={dashboardPath}
                      onClick={() => setShowUserMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-teal-50 hover:text-teal-700 transition"
                    >
                      <LayoutDashboard size={16} />
                      لوحة التحكم
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 transition"
                    >
                      <LogOut size={16} />
                      تسجيل الخروج
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile: show user icon or login icon */}
          <div className="md:hidden">
            {isAuthenticated ? (
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="text-teal-600 p-2 w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-sm"
              >
                {user?.email?.[0]?.toUpperCase() ?? 'U'}
              </button>
            ) : (
              <Link to="/login" className="text-teal-600 p-2">
                <User size={24} />
              </Link>
            )}
          </div>

        </div>

        {/* Mobile Menu Dropdown */}
        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-100 pt-4 animate-fadeIn">
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`block px-4 py-2 rounded-lg text-sm font-bold ${isActive(link.path) ? 'bg-teal-50 text-teal-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pt-3 border-t border-gray-100 mt-2 space-y-2">
                <a href="tel:777552666" className="flex items-center justify-center gap-2 text-blue-900 font-bold py-2 mb-2" dir="ltr">
                  <Phone size={18} /> 777 552 666
                </a>

                {isAuthenticated ? (
                  <>
                    <p className="text-xs text-center text-gray-400 truncate">{user?.email}</p>
                    <Link
                      to={dashboardPath}
                      onClick={() => setIsOpen(false)}
                      className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white py-3 rounded-xl font-bold"
                    >
                      <LayoutDashboard size={16} /> لوحة التحكم
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-3 rounded-xl font-bold"
                    >
                      <LogOut size={16} /> تسجيل الخروج
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500 text-white py-3 rounded-xl font-bold"
                  >
                    <User size={16} /> تسجيل الدخول
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}