-- Save a workout while it is being done, so a refresh or a closed tab does
-- not lose it.
--
-- The logger keeps one in_progress workout_logs row per client and workout,
-- holding the whole set grid (ticks, weights, reps) as JSON in draft. Real
-- exercise_logs/set_logs rows are written only on Complete Workout, which also
-- flips the row to completed and clears draft, so half-done sets never reach
-- history, Prev. or coach stats.

alter table public.workout_logs add column draft jsonb;

-- Two tabs can both try to start the draft; the second insert fails here and
-- the logger falls back to the row that won.
create unique index workout_logs_one_in_progress
  on public.workout_logs (client_id, workout_id)
  where status = 'in_progress';
