create extension if not exists btree_gist with schema extensions;

create table if not exists public.doctor_date_schedules (
    id bigserial primary key,
    doctor_id bigint not null references public.doctors(id) on delete cascade,
    specific_date date not null,
    start_time time not null,
    end_time time not null,
    shift_label text,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint doctor_date_schedules_time_order check (end_time > start_time)
);

create index if not exists doctor_date_schedules_doctor_date_idx
    on public.doctor_date_schedules (doctor_id, specific_date);

create index if not exists doctor_date_schedules_date_idx
    on public.doctor_date_schedules (specific_date);

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conrelid = 'public.doctor_date_schedules'::regclass
          and conname = 'doctor_date_schedules_no_overlap'
    ) then
        alter table public.doctor_date_schedules
            add constraint doctor_date_schedules_no_overlap
            exclude using gist (
                doctor_id with =,
                specific_date with =,
                tsrange(
                    (specific_date + start_time)::timestamp,
                    (specific_date + end_time)::timestamp,
                    '[)'
                ) with &&
            );
    end if;
end $$;

create or replace function public.set_doctor_date_schedules_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists set_doctor_date_schedules_updated_at
    on public.doctor_date_schedules;

create trigger set_doctor_date_schedules_updated_at
before update on public.doctor_date_schedules
for each row
execute function public.set_doctor_date_schedules_updated_at();

alter table public.doctor_date_schedules enable row level security;

drop policy if exists "doctor date schedules are publicly readable"
    on public.doctor_date_schedules;
create policy "doctor date schedules are publicly readable"
on public.doctor_date_schedules
for select
to anon, authenticated
using (true);

drop policy if exists "admins can insert doctor date schedules"
    on public.doctor_date_schedules;
create policy "admins can insert doctor date schedules"
on public.doctor_date_schedules
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

drop policy if exists "admins can update doctor date schedules"
    on public.doctor_date_schedules;
create policy "admins can update doctor date schedules"
on public.doctor_date_schedules
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

drop policy if exists "admins can delete doctor date schedules"
    on public.doctor_date_schedules;
create policy "admins can delete doctor date schedules"
on public.doctor_date_schedules
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

grant select on public.doctor_date_schedules to anon, authenticated;
grant insert, update, delete on public.doctor_date_schedules to authenticated;
grant all on public.doctor_date_schedules to service_role;
grant usage, select on sequence public.doctor_date_schedules_id_seq to authenticated, service_role;

create or replace function public.parse_legacy_doctor_schedule_time(
    value text,
    match_index integer
)
returns time
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
    matched text[];
    meridiem text;
    hour_part integer;
    minute_part integer;
begin
    if value is null or match_index < 1 then
        return null;
    end if;

    select r.matches
    into matched
    from regexp_matches(value, '([0-9]{1,2}):([0-9]{2})[[:space:]]*(ص|م|AM|PM|am|pm)?', 'g') with ordinality as r(matches, ord)
    where r.ord = match_index;

    if matched is null then
        return null;
    end if;

    hour_part := matched[1]::integer;
    minute_part := matched[2]::integer;
    meridiem := coalesce(matched[3], '');

    if meridiem in ('م', 'PM', 'pm') and hour_part < 12 then
        hour_part := hour_part + 12;
    elsif meridiem in ('ص', 'AM', 'am') and hour_part = 12 then
        hour_part := 0;
    end if;

    return make_time(hour_part, minute_part, 0);
end;
$$;

with day_names(day_index, day_name) as (
    values
        (0, 'الأحد'),
        (1, 'الاثنين'),
        (2, 'الثلاثاء'),
        (3, 'الأربعاء'),
        (4, 'الخميس'),
        (5, 'الجمعة'),
        (6, 'السبت')
),
legacy_rows as (
    select
        doctors.id as doctor_id,
        generated_date::date as specific_date,
        public.parse_legacy_doctor_schedule_time(schedule_entry.value, 1) as start_time,
        public.parse_legacy_doctor_schedule_time(schedule_entry.value, 2) as end_time,
        schedule_entry.value as shift_label
    from public.doctors
    cross join generate_series(
        current_date,
        current_date + interval '55 days',
        interval '1 day'
    ) as generated_date
    join day_names
      on day_names.day_index = extract(dow from generated_date)::integer
    join lateral jsonb_each_text(doctors.schedule) as schedule_entry(key, value)
      on schedule_entry.key = day_names.day_name
    where doctors.schedule is not null
      and jsonb_typeof(doctors.schedule) = 'object'
)
insert into public.doctor_date_schedules (
    doctor_id,
    specific_date,
    start_time,
    end_time,
    shift_label
)
select
    doctor_id,
    specific_date,
    start_time,
    end_time,
    shift_label
from legacy_rows
where start_time is not null
  and end_time is not null
  and end_time > start_time
on conflict do nothing;

drop function if exists public.parse_legacy_doctor_schedule_time(text, integer);
revoke all on function public.set_doctor_date_schedules_updated_at() from public, anon, authenticated;

notify pgrst, 'reload schema';
