drop policy if exists "patients can read their own payment transactions"
    on public.payment_transactions;

drop policy if exists "staff can read payment transactions"
    on public.payment_transactions;

drop policy if exists "authenticated can read permitted payment transactions"
    on public.payment_transactions;
create policy "authenticated can read permitted payment transactions"
on public.payment_transactions
for select
to authenticated
using (
    (
        (select auth.uid()) is not null
        and patient_user_id = (select auth.uid())
    )
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'accountant')
    )
);

create index if not exists appointments_doctor_id_idx
    on public.appointments (doctor_id);

create index if not exists appointments_scan_id_idx
    on public.appointments (scan_id);

create index if not exists appointments_patient_user_id_idx
    on public.appointments (patient_user_id);

notify pgrst, 'reload schema';
