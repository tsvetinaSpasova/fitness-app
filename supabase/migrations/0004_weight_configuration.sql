-- Weight configuration for exercises and prescriptions:
-- * exercises.requires_weight — false for bodyweight exercises; the client
--   UI hides all weight-related fields for them.
-- * workout_exercises.target_weight_kg — optional coach-prescribed weight,
--   used as the default in the client's logger (takes precedence over the
--   client's previous session).
-- * workout_exercises.set_details — optional per-set scheme, a jsonb array
--   [{"reps": 12, "weightKg": 40}, ...] with one entry per set, overriding
--   the uniform sets × reps prescription (e.g. pyramid sets).
-- * set_logs.weight_kg becomes nullable — bodyweight sets log reps only.

alter table public.exercises
  add column if not exists requires_weight boolean not null default true;

alter table public.workout_exercises
  add column if not exists target_weight_kg numeric,
  add column if not exists set_details jsonb;

alter table public.set_logs
  alter column weight_kg drop not null;

-- The per-client copy must carry the new prescription columns.
create or replace function public.copy_programme_for_client(template_id uuid, target_client_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_programme_id uuid;
  w record;
  new_workout_id uuid;
begin
  if auth.uid() is not null and not public.is_coach() then
    raise exception 'only coaches can assign programmes';
  end if;

  insert into programmes (name, phase, client_id, original_programme_id)
  select name, phase, target_client_id, id from programmes where id = template_id
  returning id into new_programme_id;

  if new_programme_id is null then
    raise exception 'programme % not found', template_id;
  end if;

  for w in select * from workouts where programme_id = template_id order by order_num loop
    insert into workouts (programme_id, name, order_num)
    values (new_programme_id, w.name, w.order_num)
    returning id into new_workout_id;

    insert into workout_exercises
      (workout_id, exercise_id, position, sets, reps, rest_seconds, notes, target_weight_kg, set_details)
    select new_workout_id, exercise_id, position, sets, reps, rest_seconds, notes, target_weight_kg, set_details
    from workout_exercises where workout_id = w.id;
  end loop;

  update profiles set assigned_programme_id = new_programme_id where id = target_client_id;
  return new_programme_id;
end;
$$;
