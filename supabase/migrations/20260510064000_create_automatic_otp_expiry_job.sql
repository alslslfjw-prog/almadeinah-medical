create schema if not exists private;

create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.expire_stale_otp_payments(p_batch_size integer default 100)
returns table (
    expired_count integer,
    cancelled_appointments integer,
    refreshed_doctor_slots integer,
    refreshed_scan_slots integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
    stale_row record;
    updated_transaction_id uuid;
    affected_appointments integer;
begin
    expired_count := 0;
    cancelled_appointments := 0;
    refreshed_doctor_slots := 0;
    refreshed_scan_slots := 0;

    for stale_row in
        select
            tx.id,
            tx.appointment_id,
            tx.patient_user_id,
            tx.amount_yer,
            appt.doctor_time_slot_id,
            appt.scan_time_slot_id
        from public.payment_transactions tx
        left join public.appointments appt
          on appt.id = tx.appointment_id
        where tx.status = 'otp_sent'
          and tx.expires_at is not null
          and tx.expires_at <= now()
        order by tx.expires_at asc
        limit greatest(coalesce(p_batch_size, 100), 1)
        for update of tx skip locked
    loop
        updated_transaction_id := null;
        affected_appointments := 0;

        update public.payment_transactions
           set status = 'expired',
               last_error_code = 'expired',
               last_error_message = 'OTP window expired',
               updated_at = now()
         where id = stale_row.id
           and status = 'otp_sent'
        returning id into updated_transaction_id;

        if updated_transaction_id is null then
            continue;
        end if;

        expired_count := expired_count + 1;

        if stale_row.appointment_id is not null then
            update public.appointments
               set status = 'cancelled',
                   payment_status = 'expired'
             where id = stale_row.appointment_id
               and payment_transaction_id = stale_row.id
               and status = 'pending'
               and payment_status = 'otp_pending';

            get diagnostics affected_appointments = row_count;
            cancelled_appointments := cancelled_appointments + affected_appointments;

            if stale_row.doctor_time_slot_id is not null then
                perform private.refresh_doctor_time_slot_status(stale_row.doctor_time_slot_id);
                refreshed_doctor_slots := refreshed_doctor_slots + 1;
            end if;

            if stale_row.scan_time_slot_id is not null then
                perform private.refresh_scan_time_slot_status(stale_row.scan_time_slot_id);
                refreshed_scan_slots := refreshed_scan_slots + 1;
            end if;
        end if;

        insert into public.payment_events (
            transaction_id,
            appointment_id,
            patient_user_id,
            actor_role,
            event_type,
            event_source,
            status_from,
            status_to,
            amount_yer,
            metadata
        )
        values (
            stale_row.id,
            stale_row.appointment_id,
            stale_row.patient_user_id,
            'system',
            'payment_expired',
            'cron',
            'otp_sent',
            'expired',
            stale_row.amount_yer,
            jsonb_build_object(
                'reason', 'otp_window_expired',
                'cancelled_appointment', affected_appointments > 0
            )
        );
    end loop;

    return next;
end;
$$;

create or replace function public.expire_stale_otp_payments(p_batch_size integer default 100)
returns table (
    expired_count integer,
    cancelled_appointments integer,
    refreshed_doctor_slots integer,
    refreshed_scan_slots integer
)
language sql
security definer
set search_path = public, private
as $$
    select *
    from private.expire_stale_otp_payments(p_batch_size);
$$;

revoke all on function private.expire_stale_otp_payments(integer) from public, anon, authenticated;
revoke all on function public.expire_stale_otp_payments(integer) from public, anon, authenticated;
grant execute on function private.expire_stale_otp_payments(integer) to postgres, service_role;
grant execute on function public.expire_stale_otp_payments(integer) to service_role;

do $$
begin
    if exists (
        select 1
        from cron.job
        where jobname = 'expire-stale-otp-payments'
    ) then
        perform cron.unschedule('expire-stale-otp-payments');
    end if;

    perform cron.schedule(
        'expire-stale-otp-payments',
        '* * * * *',
        'select * from private.expire_stale_otp_payments(100);'
    );
end $$;

select *
from private.expire_stale_otp_payments(1000);

notify pgrst, 'reload schema';
