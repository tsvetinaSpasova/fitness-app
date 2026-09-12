-- Common (pre-made) workouts: a coach-maintained library of workouts that
-- can be dropped into any programme from the editor's "Add workout" chooser.
-- A common workout is a workouts row with programme_id null; its exercise
-- list lives in workout_exercises exactly like a programme workout.
-- workouts.source_workout_id records which common workout a programme
-- workout was picked from, so the editor can tell an untouched pick (no
-- point saving it as common again) from a customised one.

alter table public.workouts
  alter column programme_id drop not null,
  add column if not exists source_workout_id uuid
    references public.workouts (id) on delete set null;

create index if not exists workouts_common_idx
  on public.workouts (name) where programme_id is null;

-- Common workouts are coach-only; programme workouts keep the old rule.
drop policy if exists "workouts_select" on public.workouts;
create policy "workouts_select" on public.workouts
  for select using (
    (workouts.programme_id is null and public.is_coach())
    or exists (
      select 1 from public.programmes p
      where p.id = workouts.programme_id
        and (p.client_id = auth.uid() or public.is_coach())
    )
  );

drop policy if exists "workout_exercises_select" on public.workout_exercises;
create policy "workout_exercises_select" on public.workout_exercises
  for select using (
    exists (
      select 1 from public.workouts w
      left join public.programmes p on p.id = w.programme_id
      where w.id = workout_exercises.workout_id
        and (
          (w.programme_id is null and public.is_coach())
          or p.client_id = auth.uid()
          or public.is_coach()
        )
    )
  );
