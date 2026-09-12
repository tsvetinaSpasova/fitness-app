"use client";
import { Combobox } from "@/components/ui/combobox";
import type { Database } from "@/lib/supabase/types";
import type { Exercise, Workout } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

// The exercise list of one workout, shared by the programme editor and the
// common-workout editor. Drafts hold input values as strings; parsing and
// validation happen on save.

export interface SetDraft {
  reps: string;
  weight: string;
}

export interface ExerciseDraft {
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

export type WorkoutExerciseInsert = Database["public"]["Tables"]["workout_exercises"]["Insert"];

export const NEW_EXERCISE: ExerciseDraft = {
  exerciseId: "",
  sets: "3",
  reps: "10",
  weight: "",
  restSeconds: "",
  notes: "",
  perSet: null,
};

export const inputClass =
  "px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

export function exerciseDraftsFromWorkout(w: Workout): ExerciseDraft[] {
  return w.exercises.map((we) => ({
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
  }));
}

/** Resize a per-set scheme, filling new sets from the last existing one. */
function resizePerSet(perSet: SetDraft[], count: number, fallbackReps: string): SetDraft[] {
  if (!(count > 0)) return perSet;
  const last = perSet[perSet.length - 1] ?? { reps: fallbackReps, weight: "" };
  return Array.from({ length: count }, (_, i) => perSet[i] ?? { ...last });
}

/** First problem with the rows, or null; `where` names the workout in messages. */
export function validateExerciseDrafts(drafts: ExerciseDraft[], where: string): string | null {
  for (const e of drafts) {
    if (!e.exerciseId) return `Choose an exercise for every row in "${where}".`;
    if (e.perSet) {
      if (e.perSet.some((ps) => !(parseInt(ps.reps) > 0)))
        return `Every set needs at least 1 rep in "${where}".`;
    } else if (!(parseInt(e.sets) > 0) || !(parseInt(e.reps) > 0)) {
      return `Sets and reps must be at least 1 in "${where}".`;
    }
  }
  return null;
}

/** workout_exercises rows for one workout, in editor order. */
export function exerciseRows(
  workoutId: string,
  drafts: ExerciseDraft[],
  library: Exercise[]
): WorkoutExerciseInsert[] {
  const requiresWeight = (id: string) => library.find((ex) => ex.id === id)?.requiresWeight ?? true;
  return drafts.map((e, j) => {
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
            ...(weighted && parseFloat(ps.weight) > 0 ? { weightKg: parseFloat(ps.weight) } : {}),
          }))
        : null,
    };
  });
}

export function WorkoutExercisesEditor({
  library,
  value,
  onChange,
}: {
  library: Exercise[];
  value: ExerciseDraft[];
  onChange: (next: ExerciseDraft[]) => void;
}) {
  const requiresWeight = (id: string) => library.find((ex) => ex.id === id)?.requiresWeight ?? true;

  function update(eIdx: number, patch: Partial<ExerciseDraft>) {
    onChange(value.map((e, j) => (j === eIdx ? { ...e, ...patch } : e)));
  }

  function move(eIdx: number, dir: -1 | 1) {
    const target = eIdx + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[eIdx], next[target]] = [next[target], next[eIdx]];
    onChange(next);
  }

  return (
    <>
      {value.length > 0 && (
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
        {value.map((e, eIdx) => {
          const weighted = requiresWeight(e.exerciseId);
          return (
            <div key={eIdx} className="bg-slate-50 rounded-lg p-2">
              <div className="grid sm:grid-cols-[1fr_3.5rem_3.5rem_4.5rem_4.5rem_1fr_5.5rem] grid-cols-2 gap-2 items-center">
                <Combobox
                  ariaLabel="Exercise"
                  placeholder="Choose exercise…"
                  value={e.exerciseId}
                  onChange={(exerciseId) => update(eIdx, { exerciseId })}
                  options={library.map((ex) => ({
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
                    update(eIdx, {
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
                    onChange={(ev) => update(eIdx, { reps: ev.target.value })}
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
                    onChange={(ev) => update(eIdx, { weight: ev.target.value })}
                    className={inputClass}
                  />
                )}
                <input
                  aria-label="Rest seconds"
                  type="number"
                  min={0}
                  placeholder="—"
                  value={e.restSeconds}
                  onChange={(ev) => update(eIdx, { restSeconds: ev.target.value })}
                  className={inputClass}
                />
                <input
                  aria-label="Exercise notes"
                  placeholder="Notes"
                  value={e.notes}
                  onChange={(ev) => update(eIdx, { notes: ev.target.value })}
                  className={inputClass}
                />
                <div className="flex gap-1 justify-end">
                  <button
                    aria-label="Move exercise up"
                    disabled={eIdx === 0}
                    onClick={() => move(eIdx, -1)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    aria-label="Move exercise down"
                    disabled={eIdx === value.length - 1}
                    onClick={() => move(eIdx, 1)}
                    className="p-1.5 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    aria-label="Remove exercise"
                    onClick={() => onChange(value.filter((_, j) => j !== eIdx))}
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
                          update(eIdx, {
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
                              update(eIdx, {
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
                  update(eIdx, {
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
        onClick={() => onChange([...value, { ...NEW_EXERCISE }])}
      >
        <Plus size={13} /> Add exercise
      </Button>
    </>
  );
}
