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
        where profiles.id = (select auth.uid())
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
        where profiles.id = (select auth.uid())
          and profiles.role = 'admin'
    )
);

notify pgrst, 'reload schema';
