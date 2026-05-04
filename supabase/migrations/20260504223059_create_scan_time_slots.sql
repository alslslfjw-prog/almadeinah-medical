create extension if not exists btree_gist with schema extensions;
create schema if not exists private;

create table if not exists public.scan_date_schedules (
    id bigserial primary key,
    scan_id bigint not null references public.scans(id) on delete cascade,
    specific_date date not null,
    start_time time not null,
    end_time time not null,
    shift_label text,
    notes text,
    slot_duration_minutes integer not null default 10,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scan_date_schedules_time_order check (end_time > start_time),
    constraint scan_date_schedules_slot_duration_range check (slot_duration_minutes between 5 and 120)
);

create index if not exists scan_date_schedules_scan_date_idx
    on public.scan_date_schedules (scan_id, specific_date);

create index if not exists scan_date_schedules_date_idx
    on public.scan_date_schedules (specific_date);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.scan_date_schedules'::regclass
          and conname = 'scan_date_schedules_no_overlap'
    ) then
        alter table public.scan_date_schedules
            add constraint scan_date_schedules_no_overlap
            exclude using gist (
                scan_id with =,
                specific_date with =,
                tsrange(
                    (specific_date + start_time)::timestamp,
                    (specific_date + end_time)::timestamp,
                    '[)'
                ) with &&
            );
    end if;
end $$;

create table if not exists public.scan_time_slots (
    id bigserial primary key,
    schedule_id bigint not null references public.scan_date_schedules(id) on delete cascade,
    scan_id bigint not null references public.scans(id) on delete cascade,
    slot_date date not null,
    start_time time not null,
    end_time time not null,
    is_blocked boolean not null default false,
    status text not null default 'available',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint scan_time_slots_time_order check (end_time > start_time),
    constraint scan_time_slots_status_check check (status in ('available', 'booked', 'blocked'))
);

create unique index if not exists scan_time_slots_schedule_start_idx
    on public.scan_time_slots (schedule_id, start_time);

create unique index if not exists scan_time_slots_scan_date_start_idx
    on public.scan_time_slots (scan_id, slot_date, start_time);

create index if not exists scan_time_slots_lookup_idx
    on public.scan_time_slots (scan_id, slot_date, status, start_time);

alter table public.appointments
    add column if not exists scan_time_slot_id bigint;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_scan_time_slot_id_fkey'
    ) then
        alter table public.appointments
            add constraint appointments_scan_time_slot_id_fkey
            foreign key (scan_time_slot_id)
            references public.scan_time_slots(id)
            on delete set null;
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.appointments'::regclass
          and conname = 'appointments_single_generated_slot_check'
    ) then
        alter table public.appointments
            add constraint appointments_single_generated_slot_check
            check (not (doctor_time_slot_id is not null and scan_time_slot_id is not null));
    end if;
end $$;

create index if not exists appointments_scan_time_slot_idx
    on public.appointments (scan_time_slot_id);

create unique index if not exists appointments_active_scan_time_slot_idx
    on public.appointments (scan_time_slot_id)
    where scan_time_slot_id is not null
      and status in ('pending', 'confirmed', 'completed');

create or replace function private.set_scan_date_schedules_updated_at()
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

create or replace function private.set_scan_time_slots_updated_at()
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

create or replace function private.refresh_scan_time_slot_status(p_slot_id bigint)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
    update public.scan_time_slots slot
       set status = case
           when slot.is_blocked then 'blocked'
           when exists (
               select 1
               from public.appointments appt
               where appt.scan_time_slot_id = slot.id
                 and appt.status in ('pending', 'confirmed', 'completed')
           ) then 'booked'
           else 'available'
       end,
       updated_at = now()
     where slot.id = p_slot_id;
end;
$$;

create or replace function private.scan_schedule_has_active_slot_booking(p_schedule_id bigint)
returns boolean
language sql
security definer
set search_path = public, private
as $$
    select exists (
        select 1
        from public.scan_time_slots slot
        join public.appointments appt
          on appt.scan_time_slot_id = slot.id
        where slot.schedule_id = p_schedule_id
          and appt.status in ('pending', 'confirmed', 'completed')
    );
$$;

create or replace function private.regenerate_scan_time_slots_for_schedule(p_schedule_id bigint)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
    schedule_row public.scan_date_schedules%rowtype;
    current_start time;
    current_end time;
    duration_interval interval;
begin
    select *
      into schedule_row
      from public.scan_date_schedules
     where id = p_schedule_id;

    if not found then
        return;
    end if;

    if private.scan_schedule_has_active_slot_booking(p_schedule_id) then
        raise exception 'Cannot regenerate slots for a schedule with active bookings';
    end if;

    delete from public.scan_time_slots
     where schedule_id = p_schedule_id;

    duration_interval := make_interval(mins => schedule_row.slot_duration_minutes);
    current_start := schedule_row.start_time;

    while current_start + duration_interval <= schedule_row.end_time loop
        current_end := current_start + duration_interval;

        insert into public.scan_time_slots (
            schedule_id,
            scan_id,
            slot_date,
            start_time,
            end_time
        )
        values (
            schedule_row.id,
            schedule_row.scan_id,
            schedule_row.specific_date,
            current_start,
            current_end
        );

        current_start := current_end;
    end loop;
end;
$$;

create or replace function private.guard_scan_schedule_slot_bookings()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if tg_op = 'DELETE' then
        if private.scan_schedule_has_active_slot_booking(old.id) then
            raise exception 'Cannot delete a schedule with active slot bookings';
        end if;
        return old;
    end if;

    if (
        old.specific_date is distinct from new.specific_date
        or old.start_time is distinct from new.start_time
        or old.end_time is distinct from new.end_time
        or old.slot_duration_minutes is distinct from new.slot_duration_minutes
    ) and private.scan_schedule_has_active_slot_booking(old.id) then
        raise exception 'Cannot change date, time, or slot duration for a schedule with active slot bookings';
    end if;

    return new;
end;
$$;

create or replace function private.regenerate_scan_schedule_slots_after_change()
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
        perform private.regenerate_scan_time_slots_for_schedule(new.id);
    end if;

    return new;
end;
$$;

create or replace function private.sync_appointment_scan_time_slot()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
    slot_row public.scan_time_slots%rowtype;
    effective_status text;
begin
    if new.scan_time_slot_id is null then
        return new;
    end if;

    effective_status := coalesce(new.status, 'pending');

    select *
      into slot_row
      from public.scan_time_slots
     where id = new.scan_time_slot_id;

    if not found then
        raise exception 'Selected scan time slot does not exist';
    end if;

    if slot_row.is_blocked and effective_status in ('pending', 'confirmed', 'completed') then
        raise exception 'Selected scan time slot is blocked';
    end if;

    if effective_status in ('pending', 'confirmed', 'completed') and exists (
        select 1
        from public.appointments appt
        where appt.scan_time_slot_id = new.scan_time_slot_id
          and appt.status in ('pending', 'confirmed', 'completed')
          and appt.id is distinct from new.id
    ) then
        raise exception 'Selected scan time slot is already booked';
    end if;

    new.scan_id := slot_row.scan_id;
    new.doctor_id := null;
    new.appointment_date := slot_row.slot_date;
    new.appointment_time := to_char(slot_row.start_time, 'HH24:MI')
        || ' - '
        || to_char(slot_row.end_time, 'HH24:MI');

    return new;
end;
$$;

create or replace function private.refresh_scan_slot_status_from_appointment()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
    if tg_op in ('INSERT', 'UPDATE') and new.scan_time_slot_id is not null then
        perform private.refresh_scan_time_slot_status(new.scan_time_slot_id);
    end if;

    if tg_op in ('UPDATE', 'DELETE')
       and old.scan_time_slot_id is not null
       and (tg_op = 'DELETE' or old.scan_time_slot_id is distinct from new.scan_time_slot_id)
    then
        perform private.refresh_scan_time_slot_status(old.scan_time_slot_id);
    end if;

    return coalesce(new, old);
end;
$$;

drop trigger if exists scan_date_schedules_set_updated_at
    on public.scan_date_schedules;
create trigger scan_date_schedules_set_updated_at
before update on public.scan_date_schedules
for each row
execute function private.set_scan_date_schedules_updated_at();

drop trigger if exists scan_time_slots_set_updated_at
    on public.scan_time_slots;
create trigger scan_time_slots_set_updated_at
before update on public.scan_time_slots
for each row
execute function private.set_scan_time_slots_updated_at();

drop trigger if exists scan_schedules_guard_slot_bookings
    on public.scan_date_schedules;
create trigger scan_schedules_guard_slot_bookings
before update or delete on public.scan_date_schedules
for each row
execute function private.guard_scan_schedule_slot_bookings();

drop trigger if exists scan_schedules_regenerate_slots
    on public.scan_date_schedules;
create trigger scan_schedules_regenerate_slots
after insert or update on public.scan_date_schedules
for each row
execute function private.regenerate_scan_schedule_slots_after_change();

drop trigger if exists appointments_sync_scan_time_slot
    on public.appointments;
create trigger appointments_sync_scan_time_slot
before insert or update of scan_time_slot_id, status on public.appointments
for each row
execute function private.sync_appointment_scan_time_slot();

drop trigger if exists appointments_refresh_scan_time_slot_status
    on public.appointments;
create trigger appointments_refresh_scan_time_slot_status
after insert or update of scan_time_slot_id, status or delete on public.appointments
for each row
execute function private.refresh_scan_slot_status_from_appointment();

create or replace view public.scan_time_slots_with_status
with (security_invoker = true)
as
select
    slot.id,
    slot.schedule_id,
    slot.scan_id,
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
from public.scan_time_slots slot
join public.scan_date_schedules schedule
  on schedule.id = slot.schedule_id;

alter table public.scan_date_schedules enable row level security;
alter table public.scan_time_slots enable row level security;

drop policy if exists "scan date schedules are publicly readable"
    on public.scan_date_schedules;
create policy "scan date schedules are publicly readable"
on public.scan_date_schedules
for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert scan date schedules"
    on public.scan_date_schedules;
create policy "admins can insert scan date schedules"
on public.scan_date_schedules
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can update scan date schedules"
    on public.scan_date_schedules;
create policy "admins can update scan date schedules"
on public.scan_date_schedules
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can delete scan date schedules"
    on public.scan_date_schedules;
create policy "admins can delete scan date schedules"
on public.scan_date_schedules
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'admin'
    )
);

drop policy if exists "scan time slots are publicly readable"
    on public.scan_time_slots;
create policy "scan time slots are publicly readable"
on public.scan_time_slots
for select
to anon, authenticated
using (true);

grant select on public.scan_date_schedules to anon, authenticated;
grant insert, update, delete on public.scan_date_schedules to authenticated;
grant all on public.scan_date_schedules to service_role;
grant usage, select on sequence public.scan_date_schedules_id_seq to authenticated, service_role;

grant select on public.scan_time_slots to anon, authenticated;
grant all on public.scan_time_slots to service_role;
grant usage, select on sequence public.scan_time_slots_id_seq to service_role;
grant select on public.scan_time_slots_with_status to anon, authenticated;

select private.regenerate_scan_time_slots_for_schedule(id)
from public.scan_date_schedules;

notify pgrst, 'reload schema';
