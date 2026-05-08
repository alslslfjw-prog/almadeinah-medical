import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertCircle,
    Banknote,
    CheckCircle2,
    Download,
    Eye,
    FileText,
    Loader2,
    Receipt,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    TrendingUp,
    Wallet,
    X,
} from 'lucide-react';
import {
    expireStalePayments,
    getFinanceLedger,
    getFinanceTransactionDetails,
    getManualReceivables,
    issuePaymentReceipt,
    markManualPaymentPaid,
    recordPaymentRefund,
} from '../../../api/finance';
import { getSiteSettings, updateSiteSettings } from '../../../api/settings';

const SERVICE_LABELS = {
    doctors: 'الأطباء',
    scans: 'الأشعة التشخيصية',
    lab: 'الفحوصات',
    packages: 'الباقات',
    clinics: 'العيادات',
    other: 'خدمة أخرى',
};

const STATUS_LABELS = {
    initiated: 'بدأ الدفع',
    otp_sent: 'بانتظار OTP',
    paid: 'مدفوع',
    failed: 'فشل',
    expired: 'منتهي',
    cancelled: 'ملغي',
    partially_refunded: 'مسترد جزئيا',
    refunded: 'مسترد',
};

const STATUS_STYLES = {
    initiated: 'bg-slate-100 text-slate-600',
    otp_sent: 'bg-amber-50 text-amber-700 border-amber-100',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    failed: 'bg-red-50 text-red-700 border-red-100',
    expired: 'bg-slate-100 text-slate-600',
    cancelled: 'bg-slate-100 text-slate-600',
    partially_refunded: 'bg-blue-50 text-blue-700 border-blue-100',
    refunded: 'bg-indigo-50 text-indigo-700 border-indigo-100',
};

const EVENT_LABELS = {
    payment_initiated: 'بدء عملية الدفع',
    otp_sent: 'إرسال رمز OTP',
    otp_resent: 'إعادة إرسال OTP',
    otp_failed: 'رمز غير صحيح',
    payment_paid: 'تم الدفع',
    payment_failed: 'فشل الدفع',
    payment_expired: 'انتهت مهلة الدفع',
    manual_payment_settled: 'تسوية دفع يدوي',
    receipt_issued: 'إصدار إيصال',
    refund_recorded: 'تسجيل استرداد',
    bank_request_failed: 'فشل طلب البنك',
    otp_resend_failed: 'فشل إعادة الإرسال',
};

const PROVIDER_LABELS = {
    alqutabi_bank: 'بنك القطيبي',
    cash: 'الدفع في المركز',
};

const FILTER_STATUSES = [
    { value: 'all', label: 'كل الحالات' },
    { value: 'paid', label: 'مدفوع' },
    { value: 'otp_sent', label: 'بانتظار OTP' },
    { value: 'failed', label: 'فشل' },
    { value: 'expired', label: 'منتهي' },
    { value: 'partially_refunded', label: 'مسترد جزئيا' },
    { value: 'refunded', label: 'مسترد' },
];

function asNumber(value) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
}

function fmtAmount(value) {
    return `${Math.round(asNumber(value)).toLocaleString('ar-YE')} ر.ي`;
}

function fmtDate(value) {
    if (!value) return '-';
    try {
        return new Intl.DateTimeFormat('ar-YE', {
            dateStyle: 'medium',
            timeStyle: 'short',
        }).format(new Date(value));
    } catch {
        return '-';
    }
}

function statusLabel(status) {
    return STATUS_LABELS[status] ?? status ?? '-';
}

function providerLabel(row) {
    return row?.payment_method_name_ar || PROVIDER_LABELS[row?.provider_id] || row?.provider_id || '-';
}

function serviceLabel(type) {
    return SERVICE_LABELS[type] ?? type ?? SERVICE_LABELS.other;
}

function isPaidLike(status) {
    return ['paid', 'partially_refunded', 'refunded'].includes(status);
}

function CsvButton({ rows }) {
    const handleExport = () => {
        const headers = [
            'رقم المعاملة',
            'المريض',
            'الخدمة',
            'طريقة الدفع',
            'الحالة',
            'المبلغ',
            'المسترد',
            'الصافي',
            'رقم البنك',
            'رقم الإيصال',
            'تاريخ الدفع',
        ];
        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const lines = rows.map((row) => [
            row.id,
            row.patient_name,
            row.service_name,
            providerLabel(row),
            statusLabel(row.status),
            row.amount_yer,
            row.refunded_amount_yer,
            row.net_amount_yer,
            row.bank_transaction_id,
            row.receipt_number,
            row.paid_at || row.created_at,
        ].map(escapeCsv).join(','));

        const blob = new Blob([`\uFEFF${headers.map(escapeCsv).join(',')}\n${lines.join('\n')}`], {
            type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `payment-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <button
            type="button"
            onClick={handleExport}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
            <Download size={16} />
            تصدير CSV
        </button>
    );
}

function StatusBadge({ status }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600'}`}>
            {statusLabel(status)}
        </span>
    );
}

function KpiCard({ icon, label, value, sub }) {
    return (
        <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    {icon}
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400">{label}</p>
                    <p className="mt-1 text-xl font-black text-slate-900">{value}</p>
                    {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
                </div>
            </div>
        </div>
    );
}

export default function FinanceDashboard() {
    const [ledger, setLedger] = useState([]);
    const [manualReceivables, setManualReceivables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [filters, setFilters] = useState({
        status: 'all',
        provider: 'all',
        query: '',
        dateFrom: '',
        dateTo: '',
    });

    const [usdToYerRate, setUsdToYerRate] = useState(800);
    const [savingRate, setSavingRate] = useState(false);
    const [rateMessage, setRateMessage] = useState('');

    const [selectedId, setSelectedId] = useState(null);
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState('');
    const [refundForm, setRefundForm] = useState({
        amountYer: '',
        reason: '',
        method: 'manual',
        bankReference: '',
        notes: '',
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        setError('');
        const [ledgerRes, manualRes, settingsRes] = await Promise.all([
            getFinanceLedger(),
            getManualReceivables(),
            getSiteSettings(),
        ]);

        if (ledgerRes.error || manualRes.error || settingsRes.error) {
            setError(ledgerRes.error?.message || manualRes.error?.message || settingsRes.error?.message || 'تعذر تحميل البيانات المالية');
        }

        setLedger(ledgerRes.data ?? []);
        setManualReceivables(manualRes.data ?? []);
        if (settingsRes.data) setUsdToYerRate(settingsRes.data.usd_to_yer_rate ?? 800);
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const providers = useMemo(() => {
        const map = new Map();
        ledger.forEach((row) => {
            if (row.provider_id) map.set(row.provider_id, providerLabel(row));
        });
        return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
    }, [ledger]);

    const filteredLedger = useMemo(() => {
        const query = filters.query.trim().toLowerCase();
        const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
        const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`) : null;

        return ledger.filter((row) => {
            if (filters.status !== 'all' && row.status !== filters.status) return false;
            if (filters.provider !== 'all' && row.provider_id !== filters.provider) return false;

            const rowDate = new Date(row.paid_at || row.created_at);
            if (from && rowDate < from) return false;
            if (to && rowDate > to) return false;

            if (!query) return true;
            const haystack = [
                row.id,
                row.appointment_id,
                row.patient_name,
                row.phone_number,
                row.service_name,
                row.bank_transaction_id,
                row.receipt_number,
                row.customer_account_masked,
            ].join(' ').toLowerCase();
            return haystack.includes(query);
        });
    }, [filters, ledger]);

    const kpis = useMemo(() => {
        const paidRows = filteredLedger.filter((row) => isPaidLike(row.status));
        const grossRevenue = paidRows.reduce((sum, row) => sum + asNumber(row.amount_yer), 0);
        const refunded = paidRows.reduce((sum, row) => sum + asNumber(row.refunded_amount_yer), 0);
        const netRevenue = paidRows.reduce((sum, row) => sum + asNumber(row.net_amount_yer), 0);
        const pendingOtp = filteredLedger
            .filter((row) => ['initiated', 'otp_sent'].includes(row.status))
            .reduce((sum, row) => sum + asNumber(row.amount_yer), 0);
        const manualPending = manualReceivables.reduce((sum, row) => sum + asNumber(row.total_price_yer), 0);
        const failedCount = filteredLedger.filter((row) => ['failed', 'expired', 'cancelled'].includes(row.status)).length;

        return {
            grossRevenue,
            refunded,
            netRevenue,
            pendingOtp,
            manualPending,
            failedCount,
            paidCount: paidRows.length,
        };
    }, [filteredLedger, manualReceivables]);

    const revenueByService = useMemo(() => {
        const grouped = new Map();
        filteredLedger.filter((row) => isPaidLike(row.status)).forEach((row) => {
            const key = row.service_type || 'other';
            const current = grouped.get(key) || { type: key, count: 0, gross: 0, refunded: 0, net: 0 };
            current.count += 1;
            current.gross += asNumber(row.amount_yer);
            current.refunded += asNumber(row.refunded_amount_yer);
            current.net += asNumber(row.net_amount_yer);
            grouped.set(key, current);
        });
        return Array.from(grouped.values()).sort((a, b) => b.net - a.net);
    }, [filteredLedger]);

    const selectedTransaction = details?.transaction ?? null;
    const canRefund = selectedTransaction && ['paid', 'partially_refunded'].includes(selectedTransaction.status);
    const refundableAmount = selectedTransaction
        ? Math.max(asNumber(selectedTransaction.net_amount_yer), 0)
        : 0;

    const openDetails = async (transactionId) => {
        setSelectedId(transactionId);
        setDetails(null);
        setDetailsLoading(true);
        const { data, error: detailsError } = await getFinanceTransactionDetails(transactionId);
        if (detailsError) setError(detailsError.message || 'تعذر تحميل تفاصيل المعاملة');
        else setDetails(data);
        setDetailsLoading(false);
    };

    const reloadDetails = async () => {
        if (!selectedId) return;
        const { data, error: detailsError } = await getFinanceTransactionDetails(selectedId);
        if (detailsError) setError(detailsError.message || 'تعذر تحديث تفاصيل المعاملة');
        else setDetails(data);
    };

    const handleSaveRate = async () => {
        if (!usdToYerRate || Number(usdToYerRate) < 1) {
            setRateMessage('سعر الصرف يجب أن يكون أكبر من صفر');
            return;
        }
        setSavingRate(true);
        setRateMessage('');
        const { error: saveError } = await updateSiteSettings({ usd_to_yer_rate: Number(usdToYerRate) });
        setSavingRate(false);
        setRateMessage(saveError ? saveError.message : 'تم حفظ سعر الصرف بنجاح');
    };

    const runAction = async (key, fn, successMessage) => {
        setActionLoading(key);
        setError('');
        setNotice('');
        const { data, error: actionError } = await fn();
        setActionLoading('');
        if (actionError) {
            setError(actionError.message || 'فشلت العملية المالية');
            return null;
        }
        setNotice(successMessage(data));
        await loadData();
        await reloadDetails();
        return data;
    };

    const handleExpireStale = () => runAction(
        'expire',
        expireStalePayments,
        (data) => `تم إنهاء ${data?.expiredCount ?? 0} عملية دفع منتهية المهلة`,
    );

    const handleManualPaid = (row) => runAction(
        `manual-${row.id}`,
        () => markManualPaymentPaid({
            appointmentId: row.id,
            amountYer: asNumber(row.total_price_yer),
            providerId: row.payment_method_provider_id || 'cash',
            note: 'تسوية من لوحة المالية',
        }),
        () => 'تم تسجيل الدفع اليدوي وإصدار الإيصال',
    );

    const handleIssueReceipt = () => {
        if (!selectedTransaction) return null;
        return runAction(
            `receipt-${selectedTransaction.id}`,
            () => issuePaymentReceipt(selectedTransaction.id),
            () => 'تم إصدار الإيصال',
        );
    };

    const handleRefundSubmit = async (event) => {
        event.preventDefault();
        if (!selectedTransaction) return;
        const amountYer = asNumber(refundForm.amountYer);
        if (!amountYer || amountYer <= 0 || amountYer > refundableAmount) {
            setError('مبلغ الاسترداد غير صحيح');
            return;
        }
        if (!refundForm.reason.trim()) {
            setError('سبب الاسترداد مطلوب');
            return;
        }

        await runAction(
            `refund-${selectedTransaction.id}`,
            () => recordPaymentRefund({
                transactionId: selectedTransaction.id,
                amountYer,
                reason: refundForm.reason,
                method: refundForm.method,
                bankReference: refundForm.bankReference,
                notes: refundForm.notes,
            }),
            () => 'تم تسجيل الاسترداد وتحديث الصافي المالي',
        );
        setRefundForm({ amountYer: '', reason: '', method: 'manual', bankReference: '', notes: '' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-3 py-32 text-teal-700" dir="rtl">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm font-bold">جاري تحميل البيانات المالية...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6" dir="rtl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900">المالية</h1>
                    <p className="mt-1 text-sm text-slate-400">
                        دفتر معاملات وإيصالات واستردادات مبني على سجلات الدفع، وليس على الحجز فقط.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={loadData}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                    >
                        <RefreshCw size={16} />
                        تحديث
                    </button>
                    <button
                        type="button"
                        onClick={handleExpireStale}
                        disabled={actionLoading === 'expire'}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                        {actionLoading === 'expire' ? <Loader2 className="animate-spin" size={16} /> : <AlertCircle size={16} />}
                        إنهاء OTP المنتهية
                    </button>
                    <CsvButton rows={filteredLedger} />
                </div>
            </div>

            {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    <AlertCircle size={16} />
                    {error}
                </div>
            )}
            {notice && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    <CheckCircle2 size={16} />
                    {notice}
                </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard icon={<TrendingUp size={20} />} label="صافي الإيراد" value={fmtAmount(kpis.netRevenue)} sub={`${kpis.paidCount.toLocaleString('ar-YE')} معاملة مدفوعة`} />
                <KpiCard icon={<Receipt size={20} />} label="إجمالي المدفوع" value={fmtAmount(kpis.grossRevenue)} sub="قبل الاستردادات" />
                <KpiCard icon={<RotateCcw size={20} />} label="المسترد" value={fmtAmount(kpis.refunded)} sub="استردادات مسجلة" />
                <KpiCard icon={<Wallet size={20} />} label="بانتظار OTP" value={fmtAmount(kpis.pendingOtp)} sub={`${kpis.failedCount.toLocaleString('ar-YE')} عملية فاشلة أو منتهية`} />
                <KpiCard icon={<Banknote size={20} />} label="مستحقات يدوية" value={fmtAmount(kpis.manualPending)} sub={`${manualReceivables.length.toLocaleString('ar-YE')} حجز غير مسدد`} />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
                <section className="rounded-lg border border-slate-100 bg-white shadow-sm">
                    <div className="border-b border-slate-100 p-4">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr_0.8fr]">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    value={filters.query}
                                    onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pr-9 pl-3 text-sm outline-none transition focus:border-teal-400 focus:bg-white"
                                    placeholder="بحث بالمريض، الخدمة، الإيصال أو رقم البنك..."
                                />
                            </div>
                            <select
                                value={filters.status}
                                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-teal-400"
                            >
                                {FILTER_STATUSES.map((status) => (
                                    <option key={status.value} value={status.value}>{status.label}</option>
                                ))}
                            </select>
                            <select
                                value={filters.provider}
                                onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-teal-400"
                            >
                                <option value="all">كل الطرق</option>
                                {providers.map((provider) => (
                                    <option key={provider.value} value={provider.value}>{provider.label}</option>
                                ))}
                            </select>
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-teal-400"
                            />
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
                                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-teal-400"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[940px] text-sm">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-right">المريض</th>
                                    <th className="px-4 py-3 text-right">الخدمة</th>
                                    <th className="px-4 py-3 text-center">طريقة الدفع</th>
                                    <th className="px-4 py-3 text-center">الحالة</th>
                                    <th className="px-4 py-3 text-left">الصافي</th>
                                    <th className="px-4 py-3 text-center">رقم البنك</th>
                                    <th className="px-4 py-3 text-center">الإيصال</th>
                                    <th className="px-4 py-3 text-center">إجراء</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredLedger.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
                                            لا توجد معاملات مطابقة للفلاتر الحالية
                                        </td>
                                    </tr>
                                ) : filteredLedger.map((row) => (
                                    <tr key={row.id} className="transition hover:bg-slate-50/70">
                                        <td className="px-4 py-3">
                                            <p className="font-bold text-slate-800">{row.patient_name || '-'}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">#{row.appointment_id || '-'}</p>
                                        </td>
                                        <td className="max-w-[220px] px-4 py-3">
                                            <p className="truncate font-bold text-slate-700">{row.service_name || serviceLabel(row.service_type)}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">{serviceLabel(row.service_type)}</p>
                                        </td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{providerLabel(row)}</td>
                                        <td className="px-4 py-3 text-center"><StatusBadge status={row.status} /></td>
                                        <td className="px-4 py-3 text-left">
                                            <p className="font-black text-teal-700">{fmtAmount(row.net_amount_yer)}</p>
                                            {asNumber(row.refunded_amount_yer) > 0 && (
                                                <p className="text-xs text-slate-400">استرداد {fmtAmount(row.refunded_amount_yer)}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">{row.bank_transaction_id || '-'}</td>
                                        <td className="px-4 py-3 text-center text-xs font-bold text-slate-500">{row.receipt_number || '-'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => openDetails(row.id)}
                                                className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition hover:bg-teal-100"
                                            >
                                                <Eye size={14} />
                                                تفاصيل
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-slate-900">الإيرادات حسب الخدمة</h2>
                                <p className="text-xs text-slate-400">صافي المدفوع بعد الاسترداد</p>
                            </div>
                            <FileText size={18} className="text-slate-400" />
                        </div>
                        <div className="space-y-3">
                            {revenueByService.length === 0 ? (
                                <p className="rounded-lg bg-slate-50 py-8 text-center text-sm font-bold text-slate-400">
                                    لا توجد إيرادات مدفوعة
                                </p>
                            ) : revenueByService.map((row) => (
                                <div key={row.type} className="rounded-lg border border-slate-100 p-3">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-bold text-slate-700">{serviceLabel(row.type)}</span>
                                        <span className="font-black text-teal-700">{fmtAmount(row.net)}</span>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                        <span>{row.count.toLocaleString('ar-YE')} معاملة</span>
                                        <span>مسترد {fmtAmount(row.refunded)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-4">
                            <h2 className="font-black text-slate-900">تسوية الدفع في المركز</h2>
                            <p className="text-xs text-slate-400">الحجوزات اليدوية لا تدخل الإيراد حتى يتم تسجيل تحصيلها</p>
                        </div>
                        <div className="max-h-[330px] space-y-3 overflow-y-auto pr-1">
                            {manualReceivables.length === 0 ? (
                                <p className="rounded-lg bg-slate-50 py-8 text-center text-sm font-bold text-slate-400">
                                    لا توجد مستحقات يدوية معلقة
                                </p>
                            ) : manualReceivables.map((row) => (
                                <div key={row.id} className="rounded-lg border border-slate-100 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-bold text-slate-800">{row.patient_name || '-'}</p>
                                            <p className="mt-1 truncate text-xs text-slate-400">{row.service_name || serviceLabel(row.type)}</p>
                                        </div>
                                        <p className="shrink-0 font-black text-slate-800">{fmtAmount(row.total_price_yer)}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleManualPaid(row)}
                                        disabled={actionLoading === `manual-${row.id}` || asNumber(row.total_price_yer) <= 0}
                                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-700 disabled:opacity-60"
                                    >
                                        {actionLoading === `manual-${row.id}` ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                                        تسجيل كمدفوع
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-100 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <RefreshCw size={18} />
                            </div>
                            <div>
                                <h2 className="font-black text-slate-900">سعر صرف الدولار</h2>
                                <p className="text-xs text-slate-400">يستخدم لحساب أسعار الخدمات المسعرة بالدولار</p>
                            </div>
                        </div>
                        <label className="mb-2 block text-sm font-bold text-slate-600">ريال يمني لكل 1 USD</label>
                        <input
                            type="number"
                            min="1"
                            value={usdToYerRate}
                            onChange={(event) => setUsdToYerRate(event.target.value)}
                            dir="ltr"
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm outline-none focus:border-teal-400 focus:bg-white"
                        />
                        {rateMessage && (
                            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">{rateMessage}</p>
                        )}
                        <button
                            type="button"
                            onClick={handleSaveRate}
                            disabled={savingRate}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                            {savingRate ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                            حفظ السعر
                        </button>
                    </section>
                </div>
            </div>

            {selectedId && (
                <div className="fixed inset-0 z-50 bg-slate-900/40" onClick={() => setSelectedId(null)}>
                    <aside
                        className="absolute left-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
                            <div>
                                <h2 className="text-lg font-black text-slate-900">تفاصيل المعاملة</h2>
                                <p className="text-xs text-slate-400">{selectedTransaction?.id || selectedId}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedId(null)}
                                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {detailsLoading ? (
                            <div className="flex items-center justify-center gap-3 py-24 text-teal-700">
                                <Loader2 className="animate-spin" size={22} />
                                <span className="text-sm font-bold">جاري تحميل التفاصيل...</span>
                            </div>
                        ) : selectedTransaction ? (
                            <div className="space-y-5 p-5">
                                <section className="rounded-lg border border-slate-100 p-4">
                                    <div className="mb-4 flex items-center justify-between">
                                        <StatusBadge status={selectedTransaction.status} />
                                        <span className="text-lg font-black text-teal-700">{fmtAmount(selectedTransaction.net_amount_yer)}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">المريض</p>
                                            <p className="font-bold text-slate-800">{selectedTransaction.patient_name || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">طريقة الدفع</p>
                                            <p className="font-bold text-slate-800">{providerLabel(selectedTransaction)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">الخدمة</p>
                                            <p className="font-bold text-slate-800">{selectedTransaction.service_name || serviceLabel(selectedTransaction.service_type)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">تاريخ الدفع</p>
                                            <p className="font-bold text-slate-800">{fmtDate(selectedTransaction.paid_at || selectedTransaction.created_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">رقم البنك</p>
                                            <p className="font-mono text-xs font-bold text-slate-800">{selectedTransaction.bank_transaction_id || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-400">حساب العميل</p>
                                            <p className="font-mono text-xs font-bold text-slate-800">{selectedTransaction.customer_account_masked || '-'}</p>
                                        </div>
                                    </div>
                                </section>

                                <section className="rounded-lg border border-slate-100 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="font-black text-slate-900">الإيصال</h3>
                                        {selectedTransaction.status === 'paid' && !selectedTransaction.receipt_id && (
                                            <button
                                                type="button"
                                                onClick={handleIssueReceipt}
                                                disabled={actionLoading === `receipt-${selectedTransaction.id}`}
                                                className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 transition hover:bg-teal-100 disabled:opacity-60"
                                            >
                                                {actionLoading === `receipt-${selectedTransaction.id}` ? <Loader2 className="animate-spin" size={14} /> : <Receipt size={14} />}
                                                إصدار إيصال
                                            </button>
                                        )}
                                    </div>
                                    {details.receipt ? (
                                        <div className="rounded-lg bg-slate-50 p-3 text-sm">
                                            <div className="flex items-center justify-between gap-3">
                                                <span className="font-bold text-slate-500">رقم الإيصال</span>
                                                <span className="font-mono font-black text-slate-900">{details.receipt.receipt_number}</span>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-3">
                                                <span className="font-bold text-slate-500">تاريخ الإصدار</span>
                                                <span className="font-bold text-slate-800">{fmtDate(details.receipt.issued_at)}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="rounded-lg bg-slate-50 py-6 text-center text-sm font-bold text-slate-400">
                                            لم يصدر إيصال لهذه المعاملة بعد
                                        </p>
                                    )}
                                </section>

                                <section className="rounded-lg border border-slate-100 p-4">
                                    <h3 className="mb-3 font-black text-slate-900">بنود الخدمة</h3>
                                    <div className="space-y-2">
                                        {details.lineItems?.length ? details.lineItems.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                                                <div className="min-w-0">
                                                    <p className="truncate font-bold text-slate-800">{item.item_name}</p>
                                                    <p className="text-xs text-slate-400">{item.quantity} × {fmtAmount(item.amount_yer)}</p>
                                                </div>
                                                <span className="font-black text-slate-800">{fmtAmount(item.amount_yer)}</span>
                                            </div>
                                        )) : (
                                            <p className="rounded-lg bg-slate-50 py-6 text-center text-sm font-bold text-slate-400">
                                                لا توجد بنود مفصلة لهذه المعاملة
                                            </p>
                                        )}
                                    </div>
                                </section>

                                <section className="rounded-lg border border-slate-100 p-4">
                                    <h3 className="mb-3 font-black text-slate-900">الاستردادات</h3>
                                    <div className="space-y-2">
                                        {details.refunds?.length ? details.refunds.map((refund) => (
                                            <div key={refund.id} className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="font-black">{fmtAmount(refund.amount_yer)}</span>
                                                    <span className="text-xs font-bold">{fmtDate(refund.processed_at || refund.created_at)}</span>
                                                </div>
                                                {refund.reason && <p className="mt-1 text-xs font-bold text-blue-700">{refund.reason}</p>}
                                            </div>
                                        )) : (
                                            <p className="rounded-lg bg-slate-50 py-5 text-center text-sm font-bold text-slate-400">
                                                لا توجد استردادات
                                            </p>
                                        )}
                                    </div>

                                    {canRefund && refundableAmount > 0 && (
                                        <form onSubmit={handleRefundSubmit} className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                                            <p className="text-xs font-bold text-slate-400">المبلغ المتاح للاسترداد: {fmtAmount(refundableAmount)}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={refundableAmount}
                                                    value={refundForm.amountYer}
                                                    onChange={(event) => setRefundForm((current) => ({ ...current, amountYer: event.target.value }))}
                                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400"
                                                    placeholder="المبلغ"
                                                />
                                                <select
                                                    value={refundForm.method}
                                                    onChange={(event) => setRefundForm((current) => ({ ...current, method: event.target.value }))}
                                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-teal-400"
                                                >
                                                    <option value="manual">يدوي</option>
                                                    <option value="cash">نقدي</option>
                                                    <option value="bank">بنكي</option>
                                                    <option value="adjustment">تسوية</option>
                                                </select>
                                            </div>
                                            <input
                                                value={refundForm.reason}
                                                onChange={(event) => setRefundForm((current) => ({ ...current, reason: event.target.value }))}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400"
                                                placeholder="سبب الاسترداد"
                                            />
                                            <input
                                                value={refundForm.bankReference}
                                                onChange={(event) => setRefundForm((current) => ({ ...current, bankReference: event.target.value }))}
                                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-teal-400"
                                                placeholder="مرجع البنك إن وجد"
                                            />
                                            <button
                                                type="submit"
                                                disabled={actionLoading === `refund-${selectedTransaction.id}`}
                                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                                            >
                                                {actionLoading === `refund-${selectedTransaction.id}` ? <Loader2 className="animate-spin" size={16} /> : <RotateCcw size={16} />}
                                                تسجيل الاسترداد
                                            </button>
                                        </form>
                                    )}
                                </section>

                                <section className="rounded-lg border border-slate-100 p-4">
                                    <h3 className="mb-3 font-black text-slate-900">سجل الأحداث</h3>
                                    <div className="space-y-3">
                                        {details.events?.length ? details.events.map((event) => (
                                            <div key={event.id} className="border-r-2 border-teal-100 pr-3">
                                                <div className="flex items-start justify-between gap-3">
                                                    <p className="font-bold text-slate-800">{EVENT_LABELS[event.event_type] ?? event.event_type}</p>
                                                    <p className="shrink-0 text-xs font-bold text-slate-400">{fmtDate(event.created_at)}</p>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    {event.status_from || '-'} إلى {event.status_to || '-'} - {event.event_source}
                                                </p>
                                            </div>
                                        )) : (
                                            <p className="rounded-lg bg-slate-50 py-6 text-center text-sm font-bold text-slate-400">
                                                لا توجد أحداث مسجلة
                                            </p>
                                        )}
                                    </div>
                                </section>
                            </div>
                        ) : (
                            <p className="py-24 text-center text-sm font-bold text-slate-400">لم يتم العثور على المعاملة</p>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}
