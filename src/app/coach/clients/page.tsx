import { ClientList } from "@/components/coach/client-list";
import { getClients } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export default async function ClientsPage() {
  const clients = await getClients();

  const assignedIds = clients
    .map((c) => c.assignedProgrammeId)
    .filter((id): id is string => Boolean(id));
  const programmeNames: Record<string, string> = {};
  if (assignedIds.length > 0) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("programmes")
      .select("id, name")
      .in("id", assignedIds);
    for (const row of data ?? []) programmeNames[row.id] = row.name;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {clients.length} active client{clients.length !== 1 ? "s" : ""}
        </p>
      </div>

      <ClientList clients={clients} programmeNames={programmeNames} />
    </div>
  );
}
