create schema if not exists private;

alter table public.doctor_date_schedules
    add column if not exists slot_duration_minutes integer not null default 10;

alter table public.doctor_date_schedules
    drop constraint if exists doctor_date_schedules_slot_duration_range;

alter table public.doctor_date_schedules
    add constraint doctor_date_schedules_slot_duration_range
    check (slot_duration_minutes between 5 and 120);

create table if not exists public.doctor_time_slots (
    id bigserial primary key,
    schedule_id bigint not null references public.doctor_date_schedules(id) on delete cascade,
    doctor_id bigint not null references public.doctors(id) on delete cascade,
    slot_date date not null,
    start_time time not null,
    end_time time not null,
    is_blocked boolean not null default false,
    status text not null default 'available',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint doctor_time_slots_time_order check (end_time > start_time),
    constraint doctor_time_slots_status_check check (status in ('available', 'booked', 'blocked'))
);

create unique index if not exists doctor_time_slots_schedule_start_idx
    on public.doctor_time_slots (schedule_id, start_time);

create unique index if not exists doctor_time_slots_doctor_date_start_idx
    on public.doctor_time_slots (doctor_id, slot_date, start_time);

create index if not exists doctor_time_slots_lookup_idx
    on public.doctor_time_slots (doctor_id, slot_date, status, start_time);

alter table public.appointments
    add column if not exists doctor_time_slot_id bigint;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_doctor_time_slot_id_fkey'
    ) then
        alter table public.appointments
            add constraint appointments_doctor_time_slot_id_fkey
            foreign key (doctor_time_slot_id)
            references public.doctor_time_slots(id)
            on delete set null;
    end if;
end $$;

create index if not exists appointments_doctor_time_slot_idx
    on public.appointments (doctor_time_slot_id);

create unique index if not exists appointments_active_doctor_time_slot_idx
    on public.appointments (doctor_time_slot_id)
    where doctor_time_slot_id is not null
      and status in ('pending', 'confirmed', 'completed');

create or replace function private.set_doctor_time_slots_updated_at()
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

create or replace function private.refresh_doctor_time_slot_status(p_slot_id bigint)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
    update public.doctor_time_slots slot
       set status = case
           when slot.is_blocked then 'blocked'
           when exists (
               select 1
               from public.appointments appt
               where appt.doctor_time_slot_id = slot.id
                 and appt.status in ('pending', 'confirmed', 'completed')
           ) then 'booked'
           else 'available'
       end,
       updated_at = now()
     where slot.id = p_slot_id;
end;
$$;

create or replace function private.doctor_schedule_has_active_slot_booking(p_schedule_id bigint)
returns boolean
language sql
security definer
set search_path = public, private
as $$
    select exists (
        select 1
        from public.doctor_time_slots slot
        join public.appointments appt
          on appt.doctor_time_slot_id = slot.id
        where slot.schedule_id = p_schedule_id
          and appt.status in ('pending', 'confirmed', 'completed')
    );
$$;

create or replace function private.regenerate_doctor_time_slots_for_schedule(p_schedule_id bigint)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
    schedule_row public.doctor_date_schedules%rowtype;
    current_start time;
    current_end time;
    duration_interval interval;
begin
    select *
      into schedule_row
      from public.doctor_date_schedules
     where id = p_schedule_id;

    if not found then
        return;
    end if;

    if private.doctor_schedule_has_active_slot_booking(p_schedule_id) then
        raise exception 'Cannot regenerate slots for a schedule with active bookings';
    end if;

    delete from public.doctor_time_slots
     where schedule_id = p_schedule_id;

    duration_interval := make_interval(mins => schedule_row.slot_duration_minutes);
    current_start := schedule_row.start_time;

    while current_start + duration_interval <= schedule_row.end_time loop
        current_end := current_start + duration_interval;

        insert into public.doctor_time_slots (
            schedule_id,
            doctor_id,
            slot_date,
            start_time,
            end_time
        )
        values (
            schedule_row.id,
            schedule_row.doctor_id,
            schedule_row.specific_date,
            current_start,
            current_end
        );

        current_start := current_end;
    end loop;
end;
$$;

create or replace function private.guard_doctor_schedule_slot_bookings()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if tg_op = 'DELETE' then
        if private.doctor_schedule_has_active_slot_booking(old.id) then
            raise exception 'Cannot delete a schedule with active slot bookings';
        end if;
        return old;
    end if;

    if (
        old.specific_date is distinct from new.specific_date
        or old.start_time is distinct from new.start_time
        or old.end_time is distinct from new.end_time
        or old.slot_duration_minutes is distinct from new.slot_duration_minutes
    ) and private.doctor_schedule_has_active_slot_booking(old.id) then
        raise exception 'Cannot change date, time, or slot duration for a schedule with active slot bookings';
    end if;

    return new;
end;
$$;

create or replace function private.regenerate_doctor_schedule_slots_after_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if tg_op = 'INSERT'
       or old.specific_date is distinct from new.specific_date
       or old.start_time is distinct from new.start_time
       or old.end_time is distinct from new.end_time
       or old.slot_duration_minutes is distinct from new.slot_duration_minutes
    then
        perform private.regenerate_doctor_time_slots_for_schedule(new.id);
    end if;

    return new;
end;
$$;

create or replace function private.sync_appointment_doctor_time_slot()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
    slot_row public.doctor_time_slots%rowtype;
    effective_status text;
begin
    if new.doctor_time_slot_id is null then
        return new;
    end if;

    effective_status := coalesce(new.status, 'pending');

    select *
      into slot_row
      from public.doctor_time_slots
     where id = new.doctor_time_slot_id;

    if not found then
        raise exception 'Selected time slot does not exist';
    end if;

    if slot_row.is_blocked and effective_status in ('pending', 'confirmed', 'completed') then
        raise exception 'Selected time slot is blocked';
    end if;

    if effective_status in ('pending', 'confirmed', 'completed') and exists (
        select 1
        from public.appointments appt
        where appt.doctor_time_slot_id = new.doctor_time_slot_id
          and appt.status in ('pending', 'confirmed', 'completed')
          and appt.id is distinct from new.id
    ) then
        raise exception 'Selected time slot is already booked';
    end if;

    new.doctor_id := slot_row.doctor_id;
    new.appointment_date := slot_row.slot_date;
    new.appointment_time := to_char(slot_row.start_time, 'HH24:MI')
        || ' - '
        || to_char(slot_row.end_time, 'HH24:MI');

    return new;
end;
$$;

create or replace function private.refresh_slot_status_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if tg_op in ('INSERT', 'UPDATE') and new.doctor_time_slot_id is not null then
        perform private.refresh_doctor_time_slot_status(new.doctor_time_slot_id);
    end if;

    if tg_op in ('UPDATE', 'DELETE')
       and old.doctor_time_slot_id is not null
       and (tg_op = 'DELETE' or old.doctor_time_slot_id is distinct from new.doctor_time_slot_id)
    then
        perform private.refresh_doctor_time_slot_status(old.doctor_time_slot_id);
    end if;

    return coalesce(new, old);
end;
$$;

drop trigger if exists doctor_time_slots_set_updated_at
    on public.doctor_time_slots;
create trigger doctor_time_slots_set_updated_at
before update on public.doctor_time_slots
for each row
execute function private.set_doctor_time_slots_updated_at();

drop trigger if exists doctor_schedules_guard_slot_bookings
    on public.doctor_date_schedules;
create trigger doctor_schedules_guard_slot_bookings
before update or delete on public.doctor_date_schedules
for each row
execute function private.guard_doctor_schedule_slot_bookings();

drop trigger if exists doctor_schedules_regenerate_slots
    on public.doctor_date_schedules;
create trigger doctor_schedules_regenerate_slots
after insert or update on public.doctor_date_schedules
for each row
execute function private.regenerate_doctor_schedule_slots_after_change();

drop trigger if exists appointments_sync_doctor_time_slot
    on public.appointments;
create trigger appointments_sync_doctor_time_slot
before insert or update of doctor_time_slot_id, status on public.appointments
for each row
execute function private.sync_appointment_doctor_time_slot();

drop trigger if exists appointments_refresh_doctor_time_slot_status
    on public.appointments;
create trigger appointments_refresh_doctor_time_slot_status
after insert or update of doctor_time_slot_id, status or delete on public.appointments
for each row
execute function private.refresh_slot_status_from_appointment();

create or replace view public.doctor_time_slots_with_status
with (security_invoker = true)
as
select
    slot.id,
    slot.schedule_id,
    slot.doctor_id,
    slot.slot_date,
    slot.start_time,
    slot.end_time,
    slot.is_blocked,
    slot.status,
    slot.created_at,
    slot.updated_at,
    schedule.shift_label,
    schedule.notes,
    schedule.slot_duration_minutes
from public.doctor_time_slots slot
join public.doctor_date_schedules schedule
  on schedule.id = slot.schedule_id;

alter table public.doctor_time_slots enable row level security;

drop policy if exists "doctor time slots are publicly readable"
    on public.doctor_time_slots;
create policy "doctor time slots are publicly readable"
on public.doctor_time_slots
for select
to anon, authenticated
using (true);

grant select on public.doctor_date_schedules to anon, authenticated;
grant select on public.doctor_time_slots to anon, authenticated;
grant all on public.doctor_time_slots to service_role;
grant usage, select on sequence public.doctor_time_slots_id_seq to service_role;
grant select on public.doctor_time_slots_with_status to anon, authenticated;

select private.regenerate_doctor_time_slots_for_schedule(id)
from public.doctor_date_schedules;

notify pgrst, 'reload schema';
