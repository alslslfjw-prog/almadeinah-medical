insert into storage.buckets (id, name, public)
values ('blog-images', 'blog-images', true)
on conflict (id) do update
set public = excluded.public;

do $$
begin
    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Public read blog images'
    ) then
        create policy "Public read blog images"
        on storage.objects
        for select
        to public
        using (bucket_id = 'blog-images');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Auth upload blog images'
    ) then
        create policy "Auth upload blog images"
        on storage.objects
        for insert
        to authenticated
        with check (bucket_id = 'blog-images');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Auth update blog images'
    ) then
        create policy "Auth update blog images"
        on storage.objects
        for update
        to authenticated
        using (bucket_id = 'blog-images')
        with check (bucket_id = 'blog-images');
    end if;

    if not exists (
        select 1 from pg_policies
        where schemaname = 'storage'
          and tablename = 'objects'
          and policyname = 'Auth delete blog images'
    ) then
        create policy "Auth delete blog images"
        on storage.objects
        for delete
        to authenticated
        using (bucket_id = 'blog-images');
    end if;
end $$;
