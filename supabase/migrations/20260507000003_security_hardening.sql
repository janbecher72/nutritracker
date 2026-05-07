-- Security hardening applied after initial migrations:
-- 1. Pin search_path on touch_updated_at function (Supabase advisor 0011)
-- 2. Revoke RPC access to handle_new_user (advisor 0028, 0029)
-- 3. Move pg_trgm extension out of public schema (advisor 0014)

-- 1. Pin search_path
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;

-- 2. Lock down handle_new_user from RPC exposure
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 3. Move pg_trgm to extensions schema
create schema if not exists extensions;
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_trgm' and extnamespace = 'public'::regnamespace) then
    alter extension pg_trgm set schema extensions;
  end if;
end $$;
grant usage on schema extensions to anon, authenticated, service_role;
