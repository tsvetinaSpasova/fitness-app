-- Assigning a programme to a client means giving them their own copy of a
-- template (client_id + original_programme_id set), because RLS only lets
-- clients read programmes where client_id = auth.uid().
--
-- security definer so the row copies bypass per-row checks in one place;
-- guarded so only coaches (or direct server-side/seed calls, where there is
-- no auth uid) can execute it.

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

    insert into workout_exercises (workout_id, exercise_id, position, sets, reps, rest_seconds, notes)
    select new_workout_id, exercise_id, position, sets, reps, rest_seconds, notes
    from workout_exercises where workout_id = w.id;
  end loop;

  update profiles set assigned_programme_id = new_programme_id where id = target_client_id;
  return new_programme_id;
end;
$$;
