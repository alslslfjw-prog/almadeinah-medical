insert into storage.buckets (id, name, public)
values ('training-application-uploads', 'training-application-uploads', false)
on conflict (id) do update
set public = false;

insert into storage.buckets (id, name, public)
values ('training-uploads', 'training-uploads', true)
on conflict (id) do update
set public = true;

drop policy if exists "staff can read training cover images"
    on storage.objects;
drop policy if exists "staff can upload training cover images"
    on storage.objects;
drop policy if exists "staff can update training cover images"
    on storage.objects;

create policy "staff can read training cover images"
on storage.objects
for select
to authenticated
using (
    bucket_id = 'training-uploads'
    and (storage.foldername(name))[1] = 'covers'
    and exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

create policy "staff can upload training cover images"
on storage.objects
for insert
to authenticated
with check (
    bucket_id = 'training-uploads'
    and (storage.foldername(name))[1] = 'covers'
    and exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

create policy "staff can update training cover images"
on storage.objects
for update
to authenticated
using (
    bucket_id = 'training-uploads'
    and (storage.foldername(name))[1] = 'covers'
    and exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
)
with check (
    bucket_id = 'training-uploads'
    and (storage.foldername(name))[1] = 'covers'
    and exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "read permitted training courses"
    on public.training_courses;
create policy "read permitted training courses"
on public.training_courses
for select
to anon, authenticated
using (
    status in ('published', 'closed')
    or exists (
        select 1
        from public.profiles
        where profiles.id = (select auth.uid())
          and profiles.role in ('admin', 'receptionist', 'accountant', 'editor')
    )
);

drop policy if exists "admins can insert training courses"
    on public.training_courses;
drop policy if exists "staff can insert training courses"
    on public.training_courses;
create policy "staff can insert training courses"
on public.training_courses
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

drop policy if exists "admins can update training courses"
    on public.training_courses;
drop policy if exists "staff can update training courses"
    on public.training_courses;
create policy "staff can update training courses"
on public.training_courses
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

notify pgrst, 'reload schema';
