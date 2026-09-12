import { notFound, redirect } from "next/navigation";
import { WorkoutLogger } from "@/components/client/workout-logger";
import {
  getCurrentClient,
  getPreviousWorkoutLog,
  getWorkoutWithProgramme,
} from "@/lib/data";
import type { SetLog } from "@/lib/types";

export default async function WorkoutPage({
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

  const previousLog = await getPreviousWorkoutLog(client.id, id);
  const previousByExerciseId: Record<string, Pick<SetLog, "reps" | "weightKg">[]> = {};
  for (const ex of previousLog?.exercises ?? []) {
    previousByExerciseId[ex.exerciseId] = ex.sets.map((s) => ({
      reps: s.reps,
      weightKg: s.weightKg,
    }));
  }

  return (
    <WorkoutLogger
      workout={result.workout}
      programmeName={result.programmeName}
      clientId={client.id}
      previousByExerciseId={previousByExerciseId}
    />
  );
}
