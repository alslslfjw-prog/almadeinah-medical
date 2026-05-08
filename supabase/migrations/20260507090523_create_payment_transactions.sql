create schema if not exists private;

create table if not exists public.payment_transactions (
    id uuid primary key default gen_random_uuid(),
    appointment_id bigint references public.appointments(id) on delete set null,
    patient_user_id uuid references auth.users(id) on delete set null,
    provider_id text not null,
    status text not null default 'initiated',
    amount_yer integer not null,
    currency_id integer not null default 1,
    bank_transaction_id text,
    customer_account_masked text,
    idempotency_key text not null,
    attempts_count integer not null default 0,
    resend_count integer not null default 0,
    last_error_code text,
    last_error_message text,
    gateway_response jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    otp_sent_at timestamptz,
    expires_at timestamptz,
    paid_at timestamptz,
    constraint payment_transactions_amount_positive check (amount_yer > 0),
    constraint payment_transactions_attempts_nonnegative check (attempts_count >= 0),
    constraint payment_transactions_resends_nonnegative check (resend_count >= 0),
    constraint payment_transactions_status_check check (
        status in ('initiated', 'otp_sent', 'paid', 'failed', 'expired', 'cancelled')
    )
);

create unique index if not exists payment_transactions_provider_idempotency_idx
    on public.payment_transactions (provider_id, idempotency_key);

create unique index if not exists payment_transactions_bank_transaction_idx
    on public.payment_transactions (bank_transaction_id)
    where bank_transaction_id is not null;

create index if not exists payment_transactions_appointment_idx
    on public.payment_transactions (appointment_id);

create index if not exists payment_transactions_patient_idx
    on public.payment_transactions (patient_user_id, created_at desc);

create index if not exists payment_transactions_status_idx
    on public.payment_transactions (status, expires_at);

alter table public.appointments
    add column if not exists payment_status text,
    add column if not exists payment_method_provider_id text,
    add column if not exists payment_transaction_id uuid,
    add column if not exists payment_paid_at timestamptz,
    add column if not exists payment_expires_at timestamptz;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_payment_status_check'
    ) then
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
                    'legacy'
                )
            );
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_payment_method_provider_id_fkey'
    ) then
        alter table public.appointments
            add constraint appointments_payment_method_provider_id_fkey
            foreign key (payment_method_provider_id)
            references public.payment_methods(provider_id)
            on update cascade
            on delete set null;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_payment_transaction_id_fkey'
    ) then
        alter table public.appointments
            add constraint appointments_payment_transaction_id_fkey
            foreign key (payment_transaction_id)
            references public.payment_transactions(id)
            on delete set null;
    end if;
end $$;

create index if not exists appointments_payment_status_idx
    on public.appointments (payment_status, payment_paid_at desc);

create index if not exists appointments_payment_method_provider_idx
    on public.appointments (payment_method_provider_id);

create index if not exists appointments_payment_transaction_idx
    on public.appointments (payment_transaction_id);

create or replace function private.set_payment_transactions_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists payment_transactions_set_updated_at
    on public.payment_transactions;
create trigger payment_transactions_set_updated_at
before update on public.payment_transactions
for each row
execute function private.set_payment_transactions_updated_at();

alter table public.payment_transactions enable row level security;

drop policy if exists "patients can read their own payment transactions"
    on public.payment_transactions;
create policy "patients can read their own payment transactions"
on public.payment_transactions
for select
to authenticated
using (
    (select auth.uid()) is not null
    and patient_user_id = (select auth.uid())
);

drop policy if exists "staff can read payment transactions"
    on public.payment_transactions;
create policy "staff can read payment transactions"
on public.payment_transactions
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

grant select on public.payment_transactions to authenticated;
grant all on public.payment_transactions to service_role;

do $$
begin
    if exists (
        select 1
        from public.payment_methods
        where provider_id = 'bank_transfer'
    ) and not exists (
        select 1
        from public.payment_methods
        where provider_id = 'alqutabi_bank'
    ) then
        update public.payment_methods
           set provider_id = 'alqutabi_bank',
               name_ar = 'بنك القطيبي',
               name_en = 'Alqutabi Bank',
               type = 'api',
               is_active = true,
               sort_order = least(coalesce(sort_order, 2), 2),
               config = jsonb_build_object(
                   'gateway', 'alqutabi_otp',
                   'instructions_ar', 'سيتم إرسال رمز OTP إلى واتساب العميل من بنك القطيبي.'
               )
         where provider_id = 'bank_transfer';
    elsif exists (
        select 1
        from public.payment_methods
        where provider_id = 'bank_transfer'
    ) then
        update public.payment_methods
           set name_ar = coalesce(nullif(name_ar, 'بنك القطيبي'), 'تحويل بنكي (قديم)'),
               type = 'manual',
               is_active = false,
               config = coalesce(config, '{}'::jsonb)
         where provider_id = 'bank_transfer';
    end if;
end $$;

insert into public.payment_methods (
    name_ar,
    name_en,
    provider_id,
    type,
    sort_order,
    is_active,
    config
)
select
    'بنك القطيبي',
    'Alqutabi Bank',
    'alqutabi_bank',
    'api',
    2,
    true,
    jsonb_build_object(
        'gateway', 'alqutabi_otp',
        'instructions_ar', 'سيتم إرسال رمز OTP إلى واتساب العميل من بنك القطيبي.'
    )
where not exists (
    select 1
    from public.payment_methods
    where provider_id = 'alqutabi_bank'
);

update public.payment_methods
   set name_ar = 'بنك القطيبي',
       name_en = 'Alqutabi Bank',
       type = 'api',
       is_active = true,
       config = jsonb_build_object(
           'gateway', 'alqutabi_otp',
           'instructions_ar', 'سيتم إرسال رمز OTP إلى واتساب العميل من بنك القطيبي.'
       )
 where provider_id = 'alqutabi_bank';

update public.payment_methods
   set is_active = false
 where type = 'api'
   and provider_id <> 'alqutabi_bank';

revoke all on function private.set_payment_transactions_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';
