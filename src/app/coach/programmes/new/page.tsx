import { ProgrammeEditor } from "@/components/coach/programme-editor";
import { getExercises, getWorkoutTemplates } from "@/lib/data";

export default async function NewProgrammePage() {
  const [exercises, templates] = await Promise.all([getExercises(), getWorkoutTemplates()]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ProgrammeEditor initial={null} exercises={exercises} templates={templates} owner={null} />
    </div>
  );
}
