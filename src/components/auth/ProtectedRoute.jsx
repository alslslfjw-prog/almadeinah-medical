/**
 * @module components/auth/ProtectedRoute
 * @description Role-aware route guard component.
 *
 * Redirects unauthenticated users to /login.
 * Redirects authenticated users with the wrong role to /unauthorized.
 *
 * Usage:
 *   <ProtectedRoute allowedRoles={['admin']}>
 *     <AdminLayout />
 *   </ProtectedRoute>
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

/**
 * @param {{ allowedRoles: Array<'admin'|'patient'>, children: React.ReactNode }} props
 */
export default function ProtectedRoute({ allowedRoles, children }) {
    const { user, role, isLoading } = useAuthStore();
    const location = useLocation();

    // Wait for session resolution before deciding
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Not logged in → redirect to login, preserving the intended destination
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Logged in but wrong role → unauthorized
    if (allowedRoles && !allowedRoles.includes(role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
