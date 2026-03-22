import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { isStaff } from '../lib/roles';

/**
 * ProtectedRoute — Wraps routes that require authentication (and optionally a specific role).
 *
 * @param {object}  props
 * @param {React.ReactNode} props.children       — Content to render if access is granted
 * @param {'admin' | 'patient' | string[]}  [props.allowedRoles]
 *   If omitted → any authenticated user is allowed.
 *   Pass 'admin' → only admins.
 *   Pass ['admin','patient'] → either role.
 *
 * ─── Null-role grace period ───────────────────────────────────────────────────
 * After login, useAuth performs an async profile fetch with a retry delay.
 * During that window, `isAuthenticated` is true but `role` is still null.
 * We MUST show a spinner in that state — NOT a 403 — to avoid a false
 * "Unauthorized" flash every time a user logs in.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
    const { isLoading, isAuthenticated, role } = useAuthStore();
    const location = useLocation();

    // 1. Show spinner while session is initially being resolved (app cold start).
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // 2. Not authenticated → redirect to /login, preserving the attempted URL.
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    // 3. Authenticated but role is still null → profile fetch is in-flight.
    //    Show a spinner instead of a 403 to avoid a false Unauthorized flash.
    if (role === null) {
        return <LoadingSpinner message="جارٍ تحميل بيانات حسابك..." />;
    }

    // 4. Role check (if allowedRoles is specified).
    if (allowedRoles) {
        const allowed = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
        if (!allowed.includes(role)) {
            return <UnauthorizedScreen role={role} />;
        }
    }

    // 5. All checks passed → render the protected content.
    return children;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner({ message = 'جارٍ التحقق من صلاحية الوصول...' }) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
            <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm font-medium">{message}</p>
        </div>
    );
}

function UnauthorizedScreen({ role }) {
    const dashboardPath = isStaff(role) ? '/dashboard/admin' : '/dashboard/patient';
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-8 gap-4" dir="rtl">
            <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-5xl mb-2">
                🚫
            </div>
            <h1 className="text-3xl font-bold text-gray-800">غير مصرح</h1>
            <p className="text-gray-500 max-w-sm">ليس لديك صلاحية للوصول إلى هذه الصفحة.</p>
            <a
                href={dashboardPath}
                className="mt-4 bg-teal-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-teal-700 transition"
            >
                العودة إلى لوحتي
            </a>
        </div>
    );
}
