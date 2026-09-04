-- Only server-issued signed upload URLs may create or replace vault objects.
drop policy if exists "vault_owner_insert" on storage.objects;
drop policy if exists "vault_owner_update" on storage.objects;

-- Serialize quota checks per account so concurrent finalizations cannot exceed quota.
create or replace function public.finalize_file_upload(
  _owner_id uuid,
  _name text,
  _storage_path text,
  _mime_type text,
  _size_bytes bigint,
  _share_token uuid
)
returns public.files
language plpgsql
security definer
set search_path = public
as $$
declare
  _quota bigint;
  _used bigint;
  _file public.files;
begin
  select storage_quota_bytes
    into _quota
    from public.profiles
   where id = _owner_id
   for update;

  if not found then
    raise exception 'Profile not found';
  end if;

  select coalesce(sum(size_bytes), 0)::bigint
    into _used
    from public.files
   where owner_id = _owner_id;

  if _used + _size_bytes > _quota then
    raise exception 'This upload exceeds the remaining storage quota'
      using errcode = 'check_violation';
  end if;

  insert into public.files (
    owner_id,
    name,
    storage_path,
    mime_type,
    size_bytes,
    is_public,
    share_token,
    download_count
  ) values (
    _owner_id,
    _name,
    _storage_path,
    _mime_type,
    _size_bytes,
    false,
    _share_token,
    0
  ) returning * into _file;

  return _file;
end;
$$;

revoke all on function public.finalize_file_upload(uuid, text, text, text, bigint, uuid) from public;
grant execute on function public.finalize_file_upload(uuid, text, text, text, bigint, uuid) to service_role;