/**
 * Dashboard pages — Patient Layout stub
 * Will be fleshed out in Phase 6.
 */

import React from 'react';
import { Outlet } from 'react-router-dom';

export default function PatientLayout() {
    return (
        <div className="min-h-screen bg-gray-50 flex" dir="rtl">
            {/* Sidebar placeholder */}
            <aside className="w-64 bg-white border-l border-gray-200 flex flex-col gap-4 p-6 shadow-sm">
                <h2 className="text-lg font-bold text-teal-700">لوحة المريض</h2>
                <p className="text-xs text-gray-400">Phase 6 — قيد الإنشاء</p>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-8">
                <Outlet />
            </main>
        </div>
    );
}
