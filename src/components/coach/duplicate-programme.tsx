"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Programme } from "@/lib/types";
import { Copy } from "lucide-react";

/** Copies a template programme (with workouts and exercises) into a new template. */
export function DuplicateProgramme({ programme }: { programme: Programme }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function duplicate() {
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const { data: newProgramme, error: pError } = await supabase
      .from("programmes")
      .insert({ name: `${programme.name} (copy)`, phase: programme.phase ?? null })
      .select("id")
      .single();
    if (pError || !newProgramme) {
      setError(pError?.message ?? "Could not duplicate programme.");
      setBusy(false);
      return;
    }

    for (const workout of programme.workouts) {
      const { data: newWorkout, error: wError } = await supabase
        .from("workouts")
        .insert({
          programme_id: newProgramme.id,
          name: workout.name,
          order_num: workout.order,
        })
        .select("id")
        .single();
      if (wError || !newWorkout) {
        setError(wError?.message ?? "Could not duplicate workouts.");
        setBusy(false);
        return;
      }
      if (workout.exercises.length > 0) {
        const { error: weError } = await supabase.from("workout_exercises").insert(
          workout.exercises.map((we, i) => ({
            workout_id: newWorkout.id,
            exercise_id: we.exerciseId,
            position: i + 1,
            sets: we.sets,
            reps: we.reps,
            rest_seconds: we.restSeconds ?? null,
            notes: we.notes ?? null,
            target_weight_kg: we.targetWeightKg ?? null,
            set_details: we.setDetails ?? null,
          }))
        );
        if (weError) {
          setError(weError.message);
          setBusy(false);
          return;
        }
      }
    }

    setBusy(false);
    router.refresh();
  }

  return (
    <div>
      <Button size="sm" variant="ghost" onClick={duplicate} disabled={busy}>
        <Copy size={13} /> {busy ? "Duplicating…" : "Duplicate"}
      </Button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
