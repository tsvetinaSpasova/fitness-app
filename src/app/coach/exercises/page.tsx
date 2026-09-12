import { ExerciseLibrary } from "@/components/coach/exercise-library";
import { getExerciseUsageCounts, getExercises } from "@/lib/data";

export default async function ExercisesPage() {
  const [exercises, usage] = await Promise.all([getExercises(), getExerciseUsageCounts()]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ExerciseLibrary exercises={exercises} usage={Object.fromEntries(usage)} />
    </div>
  );
}
