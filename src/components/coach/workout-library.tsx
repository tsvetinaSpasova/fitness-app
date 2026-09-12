"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Workout } from "@/lib/types";
import { repsLabel } from "@/lib/utils";
import { Pencil, Plus, Trash2 } from "lucide-react";

/** The coach's common (pre-made) workouts, with edit and inline delete. */
export function WorkoutLibrary({ workouts }: { workouts: Workout[] }) {
  const router = useRouter();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const { error: dError } = await createClient().from("workouts").delete().eq("id", id);
    if (dError) {
      setError(dError.message);
      setBusy(false);
      return;
    }
    setConfirmingId(null);
    setBusy(false);
    router.refresh();
  }

  return (
    <>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Workouts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {workouts.length} common workout{workouts.length !== 1 ? "s" : ""} to drop into programmes
          </p>
        </div>
        <Link href="/coach/workouts/new">
          <Button size="sm">
            <Plus size={15} /> New workout
          </Button>
        </Link>
      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {workouts.map((w) => (
          <div key={w.id} data-testid="workout-card" className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{w.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}
                  {w.exercises.length > 0 && (
                    <>
                      {" · "}
                      {w.exercises
                        .map((we) => `${we.exercise.name} ${we.sets}×${repsLabel(we)}`)
                        .join(", ")}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {confirmingId === w.id ? (
                  <>
                    <span className="text-xs text-slate-500 hidden sm:inline">
                      Programmes keep their copies.
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => remove(w.id)} disabled={busy}>
                      <Trash2 size={13} className="text-red-500" /> Confirm delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(null)}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href={`/coach/workouts/${w.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <Pencil size={13} /> Edit
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmingId(w.id)}>
                      <Trash2 size={13} className="text-red-500" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {workouts.length === 0 && (
          <p className="text-sm text-slate-500 px-5 py-6 text-center">
            No common workouts yet. Create one here, or use &ldquo;Save as common&rdquo; on a workout in
            any programme.
          </p>
        )}
      </div>
    </>
  );
}
