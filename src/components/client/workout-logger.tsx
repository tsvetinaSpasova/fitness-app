"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type {
  DraftSet,
  InProgressLog,
  PreviousSets,
  Workout,
  WorkoutDraft,
  WorkoutExercise,
} from "@/lib/types";
import { cn, repsLabel, youTubeEmbedUrl } from "@/lib/utils";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Play,
} from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.client.workoutLogger;

type SetState = DraftSet;

// Wait this long after the last edit before saving the draft, so typing a
// weight sends one request, not one per keystroke.
const DRAFT_SAVE_DELAY_MS = 1000;

/** A fresh grid: the coach's prescription, else what was done last time. */
function initialStates(
  workout: Workout,
  previousByExerciseId: Record<string, PreviousSets>
): SetState[][] {
  return workout.exercises.map((we) => {
    const prev = previousByExerciseId[we.exerciseId]?.bySet;
    return Array.from({ length: we.sets }, (_, i) => {
      const prescribed = we.setDetails?.[i];
      return {
        reps: prescribed?.reps ?? prev?.[i]?.reps ?? we.reps,
        // A coach-configured weight (per set or exercise-wide) beats the
        // previous session's weight as the default.
        weightKg: prescribed?.weightKg ?? we.targetWeightKg ?? prev?.[i]?.weightKg ?? 0,
        done: false,
      };
    });
  });
}

/**
 * Lay a saved draft over a fresh grid. Matched by exercise and trimmed to the
 * current set count, since the coach may have edited the workout since.
 */
function applyDraft(workout: Workout, fresh: SetState[][], draft: WorkoutDraft): SetState[][] {
  return workout.exercises.map((we, i) => {
    const saved = draft.find((d) => d.exerciseId === we.exerciseId)?.sets ?? [];
    return fresh[i].map((s, j) => saved[j] ?? s);
  });
}

function toDraft(workout: Workout, states: SetState[][]): WorkoutDraft {
  return workout.exercises.map((we, i) => ({ exerciseId: we.exerciseId, sets: states[i] }));
}

function ExerciseCard({
  workoutExercise,
  previous,
  setStates,
  onUpdateSet,
  onToggleAll,
}: {
  workoutExercise: WorkoutExercise;
  previous?: PreviousSets;
  setStates: SetState[];
  onUpdateSet: (idx: number, field: keyof SetState, val: number | boolean) => void;
  onToggleAll: () => void;
}) {
  const { exercise, sets, reps, restSeconds, notes, setDetails } = workoutExercise;
  const [expanded, setExpanded] = useState(false);
  const [showAlts, setShowAlts] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const allDone = setStates.every((s) => s.done);
  const embedUrl = exercise.videoUrl ? youTubeEmbedUrl(exercise.videoUrl) : null;
  const hasInfo = Boolean(exercise.instructions || exercise.videoUrl);
  const weighted = exercise.requiresWeight;

  return (
    <div
      data-testid="exercise-card"
      className={cn(
        "bg-white rounded-xl border shadow-sm overflow-hidden",
        allDone ? "border-emerald-200" : "border-slate-200"
      )}
    >
      {/* Header: the circle completes the WHOLE exercise; the rest expands. */}
      <div className="w-full flex items-center gap-3 px-4 py-3.5">
        <button
          data-testid="exercise-done-btn"
          aria-label={fill(t.markAllDone, { name: exercise.name })}
          onClick={onToggleAll}
          className="shrink-0"
        >
          {allDone ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-400 transition-colors" />
          )}
        </button>
        <button
          data-testid="exercise-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center justify-between text-left"
        >
          <div>
            <p className="font-semibold text-slate-900 text-sm">{exercise.name}</p>
            <p className="text-xs text-slate-500">
              {fill(t.exerciseSummary, {
                sets,
                reps: repsLabel(workoutExercise),
                muscleGroup: exercise.muscleGroup,
              })}
              {restSeconds != null &&
                ` · ${fill(copy.client.common.restSuffix, { seconds: restSeconds })}`}
            </p>
          </div>
          {expanded ? (
            <ChevronUp size={16} className="text-slate-400" />
          ) : (
            <ChevronDown size={16} className="text-slate-400" />
          )}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-3">
          {/* Coach's cue for this exercise (workout_exercises.notes) */}
          {notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
              <p className="text-xs text-amber-800">
                <span className="font-semibold">{t.coachNote}</span> {notes}
              </p>
            </div>
          )}

          {/* Previous performance hint */}
          {previous && (
            <div className="bg-blue-50 rounded-lg px-3 py-2 mb-3 flex items-start gap-2">
              <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">
                {t.lastSession}{" "}
                {previous.lastSession
                  .map((s) =>
                    s.weightKg != null
                      ? fill(copy.client.common.setWeighted, { weight: s.weightKg, reps: s.reps })
                      : fill(copy.client.common.setBodyweight, { reps: s.reps })
                  )
                  .join(", ")}
              </p>
            </div>
          )}

          {/* Sets table — the Weight column disappears for bodyweight exercises */}
          <div className="mb-3">
            <div
              className={cn(
                "grid text-xs text-slate-400 font-medium mb-1.5 px-1",
                weighted ? "grid-cols-4" : "grid-cols-3"
              )}
            >
              <span>{t.colSet}</span>
              <span>{t.colPrev}</span>
              {weighted && <span>{t.colWeight}</span>}
              <span>{t.colReps}</span>
            </div>
            {setStates.map((s, idx) => (
              <div
                key={idx}
                className={cn(
                  "grid items-center gap-1 mb-1.5 rounded-lg px-1 py-1.5",
                  weighted ? "grid-cols-4" : "grid-cols-3",
                  s.done ? "bg-emerald-50" : "bg-slate-50"
                )}
              >
                <button
                  data-testid="set-btn"
                  onClick={() => onUpdateSet(idx, "done", !s.done)}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                    s.done
                      ? "bg-emerald-500 text-white"
                      : "bg-white border-2 border-slate-300 text-slate-500"
                  )}
                >
                  {s.done ? "✓" : idx + 1}
                </button>
                <span data-testid="set-prev" className="text-xs text-slate-400">
                  {(() => {
                    const p = previous?.bySet[idx];
                    if (!p) return "—";
                    return weighted && p.weightKg != null
                      ? fill(t.prevWeight, { weight: p.weightKg })
                      : fill(t.prevReps, { reps: p.reps });
                  })()}
                </span>
                {weighted && (
                  <input
                    type="number"
                    aria-label={fill(t.setWeightLabel, { n: idx + 1 })}
                    value={s.weightKg || ""}
                    onChange={(e) => onUpdateSet(idx, "weightKg", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full text-center text-sm font-semibold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                )}
                <input
                  type="number"
                  aria-label={fill(t.setRepsLabel, { n: idx + 1 })}
                  value={s.reps || ""}
                  onChange={(e) => onUpdateSet(idx, "reps", parseInt(e.target.value) || 0)}
                  placeholder={String(setDetails?.[idx]?.reps ?? reps)}
                  className="w-full text-center text-sm font-semibold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>
            ))}
          </div>

          {/* On-demand extras: technique info/video (FR-3.2), alternatives (FR-3.3) */}
          <div className="flex flex-wrap gap-x-4">
            {hasInfo && (
              <button
                onClick={() => setShowInfo((v) => !v)}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                {t.howToDoThis}
              </button>
            )}
            {exercise.alternatives && exercise.alternatives.length > 0 && (
              <button
                onClick={() => setShowAlts((v) => !v)}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                {t.needAlternative}
              </button>
            )}
          </div>
          {showInfo && (
            <div className="mt-2 space-y-2">
              {exercise.instructions && (
                <p className="text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-2">
                  {exercise.instructions}
                </p>
              )}
              {embedUrl ? (
                <iframe
                  src={embedUrl}
                  title={fill(t.videoTitle, { name: exercise.name })}
                  className="w-full aspect-video rounded-lg border border-slate-200"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : exercise.videoUrl ? (
                <a
                  href={exercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium hover:underline"
                >
                  <Play size={12} /> {t.watchVideo}
                </a>
              ) : null}
            </div>
          )}
          {showAlts && exercise.alternatives && exercise.alternatives.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.alternatives.map((alt) => (
                <span
                  key={alt}
                  className="text-xs bg-slate-100 text-slate-700 rounded-full px-3 py-1 font-medium"
                >
                  {alt}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function WorkoutLogger({
  workout,
  programmeName,
  clientId,
  previousByExerciseId,
  inProgressLog,
}: {
  workout: Workout;
  programmeName: string;
  clientId: string;
  previousByExerciseId: Record<string, PreviousSets>;
  /** An unfinished run of this workout to resume, if any. */
  inProgressLog: InProgressLog | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [resumed, setResumed] = useState(Boolean(inProgressLog?.draft));
  const [draftSaveFailed, setDraftSaveFailed] = useState(false);
  const [states, setStates] = useState<SetState[][]>(() => {
    const fresh = initialStates(workout, previousByExerciseId);
    return inProgressLog?.draft ? applyDraft(workout, fresh, inProgressLog.draft) : fresh;
  });

  // Draft autosave. logId is this run's in_progress row, created on the first
  // edit. Saves run one at a time through saveChain, so the first save's
  // insert finishes before any update needs its id.
  const logId = useRef<string | null>(inProgressLog?.id ?? null);
  const latestStates = useRef(states);
  const dirty = useRef(false);
  const finished = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveChain = useRef<Promise<void>>(Promise.resolve());

  /** This run's in_progress row: the one we have, or a new one. */
  async function ensureLog(draft: WorkoutDraft | null): Promise<string> {
    if (logId.current) return logId.current;
    const supabase = createClient();
    const { data, error: insertError } = await supabase
      .from("workout_logs")
      .insert({
        client_id: clientId,
        workout_id: workout.id,
        workout_name: workout.name,
        programme_name: programmeName,
        status: "in_progress",
        draft,
      })
      .select("id")
      .single();
    if (data) return (logId.current = data.id);
    // Unique violation: another tab started this workout first. Share its row.
    if (insertError?.code === "23505") {
      const { data: existing } = await supabase
        .from("workout_logs")
        .select("id")
        .eq("client_id", clientId)
        .eq("workout_id", workout.id)
        .eq("status", "in_progress")
        .single();
      if (existing) return (logId.current = existing.id);
    }
    throw new Error(insertError?.message ?? t.saveWorkoutError);
  }

  function queueDraftSave() {
    saveTimer.current = null;
    const draft = toDraft(workout, latestStates.current);
    saveChain.current = saveChain.current.then(async () => {
      if (finished.current) return;
      try {
        const hadLog = Boolean(logId.current);
        const id = await ensureLog(draft);
        if (hadLog) {
          const { error: updateError } = await createClient()
            .from("workout_logs")
            .update({ draft })
            .eq("id", id)
            .eq("status", "in_progress");
          if (updateError) throw updateError;
        }
        setDraftSaveFailed(false);
      } catch {
        setDraftSaveFailed(true);
      }
    });
  }

  /** Save now instead of waiting out the delay, e.g. when leaving the page. */
  function flushDraftSave() {
    if (!saveTimer.current) return;
    clearTimeout(saveTimer.current);
    queueDraftSave();
  }

  function cancelDraftSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
  }

  useEffect(() => {
    latestStates.current = states;
    if (!dirty.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(queueDraftSave, DRAFT_SAVE_DELAY_MS);
    // queueDraftSave reads everything it needs through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [states]);

  // Phones kill background tabs without warning, so save as soon as the page
  // is hidden, and when the logger unmounts (the Back link).
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flushDraftSave();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushDraftSave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushDraftSave);
      flushDraftSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function edit(update: (prev: SetState[][]) => SetState[][]) {
    dirty.current = true;
    setStates(update);
  }

  function updateSet(exerciseIdx: number, setIdx: number, field: keyof SetState, val: number | boolean) {
    edit((prev) =>
      prev.map((sets, i) =>
        i === exerciseIdx
          ? sets.map((s, j) => (j === setIdx ? { ...s, [field]: val } : s))
          : sets
      )
    );
  }

  /** The header circle: complete (or clear) every set of one exercise. */
  function toggleAllSets(exerciseIdx: number) {
    edit((prev) =>
      prev.map((sets, i) => {
        if (i !== exerciseIdx) return sets;
        const allDone = sets.every((s) => s.done);
        return sets.map((s) => ({ ...s, done: !allDone }));
      })
    );
  }

  /** Throw the saved draft away and start from a fresh grid. */
  async function startOver() {
    cancelDraftSave();
    await saveChain.current;
    const id = logId.current;
    logId.current = null;
    dirty.current = false;
    setStates(initialStates(workout, previousByExerciseId));
    setResumed(false);
    setDraftSaveFailed(false);
    if (id) {
      await createClient()
        .from("workout_logs")
        .delete()
        .eq("id", id)
        .eq("status", "in_progress");
    }
  }

  const exerciseCount = workout.exercises.length;
  const isDone = (i: number) => states[i].length > 0 && states[i].every((s) => s.done);
  const doneCount = workout.exercises.filter((_, i) => isDone(i)).length;

  // Still-to-do exercises first (in programme order), completed ones sink to
  // the bottom — whatever is left to do is always at the top of the screen.
  const order = workout.exercises
    .map((_, i) => i)
    .sort((a, b) => Number(isDone(a)) - Number(isDone(b)) || a - b);

  /** Finish straight away when everything is done; otherwise ask first. */
  function onCompleteClick() {
    if (doneCount === exerciseCount) void complete();
    else setConfirming(true);
  }

  async function complete() {
    setConfirming(false);
    setSaving(true);
    setError(null);
    // Stop autosave and let a save in flight land, so it can't write a draft
    // back onto the row after it is completed.
    finished.current = true;
    cancelDraftSave();
    await saveChain.current;
    const supabase = createClient();

    function fail(message: string) {
      setError(message);
      setSaving(false);
      finished.current = false;
    }

    // The row stays in_progress until every set is written, so a failure
    // part way leaves a draft to retry from, not a half-logged workout.
    let id: string;
    try {
      id = await ensureLog(toDraft(workout, states));
    } catch (e) {
      return fail(e instanceof Error ? e.message : t.saveWorkoutError);
    }
    // Clear what an earlier failed attempt managed to write.
    const { error: clearError } = await supabase
      .from("exercise_logs")
      .delete()
      .eq("workout_log_id", id);
    if (clearError) return fail(clearError.message);

    for (const [i, we] of workout.exercises.entries()) {
      // Keep each set's own number, so skipping set 2 still files the next
      // one as set 3 and the Prev. column lines up next time.
      const doneSets = states[i]
        .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
        .filter((s) => s.done);
      if (doneSets.length === 0) continue;

      const { data: exLog, error: exError } = await supabase
        .from("exercise_logs")
        .insert({ workout_log_id: id, exercise_id: we.exerciseId, exercise_name: we.exercise.name })
        .select("id")
        .single();
      if (exError || !exLog) return fail(exError?.message ?? t.saveExerciseError);

      const { error: setsError } = await supabase.from("set_logs").insert(
        doneSets.map((s) => ({
          exercise_log_id: exLog.id,
          set_number: s.setNumber,
          reps: s.reps,
          // Bodyweight exercises log reps only.
          weight_kg: we.exercise.requiresWeight ? s.weightKg : null,
        }))
      );
      if (setsError) return fail(setsError.message);
    }

    const { error: finishError } = await supabase
      .from("workout_logs")
      .update({ status: "completed", draft: null, logged_at: new Date().toISOString() })
      .eq("id", id);
    if (finishError) return fail(finishError.message);

    router.push("/client");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-slate-100 sticky top-0 z-10">
        <Link
          href="/client"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft size={15} /> {copy.client.common.back}
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{workout.name}</h1>
        <p className="text-sm text-slate-500">
          {fill(copy.client.common.exerciseCount, { count: exerciseCount })}
          {doneCount > 0 && (
            <span data-testid="exercise-progress">
              {" · "}
              {fill(t.progress, { done: doneCount, total: exerciseCount })}
            </span>
          )}
        </p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {resumed && (
          <div
            data-testid="resumed-banner"
            className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
          >
            <p className="text-sm text-blue-800">{t.resumed}</p>
            <Button size="sm" variant="secondary" onClick={startOver} disabled={saving}>
              {t.startOver}
            </Button>
          </div>
        )}
        {draftSaveFailed && (
          <p role="status" className="text-xs text-amber-700">
            {t.draftSaveError}
          </p>
        )}

        {/* Collapsed cards, to-do first; tap a name to open its sets */}
        {order.map((i) => {
          const we = workout.exercises[i];
          return (
            <ExerciseCard
              key={we.exerciseId}
              workoutExercise={we}
              previous={previousByExerciseId[we.exerciseId]}
              setStates={states[i]}
              onUpdateSet={(setIdx, field, val) => updateSet(i, setIdx, field, val)}
              onToggleAll={() => toggleAllSets(i)}
            />
          );
        })}

        {/* Complete button */}
        <div className="pt-2 pb-4">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          <Button className="w-full" size="lg" onClick={onCompleteClick} disabled={saving}>
            <CheckCircle2 size={18} /> {saving ? copy.client.common.saving : t.complete}
          </Button>
        </div>
      </div>

      {/* Finishing early: confirm before saving a partial (or empty) session */}
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="complete-confirm-title"
          data-testid="complete-confirm"
          className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-slate-900/40 px-4 pb-6 sm:pb-0"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p id="complete-confirm-title" className="text-base font-bold text-slate-900">
              {t.confirmTitle}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {doneCount === 0
                ? t.confirmNoneDone
                : fill(t.confirmSomeDone, { done: doneCount, total: exerciseCount })}{" "}
              {t.confirmQuestion}
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button size="lg" onClick={complete}>
                {t.confirmYes}
              </Button>
              <Button size="lg" variant="secondary" onClick={() => setConfirming(false)}>
                {t.keepGoing}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
