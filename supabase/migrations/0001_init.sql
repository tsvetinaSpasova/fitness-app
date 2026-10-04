-- DG Coaching initial schema
-- Run this in the Supabase dashboard: Project > SQL Editor > New query

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  name text not null,
  email text not null,
  avatar_url text,
  goal text,
  joined_at date not null default current_date,
  last_active date,
  assigned_programme_id uuid,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- exercise library (coach-managed)
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  muscle_group text not null,
  video_url text,
  instructions text,
  alternatives text[],
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- programmes: template programmes have client_id null;
-- a client's assigned copy has client_id + original_programme_id set.
-- ---------------------------------------------------------------------------
create table public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phase int,
  client_id uuid references public.profiles (id) on delete cascade,
  original_programme_id uuid references public.programmes (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_assigned_programme_id_fkey
  foreign key (assigned_programme_id) references public.programmes (id) on delete set null;

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.programmes (id) on delete cascade,
  name text not null,
  order_num int not null default 0,
  created_at timestamptz not null default now()
);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  position int not null default 0,
  sets int not null,
  reps int not null,
  rest_seconds int,
  notes text
);

-- ---------------------------------------------------------------------------
-- logging
-- ---------------------------------------------------------------------------
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  workout_id uuid references public.workouts (id) on delete set null,
  workout_name text not null,
  programme_name text not null,
  status text not null check (status in ('completed', 'in_progress')),
  logged_at timestamptz not null default now()
);

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  workout_log_id uuid not null references public.workout_logs (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  exercise_log_id uuid not null references public.exercise_logs (id) on delete cascade,
  set_number int not null,
  reps int not null,
  weight_kg numeric not null
);

create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  weight_kg numeric,
  hips_cm numeric,
  waist_cm numeric,
  chest_cm numeric,
  arms_cm numeric,
  legs_cm numeric
);

create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  energy int not null,
  sleep int not null,
  nutrition int not null,
  notes text
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  date date not null,
  url text not null
);

create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

-- security definer + fixed search_path so this can be called from RLS policies
-- without recursing back into profiles' own RLS.
create function public.is_coach()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'coach'
  );
$$;

-- auto-create a profile row when someone signs up.
-- Reads role/name from the signUp() `options.data` metadata, defaulting to 'client'.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'role', 'client'),
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- row level security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.exercises enable row level security;
alter table public.programmes enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.exercise_logs enable row level security;
alter table public.set_logs enable row level security;
alter table public.measurements enable row level security;
alter table public.check_ins enable row level security;
alter table public.progress_photos enable row level security;
alter table public.coach_notes enable row level security;

-- profiles: everyone can read their own row; coaches can read every profile.
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_coach());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_coach_manage" on public.profiles
  for all using (public.is_coach()) with check (public.is_coach());

-- exercise library: readable by any signed-in user, writable by coaches only.
create policy "exercises_select" on public.exercises
  for select using (auth.role() = 'authenticated');
create policy "exercises_coach_write" on public.exercises
  for all using (public.is_coach()) with check (public.is_coach());

-- programmes: a client can see their own assigned copy; coaches see everything.
create policy "programmes_select" on public.programmes
  for select using (client_id = auth.uid() or public.is_coach());
create policy "programmes_coach_write" on public.programmes
  for all using (public.is_coach()) with check (public.is_coach());

-- workouts / workout_exercises: visible if the parent programme is visible.
create policy "workouts_select" on public.workouts
  for select using (
    exists (
      select 1 from public.programmes p
      where p.id = workouts.programme_id
        and (p.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "workouts_coach_write" on public.workouts
  for all using (public.is_coach()) with check (public.is_coach());

create policy "workout_exercises_select" on public.workout_exercises
  for select using (
    exists (
      select 1 from public.workouts w
      join public.programmes p on p.id = w.programme_id
      where w.id = workout_exercises.workout_id
        and (p.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "workout_exercises_coach_write" on public.workout_exercises
  for all using (public.is_coach()) with check (public.is_coach());

-- logging: clients manage their own logs; coaches can see and manage all.
create policy "workout_logs_select" on public.workout_logs
  for select using (client_id = auth.uid() or public.is_coach());
create policy "workout_logs_client_write" on public.workout_logs
  for all using (client_id = auth.uid() or public.is_coach())
  with check (client_id = auth.uid() or public.is_coach());

create policy "exercise_logs_select" on public.exercise_logs
  for select using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = exercise_logs.workout_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "exercise_logs_write" on public.exercise_logs
  for all using (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = exercise_logs.workout_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  )
  with check (
    exists (
      select 1 from public.workout_logs wl
      where wl.id = exercise_logs.workout_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  );

create policy "set_logs_select" on public.set_logs
  for select using (
    exists (
      select 1 from public.exercise_logs el
      join public.workout_logs wl on wl.id = el.workout_log_id
      where el.id = set_logs.exercise_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  );
create policy "set_logs_write" on public.set_logs
  for all using (
    exists (
      select 1 from public.exercise_logs el
      join public.workout_logs wl on wl.id = el.workout_log_id
      where el.id = set_logs.exercise_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  )
  with check (
    exists (
      select 1 from public.exercise_logs el
      join public.workout_logs wl on wl.id = el.workout_log_id
      where el.id = set_logs.exercise_log_id
        and (wl.client_id = auth.uid() or public.is_coach())
    )
  );

-- client-owned records: measurements, check-ins, progress photos.
create policy "measurements_select" on public.measurements
  for select using (client_id = auth.uid() or public.is_coach());
create policy "measurements_write" on public.measurements
  for all using (client_id = auth.uid() or public.is_coach())
  with check (client_id = auth.uid() or public.is_coach());

create policy "check_ins_select" on public.check_ins
  for select using (client_id = auth.uid() or public.is_coach());
create policy "check_ins_write" on public.check_ins
  for all using (client_id = auth.uid() or public.is_coach())
  with check (client_id = auth.uid() or public.is_coach());

create policy "progress_photos_select" on public.progress_photos
  for select using (client_id = auth.uid() or public.is_coach());
create policy "progress_photos_write" on public.progress_photos
  for all using (client_id = auth.uid() or public.is_coach())
  with check (client_id = auth.uid() or public.is_coach());

-- coach notes: private to coaches, never visible to the client they're about.
create policy "coach_notes_coach_only" on public.coach_notes
  for all using (public.is_coach()) with check (public.is_coach());
