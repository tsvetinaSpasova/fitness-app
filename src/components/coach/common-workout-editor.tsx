"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  exerciseDraftsFromWorkout,
  exerciseRows,
  inputClass,
  validateExerciseDrafts,
  WorkoutExercisesEditor,
  type ExerciseDraft,
} from "@/components/coach/workout-exercises-editor";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, Trash2 } from "lucide-react";

/** Create or edit one common (pre-made) workout in the library. */
export function CommonWorkoutEditor({
  initial,
  exercises,
}: {
  initial: Workout | null;
  exercises: Exercise[];
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [drafts, setDrafts] = useState<ExerciseDraft[]>(() =>
    initial ? exerciseDraftsFromWorkout(initial) : []
  );
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const trimmed = name.trim();
    const problem = !trimmed
      ? "Workout name is required."
      : (validateExerciseDrafts(drafts, trimmed) ??
        (drafts.length === 0 ? "Add at least one exercise." : null));
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();

    let workoutId = initial?.id;
    if (workoutId) {
      const { error: uError } = await supabase
        .from("workouts")
        .update({ name: trimmed })
        .eq("id", workoutId);
      if (uError) {
        setError(uError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: iError } = await supabase
        .from("workouts")
        .insert({ programme_id: null, name: trimmed, order_num: 0 })
        .select("id")
        .single();
      if (iError || !data) {
        setError(iError?.message ?? "Could not save workout.");
        setSaving(false);
        return;
      }
      workoutId = data.id;
    }

    const { error: clearError } = await supabase
      .from("workout_exercises")
      .delete()
      .eq("workout_id", workoutId);
    if (clearError) {
      setError(clearError.message);
      setSaving(false);
      return;
    }
    const { error: weError } = await supabase
      .from("workout_exercises")
      .insert(exerciseRows(workoutId, drafts, exercises));
    if (weError) {
      setError(weError.message);
      setSaving(false);
      return;
    }

    router.push("/coach/workouts");
    router.refresh();
  }

  async function remove() {
    if (!initial) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: dError } = await supabase.from("workouts").delete().eq("id", initial.id);
    if (dError) {
      setError(dError.message);
      setSaving(false);
      return;
    }
    router.push("/coach/workouts");
    router.refresh();
  }

  return (
    <div>
      <Link
        href="/coach/workouts"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> Back to workouts
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {initial ? "Edit Workout" : "New Workout"}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Common workout — pick it from &ldquo;Add workout&rdquo; in any programme. Programmes that
          already use it keep their own copy.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <input
          aria-label="Workout name"
          placeholder="Workout name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(inputClass, "w-full font-medium mb-4")}
        />
        <WorkoutExercisesEditor library={exercises} value={drafts} onChange={setDrafts} />
      </div>

      <div className="mt-6 pt-5 border-t border-slate-200">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : initial ? "Save workout" : "Create workout"}
          </Button>
          <Link href="/coach/workouts" className="text-sm text-slate-500 hover:text-slate-800">
            Cancel
          </Link>
          {initial && (
            <div className="ml-auto flex items-center gap-2">
              {confirmingDelete && (
                <span className="text-xs text-slate-500">
                  Removes it from the library. Programmes keep their copies.
                </span>
              )}
              {confirmingDelete ? (
                <Button size="sm" variant="secondary" onClick={remove} disabled={saving}>
                  <Trash2 size={13} className="text-red-500" /> Confirm delete
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                  <Trash2 size={13} className="text-red-500" /> Delete workout
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
