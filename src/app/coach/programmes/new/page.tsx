import { ProgrammeEditor } from "@/components/coach/programme-editor";
import { getExercises } from "@/lib/data";

export default async function NewProgrammePage() {
  const exercises = await getExercises();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ProgrammeEditor initial={null} exercises={exercises} owner={null} />
    </div>
  );
}
