import { notFound, redirect } from "next/navigation";
import { WorkoutLogger } from "@/components/client/workout-logger";
import {
  getCurrentClient,
  getInProgressLog,
  getPreviousSetsByExercise,
  getWorkoutWithProgramme,
} from "@/lib/data";

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

  const [previousByExerciseId, inProgressLog] = await Promise.all([
    getPreviousSetsByExercise(
      client.id,
      result.workout.exercises.map((we) => we.exerciseId)
    ),
    getInProgressLog(client.id, id),
  ]);

  return (
    <WorkoutLogger
      workout={result.workout}
      programmeName={result.programmeName}
      clientId={client.id}
      previousByExerciseId={previousByExerciseId}
      inProgressLog={inProgressLog}
    />
  );
}
