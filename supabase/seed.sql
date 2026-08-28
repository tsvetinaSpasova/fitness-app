-- Demo seed data for FitCoach.
-- Idempotent: safe to run more than once.
--
-- Creates one demo coach and five demo clients (password for all: password123),
-- the exercise library, two programme templates, per-client programme copies,
-- and sample logs / check-ins / measurements / notes.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- auth users (profiles are created by the on_auth_user_created trigger)
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'role', u.user_role),
  now(), now(), '', '', '', ''
from (values
  ('11111111-1111-1111-1111-111111111111'::uuid, 'alex@coach.com',    'Alex Trainer', 'coach'),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'sarah@example.com', 'Sarah Johnson', 'client'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'marcus@example.com','Marcus Lee', 'client'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'emma@example.com',  'Emma Clarke', 'client'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'james@example.com', 'James Patel', 'client'),
  ('66666666-6666-6666-6666-666666666666'::uuid, 'olivia@example.com','Olivia Nkosi', 'client')
) as u(id, email, name, user_role)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email in (
  'alex@coach.com', 'sarah@example.com', 'marcus@example.com',
  'emma@example.com', 'james@example.com', 'olivia@example.com'
)
and not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

update public.profiles p
set goal = v.goal, joined_at = v.joined_at::date
from (values
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Fat loss & muscle tone',    '2025-09-15'),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Muscle building',           '2025-10-01'),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'General fitness',           '2025-11-20'),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'Strength & conditioning',   '2026-01-10'),
  ('66666666-6666-6666-6666-666666666666'::uuid, 'Post-natal fitness',        '2026-02-01')
) as v(id, goal, joined_at)
where p.id = v.id;

-- ---------------------------------------------------------------------------
-- exercise library
-- ---------------------------------------------------------------------------
insert into public.exercises (id, name, muscle_group, instructions, alternatives) values
  ('e0000000-0000-0000-0000-000000000001', 'Goblet Squat', 'Legs',
   'Hold a dumbbell at chest height. Squat deep keeping chest up.',
   array['Leg Press', 'Smith Machine Squat', 'Bulgarian Split Squat']),
  ('e0000000-0000-0000-0000-000000000002', 'Romanian Deadlift', 'Hamstrings',
   'Hinge at hips, keep back flat, lower bar along legs.',
   array['Leg Curl', 'Nordic Curl']),
  ('e0000000-0000-0000-0000-000000000003', 'Dumbbell Bench Press', 'Chest',
   'Lie flat, press dumbbells up from chest level.',
   array['Barbell Bench Press', 'Cable Fly', 'Push Up']),
  ('e0000000-0000-0000-0000-000000000004', 'Seated Cable Row', 'Back',
   'Sit tall, pull handle to lower chest, squeeze shoulder blades.',
   array['Dumbbell Row', 'Lat Pulldown']),
  ('e0000000-0000-0000-0000-000000000005', 'Dumbbell Shoulder Press', 'Shoulders',
   'Press dumbbells overhead from shoulder height.',
   array['Barbell Press', 'Arnold Press', 'Cable Lateral Raise']),
  ('e0000000-0000-0000-0000-000000000006', 'Walking Lunges', 'Legs',
   'Step forward into lunge, alternate legs across the floor.',
   array['Reverse Lunge', 'Step Up']),
  ('e0000000-0000-0000-0000-000000000007', 'Pull Up', 'Back',
   'Hang from bar, pull chin above bar, lower with control.',
   array['Lat Pulldown', 'Assisted Pull Up']),
  ('e0000000-0000-0000-0000-000000000008', 'Hip Thrust', 'Glutes',
   'Shoulders on bench, drive hips up squeezing glutes at top.',
   array['Glute Bridge', 'Cable Kickback'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- programme templates (client_id null) with workouts and exercises
-- ---------------------------------------------------------------------------
insert into public.programmes (id, name, phase) values
  ('a0000000-0000-0000-0000-000000000001', 'Full Body Phase 1', 1),
  ('a0000000-0000-0000-0000-000000000002', 'Full Body Phase 2', 2)
on conflict (id) do nothing;

insert into public.workouts (id, programme_id, name, order_num) values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Workout A — Lower Focus', 1),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Workout B — Upper Focus', 2),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Workout C — Full Body', 3),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Workout A — Lower Power', 1),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Workout B — Upper Power', 2)
on conflict (id) do nothing;

insert into public.workout_exercises (workout_id, exercise_id, position, sets, reps, rest_seconds)
select w.id, x.exercise_id::uuid, x.position, x.sets, x.reps, x.rest_seconds
from (values
  -- Phase 1 / Workout A
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1, 3, 10, 90),
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 2, 3, 10, 90),
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 3, 3, 12, 60),
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 4, 3, 10, 60),
  -- Phase 1 / Workout B
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003', 1, 3, 10, 90),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000004', 2, 3, 10, 90),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000005', 3, 3, 10, 60),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000007', 4, 3, 8, 90),
  -- Phase 1 / Workout C
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000001', 1, 4, 8, 120),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', 2, 4, 8, 120),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000008', 3, 3, 15, 60),
  ('b0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000004', 4, 3, 12, 60),
  -- Phase 2 / Workout A
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000001', 1, 4, 6, 120),
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000002', 2, 4, 8, 120),
  ('b0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000008', 3, 4, 10, 90),
  -- Phase 2 / Workout B
  ('b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000003', 1, 4, 6, 120),
  ('b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000007', 2, 4, 6, 120),
  ('b0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', 3, 3, 8, 90)
) as x(workout_id, exercise_id, position, sets, reps, rest_seconds)
join public.workouts w on w.id = x.workout_id::uuid
where not exists (
  select 1 from public.workout_exercises we
  where we.workout_id = w.id and we.exercise_id = x.exercise_id::uuid
);

-- ---------------------------------------------------------------------------
-- assign programmes: each client gets their own copy of a template
-- ---------------------------------------------------------------------------
do $$
declare
  pair record;
begin
  for pair in
    select v.client_id::uuid as client_id, v.template_id::uuid as template_id
    from (values
      ('22222222-2222-2222-2222-222222222222', 'a0000000-0000-0000-0000-000000000001'),
      ('33333333-3333-3333-3333-333333333333', 'a0000000-0000-0000-0000-000000000002'),
      ('44444444-4444-4444-4444-444444444444', 'a0000000-0000-0000-0000-000000000001'),
      ('55555555-5555-5555-5555-555555555555', 'a0000000-0000-0000-0000-000000000002'),
      ('66666666-6666-6666-6666-666666666666', 'a0000000-0000-0000-0000-000000000001')
    ) as v(client_id, template_id)
    join public.profiles p on p.id = v.client_id::uuid
    where p.assigned_programme_id is null
  loop
    perform public.copy_programme_for_client(pair.template_id, pair.client_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- sample activity: workout logs (with sets), check-ins, measurements, notes
-- ---------------------------------------------------------------------------
do $$
declare
  sarah constant uuid := '22222222-2222-2222-2222-222222222222';
  marcus constant uuid := '33333333-3333-3333-3333-333333333333';
  log_id uuid;
  ex_log_id uuid;
  wid uuid;
begin
  if exists (select 1 from workout_logs where client_id = sarah) then
    return;
  end if;

  -- Sarah: Workout A — Lower Focus, yesterday
  select w.id into wid from workouts w
    join programmes p on p.id = w.programme_id
    where p.client_id = sarah and w.name = 'Workout A — Lower Focus';
  insert into workout_logs (client_id, workout_id, workout_name, programme_name, status, logged_at)
  values (sarah, wid, 'Workout A — Lower Focus', 'Full Body Phase 1', 'completed', now() - interval '1 day')
  returning id into log_id;

  insert into exercise_logs (workout_log_id, exercise_id)
  values (log_id, 'e0000000-0000-0000-0000-000000000001') returning id into ex_log_id;
  insert into set_logs (exercise_log_id, set_number, reps, weight_kg) values
    (ex_log_id, 1, 10, 16), (ex_log_id, 2, 10, 16), (ex_log_id, 3, 8, 18);

  insert into exercise_logs (workout_log_id, exercise_id)
  values (log_id, 'e0000000-0000-0000-0000-000000000002') returning id into ex_log_id;
  insert into set_logs (exercise_log_id, set_number, reps, weight_kg) values
    (ex_log_id, 1, 10, 40), (ex_log_id, 2, 10, 40), (ex_log_id, 3, 10, 42.5);

  -- Sarah: Workout B — Upper Focus, three days ago
  select w.id into wid from workouts w
    join programmes p on p.id = w.programme_id
    where p.client_id = sarah and w.name = 'Workout B — Upper Focus';
  insert into workout_logs (client_id, workout_id, workout_name, programme_name, status, logged_at)
  values (sarah, wid, 'Workout B — Upper Focus', 'Full Body Phase 1', 'completed', now() - interval '3 days')
  returning id into log_id;

  insert into exercise_logs (workout_log_id, exercise_id)
  values (log_id, 'e0000000-0000-0000-0000-000000000003') returning id into ex_log_id;
  insert into set_logs (exercise_log_id, set_number, reps, weight_kg) values
    (ex_log_id, 1, 10, 12), (ex_log_id, 2, 10, 12), (ex_log_id, 3, 9, 14);

  -- Marcus: Workout A — Lower Power, today
  select w.id into wid from workouts w
    join programmes p on p.id = w.programme_id
    where p.client_id = marcus and w.name = 'Workout A — Lower Power';
  insert into workout_logs (client_id, workout_id, workout_name, programme_name, status, logged_at)
  values (marcus, wid, 'Workout A — Lower Power', 'Full Body Phase 2', 'completed', now() - interval '2 hours')
  returning id into log_id;

  insert into exercise_logs (workout_log_id, exercise_id)
  values (log_id, 'e0000000-0000-0000-0000-000000000001') returning id into ex_log_id;
  insert into set_logs (exercise_log_id, set_number, reps, weight_kg) values
    (ex_log_id, 1, 6, 28), (ex_log_id, 2, 6, 28), (ex_log_id, 3, 6, 30), (ex_log_id, 4, 5, 30);

  -- Check-ins
  insert into check_ins (client_id, date, energy, sleep, nutrition, notes) values
    (sarah, (now() - interval '1 day')::date, 7, 8, 6, 'Feeling strong this week, sleep has improved a lot.'),
    (sarah, (now() - interval '8 days')::date, 5, 6, 7, 'Stressful week at work, energy low.'),
    (marcus, (now() - interval '1 day')::date, 9, 8, 8, null);

  -- Measurements (Sarah, monthly)
  insert into measurements (client_id, date, weight_kg, hips_cm, waist_cm, chest_cm) values
    (sarah, (now() - interval '22 days')::date, 68,   97,  76, 88),
    (sarah, (now() - interval '53 days')::date, 69.5, 98,  78, 89),
    (sarah, (now() - interval '83 days')::date, 71,   100, 80, 90);

  -- Coach notes
  insert into coach_notes (client_id, content, created_at) values
    (sarah, 'Left knee niggle — avoid deep lunges for now. Prefers morning sessions.', now() - interval '11 months'),
    (marcus, 'Former rugby player. Strong lower body baseline. Wants to compete in powerlifting.', now() - interval '10 months');

  -- Last-active stamps shown on the coach dashboard
  update profiles set last_active = (now() - interval '1 day')::date where id = sarah;
  update profiles set last_active = now()::date where id = marcus;
  update profiles set last_active = (now() - interval '24 days')::date where id = '44444444-4444-4444-4444-444444444444';
  update profiles set last_active = (now() - interval '2 days')::date  where id = '55555555-5555-5555-5555-555555555555';
  update profiles set last_active = (now() - interval '4 days')::date  where id = '66666666-6666-6666-6666-666666666666';
end;
$$;

-- ---------------------------------------------------------------------------
-- clients with NO assigned programme (empty-state demos: coach sees a bare
-- profile, client portal shows "No programme assigned yet")
-- ---------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
select
  '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated',
  u.email, extensions.crypt('password123', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', u.name, 'role', 'client'),
  now(), now(), '', '', '', ''
from (values
  ('77777777-7777-7777-7777-777777777777'::uuid, 'liam@example.com', 'Liam Okafor'),
  ('88888888-8888-8888-8888-888888888888'::uuid, 'maya@example.com', 'Maya Rossi')
) as u(id, email, name)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, provider, identity_data,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), u.id, u.id::text, 'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
from auth.users u
where u.email in ('liam@example.com', 'maya@example.com')
and not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

update public.profiles p
set goal = v.goal, joined_at = v.joined_at::date
from (values
  ('77777777-7777-7777-7777-777777777777'::uuid, 'Marathon prep', '2026-08-25'),
  ('88888888-8888-8888-8888-888888888888'::uuid, 'Strength building', '2026-08-27')
) as v(id, goal, joined_at)
where p.id = v.id;

-- Bodyweight exercises (requires_weight = false): the client UI hides all
-- weight fields for these. (Idempotent — the insert above uses ON CONFLICT
-- DO NOTHING, so the flag is set here.)
update public.exercises set requires_weight = false where name = 'Pull Up';
