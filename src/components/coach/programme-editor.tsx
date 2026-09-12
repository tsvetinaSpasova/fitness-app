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
import type { Exercise, Programme, Workout, WorkoutExercise } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ArrowLeft, BookOpen, Bookmark, Plus, Trash2 } from "lucide-react";

// One editor for both cases: a template (client_id null) and a client's
// personal copy (FR-4.7). Drafts hold input values as strings; parsing and
// validation happen on save.

interface WorkoutDraft {
  id?: string; // set when the workout already exists in the DB
  name: string;
  exercises: ExerciseDraft[];
  /** The common workout this was picked from, if any … */
  templateId?: string;
  /** … and what it looked like at pick time, so edits can be detected. */
  templateSnapshot?: string;
}

function workoutToDraft(w: Workout): WorkoutDraft {
  return { id: w.id, name: w.name, exercises: exerciseDraftsFromWorkout(w) };
}

/** Canonical form of everything "Save as common" would store. */
function serialize(w: WorkoutDraft): string {
  return JSON.stringify([
    w.name.trim(),
    w.exercises.map((e) => [e.exerciseId, e.sets, e.reps, e.weight, e.restSeconds, e.notes, e.perSet]),
  ]);
}

/** A fresh programme workout picked from a common one. */
function draftFromTemplate(t: Workout): WorkoutDraft {
  const d = { ...workoutToDraft(t), id: undefined };
  return { ...d, templateId: t.id, templateSnapshot: serialize(d) };
}

/** Picked from a common workout and not touched since. */
function isPristineTemplate(w: WorkoutDraft): boolean {
  return Boolean(w.templateId) && w.templateSnapshot === serialize(w);
}

function toDrafts(programme: Programme | null, templates: Workout[]): WorkoutDraft[] {
  if (!programme) return [{ name: "Workout 1", exercises: [] }];
  return programme.workouts.map((w) => {
    const d = workoutToDraft(w);
    const t = w.sourceWorkoutId ? templates.find((x) => x.id === w.sourceWorkoutId) : undefined;
    return t ? { ...d, templateId: t.id, templateSnapshot: draftFromTemplate(t).templateSnapshot } : d;
  });
}

export function ProgrammeEditor({
  initial,
  exercises,
  templates: initialTemplates,
  owner,
  assignTo = null,
}: {
  initial: Programme | null;
  exercises: Exercise[];
  /** Common (pre-made) workouts offered by "Add workout". */
  templates: Workout[];
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
  const [templates, setTemplates] = useState<Workout[]>(initialTemplates);
  const [workouts, setWorkouts] = useState<WorkoutDraft[]>(() => toDrafts(initial, initialTemplates));
  const [saving, setSaving] = useState(false);
  const [addingWorkout, setAddingWorkout] = useState(false);
  const [savingCommon, setSavingCommon] = useState<number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = assignTo ? { id: assignTo.clientId, name: assignTo.clientName } : owner;
  const backHref = client ? `/coach/clients/${client.id}` : "/coach/programmes";
  const backLabel = client ? `Back to ${client.name}` : "Back to programmes";

  function updateWorkout(idx: number, patch: Partial<WorkoutDraft>) {
    setWorkouts((prev) => prev.map((w, i) => (i === idx ? { ...w, ...patch } : w)));
  }

  function validateWorkout(w: WorkoutDraft, i: number): string | null {
    if (!w.name.trim()) return `Workout ${i + 1} needs a name.`;
    return validateExerciseDrafts(w.exercises, w.name);
  }

  function validate(): string | null {
    if (!name.trim()) return "Programme name is required.";
    for (const [i, w] of workouts.entries()) {
      const problem = validateWorkout(w, i);
      if (problem) return problem;
    }
    return null;
  }

  /**
   * "Save as common": store this workout in the library. A common workout
   * with the same name is replaced; otherwise a new one is created. The
   * draft is then linked to it, so the button goes quiet until it changes.
   */
  async function saveAsCommon(wIdx: number) {
    const w = workouts[wIdx];
    const problem =
      validateWorkout(w, wIdx) ??
      (w.exercises.length === 0 ? `Add at least one exercise to "${w.name}" first.` : null);
    if (problem) {
      setError(problem);
      return;
    }
    setSavingCommon(wIdx);
    setError(null);
    const supabase = createClient();
    const trimmed = w.name.trim();
    const existing = templates.find((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase());

    let templateId = existing?.id;
    if (templateId) {
      const { error: uError } = await supabase
        .from("workouts")
        .update({ name: trimmed })
        .eq("id", templateId);
      if (uError) {
        setError(uError.message);
        setSavingCommon(null);
        return;
      }
    } else {
      const { data, error: iError } = await supabase
        .from("workouts")
        .insert({ programme_id: null, name: trimmed, order_num: 0 })
        .select("id")
        .single();
      if (iError || !data) {
        setError(iError?.message ?? "Could not save the common workout.");
        setSavingCommon(null);
        return;
      }
      templateId = data.id;
    }

    const { error: clearError } = await supabase
      .from("workout_exercises")
      .delete()
      .eq("workout_id", templateId);
    const rows = exerciseRows(templateId, w.exercises, exercises);
    const { error: weError } = clearError
      ? { error: clearError }
      : await supabase.from("workout_exercises").insert(rows);
    if (weError) {
      setError(weError.message);
      setSavingCommon(null);
      return;
    }

    // Mirror what was stored so the chooser offers it straight away, and
    // re-snapshot the draft from that same normalised form.
    const saved: Workout = {
      id: templateId,
      name: trimmed,
      order: 0,
      exercises: rows.map(
        (r): WorkoutExercise => ({
          exerciseId: r.exercise_id,
          exercise: exercises.find((ex) => ex.id === r.exercise_id)!,
          sets: r.sets,
          reps: r.reps,
          restSeconds: r.rest_seconds ?? undefined,
          notes: r.notes ?? undefined,
          targetWeightKg: r.target_weight_kg ?? undefined,
          setDetails: r.set_details ?? undefined,
        })
      ),
    };
    setTemplates((prev) =>
      [...prev.filter((t) => t.id !== templateId), saved].sort((a, b) => a.name.localeCompare(b.name))
    );
    updateWorkout(wIdx, { ...draftFromTemplate(saved), id: w.id });
    setSavingCommon(null);
  }

  function addWorkout(template?: Workout) {
    setWorkouts((prev) => [
      ...prev,
      template ? draftFromTemplate(template) : { name: `Workout ${prev.length + 1}`, exercises: [] },
    ]);
    setAddingWorkout(false);
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
          .update({ name: w.name.trim(), order_num: i + 1, source_workout_id: w.templateId ?? null })
          .eq("id", workoutId);
        if (wError) {
          setError(wError.message);
          setSaving(false);
          return;
        }
      } else {
        const { data, error: wError } = await supabase
          .from("workouts")
          .insert({
            programme_id: programmeId,
            name: w.name.trim(),
            order_num: i + 1,
            source_workout_id: w.templateId ?? null,
          })
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
        const { error: weError } = await supabase
          .from("workout_exercises")
          .insert(exerciseRows(workoutId, w.exercises, exercises));
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
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Phase
          <input
            type="number"
            min={1}
            placeholder="e.g. 1"
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className={cn(inputClass, "w-20")}
          />
        </label>
      </div>

      {/* Workouts */}
      <div className="space-y-4">
        {workouts.map((w, wIdx) => {
          const pristine = isPristineTemplate(w);
          return (
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
              {/* Inactive while the workout is an untouched pick from the
                  library — there is nothing new to save. */}
              <Button
                size="sm"
                variant="secondary"
                disabled={pristine || saving || savingCommon != null}
                title={
                  pristine
                    ? "This is an unchanged common workout."
                    : "Store this workout in the library to reuse in other programmes."
                }
                onClick={() => saveAsCommon(wIdx)}
              >
                <Bookmark size={13} />
                {savingCommon === wIdx ? "Saving…" : pristine ? "Saved as common" : "Save as common"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove workout ${wIdx + 1}`}
                onClick={() => setWorkouts((prev) => prev.filter((_, i) => i !== wIdx))}
              >
                <Trash2 size={14} className="text-red-500" />
              </Button>
            </div>

            <WorkoutExercisesEditor
              library={exercises}
              value={w.exercises}
              onChange={(next) => updateWorkout(wIdx, { exercises: next })}
            />
          </div>
          );
        })}
      </div>

      {/* Add workout: from scratch, or pick a common (pre-made) one */}
      {addingWorkout ? (
        <div
          data-testid="add-workout-chooser"
          className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm p-5"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Add a workout</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Start from scratch, or pick one of your common workouts.
              </p>
            </div>
            <button
              onClick={() => setAddingWorkout(false)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => addWorkout()}>
              <Plus size={13} /> Custom workout
            </Button>
            {templates.map((t) => (
              <Button key={t.id} size="sm" variant="secondary" onClick={() => addWorkout(t)}>
                <BookOpen size={13} /> {t.name}
                <span className="text-slate-400 font-normal">
                  · {t.exercises.length} {t.exercises.length === 1 ? "exercise" : "exercises"}
                </span>
              </Button>
            ))}
          </div>
          {templates.length === 0 && (
            <p className="text-xs text-slate-400 mt-3">
              No common workouts yet — use &ldquo;Save as common&rdquo; on any workout to add one.
            </p>
          )}
        </div>
      ) : (
        <Button size="sm" variant="secondary" className="mt-4" onClick={() => setAddingWorkout(true)}>
          <Plus size={13} /> Add workout
        </Button>
      )}

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
