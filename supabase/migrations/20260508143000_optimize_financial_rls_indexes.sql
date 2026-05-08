create index if not exists payment_events_appointment_idx
    on public.payment_events (appointment_id);
create index if not exists payment_events_actor_idx
    on public.payment_events (actor_user_id);

create index if not exists payment_receipts_appointment_idx
    on public.payment_receipts (appointment_id);
create index if not exists payment_receipts_issued_by_idx
    on public.payment_receipts (issued_by_user_id);

create index if not exists payment_refunds_appointment_idx
    on public.payment_refunds (appointment_id);
create index if not exists payment_refunds_receipt_idx
    on public.payment_refunds (receipt_id);
create index if not exists payment_refunds_requested_by_idx
    on public.payment_refunds (requested_by_user_id);
create index if not exists payment_refunds_processed_by_idx
    on public.payment_refunds (processed_by_user_id);

create index if not exists payment_line_items_appointment_idx
    on public.payment_line_items (appointment_id);
create index if not exists payment_line_items_patient_idx
    on public.payment_line_items (patient_user_id);

create index if not exists payment_reconciliation_transaction_idx
    on public.payment_reconciliation_items (transaction_id);
create index if not exists payment_reconciliation_imported_by_idx
    on public.payment_reconciliation_items (imported_by_user_id);
create index if not exists payment_reconciliation_resolved_by_idx
    on public.payment_reconciliation_items (resolved_by_user_id);

drop policy if exists "patients can read their own payment events"
    on public.payment_events;
drop policy if exists "staff can read payment events"
    on public.payment_events;
create policy "authenticated finance readers can read payment events"
on public.payment_events
for select
to authenticated
using (
    patient_user_id = (select auth.uid())
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment receipts"
    on public.payment_receipts;
drop policy if exists "staff can read payment receipts"
    on public.payment_receipts;
create policy "authenticated finance readers can read payment receipts"
on public.payment_receipts
for select
to authenticated
using (
    patient_user_id = (select auth.uid())
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment refunds"
    on public.payment_refunds;
drop policy if exists "staff can read payment refunds"
    on public.payment_refunds;
create policy "authenticated finance readers can read payment refunds"
on public.payment_refunds
for select
to authenticated
using (
    patient_user_id = (select auth.uid())
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

drop policy if exists "patients can read their own payment line items"
    on public.payment_line_items;
drop policy if exists "staff can read payment line items"
    on public.payment_line_items;
create policy "authenticated finance readers can read payment line items"
on public.payment_line_items
for select
to authenticated
using (
    patient_user_id = (select auth.uid())
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

notify pgrst, 'reload schema';
