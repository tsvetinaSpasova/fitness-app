"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { createClient } from "@/lib/supabase/client";
import type { Exercise, Programme } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from "lucide-react";

// One editor for both cases: a template (client_id null) and a client's
// personal copy (FR-4.7). Drafts hold input values as strings; parsing and
// validation happen on save.

interface SetDraft {
  reps: string;
  weight: string;
}

interface ExerciseDraft {
  exerciseId: string;
  sets: string;
  reps: string;
  /** Optional target weight (kg) — the client's default. */
  weight: string;
  restSeconds: string;
  notes: string;
  /** Per-set scheme (pyramids etc.); null = same every set. */
  perSet: SetDraft[] | null;
}

interface WorkoutDraft {
  id?: string; // set when the workout already exists in the DB
  name: string;
  exercises: ExerciseDraft[];
}

const NEW_EXERCISE: ExerciseDraft = {
  exerciseId: "",
  sets: "3",
  reps: "10",
  weight: "",
  restSeconds: "",
  notes: "",
  perSet: null,
};

function toDrafts(programme: Programme | null): WorkoutDraft[] {
  if (!programme) return [{ name: "Workout 1", exercises: [] }];
  return programme.workouts.map((w) => ({
    id: w.id,
    name: w.name,
    exercises: w.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      sets: String(we.sets),
      reps: String(we.reps),
      weight: we.targetWeightKg != null ? String(we.targetWeightKg) : "",
      restSeconds: we.restSeconds != null ? String(we.restSeconds) : "",
      notes: we.notes ?? "",
      perSet: we.setDetails
        ? we.setDetails.map((d) => ({
            reps: String(d.reps),
            weight: d.weightKg != null ? String(d.weightKg) : "",
          }))
        : null,
    })),
  }));
}

/** Resize a per-set scheme, filling new sets from the last existing one. */
function resizePerSet(perSet: SetDraft[], count: number, fallbackReps: string): SetDraft[] {
  if (!(count > 0)) return perSet;
  const last = perSet[perSet.length - 1] ?? { reps: fallbackReps, weight: "" };
  return Array.from({ length: count }, (_, i) => perSet[i] ?? { ...last });
}

const inputClass =
  "px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export function ProgrammeEditor({
  initial,
  exercises,
  owner,
  assignTo = null,
}: {
  initial: Programme | null;
  exercises: Exercise[];
  /** The client this copy belongs to, when editing an assigned copy. */
  owner: { id: string; name: string } | null;
  /**
   * Assign mode: `initial` is a template used only to prepopulate the form.
   * Saving creates a brand-new copy for this client and assigns it — the
   * template itself is never written to.
   */
  assignTo?: { clientId: string; clientName: string; templateId: string } | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phase, setPhase] = useState(initial?.phase != null ? String(initial.phase) : "");
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>(() => toDrafts(initial));
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = assignTo ? { id: assignTo.clientId, name: assignTo.clientName } : owner;
  const backHref = client ? `/coach/clients/${client.id}` : "/coach/programmes";
  const backLabel = client ? `Back to ${client.name}` : "Back to programmes";

  function updateWorkout(idx: number, patch: Partial<WorkoutDraft>) {
    setWorkouts((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function updateExercise(wIdx: number, eIdx: number, patch: Partial<ExerciseDraft>) {
    setWorkouts((prev) =>
      prev.map((w, i) =>
        i === wIdx
          ? {
              ...w,
              exercises: w.exercises.map((e, j) => (j === eIdx ? { ...e, ...patch } : e)),
            }
          : w
      )
    );
  }

  function moveExercise(wIdx: number, eIdx: number, dir: -1 | 1) {
    setWorkouts((prev) =>
      prev.map((w, i) => {
        if (i !== wIdx) return w;
        const target = eIdx + dir;
        if (target < 0 || target >= w.exercises.length) return w;
        const next = [...w.exercises];
        [next[eIdx], next[target]] = [next[target], next[eIdx]];
        return { ...w, exercises: next };
      })
    );
  }

  const requiresWeight = (exerciseId: string) =>
    exercises.find((ex) => ex.id === exerciseId)?.requiresWeight ?? true;

  function validate(): string | null {
    if (!name.trim()) return "Programme name is required.";
    for (const [i, w] of workouts.entries()) {
      if (!w.name.trim()) return `Workout ${i + 1} needs a name.`;
      for (const e of w.exercises) {
        if (!e.exerciseId) return `Choose an exercise for every row in "${w.name}".`;
        if (e.perSet) {
          if (e.perSet.some((ps) => !(parseInt(ps.reps) > 0)))
            return `Every set needs at least 1 rep in "${w.name}".`;
        } else if (!(parseInt(e.sets) > 0) || !(parseInt(e.reps) > 0)) {
          return `Sets and reps must be at least 1 in "${w.name}".`;
        }
      }
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const phaseValue = parseInt(phase) > 0 ? parseInt(phase) : null;

    // Assign mode never touches the template: everything is inserted fresh
    // for the client, so drop the template's row ids from the drafts.
    const drafts = assignTo ? workouts.map((w) => ({ ...w, id: undefined })) : workouts;

    // 1. Programme row.
    let programmeId = assignTo ? undefined : initial?.id;
    if (assignTo) {
      const { data, error: pError } = await supabase
        .from("programmes")
        .insert({
          name: name.trim(),
          phase: phaseValue,
          client_id: assignTo.clientId,
          original_programme_id: assignTo.templateId,
        })
        .select("id")
        .single();
      if (pError || !data) {
        setError(pError?.message ?? "Could not create the client's programme.");
        setSaving(false);
        return;
      }
      programmeId = data.id;
    } else if (programmeId) {
      const { error: pError } = await supabase
        .from("programmes")
        .update({ name: name.trim(), phase: phaseValue })
        .eq("id", programmeId);
      if (pError) {
        setError(pError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: pError } = await supabase
        .from("programmes")
        .insert({ name: name.trim(), phase: phaseValue })
        .select("id")
        .single();
      if (pError || !data) {
        setError(pError?.message ?? "Could not create programme.");
        setSaving(false);
        return;
      }
      programmeId = data.id;
    }

    // 2. Remove workouts that were deleted in the editor. Their
    //    workout_exercises cascade; logged history keeps its text columns
    //    (workout_logs.workout_id is ON DELETE SET NULL).
    const keptIds = new Set(drafts.map((w) => w.id).filter(Boolean));
    const removed = assignTo
      ? []
      : (initial?.workouts ?? []).map((w) => w.id).filter((id) => !keptIds.has(id));
    if (removed.length > 0) {
      const { error: dError } = await supabase.from("workouts").delete().in("id", removed);
      if (dError) {
        setError(dError.message);
        setSaving(false);
        return;
      }
    }

    // 3. Upsert each workout in editor order, then rewrite its exercise list.
    for (const [i, w] of drafts.entries()) {
      let workoutId = w.id;
      if (workoutId) {
        const { error: wError } = await supabase
          .from("workouts")
          .update({ name: w.name.trim(), order_num: i + 1 })
          .eq("id", workoutId);
        if (wError) {
          setError(wError.message);
          setSaving(false);
          return;
        }
      } else {
        const { data, error: wError } = await supabase
          .from("workouts")
          .insert({ programme_id: programmeId, name: w.name.trim(), order_num: i + 1 })
          .select("id")
          .single();
        if (wError || !data) {
          setError(wError?.message ?? "Could not save workout.");
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
      if (w.exercises.length > 0) {
        const { error: weError } = await supabase.from("workout_exercises").insert(
          w.exercises.map((e, j) => {
            const weighted = requiresWeight(e.exerciseId);
            return {
              workout_id: workoutId,
              exercise_id: e.exerciseId,
              position: j + 1,
              sets: e.perSet ? e.perSet.length : parseInt(e.sets),
              reps: parseInt(e.perSet ? e.perSet[0].reps : e.reps),
              rest_seconds: parseInt(e.restSeconds) > 0 ? parseInt(e.restSeconds) : null,
              notes: e.notes.trim() || null,
              target_weight_kg:
                weighted && !e.perSet && parseFloat(e.weight) > 0 ? parseFloat(e.weight) : null,
              set_details: e.perSet
                ? e.perSet.map((ps) => ({
                    reps: parseInt(ps.reps),
                    ...(weighted && parseFloat(ps.weight) > 0
                      ? { weightKg: parseFloat(ps.weight) }
                      : {}),
                  }))
                : null,
            };
          })
        );
        if (weError) {
          setError(weError.message);
          setSaving(false);
          return;
        }
      }
    }

    // 4. Assign mode: point the client at their new copy. The previous copy
    //    (if any) is left behind so logged history stays intact.
    if (assignTo) {
      const { error: aError } = await supabase
        .from("profiles")
        .update({ assigned_programme_id: programmeId })
        .eq("id", assignTo.clientId);
      if (aError) {
        setError(aError.message);
        setSaving(false);
        return;
      }
    }

    router.push(backHref);
    router.refresh();
  }

  async function deleteProgramme() {
    if (!initial) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: dError } = await supabase.from("programmes").delete().eq("id", initial.id);
    if (dError) {
      setError(dError.message);
      setSaving(false);
      return;
    }
    router.push("/coach/programmes");
    router.refresh();
  }

  return (
    <div>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> {backLabel}
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {assignTo ? "Assign Programme" : initial ? "Edit Programme" : "New Programme"}
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {assignTo
            ? `Prepopulated from the template — tweak anything for ${assignTo.clientName} before assigning. The template itself is not changed.`
            : owner
              ? `${owner.name}'s personal copy — edits don't affect the template or other clients.`
              : "Template — assigning it gives each client their own editable copy."}
        </p>
      </div>

      {/* Programme fields */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-5 flex flex-wrap gap-3">
        <input
          aria-label="Programme name"
          placeholder="Programme name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={cn(inputClass, "flex-1 min-w-56 font-medium")}
        />
        <input
          aria-label="Phase"
          type="number"
          min={1}
          placeholder="Phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value)}
          className={cn(inputClass, "w-24")}
        />
      </div>

      {/* Workouts */}
      <div className="space-y-4">
        {workouts.map((w, wIdx) => (
          <div
            key={w.id ?? `new-${wIdx}`}
            // Anchor target for the workout links on the programme cards.
            id={w.id ? `workout-${w.id}` : undefined}
            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 scroll-mt-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <input
                aria-label="Workout name"
                placeholder="Workout name *"
                value={w.name}
                onChange={(e) => updateWorkout(wIdx, { name: e.target.value })}
                className={cn(inputClass, "flex-1 font-medium")}
              />
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove workout ${wIdx + 1}`}
                onClick={() => setWorkouts((prev) => prev.filter((_, i) => i !== wIdx))}
              >
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>

            {w.exercises.length > 0 && (
              <div className="hidden sm:grid grid-cols-[1fr_3.5rem_3.5rem_4.5rem_4.5rem_1fr_5.5rem] gap-2 text-xs text-slate-400 font-medium mb-1.5 px-1">
                <span>Exercise</span>
                <span>Sets</span>
                <span>Reps</span>
                <span>Weight</span>
                <span>Rest (s)</span>
                <span>Notes</span>
                <span />
              </div>
            )}
            <div className="space-y-2">
              {w.exercises.map((e, eIdx) => {
                const weighted = requiresWeight(e.exerciseId);
                return (
                <div key={eIdx} className="bg-slate-50 rounded-lg p-2">
                <div className="grid sm:grid-cols-[1fr_3.5rem_3.5rem_4.5rem_4.5rem_1fr_5.5rem] grid-cols-2 gap-2 items-center">
                  <Combobox
                    ariaLabel="Exercise"
                    placeholder="Choose exercise…"
                    value={e.exerciseId}
                    onChange={(exerciseId) => updateExercise(wIdx, eIdx, { exerciseId })}
                    options={exercises.map((ex) => ({
                      value: ex.id,
                      label: ex.name,
                      hint: ex.requiresWeight ? ex.muscleGroup : `${ex.muscleGroup} · bodyweight`,
                    }))}
                    className="col-span-2 sm:col-span-1"
                  />
                  <input
                    aria-label="Sets"
                    type="number"
                    min={1}
                    value={e.sets}
                    onChange={(ev) =>
                      updateExercise(wIdx, eIdx, {
                        sets: ev.target.value,
                        ...(e.perSet
                          ? { perSet: resizePerSet(e.perSet, parseInt(ev.target.value) || 0, e.reps) }
                          : {}),
                      })
                    }
                    className={inputClass}
                  />
                  {e.perSet ? (
                    <span className="text-xs text-slate-400 text-center">varies</span>
                  ) : (
                    <input
                      aria-label="Reps"
                      type="number"
                      min={1}
                      value={e.reps}
                      onChange={(ev) => updateExercise(wIdx, eIdx, { reps: ev.target.value })}
                      className={inputClass}
                    />
                  )}
                  {!weighted ? (
                    <span className="text-xs text-slate-400 text-center" title="Bodyweight exercise">
                      —
                    </span>
                  ) : e.perSet ? (
                    <span className="text-xs text-slate-400 text-center">varies</span>
                  ) : (
                    <input
                      aria-label="Weight kg"
                      type="number"
                      min={0}
                      step="0.5"
                      placeholder="kg"
                      value={e.weight}
                      onChange={(ev) => updateExercise(wIdx, eIdx, { weight: ev.target.value })}
                      className={inputClass}
                    />
                  )}
                  <input
                    aria-label="Rest seconds"
                    type="number"
                    min={0}
                    placeholder="—"
                    value={e.restSeconds}
                    onChange={(ev) => updateExercise(wIdx, eIdx, { restSeconds: ev.target.value })}
                    className={inputClass}
                  />
                  <input
                    aria-label="Exercise notes"
                    placeholder="Notes"
                    value={e.notes}
                    onChange={(ev) => updateExercise(wIdx, eIdx, { notes: ev.target.value })}
                    className={inputClass}
                  />
                  <div className="flex gap-1 justify-end">
                    <button
                      aria-label="Move exercise up"
                      disabled={eIdx === 0}
                      onClick={() => moveExercise(wIdx, eIdx, -1)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      aria-label="Move exercise down"
                      disabled={eIdx === w.exercises.length - 1}
                      onClick={() => moveExercise(wIdx, eIdx, 1)}
                      className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      aria-label="Remove exercise"
                      onClick={() =>
                        updateWorkout(wIdx, { exercises: w.exercises.filter((_, j) => j !== eIdx) })
                      }
                      className="p-1.5 rounded text-red-400 hover:text-red-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Per-set scheme (pyramids: different reps/weight per set) */}
                {e.perSet && (
                  <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
                    {e.perSet.map((ps, si) => (
                      <div key={si} className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 w-10 shrink-0">Set {si + 1}</span>
                        <input
                          aria-label={`Set ${si + 1} reps`}
                          type="number"
                          min={1}
                          value={ps.reps}
                          onChange={(ev) =>
                            updateExercise(wIdx, eIdx, {
                              perSet: e.perSet!.map((p, j) =>
                                j === si ? { ...p, reps: ev.target.value } : p
                              ),
                            })
                          }
                          className={cn(inputClass, "w-20")}
                        />
                        <span className="text-xs text-slate-400">reps</span>
                        {weighted && (
                          <>
                            <input
                              aria-label={`Set ${si + 1} weight`}
                              type="number"
                              min={0}
                              step="0.5"
                              placeholder="—"
                              value={ps.weight}
                              onChange={(ev) =>
                                updateExercise(wIdx, eIdx, {
                                  perSet: e.perSet!.map((p, j) =>
                                    j === si ? { ...p, weight: ev.target.value } : p
                                  ),
                                })
                              }
                              className={cn(inputClass, "w-20")}
                            />
                            <span className="text-xs text-slate-400">kg</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() =>
                    updateExercise(wIdx, eIdx, {
                      perSet: e.perSet
                        ? null
                        : Array.from({ length: parseInt(e.sets) > 0 ? parseInt(e.sets) : 1 }, () => ({
                            reps: e.reps,
                            weight: e.weight,
                          })),
                    })
                  }
                  className="mt-1.5 text-xs text-blue-600 font-medium hover:underline"
                >
                  {e.perSet ? "Same every set" : "Vary per set"}
                </button>
                </div>
                );
              })}
            </div>

            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              onClick={() => updateWorkout(wIdx, { exercises: [...w.exercises, { ...NEW_EXERCISE }] })}
            >
              <Plus size={13} /> Add exercise
            </Button>
          </div>
        ))}
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="mt-4"
        onClick={() => setWorkouts((prev) => [...prev, { name: `Workout ${prev.length + 1}`, exercises: [] }])}
      >
        <Plus size={13} /> Add workout
      </Button>

      {/* Save / delete */}
      <div className="mt-6 pt-5 border-t border-slate-200">
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving
              ? "Saving…"
              : assignTo
                ? `Assign to ${assignTo.clientName}`
                : initial
                  ? "Save programme"
                  : "Create programme"}
          </Button>
          <Link href={backHref} className="text-sm text-slate-500 hover:text-slate-800">
            Cancel
          </Link>
          {/* Deleting is offered for templates only; a client's copy goes
              away by assigning them a different programme instead. */}
          {initial && !owner && !assignTo && (
            <div className="ml-auto flex items-center gap-2">
              {confirmingDelete && (
                <span className="text-xs text-slate-500">
                  Deletes the template and its workouts. Client copies are unaffected.
                </span>
              )}
              {confirmingDelete ? (
                <Button size="sm" variant="secondary" onClick={deleteProgramme} disabled={saving}>
                  <Trash2 size={13} className="text-red-500" /> Confirm delete
                </Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                  <Trash2 size={13} className="text-red-500" /> Delete programme
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
