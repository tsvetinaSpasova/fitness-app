import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteProgramme } from "@/components/coach/delete-programme";
import { DuplicateProgramme } from "@/components/coach/duplicate-programme";
import { getProgrammeTemplates, getTemplateAssignmentCounts } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { Dumbbell, Pencil, Plus, Users } from "lucide-react";

export default async function ProgrammesPage() {
  const [programmes, assignmentCounts] = await Promise.all([
    getProgrammeTemplates(),
    getTemplateAssignmentCounts(),
  ]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Programmes</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {programmes.length} programme{programmes.length !== 1 ? "s" : ""} in your library
          </p>
        </div>
        <Link href="/coach/programmes/new">
          <Button size="sm">
            <Plus size={15} /> New programme
          </Button>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {programmes.map((programme) => {
          const assignedCount = assignmentCounts.get(programme.id) ?? 0;

          return (
            <Card
              key={programme.id}
              data-testid="programme-card"
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader className="flex flex-row items-start justify-between pb-3">
                <div>
                  <CardTitle className="text-base">{programme.name}</CardTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Created {formatDate(programme.createdAt)}
                  </p>
                </div>
                {programme.phase && (
                  <Badge variant="blue">Phase {programme.phase}</Badge>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {/* Workouts */}
                <div className="space-y-1.5 mb-4">
                  {programme.workouts.map((w) => (
                    <Link
                      key={w.id}
                      href={`/coach/programmes/${programme.id}#workout-${w.id}`}
                      className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-2 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Dumbbell size={13} className="text-blue-500" />
                        <span className="font-medium text-slate-700">{w.name}</span>
                      </div>
                      <span className="text-xs text-slate-400">
                        {w.exercises.length} exercises
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Users size={13} />
                    {assignedCount} client{assignedCount !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/coach/programmes/${programme.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={13} /> Edit
                    </Link>
                    <DuplicateProgramme programme={programme} />
                    <DeleteProgramme programmeId={programme.id} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {programmes.length === 0 && (
          <p className="text-sm text-slate-500 col-span-full">
            No programmes yet.
          </p>
        )}
      </div>
    </div>
  );
}
