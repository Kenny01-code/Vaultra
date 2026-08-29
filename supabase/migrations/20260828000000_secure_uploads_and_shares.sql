-- Create the private bucket in the same migration as the policies that protect it.
insert into storage.buckets (id, name, public, file_size_limit)
values ('vault', 'vault', false, 1073741824)
on conflict (id) do update set public = false, file_size_limit = 1073741824;

-- Public links expose metadata and a short-lived signed URL only for files
-- explicitly shared by their owner. Private objects remain owner-only.
grant select on public.files to anon;
create policy "files_select_public_links" on public.files for select to anon, authenticated using (is_public = true);
create policy "vault_public_link_read" on storage.objects for select to anon, authenticated
using (bucket_id = 'vault' and exists (select 1 from public.files f where f.storage_path = name and f.is_public = true));
