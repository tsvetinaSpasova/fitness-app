import { ExerciseLibrary } from "@/components/coach/exercise-library";
import { getExercises } from "@/lib/data";

export default async function ExercisesPage() {
  const exercises = await getExercises();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ExerciseLibrary exercises={exercises} />
    </div>
  );
}
