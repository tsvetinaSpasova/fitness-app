-- Close two ways a client could make themselves a coach.
--
-- 1. handle_new_user() used to take the role from signUp() metadata, which
--    the browser controls. New sign-ups are now always clients.
-- 2. profiles_update_own lets users edit their own row, role included.
--    A trigger now rejects role changes unless they come from a coach or
--    from a trusted database role (SQL editor, management API, service key).
--
-- To create a coach: have them sign up, then as a database admin run
--   update public.profiles set role = 'coach' where email = '...';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

-- Runs as the caller (not security definer) so current_user is the real
-- request role: "authenticated"/"anon" for API calls from the app.
create function public.guard_profile_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and not public.is_coach() then
    raise exception 'Only a coach can change a profile role'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();
