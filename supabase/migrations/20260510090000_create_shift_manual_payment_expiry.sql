create schema if not exists private;

create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.parse_appointment_start_time(p_time text)
returns time
language plpgsql
immutable
as $$
declare
    v_start text;
    v_match text[];
    v_hour integer;
    v_minute integer;
    v_marker text;
begin
    if p_time is null or btrim(p_time) = '' then
        return null;
    end if;

    v_start := btrim(split_part(p_time, '-', 1));
    v_start := regexp_replace(v_start, '\s+', ' ', 'g');

    begin
        return v_start::time;
    exception
        when others then
            null;
    end;

    v_match := regexp_match(v_start, '^([0-9]{1,2})[:.]([0-9]{2})(?::[0-9]{2})?\s*([AaPp][Mm]|ص|م)?');
    if v_match is null then
        return null;
    end if;

    v_hour := v_match[1]::integer;
    v_minute := v_match[2]::integer;
    v_marker := lower(coalesce(v_match[3], ''));

    if v_marker in ('pm', 'م') and v_hour < 12 then
        v_hour := v_hour + 12;
    elsif v_marker in ('am', 'ص') and v_hour = 12 then
        v_hour := 0;
    end if;

    if v_hour < 0 or v_hour > 23 or v_minute < 0 or v_minute > 59 then
        return null;
    end if;

    return make_time(v_hour, v_minute, 0);
end;
$$;

create or replace function private.cancel_manual_pending_shift(
    p_shift text,
    p_target_date date default null
)
returns table (
    cancelled_count integer,
    refreshed_doctor_slots integer,
    refreshed_scan_slots integer
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
    v_target_date date := coalesce(p_target_date, (now() at time zone 'Asia/Aden')::date);
    v_row record;
    v_affected integer;
begin
    if p_shift not in ('morning', 'evening') then
        raise exception 'Invalid manual payment shift: %', p_shift;
    end if;

    cancelled_count := 0;
    refreshed_doctor_slots := 0;
    refreshed_scan_slots := 0;

    for v_row in
        select *
        from (
            select
                appt.id,
                appt.patient_user_id,
                appt.doctor_time_slot_id,
                appt.scan_time_slot_id,
                appt.total_price_yer,
                coalesce(
                    doctor_slot.start_time,
                    scan_slot.start_time,
                    private.parse_appointment_start_time(appt.appointment_time)
                ) as start_time
            from public.appointments appt
            left join public.doctor_time_slots doctor_slot
              on doctor_slot.id = appt.doctor_time_slot_id
            left join public.scan_time_slots scan_slot
              on scan_slot.id = appt.scan_time_slot_id
            where appt.status = 'pending'
              and appt.payment_status = 'manual_pending'
              and appt.appointment_date = v_target_date
            for update of appt skip locked
        ) candidate
        where candidate.start_time is not null
          and (
              (p_shift = 'morning' and candidate.start_time < time '12:00')
              or
              (p_shift = 'evening' and candidate.start_time >= time '12:00')
          )
    loop
        update public.appointments
           set status = 'cancelled',
               payment_status = 'cancelled'
         where id = v_row.id
           and status = 'pending'
           and payment_status = 'manual_pending';

        get diagnostics v_affected = row_count;
        if v_affected = 0 then
            continue;
        end if;

        cancelled_count := cancelled_count + 1;

        if v_row.doctor_time_slot_id is not null then
            perform private.refresh_doctor_time_slot_status(v_row.doctor_time_slot_id);
            refreshed_doctor_slots := refreshed_doctor_slots + 1;
        end if;

        if v_row.scan_time_slot_id is not null then
            perform private.refresh_scan_time_slot_status(v_row.scan_time_slot_id);
            refreshed_scan_slots := refreshed_scan_slots + 1;
        end if;

        insert into public.payment_events (
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
            v_row.id,
            v_row.patient_user_id,
            'system',
            'manual_payment_cancelled',
            'cron',
            'manual_pending',
            'cancelled',
            v_row.total_price_yer,
            jsonb_build_object(
                'shift', p_shift,
                'target_date', v_target_date,
                'reason', 'manual_payment_cutoff_passed'
            )
        );
    end loop;

    return next;
end;
$$;

create or replace function public.cancel_manual_pending_shift(
    p_shift text,
    p_target_date date default null
)
returns table (
    cancelled_count integer,
    refreshed_doctor_slots integer,
    refreshed_scan_slots integer
)
language sql
security definer
set search_path = public, private
as $$
    select *
    from private.cancel_manual_pending_shift(p_shift, p_target_date);
$$;

revoke all on function private.parse_appointment_start_time(text) from public, anon, authenticated;
revoke all on function private.cancel_manual_pending_shift(text, date) from public, anon, authenticated;
revoke all on function public.cancel_manual_pending_shift(text, date) from public, anon, authenticated;
grant execute on function private.cancel_manual_pending_shift(text, date) to postgres, service_role;
grant execute on function public.cancel_manual_pending_shift(text, date) to service_role;

create unique index if not exists appointments_one_active_manual_pending_per_patient_idx
    on public.appointments (patient_user_id)
    where patient_user_id is not null
      and status = 'pending'
      and payment_status = 'manual_pending';

do $$
begin
    if exists (select 1 from cron.job where jobname = 'cancel-morning-manual-pending') then
        perform cron.unschedule('cancel-morning-manual-pending');
    end if;

    perform cron.schedule(
        'cancel-morning-manual-pending',
        '30 5 * * *',
        'select * from private.cancel_manual_pending_shift(''morning'');'
    );

    if exists (select 1 from cron.job where jobname = 'cancel-evening-manual-pending') then
        perform cron.unschedule('cancel-evening-manual-pending');
    end if;

    perform cron.schedule(
        'cancel-evening-manual-pending',
        '30 13 * * *',
        'select * from private.cancel_manual_pending_shift(''evening'');'
    );
end $$;

notify pgrst, 'reload schema';
