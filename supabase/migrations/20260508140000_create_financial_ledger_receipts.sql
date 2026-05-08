create schema if not exists private;

alter table public.payment_transactions
    add column if not exists amount_usd numeric,
    add column if not exists exchange_rate numeric,
    add column if not exists amount_source text,
    add column if not exists service_type text,
    add column if not exists service_name text,
    add column if not exists line_items_snapshot jsonb not null default '[]'::jsonb;

alter table public.payment_transactions
    drop constraint if exists payment_transactions_status_check;

alter table public.payment_transactions
    add constraint payment_transactions_status_check
    check (
        status in (
            'initiated',
            'otp_sent',
            'paid',
            'failed',
            'expired',
            'cancelled',
            'partially_refunded',
            'refunded'
        )
    );

alter table public.appointments
    drop constraint if exists appointments_payment_status_check;

alter table public.appointments
    add constraint appointments_payment_status_check
    check (
        payment_status is null
        or payment_status in (
            'manual_pending',
            'otp_pending',
            'paid',
            'failed',
            'expired',
            'cancelled',
            'legacy',
            'partially_refunded',
            'refunded'
        )
    );

create table if not exists public.payment_events (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid references public.payment_transactions(id) on delete cascade,
    appointment_id bigint references public.appointments(id) on delete set null,
    patient_user_id uuid references auth.users(id) on delete set null,
    actor_user_id uuid references auth.users(id) on delete set null,
    actor_role text not null default 'system',
    event_type text not null,
    event_source text not null default 'system',
    status_from text,
    status_to text,
    amount_yer integer,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint payment_events_event_source_check check (
        event_source in ('system', 'patient', 'admin', 'bank', 'cron')
    )
);

create table if not exists public.payment_receipts (
    id uuid primary key default gen_random_uuid(),
    receipt_number text not null unique,
    transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
    appointment_id bigint references public.appointments(id) on delete set null,
    patient_user_id uuid references auth.users(id) on delete set null,
    provider_id text not null,
    amount_yer integer not null,
    currency_id integer not null default 1,
    status text not null default 'active',
    issued_at timestamptz not null default now(),
    paid_at timestamptz,
    issued_by_user_id uuid references auth.users(id) on delete set null,
    snapshot jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint payment_receipts_amount_positive check (amount_yer > 0),
    constraint payment_receipts_status_check check (
        status in ('active', 'partially_refunded', 'refunded', 'void')
    )
);

create unique index if not exists payment_receipts_transaction_idx
    on public.payment_receipts (transaction_id);

create table if not exists public.payment_refunds (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.payment_transactions(id) on delete restrict,
    receipt_id uuid references public.payment_receipts(id) on delete set null,
    appointment_id bigint references public.appointments(id) on delete set null,
    patient_user_id uuid references auth.users(id) on delete set null,
    amount_yer integer not null,
    status text not null default 'processed',
    method text not null default 'manual',
    reason text,
    bank_reference text,
    requested_by_user_id uuid references auth.users(id) on delete set null,
    processed_by_user_id uuid references auth.users(id) on delete set null,
    requested_at timestamptz not null default now(),
    processed_at timestamptz,
    notes text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint payment_refunds_amount_positive check (amount_yer > 0),
    constraint payment_refunds_status_check check (
        status in ('requested', 'approved', 'processed', 'rejected', 'cancelled')
    ),
    constraint payment_refunds_method_check check (
        method in ('manual', 'bank', 'cash', 'adjustment')
    )
);

create table if not exists public.payment_line_items (
    id uuid primary key default gen_random_uuid(),
    transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
    appointment_id bigint references public.appointments(id) on delete set null,
    patient_user_id uuid references auth.users(id) on delete set null,
    item_type text not null,
    item_id text,
    item_name text not null,
    quantity integer not null default 1,
    unit_price_usd numeric,
    amount_usd numeric,
    exchange_rate numeric,
    amount_yer integer not null,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint payment_line_items_quantity_positive check (quantity > 0),
    constraint payment_line_items_amount_positive check (amount_yer >= 0)
);

create table if not exists public.payment_reconciliation_items (
    id uuid primary key default gen_random_uuid(),
    provider_id text not null,
    bank_transaction_id text,
    transaction_id uuid references public.payment_transactions(id) on delete set null,
    statement_date date,
    amount_yer integer,
    status text not null default 'manual_review',
    mismatch_reason text,
    imported_by_user_id uuid references auth.users(id) on delete set null,
    resolved_by_user_id uuid references auth.users(id) on delete set null,
    resolved_at timestamptz,
    notes text,
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    constraint payment_reconciliation_status_check check (
        status in (
            'matched',
            'missing_internal',
            'missing_bank',
            'amount_mismatch',
            'duplicate',
            'manual_review',
            'resolved'
        )
    )
);

create index if not exists payment_events_transaction_idx
    on public.payment_events (transaction_id, created_at desc);
create index if not exists payment_events_patient_idx
    on public.payment_events (patient_user_id, created_at desc);
create index if not exists payment_receipts_patient_idx
    on public.payment_receipts (patient_user_id, issued_at desc);
create index if not exists payment_refunds_transaction_idx
    on public.payment_refunds (transaction_id, created_at desc);
create index if not exists payment_refunds_patient_idx
    on public.payment_refunds (patient_user_id, created_at desc);
create index if not exists payment_line_items_transaction_idx
    on public.payment_line_items (transaction_id);
create index if not exists payment_reconciliation_provider_idx
    on public.payment_reconciliation_items (provider_id, statement_date desc);

create or replace view public.payment_transaction_ledger
with (security_invoker = true)
as
select
    tx.id,
    tx.appointment_id,
    tx.patient_user_id,
    tx.provider_id,
    method.name_ar as payment_method_name_ar,
    tx.status,
    tx.amount_yer,
    tx.amount_usd,
    tx.exchange_rate,
    tx.amount_source,
    tx.service_type,
    coalesce(tx.service_name, appt.service_name) as service_name,
    tx.currency_id,
    tx.bank_transaction_id,
    tx.customer_account_masked,
    tx.attempts_count,
    tx.resend_count,
    tx.last_error_code,
    tx.last_error_message,
    tx.created_at,
    tx.updated_at,
    tx.otp_sent_at,
    tx.expires_at,
    tx.paid_at,
    appt.patient_name,
    appt.phone_number,
    appt.appointment_date,
    appt.appointment_time,
    appt.status as appointment_status,
    appt.payment_status as appointment_payment_status,
    receipt.id as receipt_id,
    receipt.receipt_number,
    receipt.status as receipt_status,
    receipt.issued_at as receipt_issued_at,
    coalesce(refunds.refunded_amount_yer, 0) as refunded_amount_yer,
    greatest(tx.amount_yer - coalesce(refunds.refunded_amount_yer, 0), 0) as net_amount_yer
from public.payment_transactions tx
left join public.appointments appt
  on appt.id = tx.appointment_id
left join public.payment_methods method
  on method.provider_id = tx.provider_id
left join public.payment_receipts receipt
  on receipt.transaction_id = tx.id
left join (
    select
        transaction_id,
        sum(amount_yer)::integer as refunded_amount_yer
    from public.payment_refunds
    where status = 'processed'
    group by transaction_id
) refunds
  on refunds.transaction_id = tx.id;

alter table public.payment_events enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.payment_line_items enable row level security;
alter table public.payment_reconciliation_items enable row level security;

drop policy if exists "patients can read their own payment events"
    on public.payment_events;
create policy "patients can read their own payment events"
on public.payment_events
for select
to authenticated
using (patient_user_id = (select auth.uid()));

drop policy if exists "staff can read payment events"
    on public.payment_events;
create policy "staff can read payment events"
on public.payment_events
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment receipts"
    on public.payment_receipts;
create policy "patients can read their own payment receipts"
on public.payment_receipts
for select
to authenticated
using (patient_user_id = (select auth.uid()));

drop policy if exists "staff can read payment receipts"
    on public.payment_receipts;
create policy "staff can read payment receipts"
on public.payment_receipts
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment refunds"
    on public.payment_refunds;
create policy "patients can read their own payment refunds"
on public.payment_refunds
for select
to authenticated
using (patient_user_id = (select auth.uid()));

drop policy if exists "staff can read payment refunds"
    on public.payment_refunds;
create policy "staff can read payment refunds"
on public.payment_refunds
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment line items"
    on public.payment_line_items;
create policy "patients can read their own payment line items"
on public.payment_line_items
for select
to authenticated
using (patient_user_id = (select auth.uid()));

drop policy if exists "staff can read payment line items"
    on public.payment_line_items;
create policy "staff can read payment line items"
on public.payment_line_items
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "staff can read reconciliation items"
    on public.payment_reconciliation_items;
create policy "staff can read reconciliation items"
on public.payment_reconciliation_items
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

grant select on public.payment_events to authenticated;
grant select on public.payment_receipts to authenticated;
grant select on public.payment_refunds to authenticated;
grant select on public.payment_line_items to authenticated;
grant select on public.payment_reconciliation_items to authenticated;
grant select on public.payment_transaction_ledger to authenticated;

grant all on public.payment_events to service_role;
grant all on public.payment_receipts to service_role;
grant all on public.payment_refunds to service_role;
grant all on public.payment_line_items to service_role;
grant all on public.payment_reconciliation_items to service_role;
grant select on public.payment_transaction_ledger to service_role;

alter table public.scan_categories enable row level security;
alter table public.lab_categories enable row level security;

drop policy if exists "scan categories are publicly readable"
    on public.scan_categories;
create policy "scan categories are publicly readable"
on public.scan_categories
for select
to anon, authenticated
using (true);

drop policy if exists "staff can insert scan categories"
    on public.scan_categories;
create policy "staff can insert scan categories"
on public.scan_categories
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "staff can update scan categories"
    on public.scan_categories;
create policy "staff can update scan categories"
on public.scan_categories
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "staff can delete scan categories"
    on public.scan_categories;
create policy "staff can delete scan categories"
on public.scan_categories
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "lab categories are publicly readable"
    on public.lab_categories;
create policy "lab categories are publicly readable"
on public.lab_categories
for select
to anon, authenticated
using (true);

drop policy if exists "staff can insert lab categories"
    on public.lab_categories;
create policy "staff can insert lab categories"
on public.lab_categories
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "staff can update lab categories"
    on public.lab_categories;
create policy "staff can update lab categories"
on public.lab_categories
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "staff can delete lab categories"
    on public.lab_categories;
create policy "staff can delete lab categories"
on public.lab_categories
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

grant select on public.scan_categories to anon, authenticated;
grant insert, update, delete on public.scan_categories to authenticated;
grant all on public.scan_categories to service_role;
grant usage, select on sequence public.scan_categories_id_seq to authenticated, service_role;

grant select on public.lab_categories to anon, authenticated;
grant insert, update, delete on public.lab_categories to authenticated;
grant all on public.lab_categories to service_role;
grant usage, select on sequence public.lab_categories_id_seq to authenticated, service_role;

notify pgrst, 'reload schema';
