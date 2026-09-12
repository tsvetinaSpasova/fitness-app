import { WorkoutLibrary } from "@/components/coach/workout-library";
import { getWorkoutTemplates } from "@/lib/data";

export default async function WorkoutsPage() {
  const workouts = await getWorkoutTemplates();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <WorkoutLibrary workouts={workouts} />
    </div>
  );
}
