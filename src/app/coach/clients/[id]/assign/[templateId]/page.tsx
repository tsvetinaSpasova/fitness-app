import { notFound } from "next/navigation";
import { ProgrammeEditor } from "@/components/coach/programme-editor";
import { getClient, getExercises, getProgramme } from "@/lib/data";

// Assign flow: the editor opens prepopulated from the chosen template, and
// saving creates + assigns a fresh copy for this client. Only real templates
// can be assigned — a client copy's id here is a 404.
export default async function AssignProgrammePage({
  params,
}: {
  params: Promise<{ id: string; templateId: string }>;
}) {
  const { id, templateId } = await params;
  const [client, template, exercises] = await Promise.all([
    getClient(id),
    getProgramme(templateId),
    getExercises(),
  ]);
  if (!client || !template || template.clientId) notFound();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ProgrammeEditor
        initial={template}
        exercises={exercises}
        owner={null}
        assignTo={{ clientId: client.id, clientName: client.name, templateId: template.id }}
      />
    </div>
  );
}
