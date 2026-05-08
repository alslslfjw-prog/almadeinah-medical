import { createClient } from 'npm:@supabase/supabase-js@2';

const PROVIDER_ID = 'alqutabi_bank';
const OTP_EXPIRY_MINUTES = 10;
const MAX_INITIATES_PER_WINDOW = 5;
const INITIATE_WINDOW_MINUTES = 10;
const MAX_CONFIRM_ATTEMPTS = 5;
const MAX_RESENDS = 3;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type JsonRecord = Record<string, unknown>;

type PricingLineItem = {
  item_type: string;
  item_id?: string | number | null;
  item_name: string;
  quantity: number;
  unit_price_usd: number;
  amount_usd: number;
  exchange_rate: number;
  amount_yer: number;
  metadata?: JsonRecord;
};

type PricingSummary = {
  amountYer: number;
  amountUsd: number;
  exchangeRate: number;
  amountSource: string;
  serviceType: string;
  serviceName: string;
  lineItems: PricingLineItem[];
};

class PaymentError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = 'payment_error') {
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
  if (!value) {
    throw new PaymentError('Payment gateway is not configured.', 500, 'missing_gateway_secret');
  }
  return value;
}

function toNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' ? value as JsonRecord : {};
}

function maskAccount(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 4) return '****';
  return `${'*'.repeat(Math.max(digits.length - 4, 4))}${digits.slice(-4)}`;
}

function cleanDigits(value: unknown, fieldName: string) {
  const text = String(value ?? '').replace(/\D/g, '');
  if (!text) throw new PaymentError(`${fieldName} is required`);
  return text;
}

function normalizeSlotId(value: unknown) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function receiptNumber(transactionId: unknown, paidAt = new Date().toISOString()) {
  const day = paidAt.slice(0, 10).replace(/-/g, '');
  const suffix = String(transactionId).replace(/-/g, '').slice(0, 10).toUpperCase();
  return `RCPT-${day}-${suffix}`;
}

function lineItemSnapshot(line: PricingLineItem) {
  return {
    item_type: line.item_type,
    item_id: line.item_id ?? null,
    item_name: line.item_name,
    quantity: line.quantity,
    unit_price_usd: line.unit_price_usd,
    amount_usd: line.amount_usd,
    exchange_rate: line.exchange_rate,
    amount_yer: line.amount_yer,
    metadata: line.metadata ?? {},
  };
}

function safeGatewayResponse(payload: JsonRecord | null | undefined) {
  if (!payload) return {};
  const allowed = [
    'status',
    'description',
    'descriptionEn',
    'errorCode',
    'transactionID',
    'transactionId',
    'currencyId',
    'atmNo',
    'accountType',
  ];
  return Object.fromEntries(allowed.filter((key) => key in payload).map((key) => [key, payload[key]]));
}

function gatewayTransactionId(payload: JsonRecord | null | undefined) {
  return getString(payload?.transactionID) || getString(payload?.transactionId) || null;
}

function gatewaySuccess(payload: JsonRecord | null | undefined) {
  const value = payload?.status;
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', 'success', 'succeeded', 'paid', '1', '200', 'ok'].includes(normalized);
  }
  return false;
}

function gatewayErrorMessage(payload: JsonRecord | null | undefined) {
  return (
    getString(payload?.description) ||
    getString(payload?.descriptionEn) ||
    getString(payload?.message) ||
    'The bank could not complete the payment.'
  );
}

async function encryptMerchantId(merchantId: string, apiKey: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiKey),
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: new Uint8Array(16) },
    key,
    encoder.encode(merchantId),
  );
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

function bankConfig() {
  const baseUrl = requiredEnv('ALQUTABI_BASE_URL').replace(/\/+$/, '');
  const appKey = requiredEnv('ALQUTABI_APP_KEY');
  const apiKey = requiredEnv('ALQUTABI_API_KEY');
  const merchantId = requiredEnv('ALQUTABI_MERCHANT_ID');
  const currencyId = Number(Deno.env.get('ALQUTABI_CURRENCY_ID') ?? '1') || 1;
  return { baseUrl, appKey, apiKey, merchantId, currencyId };
}

async function encryptedCustomerNo(config: ReturnType<typeof bankConfig>) {
  return Deno.env.get('ALQUTABI_CUSTOMER_NO_ENCRYPTED') || await encryptMerchantId(config.merchantId, config.apiKey);
}

async function bankRequest(endpoint: string, body: JsonRecord) {
  const config = bankConfig();
  const response = await fetch(`${config.baseUrl}/E_Payment/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': config.apiKey,
      'X-APP-KEY': config.appKey,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let payload: JsonRecord = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { status: false, description: text };
  }

  if (!response.ok) {
    throw new PaymentError(gatewayErrorMessage(payload), response.status, 'bank_http_error');
  }

  return payload;
}

async function getAuthedUser(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    throw new PaymentError('Please sign in to complete electronic payment.', 401, 'auth_required');
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    throw new PaymentError('Your session has expired. Please sign in again.', 401, 'auth_required');
  }

  return data.user;
}

async function getExchangeRate(supabaseAdmin: ReturnType<typeof createClient>) {
  const { data, error } = await supabaseAdmin
    .from('site_settings')
    .select('usd_to_yer_rate')
    .eq('id', 1)
    .single();
  if (error) throw new PaymentError('Could not read exchange rate.', 500, 'rate_lookup_failed');
  return toNumber(data?.usd_to_yer_rate);
}

function makeLineItem(
  itemType: string,
  itemId: string | number | null,
  itemName: string,
  priceUsd: number,
  exchangeRate: number,
  metadata: JsonRecord = {},
): PricingLineItem {
  return {
    item_type: itemType,
    item_id: itemId,
    item_name: itemName,
    quantity: 1,
    unit_price_usd: priceUsd,
    amount_usd: priceUsd,
    exchange_rate: exchangeRate,
    amount_yer: Math.round(priceUsd * exchangeRate),
    metadata,
  };
}

function buildPricing(
  exchangeRate: number,
  amountSource: string,
  serviceType: string,
  serviceName: string,
  lineItems: PricingLineItem[],
): PricingSummary {
  const amountUsd = lineItems.reduce((sum, line) => sum + toNumber(line.amount_usd), 0);
  const amountYer = Math.round(amountUsd * exchangeRate);
  if (!amountYer || amountYer < 1) {
    throw new PaymentError('Electronic payment is unavailable because the service price is not configured.', 400, 'amount_not_available');
  }
  return {
    amountYer,
    amountUsd,
    exchangeRate,
    amountSource,
    serviceType,
    serviceName,
    lineItems,
  };
}

async function derivePricing(supabaseAdmin: ReturnType<typeof createClient>, booking: JsonRecord): Promise<PricingSummary> {
  const rate = await getExchangeRate(supabaseAdmin);
  if (!rate) throw new PaymentError('Current exchange rate is missing.', 500, 'missing_exchange_rate');

  const doctorSlotId = normalizeSlotId(booking.doctorTimeSlotId ?? booking.doctor_time_slot_id);
  const scanSlotId = normalizeSlotId(booking.scanTimeSlotId ?? booking.scan_time_slot_id);
  const doctor = asRecord(booking.doctor);
  const doctorId = normalizeSlotId(doctor.id ?? booking.doctorId ?? booking.doctor_id);
  const scanId = normalizeSlotId(booking.scanId ?? booking.scan_id);
  const bookingType = getString(booking.type);
  const selectedName = getString(booking.primarySelection);

  if (doctorSlotId) {
    const { data, error } = await supabaseAdmin
      .from('doctor_time_slots')
      .select('doctor_id, is_blocked, status, doctors(id, name, price)')
      .eq('id', doctorSlotId)
      .maybeSingle();
    if (error || !data) throw new PaymentError('Selected appointment slot was not found.', 409, 'slot_unavailable');
    if (data.is_blocked || data.status !== 'available') {
      throw new PaymentError('Selected appointment slot is no longer available.', 409, 'slot_unavailable');
    }
    const doctorRow = asRecord(data.doctors);
    const priceUsd = toNumber(doctorRow.price);
    const name = getString(doctorRow.name) || selectedName || 'Doctor appointment';
    return buildPricing(
      rate,
      'doctor_time_slot',
      bookingType || 'doctors',
      name,
      [makeLineItem('doctor', getString(doctorRow.id) || data.doctor_id, name, priceUsd, rate, { doctor_time_slot_id: doctorSlotId })],
    );
  }

  if (doctorId) {
    const { data } = await supabaseAdmin
      .from('doctors')
      .select('id, name, price')
      .eq('id', doctorId)
      .maybeSingle();
    const doctorRow = asRecord(data);
    const priceUsd = toNumber(doctorRow.price);
    const name = getString(doctorRow.name) || selectedName || 'Doctor appointment';
    return buildPricing(
      rate,
      'doctor_id',
      bookingType || 'doctors',
      name,
      [makeLineItem('doctor', doctorId, name, priceUsd, rate)],
    );
  }

  if (scanSlotId) {
    const { data, error } = await supabaseAdmin
      .from('scan_time_slots')
      .select('scan_id, is_blocked, status, scans(id, name, price)')
      .eq('id', scanSlotId)
      .maybeSingle();
    if (error || !data) throw new PaymentError('Selected scan slot was not found.', 409, 'slot_unavailable');
    if (data.is_blocked || data.status !== 'available') {
      throw new PaymentError('Selected scan slot is no longer available.', 409, 'slot_unavailable');
    }
    const scanRow = asRecord(data.scans);
    const priceUsd = toNumber(scanRow.price);
    const name = getString(scanRow.name) || selectedName || 'Scan appointment';
    return buildPricing(
      rate,
      'scan_time_slot',
      'scans',
      name,
      [makeLineItem('scan', getString(scanRow.id) || data.scan_id, name, priceUsd, rate, { scan_time_slot_id: scanSlotId })],
    );
  }

  if (scanId) {
    const { data } = await supabaseAdmin
      .from('scans')
      .select('id, name, price')
      .eq('id', scanId)
      .maybeSingle();
    const scanRow = asRecord(data);
    const priceUsd = toNumber(scanRow.price);
    const name = getString(scanRow.name) || selectedName || 'Scan appointment';
    return buildPricing(
      rate,
      'scan_id',
      'scans',
      name,
      [makeLineItem('scan', scanId, name, priceUsd, rate)],
    );
  }

  if (booking.isPackage) {
    const title = selectedName;
    if (title) {
      const { data } = await supabaseAdmin
        .from('medical_packages')
        .select('id, title, price')
        .eq('title', title)
        .maybeSingle();
      const pkg = asRecord(data);
      const name = getString(pkg.title) || title;
      return buildPricing(
        rate,
        'medical_package_title',
        'lab',
        name,
        [makeLineItem('package', getString(pkg.id) || null, name, toNumber(pkg.price), rate)],
      );
    }
  }

  if (bookingType === 'lab') {
    const names = selectedName
      .split(/[,\u060C]/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (names.length) {
      const { data } = await supabaseAdmin
        .from('medical_tests_guide')
        .select('id, name, price')
        .in('name', names);
      const rows = (data ?? []) as JsonRecord[];
      const lines = rows.map((row) => makeLineItem(
        'lab_test',
        getString(row.id) || null,
        getString(row.name) || 'Lab test',
        toNumber(row.price),
        rate,
      ));
      return buildPricing(rate, 'lab_test_names', 'lab', names.join('، '), lines);
    }
  }

  throw new PaymentError('Could not derive a payable amount for this booking.', 400, 'amount_not_available');
}

function appointmentPayload(
  booking: JsonRecord,
  patient: JsonRecord,
  userId: string,
  pricing: PricingSummary,
  transactionId: string,
  expiresAt: string,
) {
  const doctor = asRecord(booking.doctor);

  return {
    patient_name: getString(patient.name),
    phone_number: cleanDigits(patient.phone, 'phone number'),
    appointment_date: getString(booking.date) || null,
    appointment_time: getString(booking.time) || null,
    doctor_time_slot_id: normalizeSlotId(booking.doctorTimeSlotId ?? booking.doctor_time_slot_id),
    scan_time_slot_id: normalizeSlotId(booking.scanTimeSlotId ?? booking.scan_time_slot_id),
    doctor_id: normalizeSlotId(doctor.id ?? booking.doctorId ?? booking.doctor_id),
    scan_id: normalizeSlotId(booking.scanId ?? booking.scan_id),
    status: 'pending',
    patient_user_id: userId,
    service_name: pricing.serviceName,
    type: getString(booking.type) || pricing.serviceType || null,
    total_price_yer: pricing.amountYer,
    payment_status: 'otp_pending',
    payment_method_provider_id: PROVIDER_ID,
    payment_transaction_id: transactionId,
    payment_expires_at: expiresAt,
  };
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

async function insertLineItems(
  supabaseAdmin: ReturnType<typeof createClient>,
  transactionId: string,
  appointmentId: number,
  patientUserId: string,
  pricing: PricingSummary,
) {
  if (!pricing.lineItems.length) return;
  await supabaseAdmin.from('payment_line_items').insert(
    pricing.lineItems.map((line) => ({
      transaction_id: transactionId,
      appointment_id: appointmentId,
      patient_user_id: patientUserId,
      ...lineItemSnapshot(line),
    })),
  );
}

async function ensureReceipt(
  supabaseAdmin: ReturnType<typeof createClient>,
  transaction: JsonRecord,
  paidAt: string,
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
      provider_id: transaction.provider_id ?? PROVIDER_ID,
      amount_yer: transaction.amount_yer,
      currency_id: transaction.currency_id ?? 1,
      paid_at: paidAt,
      snapshot: {
        provider_id: transaction.provider_id ?? PROVIDER_ID,
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

  if (error) {
    const { data: retry } = await supabaseAdmin
      .from('payment_receipts')
      .select('*')
      .eq('transaction_id', transaction.id)
      .maybeSingle();
    if (retry) return retry;
    throw new PaymentError('Payment succeeded, but receipt creation failed.', 500, 'receipt_create_failed');
  }

  return data;
}

async function insertOrGetTransaction(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  idempotencyKey: string,
  pricing: PricingSummary,
  currencyId: number,
  accountMasked: string,
) {
  const { data: existing } = await supabaseAdmin
    .from('payment_transactions')
    .select('*')
    .eq('provider_id', PROVIDER_ID)
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (existing) return { transaction: existing, existing: true };

  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .insert({
      patient_user_id: userId,
      provider_id: PROVIDER_ID,
      status: 'initiated',
      amount_yer: pricing.amountYer,
      amount_usd: pricing.amountUsd,
      exchange_rate: pricing.exchangeRate,
      amount_source: pricing.amountSource,
      service_type: pricing.serviceType,
      service_name: pricing.serviceName,
      line_items_snapshot: pricing.lineItems.map(lineItemSnapshot),
      currency_id: currencyId,
      customer_account_masked: accountMasked,
      idempotency_key: idempotencyKey,
    })
    .select()
    .single();

  if (error) throw new PaymentError('Could not create payment transaction.', 500, 'transaction_create_failed');
  return { transaction: data, existing: false };
}

async function expireTransaction(supabaseAdmin: ReturnType<typeof createClient>, transaction: JsonRecord) {
  await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: 'expired',
      last_error_code: 'expired',
      last_error_message: 'OTP window expired',
    })
    .eq('id', transaction.id);

  if (transaction.appointment_id) {
    await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        payment_status: 'expired',
      })
      .eq('id', transaction.appointment_id);
  }

  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: transaction.appointment_id,
    patientUserId: transaction.patient_user_id,
    eventType: 'payment_expired',
    eventSource: 'system',
    statusFrom: getString(transaction.status) || null,
    statusTo: 'expired',
    amountYer: toNumber(transaction.amount_yer),
  });
}

async function initiatePayment(reqBody: JsonRecord, userId: string, supabaseAdmin: ReturnType<typeof createClient>) {
  const booking = (reqBody.bookingData ?? reqBody.booking) as JsonRecord | undefined;
  const patient = (reqBody.patient ?? {}) as JsonRecord;
  const idempotencyKey = getString(reqBody.idempotencyKey);
  const customerAccountNumber = cleanDigits(reqBody.customerAccountNumber, 'customer account number');
  const paymentCode = cleanDigits(reqBody.paymentCode, 'payment code');

  if (!booking) throw new PaymentError('Booking data is incomplete.');
  if (!getString(patient.name)) throw new PaymentError('Patient name is required.');
  if (!idempotencyKey) throw new PaymentError('Idempotency key is missing.', 400, 'missing_idempotency_key');

  const windowStart = new Date(Date.now() - INITIATE_WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count } = await supabaseAdmin
    .from('payment_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('patient_user_id', userId)
    .eq('provider_id', PROVIDER_ID)
    .gte('created_at', windowStart);

  if ((count ?? 0) >= MAX_INITIATES_PER_WINDOW) {
    throw new PaymentError('Too many payment attempts. Please try again shortly.', 429, 'rate_limited');
  }

  const config = bankConfig();
  const pricing = await derivePricing(supabaseAdmin, booking);
  const expiresAt = addMinutes(new Date(), OTP_EXPIRY_MINUTES).toISOString();
  const maskedAccount = maskAccount(customerAccountNumber);
  const { transaction, existing } = await insertOrGetTransaction(
    supabaseAdmin,
    userId,
    idempotencyKey,
    pricing,
    config.currencyId,
    maskedAccount,
  );

  if (existing) {
    if (transaction.status === 'paid') {
      return {
        status: 'paid',
        paymentSessionId: transaction.id,
        appointmentId: transaction.appointment_id,
        expiresAt: transaction.expires_at,
      };
    }
    return {
      status: 'otp_required',
      paymentSessionId: transaction.id,
      appointmentId: transaction.appointment_id,
      expiresAt: transaction.expires_at,
    };
  }

  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    patientUserId: userId,
    actorUserId: userId,
    actorRole: 'patient',
    eventType: 'payment_initiated',
    eventSource: 'patient',
    statusTo: 'initiated',
    amountYer: pricing.amountYer,
    metadata: { amount_source: pricing.amountSource, service_name: pricing.serviceName },
  });

  const { data: appointment, error: appointmentError } = await supabaseAdmin
    .from('appointments')
    .insert(appointmentPayload(booking, patient, userId, pricing, transaction.id, expiresAt))
    .select()
    .single();

  if (appointmentError) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'failed',
        last_error_code: appointmentError.code ?? 'appointment_create_failed',
        last_error_message: appointmentError.message,
      })
      .eq('id', transaction.id);
    await logPaymentEvent(supabaseAdmin, {
      transactionId: transaction.id,
      patientUserId: userId,
      eventType: 'appointment_create_failed',
      eventSource: 'system',
      statusFrom: 'initiated',
      statusTo: 'failed',
      amountYer: pricing.amountYer,
      metadata: { error_code: appointmentError.code, error_message: appointmentError.message },
    });
    throw new PaymentError('Selected appointment is no longer available or could not be created.', 409, 'appointment_create_failed');
  }

  await supabaseAdmin
    .from('payment_transactions')
    .update({ appointment_id: appointment.id })
    .eq('id', transaction.id);
  await insertLineItems(supabaseAdmin, transaction.id, appointment.id, userId, pricing);

  const customerNo = await encryptedCustomerNo(config);
  const bankPayload = {
    customer_no: customerNo,
    payment_DestNation: config.merchantId,
    payment_CustomerNo: customerAccountNumber,
    payment_Code: paymentCode,
    payment_Amount: pricing.amountYer,
    payment_Curr: config.currencyId,
  };

  const gatewayPayload = await bankRequest('RequestPayment', bankPayload);
  const safeResponse = safeGatewayResponse(gatewayPayload);

  if (!gatewaySuccess(gatewayPayload)) {
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: 'failed',
        last_error_code: getString(gatewayPayload.errorCode) || 'bank_request_failed',
        last_error_message: gatewayErrorMessage(gatewayPayload),
        gateway_response: safeResponse,
      })
      .eq('id', transaction.id);

    await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
      })
      .eq('id', appointment.id);

    await logPaymentEvent(supabaseAdmin, {
      transactionId: transaction.id,
      appointmentId: appointment.id,
      patientUserId: userId,
      eventType: 'bank_request_failed',
      eventSource: 'bank',
      statusFrom: 'initiated',
      statusTo: 'failed',
      amountYer: pricing.amountYer,
      metadata: safeResponse,
    });

    throw new PaymentError(gatewayErrorMessage(gatewayPayload), 402, 'bank_request_failed');
  }

  const bankTransactionId = gatewayTransactionId(gatewayPayload);
  await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: 'otp_sent',
      bank_transaction_id: bankTransactionId,
      otp_sent_at: new Date().toISOString(),
      expires_at: expiresAt,
      gateway_response: safeResponse,
      last_error_code: null,
      last_error_message: null,
    })
    .eq('id', transaction.id);

  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: appointment.id,
    patientUserId: userId,
    eventType: 'otp_sent',
    eventSource: 'bank',
    statusFrom: 'initiated',
    statusTo: 'otp_sent',
    amountYer: pricing.amountYer,
    metadata: { bank_transaction_id: bankTransactionId },
  });

  return {
    status: 'otp_required',
    paymentSessionId: transaction.id,
    appointmentId: appointment.id,
    expiresAt,
    bankTransactionId,
    message: 'OTP has been sent by the bank.',
  };
}

async function getOwnedTransaction(supabaseAdmin: ReturnType<typeof createClient>, paymentSessionId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('payment_transactions')
    .select('*')
    .eq('id', paymentSessionId)
    .eq('provider_id', PROVIDER_ID)
    .maybeSingle();

  if (error || !data) throw new PaymentError('Payment transaction was not found.', 404, 'transaction_not_found');
  if (data.patient_user_id !== userId) throw new PaymentError('You do not have access to this payment transaction.', 403, 'forbidden');
  if (data.status === 'paid') throw new PaymentError('This payment was already completed.', 409, 'already_paid');
  if (data.status !== 'otp_sent') throw new PaymentError('This payment can no longer be confirmed.', 409, 'invalid_transaction_state');
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    await expireTransaction(supabaseAdmin, data);
    throw new PaymentError('The OTP window has expired. Please start a new payment.', 410, 'expired');
  }
  return data;
}

async function confirmPayment(reqBody: JsonRecord, userId: string, supabaseAdmin: ReturnType<typeof createClient>) {
  const paymentSessionId = getString(reqBody.paymentSessionId);
  const otp = cleanDigits(reqBody.otp, 'OTP');
  const customerAccountNumber = cleanDigits(reqBody.customerAccountNumber, 'customer account number');
  const paymentCode = cleanDigits(reqBody.paymentCode, 'payment code');

  if (!paymentSessionId) throw new PaymentError('Payment session id is required.');
  const transaction = await getOwnedTransaction(supabaseAdmin, paymentSessionId, userId);
  if (Number(transaction.attempts_count ?? 0) >= MAX_CONFIRM_ATTEMPTS) {
    throw new PaymentError('Too many OTP attempts.', 429, 'too_many_attempts');
  }
  if (transaction.customer_account_masked && transaction.customer_account_masked !== maskAccount(customerAccountNumber)) {
    throw new PaymentError('Account number does not match this payment session.', 400, 'account_mismatch');
  }

  const config = bankConfig();
  const customerNo = await encryptedCustomerNo(config);
  const gatewayPayload = await bankRequest('ConfirmPayment', {
    customer_no: customerNo,
    payment_DestNation: config.merchantId,
    payment_CustomerNo: customerAccountNumber,
    payment_Code: paymentCode,
    payment_Amount: transaction.amount_yer,
    payment_Curr: transaction.currency_id,
    Payment_OTP: otp,
  });
  const safeResponse = safeGatewayResponse(gatewayPayload);
  const nextAttempts = Number(transaction.attempts_count ?? 0) + 1;

  if (!gatewaySuccess(gatewayPayload)) {
    const finalFailure = nextAttempts >= MAX_CONFIRM_ATTEMPTS;
    await supabaseAdmin
      .from('payment_transactions')
      .update({
        status: finalFailure ? 'failed' : 'otp_sent',
        attempts_count: nextAttempts,
        last_error_code: getString(gatewayPayload.errorCode) || 'otp_failed',
        last_error_message: gatewayErrorMessage(gatewayPayload),
        gateway_response: safeResponse,
      })
      .eq('id', transaction.id);

    if (finalFailure && transaction.appointment_id) {
      await supabaseAdmin
        .from('appointments')
        .update({
          status: 'cancelled',
          payment_status: 'failed',
        })
        .eq('id', transaction.appointment_id);
    }

    await logPaymentEvent(supabaseAdmin, {
      transactionId: transaction.id,
      appointmentId: transaction.appointment_id,
      patientUserId: transaction.patient_user_id,
      actorUserId: userId,
      actorRole: 'patient',
      eventType: finalFailure ? 'payment_failed' : 'otp_failed',
      eventSource: 'bank',
      statusFrom: 'otp_sent',
      statusTo: finalFailure ? 'failed' : 'otp_sent',
      amountYer: toNumber(transaction.amount_yer),
      metadata: safeResponse,
    });

    throw new PaymentError(gatewayErrorMessage(gatewayPayload), finalFailure ? 429 : 402, 'otp_failed');
  }

  const paidAt = new Date().toISOString();
  const bankTransactionId = gatewayTransactionId(gatewayPayload) || transaction.bank_transaction_id;

  await supabaseAdmin
    .from('payment_transactions')
    .update({
      status: 'paid',
      attempts_count: nextAttempts,
      bank_transaction_id: bankTransactionId,
      paid_at: paidAt,
      gateway_response: safeResponse,
      last_error_code: null,
      last_error_message: null,
    })
    .eq('id', transaction.id);

  if (transaction.appointment_id) {
    await supabaseAdmin
      .from('appointments')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_paid_at: paidAt,
        payment_transaction_id: transaction.id,
      })
      .eq('id', transaction.appointment_id);
  }

  const paidTransaction = {
    ...transaction,
    status: 'paid',
    attempts_count: nextAttempts,
    bank_transaction_id: bankTransactionId,
    paid_at: paidAt,
  };
  const receipt = await ensureReceipt(supabaseAdmin, paidTransaction, paidAt);
  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: transaction.appointment_id,
    patientUserId: transaction.patient_user_id,
    actorUserId: userId,
    actorRole: 'patient',
    eventType: 'payment_paid',
    eventSource: 'bank',
    statusFrom: 'otp_sent',
    statusTo: 'paid',
    amountYer: toNumber(transaction.amount_yer),
    metadata: { bank_transaction_id: bankTransactionId, receipt_number: receipt.receipt_number },
  });

  return {
    status: 'paid',
    paymentSessionId: transaction.id,
    appointmentId: transaction.appointment_id,
    bankTransactionId,
    receiptNumber: receipt.receipt_number,
    paidAt,
  };
}

async function resendOtp(reqBody: JsonRecord, userId: string, supabaseAdmin: ReturnType<typeof createClient>) {
  const paymentSessionId = getString(reqBody.paymentSessionId);
  const customerAccountNumber = cleanDigits(reqBody.customerAccountNumber, 'customer account number');
  const paymentCode = cleanDigits(reqBody.paymentCode, 'payment code');
  const previousOtp = String(reqBody.otp ?? '0').replace(/\D/g, '') || '0';

  if (!paymentSessionId) throw new PaymentError('Payment session id is required.');
  const transaction = await getOwnedTransaction(supabaseAdmin, paymentSessionId, userId);
  if (Number(transaction.resend_count ?? 0) >= MAX_RESENDS) {
    throw new PaymentError('Too many OTP resend attempts.', 429, 'too_many_resends');
  }

  const config = bankConfig();
  const customerNo = await encryptedCustomerNo(config);
  const gatewayPayload = await bankRequest('ResendOTP', {
    customer_no: customerNo,
    payment_DestNation: config.merchantId,
    payment_CustomerNo: customerAccountNumber,
    payment_Code: paymentCode,
    payment_Amount: transaction.amount_yer,
    payment_Curr: transaction.currency_id,
    Payment_OTP: previousOtp,
  });
  const safeResponse = safeGatewayResponse(gatewayPayload);
  const nextResends = Number(transaction.resend_count ?? 0) + 1;

  await supabaseAdmin
    .from('payment_transactions')
    .update({
      resend_count: nextResends,
      gateway_response: safeResponse,
      last_error_code: gatewaySuccess(gatewayPayload) ? null : getString(gatewayPayload.errorCode) || 'resend_failed',
      last_error_message: gatewaySuccess(gatewayPayload) ? null : gatewayErrorMessage(gatewayPayload),
    })
    .eq('id', transaction.id);

  if (!gatewaySuccess(gatewayPayload)) {
    await logPaymentEvent(supabaseAdmin, {
      transactionId: transaction.id,
      appointmentId: transaction.appointment_id,
      patientUserId: transaction.patient_user_id,
      actorUserId: userId,
      actorRole: 'patient',
      eventType: 'otp_resend_failed',
      eventSource: 'bank',
      statusFrom: 'otp_sent',
      statusTo: 'otp_sent',
      amountYer: toNumber(transaction.amount_yer),
      metadata: safeResponse,
    });
    throw new PaymentError(gatewayErrorMessage(gatewayPayload), 402, 'resend_failed');
  }

  await logPaymentEvent(supabaseAdmin, {
    transactionId: transaction.id,
    appointmentId: transaction.appointment_id,
    patientUserId: transaction.patient_user_id,
    actorUserId: userId,
    actorRole: 'patient',
    eventType: 'otp_resent',
    eventSource: 'bank',
    statusFrom: 'otp_sent',
    statusTo: 'otp_sent',
    amountYer: toNumber(transaction.amount_yer),
    metadata: { resend_count: nextResends },
  });

  return {
    status: 'otp_required',
    paymentSessionId: transaction.id,
    resendCount: nextResends,
    message: 'OTP was resent.',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const supabaseUrl = requiredEnv('SUPABASE_URL');
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const user = await getAuthedUser(req, supabaseAdmin);
    const body = await req.json() as JsonRecord;
    const action = getString(body.action);

    if (action === 'initiate') {
      const data = await initiatePayment(body, user.id, supabaseAdmin);
      return jsonResponse({ success: true, data });
    }
    if (action === 'confirm') {
      const data = await confirmPayment(body, user.id, supabaseAdmin);
      return jsonResponse({ success: true, data });
    }
    if (action === 'resend_otp') {
      const data = await resendOtp(body, user.id, supabaseAdmin);
      return jsonResponse({ success: true, data });
    }

    throw new PaymentError('Unknown payment action.', 400, 'unknown_action');
  } catch (error) {
    const err = error instanceof PaymentError
      ? error
      : new PaymentError('Unexpected payment processing error.', 500, 'unexpected_error');

    return jsonResponse({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    }, err.status);
  }
});
