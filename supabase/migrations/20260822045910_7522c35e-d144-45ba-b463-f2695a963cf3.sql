insert into public.user_roles (user_id, role)
select id, 'admin'::app_role from auth.users order by created_at asc limit 1
on conflict (user_id, role) do nothing;