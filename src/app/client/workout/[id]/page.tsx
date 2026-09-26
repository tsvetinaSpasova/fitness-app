import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentClient, getWorkoutWithProgramme } from "@/lib/data";
import { repsLabel } from "@/lib/utils";
import { ArrowLeft, Play } from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.client.workout;

/**
 * Workout preview: the whole session at a glance before anything is logged.
 * Order is a suggestion, not a rule — the client can start wherever a
 * station is free. "Begin workout" opens the logger.
 */
export default async function WorkoutPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  // RLS only exposes workouts in the client's own programme copy, so an
  // unknown or foreign id simply comes back empty.
  const result = await getWorkoutWithProgramme(id);
  if (!result) notFound();
  const { workout, programmeName } = result;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-slate-100">
        <Link
          href="/client"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft size={15} /> {copy.client.common.back}
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{workout.name}</h1>
        <p className="text-sm text-slate-500">
          {fill(t.summary, { programme: programmeName, count: workout.exercises.length })}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">{t.warmupTitle}</p>
          <p className="text-xs text-amber-700 mt-0.5">{t.warmupBody}</p>
        </div>

        <div
          data-testid="exercise-overview"
          className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3"
        >
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm font-semibold text-slate-900">{t.todaysExercises}</p>
            <p className="text-xs text-slate-400">{t.anyOrder}</p>
          </div>
          <ol className="divide-y divide-slate-100">
            {workout.exercises.map((we, i) => (
              <li
                key={we.exerciseId}
                data-testid="exercise-overview-item"
                className="flex items-center gap-3 py-2.5"
              >
                <span className="w-[22px] h-[22px] rounded-full bg-blue-50 text-blue-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{we.exercise.name}</p>
                  <p className="text-xs text-slate-500">
                    {we.exercise.muscleGroup}
                    {we.restSeconds != null &&
                      ` · ${fill(copy.client.common.restSuffix, { seconds: we.restSeconds })}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700 shrink-0">
                  {fill(t.setsByReps, { sets: we.sets, reps: repsLabel(we) })}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="pt-2 pb-4">
          <Link
            href={`/client/workout/${workout.id}/start`}
            className="w-full inline-flex items-center justify-center gap-2 font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-base px-6 py-3 transition-colors"
          >
            <Play size={18} /> {t.begin}
          </Link>
        </div>
      </div>
    </div>
  );
}
