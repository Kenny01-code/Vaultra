-- Prevent clients from setting their own storage quota.
-- The profiles_insert_own policy previously allowed any column to be set on insert.
-- We replace it with a policy that explicitly blocks storage_quota_bytes from client writes.

-- Drop the old permissive insert policy
drop policy if exists "profiles_insert_own" on public.profiles;

-- New insert policy: client can insert their own row but cannot set storage_quota_bytes
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (
    id = auth.uid()
    and storage_quota_bytes = 5368709120  -- must match the DB default (5 GB)
  );

-- Drop the old update policy
drop policy if exists "profiles_update_own" on public.profiles;

-- New update policy: client can update their own row but cannot change storage_quota_bytes
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and storage_quota_bytes = (select storage_quota_bytes from public.profiles where id = auth.uid())
  );
