/**
 * FinanceDashboard — Admin Finance section.
 * KPI cards, revenue by service type, recent transactions, and exchange rate controller.
 * All data derived from existing `appointments` table — no new DB columns needed.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, Receipt, Gift, BarChart2,
    Save, Loader2, CheckCircle, AlertCircle, RefreshCw,
} from 'lucide-react';
import { getAllAppointments } from '../../../api/appointments';
import { getSiteSettings, updateSiteSettings } from '../../../api/settings';

// ── Helpers ──────────────────────────────────────────────────────────────────

const SERVICE_LABELS = {
    doctors: 'الأطباء',
    scans: 'الأشعة',
    lab: 'الفحوصات',
    packages: 'الباقات',
    clinics: 'العيادات',
};

function fmt(n) {
    return Number(n).toLocaleString('ar-YE');
}

function KpiCard({ icon, label, value, sub, color }) {
    return (
        <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4 items-start`}>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-semibold text-slate-400 mb-0.5">{label}</p>
                <p className="text-xl font-black text-slate-800">{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Date filter options ───────────────────────────────────────────────────────
const RANGES = [
    { label: 'هذا الشهر', value: 'month' },
    { label: 'آخر 30 يوم', value: '30d' },
    { label: 'الكل', value: 'all' },
];

function filterByRange(appts, range) {
    if (range === 'all') return appts;
    const now = new Date();
    const cutoff = new Date();
    if (range === 'month') cutoff.setDate(1);
    else cutoff.setDate(now.getDate() - 30);
    cutoff.setHours(0, 0, 0, 0);
    return appts.filter(a => {
        if (!a.appointment_date) return false;
        return new Date(a.appointment_date) >= cutoff;
    });
}

// ─────────────────────────────────────────────────────────────────────────────

export default function FinanceDashboard() {
    const [appts, setAppts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('month');

    // Exchange rate state
    const [usdToYerRate, setUsdToYerRate] = useState(800);
    const [savingRate, setSavingRate] = useState(false);
    const [savedRate, setSavedRate] = useState(false);
    const [errorRate, setErrorRate] = useState('');
    const [settingsLoading, setSettingsLoading] = useState(true);

    // ── Fetch data ────────────────────────────────────────────────────────────
    useEffect(() => {
        Promise.all([
            getAllAppointments(),
            getSiteSettings(),
        ]).then(([{ data: apptData }, { data: settings }]) => {
            setAppts(apptData ?? []);
            if (settings) setUsdToYerRate(settings.usd_to_yer_rate ?? 800);
            setLoading(false);
            setSettingsLoading(false);
        });
    }, []);

    // ── Derived KPIs ──────────────────────────────────────────────────────────
    const filtered = useMemo(() => filterByRange(appts, range), [appts, range]);

    const kpis = useMemo(() => {
        const paid = filtered.filter(a => a.total_price_yer > 0);
        const free = filtered.filter(a => !a.total_price_yer || a.total_price_yer === 0);
        const totalRevenue = paid.reduce((s, a) => s + (a.total_price_yer ?? 0), 0);
        const avgValue = paid.length > 0 ? Math.round(totalRevenue / paid.length) : 0;
        return { totalRevenue, paidCount: paid.length, freeCount: free.length, avgValue };
    }, [filtered]);

    // Revenue by service type
    const revenueByType = useMemo(() => {
        const map = {};
        filtered.forEach(a => {
            const type = a.type ?? 'other';
            if (!map[type]) map[type] = { count: 0, total: 0 };
            map[type].count += 1;
            map[type].total += a.total_price_yer ?? 0;
        });
        return Object.entries(map)
            .map(([type, v]) => ({ type, ...v }))
            .sort((a, b) => b.total - a.total);
    }, [filtered]);

    // Recent paid transactions
    const recentPaid = useMemo(() => {
        return filtered
            .filter(a => a.total_price_yer > 0)
            .slice(0, 30);
    }, [filtered]);

    // ── Exchange rate save ────────────────────────────────────────────────────
    const handleSaveRate = async () => {
        if (!usdToYerRate || Number(usdToYerRate) < 1) {
            setErrorRate('سعر الصرف يجب أن يكون أكبر من صفر');
            return;
        }
        setSavingRate(true); setErrorRate(''); setSavedRate(false);
        const { error: err } = await updateSiteSettings({ usd_to_yer_rate: Number(usdToYerRate) });
        setSavingRate(false);
        if (err) { setErrorRate(err.message); return; }
        setSavedRate(true);
        setTimeout(() => setSavedRate(false), 3000);
    };

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-teal-600 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm font-medium">جارٍ تحميل البيانات المالية...</span>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-8" dir="rtl">

            {/* Header + range filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">المالية</h1>
                    <p className="text-sm text-slate-400 mt-0.5">ملخص إيرادات المركز من الحجوزات</p>
                </div>
                <div className="flex gap-2">
                    {RANGES.map(r => (
                        <button
                            key={r.value}
                            onClick={() => setRange(r.value)}
                            className={`px-4 py-2 rounded-xl text-sm font-bold transition ${range === r.value
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={<TrendingUp size={20} className="text-teal-600" />}
                    label="إجمالي الإيرادات"
                    value={`${fmt(kpis.totalRevenue)} ر.ي`}
                    sub="من الحجوزات المدفوعة"
                    color="bg-teal-50"
                />
                <KpiCard
                    icon={<Receipt size={20} className="text-blue-600" />}
                    label="حجوزات مدفوعة"
                    value={fmt(kpis.paidCount)}
                    sub={`متوسط قيمة الحجز: ${fmt(kpis.avgValue)} ر.ي`}
                    color="bg-blue-50"
                />
                <KpiCard
                    icon={<Gift size={20} className="text-purple-600" />}
                    label="حجوزات مجانية"
                    value={fmt(kpis.freeCount)}
                    sub="بدون سعر مسجّل"
                    color="bg-purple-50"
                />
                <KpiCard
                    icon={<BarChart2 size={20} className="text-orange-500" />}
                    label="متوسط قيمة الحجز"
                    value={`${fmt(kpis.avgValue)} ر.ي`}
                    sub="من الحجوزات المدفوعة فقط"
                    color="bg-orange-50"
                />
            </div>

            {/* ── Revenue by Service Type ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">الإيرادات حسب نوع الخدمة</h2>
                </div>
                {revenueByType.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">لا توجد بيانات للفترة المحددة</p>
                ) : (
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[380px]">
                        <thead className="bg-slate-50 text-xs text-slate-500 font-bold">
                            <tr>
                                <th className="text-right px-6 py-3">نوع الخدمة</th>
                                <th className="text-center px-4 py-3">عدد الحجوزات</th>
                                <th className="text-left px-6 py-3">إجمالي الإيرادات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {revenueByType.map(row => (
                                <tr key={row.type} className="hover:bg-slate-50/50 transition">
                                    <td className="px-6 py-3.5 font-semibold text-slate-700">
                                        {SERVICE_LABELS[row.type] ?? row.type}
                                    </td>
                                    <td className="px-4 py-3.5 text-center text-slate-500">
                                        {fmt(row.count)}
                                    </td>
                                    <td className="px-6 py-3.5 text-left">
                                        {row.total > 0
                                            ? <span className="font-bold text-teal-700">{fmt(row.total)} ر.ي</span>
                                            : <span className="text-slate-300">—</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}
            </div>

            {/* ── Recent Paid Transactions ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-bold text-slate-800">آخر المعاملات المدفوعة</h2>
                    <span className="text-xs text-slate-400">{recentPaid.length} معاملة</span>
                </div>
                {recentPaid.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-10">لا توجد معاملات مدفوعة للفترة المحددة</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm min-w-[600px]">
                            <thead className="bg-slate-50 text-xs text-slate-500 font-bold">
                                <tr>
                                    <th className="text-right px-6 py-3">المريض</th>
                                    <th className="text-right px-4 py-3">الخدمة</th>
                                    <th className="text-center px-4 py-3">التاريخ</th>
                                    <th className="text-left px-4 py-3">المبلغ</th>
                                    <th className="text-center px-4 py-3">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {recentPaid.map(a => (
                                    <tr key={a.id} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-3 font-semibold text-slate-700">{a.patient_name}</td>
                                        <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate">{a.service_name ?? (SERVICE_LABELS[a.type] ?? '—')}</td>
                                        <td className="px-4 py-3 text-center text-slate-400 font-mono text-xs">{a.appointment_date ?? '—'}</td>
                                        <td className="px-4 py-3 text-left font-bold text-teal-700">{fmt(a.total_price_yer)} ر.ي</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                                a.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                a.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                                                a.status === 'cancelled' ? 'bg-red-100 text-red-600' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {a.status === 'completed' ? 'مكتمل' :
                                                 a.status === 'confirmed' ? 'مؤكد' :
                                                 a.status === 'cancelled' ? 'ملغى' : 'قيد الانتظار'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Exchange Rate Controller ── */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <RefreshCw size={18} className="text-blue-500" />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800">سعر صرف الدولار</p>
                        <p className="text-xs text-slate-400">يُستخدم لحساب جميع أسعار الخدمات بالريال اليمني</p>
                    </div>
                </div>

                {settingsLoading ? (
                    <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                        <Loader2 size={16} className="animate-spin" /> جارٍ التحميل...
                    </div>
                ) : (
                    <div className="space-y-4 max-w-sm">
                        <div>
                            <label className="block text-sm font-bold text-slate-600 mb-2">
                                سعر الدولار <span className="text-slate-400 font-normal text-xs">(ريال يمني لكل دولار)</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={usdToYerRate}
                                onChange={e => setUsdToYerRate(e.target.value)}
                                dir="ltr"
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 bg-slate-50"
                                placeholder="800"
                            />
                            {usdToYerRate > 0 && (
                                <p className="text-xs text-slate-400 mt-2">
                                    معاينة: <span className="font-mono font-bold text-slate-600">1 USD = {Number(usdToYerRate).toLocaleString('ar-YE')} ر.ي</span>
                                </p>
                            )}
                        </div>

                        {errorRate && (
                            <p className="flex items-center gap-2 text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                                <AlertCircle size={13} /> {errorRate}
                            </p>
                        )}
                        {savedRate && (
                            <p className="flex items-center gap-2 text-green-600 text-xs bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                                <CheckCircle size={13} /> تم حفظ سعر الصرف بنجاح! سيتم تطبيقه فوراً على جميع الأسعار.
                            </p>
                        )}

                        <button
                            onClick={handleSaveRate}
                            disabled={savingRate}
                            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-xl transition text-sm shadow-sm"
                        >
                            {savingRate ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            {savingRate ? 'جارٍ الحفظ...' : 'حفظ سعر الصرف'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
