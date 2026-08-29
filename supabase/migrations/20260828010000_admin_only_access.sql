-- The admin role is held in the database, never in browser code.
do $$ begin
  create type public.app_role as enum ('admin', 'user');
exception when duplicate_object then null;
end $$;

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.user_roles enable row level security;
grant select on public.user_roles to authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin') $$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "users_read_own_role" on public.user_roles;
create policy "users_read_own_role" on public.user_roles for select to authenticated using (user_id = auth.uid());

drop policy if exists "admins_read_all_files" on public.files;
create policy "admins_read_all_files" on public.files for select to authenticated using (public.is_admin());
drop policy if exists "admins_read_all_profiles" on public.profiles;
create policy "admins_read_all_profiles" on public.profiles for select to authenticated using (public.is_admin());

-- The only administrator for this application.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users where lower(email) = 'ighiledivine77@gmail.com'
on conflict (user_id) do update set role = excluded.role;
