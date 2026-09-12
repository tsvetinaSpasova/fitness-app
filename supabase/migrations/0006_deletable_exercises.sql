-- Let coaches delete exercises from the library without losing history.
-- exercise_logs keeps its own exercise_name snapshot (backfilled here and
-- written by the logger from now on), and exercise_id becomes a nullable
-- ON DELETE SET NULL reference. workout_exercises keeps ON DELETE RESTRICT:
-- an exercise still used in a workout has to be removed from it first, and
-- the library UI says so instead of offering a delete that would fail.

alter table public.exercise_logs
  add column if not exists exercise_name text,
  alter column exercise_id drop not null;

update public.exercise_logs el
set exercise_name = e.name
from public.exercises e
where e.id = el.exercise_id and el.exercise_name is null;

alter table public.exercise_logs
  drop constraint if exists exercise_logs_exercise_id_fkey,
  add constraint exercise_logs_exercise_id_fkey
    foreign key (exercise_id) references public.exercises (id) on delete set null;
