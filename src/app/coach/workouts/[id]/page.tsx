import { notFound } from "next/navigation";
import { CommonWorkoutEditor } from "@/components/coach/common-workout-editor";
import { getExercises, getWorkoutTemplate } from "@/lib/data";

export default async function EditWorkoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [workout, exercises] = await Promise.all([getWorkoutTemplate(id), getExercises()]);
  if (!workout) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <CommonWorkoutEditor initial={workout} exercises={exercises} />
    </div>
  );
}
