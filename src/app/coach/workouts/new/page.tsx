import { CommonWorkoutEditor } from "@/components/coach/common-workout-editor";
import { getExercises } from "@/lib/data";

export default async function NewWorkoutPage() {
  const exercises = await getExercises();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CommonWorkoutEditor initial={null} exercises={exercises} />
    </div>
  );
}
