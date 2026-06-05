create schema if not exists private;

create table if not exists public.training_courses (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    slug text not null unique,
    description text,
    cover_image text,
    duration text,
    schedule text,
    location text,
    seats integer,
    deadline date,
    topics jsonb not null default '[]'::jsonb,
    status text not null default 'draft',
    form_schema jsonb not null default '[]'::jsonb,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint training_courses_title_not_blank check (btrim(title) <> ''),
    constraint training_courses_slug_not_blank check (btrim(slug) <> ''),
    constraint training_courses_seats_nonnegative check (seats is null or seats >= 0),
    constraint training_courses_topics_array check (jsonb_typeof(topics) = 'array'),
    constraint training_courses_form_schema_array check (jsonb_typeof(form_schema) = 'array'),
    constraint training_courses_status_check check (status in ('draft', 'published', 'closed'))
);

create table if not exists public.training_applications (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.training_courses(id) on delete cascade,
    applicant_name text not null,
    applicant_phone text not null,
    applicant_email text,
    answers jsonb not null default '{}'::jsonb,
    file_attachments jsonb not null default '[]'::jsonb,
    status text not null default 'submitted',
    admin_notes text,
    wa_notification_sent boolean not null default false,
    wa_notification_sent_at timestamptz,
    wa_notification_error text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint training_applications_name_not_blank check (btrim(applicant_name) <> ''),
    constraint training_applications_phone_not_blank check (btrim(applicant_phone) <> ''),
    constraint training_applications_answers_object check (jsonb_typeof(answers) = 'object'),
    constraint training_applications_file_attachments_array check (jsonb_typeof(file_attachments) = 'array'),
    constraint training_applications_status_check check (
        status in ('submitted', 'under_review', 'accepted', 'rejected', 'cancelled')
    )
);

create index if not exists training_courses_status_deadline_idx
    on public.training_courses (status, deadline);

create index if not exists training_courses_created_by_idx
    on public.training_courses (created_by, created_at desc);

create index if not exists training_applications_course_created_idx
    on public.training_applications (course_id, created_at desc);

create index if not exists training_applications_course_phone_idx
    on public.training_applications (course_id, applicant_phone);

create index if not exists training_applications_status_idx
    on public.training_applications (status, created_at desc);

create index if not exists training_applications_wa_status_idx
    on public.training_applications (wa_notification_sent, created_at desc);

insert into storage.buckets (id, name, public)
values ('training-uploads', 'training-uploads', false)
on conflict (id) do update
set public = false;

create or replace function private.set_training_updated_at()
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

drop trigger if exists training_courses_set_updated_at
    on public.training_courses;
create trigger training_courses_set_updated_at
before update on public.training_courses
for each row
execute function private.set_training_updated_at();

drop trigger if exists training_applications_set_updated_at
    on public.training_applications;
create trigger training_applications_set_updated_at
before update on public.training_applications
for each row
execute function private.set_training_updated_at();

create or replace function private.enforce_training_application_limits()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
    course_record public.training_courses%rowtype;
    active_application_count integer;
    phone_application_count integer;
begin
    select *
      into course_record
      from public.training_courses
     where id = new.course_id
     for update;

    if not found then
        raise exception 'الدورة التدريبية غير موجودة.';
    end if;

    if course_record.status <> 'published' then
        raise exception 'هذه الدورة غير متاحة للتقديم حاليا.';
    end if;

    if course_record.deadline is not null and course_record.deadline < current_date then
        raise exception 'انتهى موعد التقديم لهذه الدورة.';
    end if;

    select count(*)::integer
      into phone_application_count
      from public.training_applications
     where course_id = new.course_id
       and applicant_phone = new.applicant_phone;

    if phone_application_count >= 3 then
        raise exception 'لقد وصلت إلى الحد الأقصى للتقديم على هذه الدورة.';
    end if;

    if course_record.seats is not null then
        select count(*)::integer
          into active_application_count
          from public.training_applications
         where course_id = new.course_id
           and status not in ('rejected', 'cancelled');

        if active_application_count >= course_record.seats then
            raise exception 'عذرا، اكتمل عدد المقاعد المتاحة لهذه الدورة.';
        end if;
    end if;

    return new;
end;
$$;

drop trigger if exists training_applications_enforce_limits
    on public.training_applications;
create trigger training_applications_enforce_limits
before insert on public.training_applications
for each row
execute function private.enforce_training_application_limits();

create or replace function public.get_course_by_slug(p_slug text)
returns table (
    id uuid,
    title text,
    slug text,
    description text,
    cover_image text,
    duration text,
    schedule text,
    location text,
    seats integer,
    deadline date,
    topics jsonb,
    status text,
    form_schema jsonb,
    application_count integer,
    seats_remaining integer,
    is_full boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select
        course.id,
        course.title,
        course.slug,
        course.description,
        course.cover_image,
        course.duration,
        course.schedule,
        course.location,
        course.seats,
        course.deadline,
        course.topics,
        course.status,
        course.form_schema,
        coalesce(applications.application_count, 0)::integer as application_count,
        case
            when course.seats is null then null
            else greatest(course.seats - coalesce(applications.application_count, 0), 0)::integer
        end as seats_remaining,
        (
            course.seats is not null
            and coalesce(applications.application_count, 0) >= course.seats
        ) as is_full
    from public.training_courses course
    left join lateral (
        select count(*)::integer as application_count
          from public.training_applications application
         where application.course_id = course.id
           and application.status not in ('rejected', 'cancelled')
    ) applications on true
    where course.slug = p_slug
      and course.status in ('published', 'closed')
    limit 1;
$$;

create or replace view public.training_applications_with_answers
with (security_invoker = true)
as
select
    application.id,
    application.course_id,
    course.title as course_title,
    course.slug as course_slug,
    application.applicant_name,
    application.applicant_phone,
    application.applicant_email,
    application.answers,
    application.file_attachments,
    application.status,
    application.admin_notes,
    application.wa_notification_sent,
    application.wa_notification_sent_at,
    application.wa_notification_error,
    application.created_at,
    application.updated_at
from public.training_applications application
join public.training_courses course
  on course.id = application.course_id;

alter table public.training_courses enable row level security;
alter table public.training_applications enable row level security;

drop policy if exists "public can read published training courses"
    on public.training_courses;
create policy "public can read published training courses"
on public.training_courses
for select
to anon, authenticated
using (status in ('published', 'closed'));

drop policy if exists "admins can read all training courses"
    on public.training_courses;
create policy "admins can read all training courses"
on public.training_courses
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can insert training courses"
    on public.training_courses;
create policy "admins can insert training courses"
on public.training_courses
for insert
to authenticated
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can update training courses"
    on public.training_courses;
create policy "admins can update training courses"
on public.training_courses
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can delete training courses"
    on public.training_courses;
create policy "admins can delete training courses"
on public.training_courses
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can read training applications"
    on public.training_applications;
create policy "admins can read training applications"
on public.training_applications
for select
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can update training applications"
    on public.training_applications;
create policy "admins can update training applications"
on public.training_applications
for update
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
)
with check (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

drop policy if exists "admins can delete training applications"
    on public.training_applications;
create policy "admins can delete training applications"
on public.training_applications
for delete
to authenticated
using (
    exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

grant select on public.training_courses to anon, authenticated;
grant insert, update, delete on public.training_courses to authenticated;
grant select, update, delete on public.training_applications to authenticated;
grant select on public.training_applications_with_answers to authenticated;

grant all on public.training_courses to service_role;
grant all on public.training_applications to service_role;
grant select on public.training_applications_with_answers to service_role;

revoke all on function private.set_training_updated_at() from public, anon, authenticated;
revoke all on function private.enforce_training_application_limits() from public, anon, authenticated;
revoke all on function public.get_course_by_slug(text) from public;
grant execute on function public.get_course_by_slug(text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
