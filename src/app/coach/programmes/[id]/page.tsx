import { notFound } from "next/navigation";
import { ProgrammeEditor } from "@/components/coach/programme-editor";
import { getClient, getExercises, getProgramme, getWorkoutTemplates } from "@/lib/data";

export default async function EditProgrammePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [programme, exercises, templates] = await Promise.all([
    getProgramme(id),
    getExercises(),
    getWorkoutTemplates(),
  ]);
  if (!programme) notFound();

  // A client's personal copy links back to that client, not the library.
  const owner = programme.clientId ? await getClient(programme.clientId) : null;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ProgrammeEditor
        initial={programme}
        exercises={exercises}
        templates={templates}
        owner={owner ? { id: owner.id, name: owner.name } : null}
      />
    </div>
  );
}
