-- =========================================================
-- AUTO-PROVISIONING HOST ON SIGNUP
-- Additive migration on top of schema_saas_hosting.sql — does not alter
-- any existing table, column, or policy.
--
-- Creating the `hosts` row from a Postgres trigger on auth.users (instead
-- of from the Flutter client right after signUp()) means:
--   - it happens in the same transaction as the auth user creation, so
--     there's no window where a signed-up user has no host record yet;
--   - the client never needs insert access to `hosts` at all, so no new
--     RLS policy is required — SECURITY DEFINER runs as the function
--     owner, bypassing RLS for this one, tightly-scoped operation.
-- =========================================================

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.hosts (auth_user_id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
