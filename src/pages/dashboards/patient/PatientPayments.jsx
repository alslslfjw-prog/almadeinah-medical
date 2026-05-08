import React, { useCallback, useEffect, useState } from 'react';
import {
    AlertCircle,
    CalendarDays,
    Clock,
    CreditCard,
    FileText,
    Loader2,
    Receipt,
    RefreshCw,
    X,
} from 'lucide-react';
import { getMyPaymentDetails, getMyPayments } from '../../../api/patient';

const STATUS = {
    initiated: { label: 'بدأ الدفع', cls: 'bg-slate-100 text-slate-600' },
    otp_sent: { label: 'بانتظار OTP', cls: 'bg-amber-100 text-amber-700' },
    paid: { label: 'مدفوع', cls: 'bg-emerald-100 text-emerald-700' },
    failed: { label: 'فشل الدفع', cls: 'bg-red-100 text-red-600' },
    expired: { label: 'انتهت المهلة', cls: 'bg-red-100 text-red-600' },
    cancelled: { label: 'ملغي', cls: 'bg-slate-100 text-slate-500' },
    partially_refunded: { label: 'مسترد جزئيا', cls: 'bg-blue-100 text-blue-700' },
    refunded: { label: 'مسترد', cls: 'bg-purple-100 text-purple-700' },
};

const EVENT_LABELS = {
    payment_initiated: 'بدء عملية الدفع',
    otp_sent: 'إرسال رمز OTP',
    otp_resent: 'إعادة إرسال OTP',
    otp_failed: 'رمز OTP غير صحيح',
    payment_paid: 'تم الدفع',
    payment_failed: 'فشل الدفع',
    payment_expired: 'انتهت مهلة الدفع',
    manual_payment_settled: 'تسوية دفع يدوي',
    receipt_issued: 'إصدار إيصال',
    refund_recorded: 'تسجيل استرداد',
    bank_request_failed: 'فشل طلب البنك',
};

function fmtAmount(value) {
    return `${Number(value || 0).toLocaleString('ar-YE')} ر.ي`;
}

function fmtDate(value) {
    if (!value) return '-';
    try {
        return new Date(value).toLocaleString('ar-YE', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '-';
    }
}

function StatusBadge({ status }) {
    const item = STATUS[status] ?? { label: status || 'غير معروف', cls: 'bg-slate-100 text-slate-500' };
    return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${item.cls}`}>{item.label}</span>;
}

function ReceiptModal({ details, onClose }) {
    const transaction = details?.transaction;
    const receipt = details?.receipt;
    if (!transaction) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4" dir="rtl">
            <div className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-lg bg-white shadow-2xl sm:max-w-3xl sm:rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 print:hidden">
                    <div>
                        <h2 className="font-black text-slate-800">تفاصيل الدفع</h2>
                        <p className="text-xs text-slate-400" dir="ltr">{transaction.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="rounded-lg bg-teal-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-teal-700"
                        >
                            طباعة
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                <div className="space-y-5 overflow-y-auto p-5">
                    <section className="rounded-lg border border-slate-100 bg-white p-5">
                        <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400">مركز المدينة الطبي</p>
                                <h3 className="text-xl font-black text-slate-800">إيصال دفع</h3>
                                <p className="mt-1 text-xs text-slate-400">
                                    رقم الإيصال: <span dir="ltr">{receipt?.receipt_number ?? '-'}</span>
                                </p>
                            </div>
                            <StatusBadge status={transaction.status} />
                        </div>

                        <div className="grid gap-4 text-sm sm:grid-cols-2">
                            <div>
                                <p className="text-xs text-slate-400">الخدمة</p>
                                <p className="font-bold text-slate-800">{transaction.service_name ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">المبلغ</p>
                                <p className="text-lg font-black text-teal-600">{fmtAmount(transaction.amount_yer)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">طريقة الدفع</p>
                                <p className="font-bold text-slate-800">{transaction.payment_method_name_ar ?? transaction.provider_id}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">تاريخ الدفع</p>
                                <p className="font-bold text-slate-800">{fmtDate(transaction.paid_at ?? receipt?.paid_at)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">رقم عملية البنك</p>
                                <p className="font-mono text-slate-700" dir="ltr">{transaction.bank_transaction_id ?? '-'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-400">الحساب</p>
                                <p className="font-mono text-slate-700" dir="ltr">{transaction.customer_account_masked ?? '-'}</p>
                            </div>
                        </div>
                    </section>

                    {details.lineItems?.length > 0 && (
                        <section className="overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">بنود الخدمة</div>
                            {details.lineItems.map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-3 border-b border-white px-4 py-3 text-sm last:border-b-0">
                                    <span className="font-semibold text-slate-700">{item.item_name}</span>
                                    <span className="font-bold text-teal-700">{fmtAmount(item.amount_yer)}</span>
                                </div>
                            ))}
                        </section>
                    )}

                    {details.refunds?.length > 0 && (
                        <section className="overflow-hidden rounded-lg border border-purple-100 bg-purple-50">
                            <div className="border-b border-purple-100 px-4 py-3 text-sm font-bold text-purple-800">الاستردادات</div>
                            {details.refunds.map((refund) => (
                                <div key={refund.id} className="border-b border-white px-4 py-3 text-sm last:border-b-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="font-semibold text-purple-900">{refund.reason ?? 'استرداد'}</span>
                                        <span className="font-bold text-purple-700">{fmtAmount(refund.amount_yer)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-purple-500">{fmtDate(refund.processed_at ?? refund.created_at)}</p>
                                </div>
                            ))}
                        </section>
                    )}

                    <section className="overflow-hidden rounded-lg border border-slate-100 bg-white">
                        <div className="border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700">سجل العملية</div>
                        {details.events?.length ? details.events.map((event) => (
                            <div key={event.id} className="border-b border-slate-50 px-4 py-3 text-sm last:border-b-0">
                                <p className="font-bold text-slate-700">{EVENT_LABELS[event.event_type] ?? event.event_type}</p>
                                <p className="text-xs text-slate-400">{fmtDate(event.created_at)}</p>
                            </div>
                        )) : (
                            <p className="px-4 py-6 text-center text-sm text-slate-400">لا يوجد سجل أحداث بعد</p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default function PatientPayments() {
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [details, setDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        const { data, error: loadError } = await getMyPayments();
        if (loadError) setError(loadError.message);
        setPayments(data ?? []);
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const openDetails = async (payment) => {
        setDetailsLoading(payment.id);
        const { data, error: detailsError } = await getMyPaymentDetails(payment.id);
        setDetailsLoading(null);
        if (detailsError) {
            setError(detailsError.message);
            return;
        }
        setDetails(data);
    };

    return (
        <div className="space-y-5" dir="rtl">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-black text-slate-800">المدفوعات والإيصالات</h1>
                    <p className="mt-0.5 text-sm text-slate-400">سجل عمليات الدفع الخاصة بحجوزاتك</p>
                </div>
                <button
                    type="button"
                    onClick={load}
                    className="rounded-lg border border-slate-100 bg-white p-2 text-slate-500 transition hover:text-teal-600"
                    aria-label="تحديث المدفوعات"
                >
                    <RefreshCw size={16} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader2 size={24} className="animate-spin text-teal-500" />
                </div>
            ) : error ? (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-500">
                    <AlertCircle size={16} />
                    {error}
                </div>
            ) : payments.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-white py-16 text-center">
                    <Receipt size={40} className="mx-auto mb-3 text-slate-200" />
                    <p className="text-sm font-medium text-slate-400">لا توجد عمليات دفع حتى الآن</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {payments.map((payment) => (
                        <div key={payment.id} className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                                        <CreditCard size={18} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <StatusBadge status={payment.status} />
                                            {payment.receipt_number && (
                                                <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                                                    {payment.receipt_number}
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate font-bold text-slate-800">{payment.service_name ?? '-'}</p>
                                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <CalendarDays size={12} />
                                                {payment.appointment_date ?? '-'}
                                            </span>
                                            {payment.appointment_time && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {payment.appointment_time}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="shrink-0 text-left">
                                    <p className="font-black text-teal-600">{fmtAmount(payment.amount_yer)}</p>
                                    {payment.refunded_amount_yer > 0 && (
                                        <p className="mt-1 text-xs text-purple-500">مسترد: {fmtAmount(payment.refunded_amount_yer)}</p>
                                    )}
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                                <p className="text-xs text-slate-400">
                                    {payment.status === 'otp_sent'
                                        ? 'الدفع بانتظار إدخال رمز OTP ضمن مهلة العملية.'
                                        : payment.last_error_message || fmtDate(payment.paid_at ?? payment.created_at)}
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openDetails(payment)}
                                    disabled={detailsLoading === payment.id}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-teal-50 hover:text-teal-700 disabled:opacity-60"
                                >
                                    {detailsLoading === payment.id ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                                    التفاصيل
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {details && <ReceiptModal details={details} onClose={() => setDetails(null)} />}
        </div>
    );
}
