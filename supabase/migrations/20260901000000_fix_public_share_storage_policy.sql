-- The original vault_public_link_read policy used a raw cross-table subquery
-- (EXISTS ... FROM public.files f WHERE f.storage_path = name AND f.is_public = true)
-- inside a storage.objects RLS policy. Supabase Storage's policy evaluator does
-- not reliably apply anon-role grants inside subqueries that reference another
-- table, so public share links resolved to "Object not found" for anonymous
-- visitors even though the underlying data and grants were correct.
--
-- Fix: check public status through a SECURITY DEFINER function instead. The
-- function runs with the privileges of its owner, sidestepping the permission
-- quirk while still only ever returning a boolean, no data is exposed beyond
-- what the policy already intended to allow.

create or replace function public.is_file_public(object_name text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.files
    where storage_path = object_name
      and is_public = true
  );
$$;

grant execute on function public.is_file_public(text) to anon, authenticated;

drop policy if exists "vault_public_link_read" on storage.objects;

create policy "vault_public_link_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vault' and public.is_file_public(name));
