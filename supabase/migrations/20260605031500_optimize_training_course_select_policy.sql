drop policy if exists "public can read published training courses"
    on public.training_courses;
drop policy if exists "admins can read all training courses"
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
          and profiles.role = 'admin'
    )
);

notify pgrst, 'reload schema';
