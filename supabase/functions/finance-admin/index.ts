import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-maintenance-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonRecord = Record<string, unknown>;

class FinanceError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'finance_error') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(body: JsonRecord, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new FinanceError(`Missing required secret: ${name}`, 500, 'missing_secret');
  return value;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function toInteger(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function receiptNumber(transactionId: unknown, paidAt = new Date().toISOString()) {
  const day = paidAt.slice(0, 10).replace(/-/g, '');
  const suffix = String(transactionId).replace(/-/g, '').slice(0, 10).toUpperCase();
  return `RCPT-${day}-${suffix}`;
}

function appointmentLineItem(appointment: JsonRecord, amountYer: number) {
  return {
    item_type: getString(appointment.type) || 'appointment',
    item_id: appointment.id ? String(appointment.id) : null,
    item_name: getString(appointment.service_name) || 'Appointment',
    quantity: 1,
    unit_price_usd: null,
    amount_usd: null,
    exchange_rate: null,
    amount_yer: amountYer,
    metadata: { appointment_id: appointment.id ?? null },
  };
}

async function getActor(req: Request, supabaseAdmin: ReturnType<typeof createClient>, allowMaintenanceToken = false) {
  const maintenanceToken = Deno.env.get('PAYMENT_MAINTENANCE_TOKEN');
  if (allowMaintenanceToken && maintenanceToken && req.headers.get('x-maintenance-token') === maintenanceToken) {
    return { id: null, role: 'system' };
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new FinanceError('Authentication is required.', 401, 'auth_required');

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new FinanceError('Authentication is required.', 401, 'auth_required');

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  const role = getString(profile?.role);
  if (!['admin', 'accountant'].includes(role)) {
    throw new FinanceError('You do not have permission to perform this finance action.', 403, 'forbidden');
  }

  return { id: data.user.id, role };
}

async function logPaymentEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  payload: {
    transactionId?: unknown;
    appointmentId?: unknown;
    patientUserId?: unknown;
    actorUserId?: unknown;
    actorRole?: string;
    eventType: string;
    eventSource?: string;
    statusFrom?: string | null;
    statusTo?: string | null;
    amountYer?: number | null;
    metadata?: JsonRecord;
  },
) {
  await supabaseAdmin.from('payment_events').insert({
    transaction_id: payload.transactionId ?? null,
    appointment_id: payload.appointmentId ?? null,
    patient_user_id: payload.patientUserId ?? null,
    actor_user_id: payload.actorUserId ?? null,
    actor_role: payload.actorRole ?? 'system',
    event_type: payload.eventType,
    event_source: payload.eventSource ?? 'system',
    status_from: payload.statusFrom ?? null,
    status_to: payload.statusTo ?? null,
    amount_yer: payload.amountYer ?? null,
    metadata: payload.metadata ?? {},
  });
}

async function ensureReceipt(
  supabaseAdmin: ReturnType<typeof createClient>,
  transaction: JsonRecord,
  paidAt: string,
  issuedByUserId: string | null,
) {
  const { data: existing } = await supabaseAdmin
    .from('payment_receipts')
    .select('*')
    .eq('transaction_id', transaction.id)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await supabaseAdmin
    .from('payment_receipts')
    .insert({
      receipt_number: receiptNumber(transaction.id, paidAt),
      transaction_id: transaction.id,
      appointment_id: transaction.appointment_id ?? null,
      patient_user_id: transaction.patient_user_id ?? null,
      provider_id: transaction.provider_id,
      amount_yer: transaction.amount_yer,
      currency_id: transaction.currency_id ?? 1,
      paid_at: paidAt,
      issued_by_user_id: issuedByUserId,
      snapshot: {
        provider_id: transaction.provider_id,
        amount_yer: transaction.amount_yer,
        amount_usd: transaction.amount_usd ?? null,
        exchange_rate: transaction.exchange_rate ?? null,
        service_type: transaction.service_type ?? null,
        service_name: transaction.service_name ?? null,
        bank_transaction_id: transaction.bank_transaction_id ?? null,
        paid_at: paidAt,
      },
    })
    .select()
    .single();

  if (error) throw new FinanceError('Could not issue receipt.', 500, 'receipt_create_failed');
  return data;
}

async function ensureLineItem(
  supabaseAdmin: ReturnType<typeof createClient>,
  transaction: JsonRecord,
  appointment: JsonRecord,
  amountYer: number,
) {
  const { count } = await supabaseAdmin
    .from('payment_line_items')
    .select('id', { count: 'exact', head: true })
    .eq('transaction_id', transaction.id);

  if ((count ?? 0) > 0) return;

  await supabaseAdmin.from('payment_line_items').insert({
    transaction_id: transaction.id,
    appointment_id: appointment.id ?? null,
    patient_user_id: appointment.patient_user_id ?? null,
    ...appointmentLineItem(appointment, amountYer),
  });
}

async function getTransaction(supabaseAdmin: ReturnType<typeof createClient>, transactionId: string) {
  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .select('*')
    .eq('id', transactionId)
    .maybeSingle();
  if (error || !data) throw new FinanceError('Payment transaction was not found.', 404, 'transaction_not_found');
  return data;
}

async function issueReceipt(body: JsonRecord, actor: { id: string | null; role: string }, supabaseAdmin: ReturnType<typeof createClient>) {
  const transactionId = getString(body.transactionId);
  if (!transactionId) throw new FinanceError('transactionId is required.', 400, 'missing_transaction_id');
  const transaction = await getTransaction(supabaseAdmin, transactionId);
  if (!['paid', 'partially_refunded', 'refunded'].includes(getString(transaction.status))) {
    throw new FinanceError('Receipts can only be issued for paid transactions.', 409, 'transaction_not_paid');
  }
  const paidAt = getString(transaction.paid_at) || new Date().toISOString();
  const receipt = await ensureReceipt(supabaseAdmin, transaction, paidAt, actor.id);
  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: transaction.appointment_id,
    patientUserId: transaction.patient_user_id,
    actorUserId: actor.id,
    actorRole: actor.role,
    eventType: 'receipt_issued',
    eventSource: actor.role === 'system' ? 'system' : 'admin',
    statusFrom: getString(transaction.status),
    statusTo: getString(transaction.status),
    amountYer: toNumber(transaction.amount_yer),
    metadata: { receipt_number: receipt.receipt_number },
  });
  return { receipt };
}

async function markManualPaid(body: JsonRecord, actor: { id: string | null; role: string }, supabaseAdmin: ReturnType<typeof createClient>) {
  const appointmentId = toInteger(body.appointmentId);
  if (!appointmentId) throw new FinanceError('appointmentId is required.', 400, 'missing_appointment_id');

  const { data: appointment, error } = await supabaseAdmin
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .maybeSingle();
  if (error || !appointment) throw new FinanceError('Appointment was not found.', 404, 'appointment_not_found');
  if (appointment.status === 'cancelled') throw new FinanceError('Cancelled appointments cannot be settled.', 409, 'appointment_cancelled');

  const providerId = getString(body.providerId) || getString(appointment.payment_method_provider_id) || 'cash';
  const amountYer = toInteger(body.amountYer) || toInteger(appointment.total_price_yer);
  if (!amountYer || amountYer < 1) throw new FinanceError('A positive amount is required for manual settlement.', 400, 'missing_amount');

  let transaction: JsonRecord | null = null;
  if (appointment.payment_transaction_id) {
    transaction = await getTransaction(supabaseAdmin, String(appointment.payment_transaction_id));
  } else {
    const idempotencyKey = `manual-${appointmentId}`;
    const { data: existing } = await supabaseAdmin
      .from('payment_transactions')
      .select('*')
      .eq('provider_id', providerId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existing) {
      transaction = existing;
    } else {
      const { data, error: insertError } = await supabaseAdmin
        .from('payment_transactions')
        .insert({
          appointment_id: appointment.id,
          patient_user_id: appointment.patient_user_id,
          provider_id: providerId,
          status: 'initiated',
          amount_yer: amountYer,
          currency_id: 1,
          idempotency_key: idempotencyKey,
          service_type: appointment.type,
          service_name: appointment.service_name,
          amount_source: 'manual_settlement',
          line_items_snapshot: [appointmentLineItem(appointment, amountYer)],
        })
        .select()
        .single();
      if (insertError) throw new FinanceError('Could not create manual payment transaction.', 500, 'transaction_create_failed');
      transaction = data;
    }
  }

  if (!transaction) throw new FinanceError('Could not resolve payment transaction.', 500, 'transaction_missing');
  const paidAt = new Date().toISOString();

  const { data: paidTransaction, error: updateError } = await supabaseAdmin
    .from('payment_transactions')
    .update({
      appointment_id: appointment.id,
      patient_user_id: appointment.patient_user_id,
      provider_id: providerId,
      status: 'paid',
      amount_yer: amountYer,
      paid_at: paidAt,
      service_type: appointment.type,
      service_name: appointment.service_name,
      line_items_snapshot: [appointmentLineItem(appointment, amountYer)],
      last_error_code: null,
      last_error_message: null,
    })
    .eq('id', transaction.id)
    .select()
    .single();
  if (updateError) throw new FinanceError('Could not settle manual payment.', 500, 'manual_settlement_failed');

  await supabaseAdmin
    .from('appointments')
    .update({
      status: appointment.status === 'pending' ? 'confirmed' : appointment.status,
      payment_status: 'paid',
      payment_method_provider_id: providerId,
      payment_transaction_id: paidTransaction.id,
      payment_paid_at: paidAt,
    })
    .eq('id', appointment.id);

  const receipt = await ensureReceipt(supabaseAdmin, paidTransaction, paidAt, actor.id);
  await ensureLineItem(supabaseAdmin, paidTransaction, appointment, amountYer);
  await logPaymentEvent(supabaseAdmin, {
    transactionId: paidTransaction.id,
    appointmentId: appointment.id,
    patientUserId: appointment.patient_user_id,
    actorUserId: actor.id,
    actorRole: actor.role,
    eventType: 'manual_payment_settled',
    eventSource: 'admin',
    statusFrom: getString(transaction.status),
    statusTo: 'paid',
    amountYer,
    metadata: {
      provider_id: providerId,
      receipt_number: receipt.receipt_number,
      note: getString(body.note) || null,
    },
  });

  return { transaction: paidTransaction, receipt };
}

async function recordRefund(body: JsonRecord, actor: { id: string | null; role: string }, supabaseAdmin: ReturnType<typeof createClient>) {
  const transactionId = getString(body.transactionId);
  if (!transactionId) throw new FinanceError('transactionId is required.', 400, 'missing_transaction_id');

  const transaction = await getTransaction(supabaseAdmin, transactionId);
  if (!['paid', 'partially_refunded'].includes(getString(transaction.status))) {
    throw new FinanceError('Only paid transactions can be refunded.', 409, 'transaction_not_refundable');
  }

  const { data: existingRefunds } = await supabaseAdmin
    .from('payment_refunds')
    .select('amount_yer')
    .eq('transaction_id', transaction.id)
    .eq('status', 'processed');
  const refunded = (existingRefunds ?? []).reduce((sum: number, row: JsonRecord) => sum + toNumber(row.amount_yer), 0);
  const remaining = toNumber(transaction.amount_yer) - refunded;
  const amountYer = toInteger(body.amountYer) || remaining;
  if (!amountYer || amountYer < 1) throw new FinanceError('Refund amount must be positive.', 400, 'invalid_refund_amount');
  if (amountYer > remaining) throw new FinanceError('Refund amount exceeds remaining paid amount.', 409, 'refund_exceeds_remaining');

  const { data: receipt } = await supabaseAdmin
    .from('payment_receipts')
    .select('*')
    .eq('transaction_id', transaction.id)
    .maybeSingle();

  const processedAt = new Date().toISOString();
  const { data: refund, error } = await supabaseAdmin
    .from('payment_refunds')
    .insert({
      transaction_id: transaction.id,
      receipt_id: receipt?.id ?? null,
      appointment_id: transaction.appointment_id ?? null,
      patient_user_id: transaction.patient_user_id ?? null,
      amount_yer: amountYer,
      status: 'processed',
      method: getString(body.method) || 'manual',
      reason: getString(body.reason) || null,
      bank_reference: getString(body.bankReference) || null,
      requested_by_user_id: actor.id,
      processed_by_user_id: actor.id,
      processed_at: processedAt,
      notes: getString(body.notes) || null,
    })
    .select()
    .single();
  if (error) throw new FinanceError('Could not record refund.', 500, 'refund_create_failed');

  const totalRefunded = refunded + amountYer;
  const nextStatus = totalRefunded >= toNumber(transaction.amount_yer) ? 'refunded' : 'partially_refunded';
  await supabaseAdmin
    .from('payment_transactions')
    .update({ status: nextStatus })
    .eq('id', transaction.id);

  if (receipt?.id) {
    await supabaseAdmin
      .from('payment_receipts')
      .update({ status: nextStatus === 'refunded' ? 'refunded' : 'partially_refunded' })
      .eq('id', receipt.id);
  }

  if (transaction.appointment_id) {
    await supabaseAdmin
      .from('appointments')
      .update({ payment_status: nextStatus })
      .eq('id', transaction.appointment_id);
  }

  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: transaction.appointment_id,
    patientUserId: transaction.patient_user_id,
    actorUserId: actor.id,
    actorRole: actor.role,
    eventType: 'refund_recorded',
    eventSource: 'admin',
    statusFrom: getString(transaction.status),
    statusTo: nextStatus,
    amountYer,
    metadata: {
      refund_id: refund.id,
      reason: getString(body.reason) || null,
      total_refunded_yer: totalRefunded,
    },
  });

  return { refund, transactionStatus: nextStatus };
}

async function expireStalePayments(actor: { id: string | null; role: string }, supabaseAdmin: ReturnType<typeof createClient>) {
  const now = new Date().toISOString();
  const { data: rows, error } = await supabaseAdmin
    .from('payment_transactions')
    .select('*, appointments(id, status)')
    .eq('status', 'otp_sent')
    .lt('expires_at', now)
    .limit(100);
  if (error) throw new FinanceError('Could not load stale payments.', 500, 'expire_lookup_failed');

  let expiredCount = 0;
  for (const tx of rows ?? []) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'expired',
        last_error_code: 'expired',
        last_error_message: 'OTP window expired',
      })
      .eq('id', tx.id);

    if (tx.appointment_id) {
      await supabaseAdmin
        .from('appointments')
        .update({
          status: 'cancelled',
          payment_status: 'expired',
        })
        .eq('id', tx.appointment_id);
    }

    await logPaymentEvent(supabaseAdmin, {
      transactionId: tx.id,
      appointmentId: tx.appointment_id,
      patientUserId: tx.patient_user_id,
      actorUserId: actor.id,
      actorRole: actor.role,
      eventType: 'payment_expired',
      eventSource: actor.role === 'system' ? 'cron' : 'admin',
      statusFrom: 'otp_sent',
      statusTo: 'expired',
      amountYer: toNumber(tx.amount_yer),
    });
    expiredCount += 1;
  }

  return { expiredCount };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ success: false, error: { message: 'Method not allowed' } }, 405);

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const body = await req.json() as JsonRecord;
    const action = getString(body.action);
    const actor = await getActor(req, supabaseAdmin, action === 'expire_stale');

    if (action === 'expire_stale') {
      return jsonResponse({ success: true, data: await expireStalePayments(actor, supabaseAdmin) });
    }
    if (action === 'mark_manual_paid') {
      return jsonResponse({ success: true, data: await markManualPaid(body, actor, supabaseAdmin) });
    }
    if (action === 'record_refund') {
      return jsonResponse({ success: true, data: await recordRefund(body, actor, supabaseAdmin) });
    }
    if (action === 'issue_receipt') {
      return jsonResponse({ success: true, data: await issueReceipt(body, actor, supabaseAdmin) });
    }

    throw new FinanceError('Unknown finance action.', 400, 'unknown_action');
  } catch (error) {
    const err = error instanceof FinanceError
      ? error
      : new FinanceError('Unexpected finance operation error.', 500, 'unexpected_error');
    return jsonResponse({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    }, err.status);
  }
});
