import { supabase } from '../lib/supabaseClient';

function normalizeError(error) {
    return error?.message ? error : { message: String(error ?? 'Unknown error') };
}

async function invokeFinanceAdmin(body) {
    const { data, error } = await supabase.functions.invoke('finance-admin', { body });

    if (error) {
        let serverError = null;
        try {
            serverError = await error.context?.json?.();
        } catch {
            serverError = null;
        }
        return { data: null, error: serverError?.error ?? normalizeError(error) };
    }

    if (data?.success === false) {
        return { data: null, error: data.error ?? { message: 'Finance operation failed' } };
    }

    return { data: data?.data ?? data, error: null };
}

export async function getFinanceLedger() {
    const { data, error } = await supabase
        .from('payment_transaction_ledger')
        .select('*')
        .order('created_at', { ascending: false });
    return { data: data ?? [], error };
}

export async function getFinanceTransactionDetails(transactionId) {
    const [transaction, events, lineItems, refunds, receipt] = await Promise.all([
        supabase
            .from('payment_transaction_ledger')
            .select('*')
            .eq('id', transactionId)
            .maybeSingle(),
        supabase
            .from('payment_events')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('created_at', { ascending: true }),
        supabase
            .from('payment_line_items')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('created_at', { ascending: true }),
        supabase
            .from('payment_refunds')
            .select('*')
            .eq('transaction_id', transactionId)
            .order('created_at', { ascending: false }),
        supabase
            .from('payment_receipts')
            .select('*')
            .eq('transaction_id', transactionId)
            .maybeSingle(),
    ]);

    const error = transaction.error || events.error || lineItems.error || refunds.error || receipt.error;
    if (error) return { data: null, error };

    return {
        data: {
            transaction: transaction.data,
            events: events.data ?? [],
            lineItems: lineItems.data ?? [],
            refunds: refunds.data ?? [],
            receipt: receipt.data,
        },
        error: null,
    };
}

export async function getManualReceivables() {
    const { data, error } = await supabase
        .from('appointments')
        .select('id, patient_name, phone_number, appointment_date, appointment_time, service_name, type, status, total_price_yer, payment_status, payment_method_provider_id, created_at')
        .eq('payment_status', 'manual_pending')
        .order('created_at', { ascending: false });
    return { data: data ?? [], error };
}

export async function markManualPaymentPaid({ appointmentId, amountYer, providerId = 'cash', note = '' }) {
    return invokeFinanceAdmin({
        action: 'mark_manual_paid',
        appointmentId,
        amountYer,
        providerId,
        note,
    });
}

export async function recordPaymentRefund({ transactionId, amountYer, reason, method = 'manual', bankReference = '', notes = '' }) {
    return invokeFinanceAdmin({
        action: 'record_refund',
        transactionId,
        amountYer,
        reason,
        method,
        bankReference,
        notes,
    });
}

export async function issuePaymentReceipt(transactionId) {
    return invokeFinanceAdmin({
        action: 'issue_receipt',
        transactionId,
    });
}

export async function expireStalePayments() {
    return invokeFinanceAdmin({ action: 'expire_stale' });
}
