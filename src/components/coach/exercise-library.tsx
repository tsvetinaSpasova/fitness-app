"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Exercise } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, Play } from "lucide-react";

interface FormState {
  id?: string;
  name: string;
  muscleGroup: string;
  instructions: string;
  videoUrl: string;
  alternatives: string;
  requiresWeight: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  muscleGroup: "",
  instructions: "",
  videoUrl: "",
  alternatives: "",
  requiresWeight: true,
};

function ExerciseForm({
  initial,
  onDone,
  onCancel,
}: {
  initial: FormState;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    if (!form.name.trim() || !form.muscleGroup.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload = {
      name: form.name.trim(),
      muscle_group: form.muscleGroup.trim(),
      instructions: form.instructions.trim() || null,
      video_url: form.videoUrl.trim() || null,
      alternatives: form.alternatives
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      requires_weight: form.requiresWeight,
    };
    const { error: saveError } = form.id
      ? await supabase.from("exercises").update(payload).eq("id", form.id)
      : await supabase.from("exercises").insert(payload);
    if (saveError) {
      setError(saveError.message);
      setSaving(false);
      return;
    }
    onDone();
  }

  const inputClass =
    "w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 mb-5 space-y-3">
      <p className="font-semibold text-slate-900 text-sm">
        {form.id ? "Edit exercise" : "New exercise"}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          placeholder="Name *"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputClass}
          autoFocus
        />
        <input
          placeholder="Muscle group *"
          value={form.muscleGroup}
          onChange={(e) => set("muscleGroup", e.target.value)}
          className={inputClass}
        />
      </div>
      <textarea
        placeholder="Instructions"
        value={form.instructions}
        onChange={(e) => set("instructions", e.target.value)}
        rows={2}
        className={cn(inputClass, "resize-none")}
      />
      <div className="grid sm:grid-cols-2 gap-3">
        <input
          placeholder="Video URL"
          value={form.videoUrl}
          onChange={(e) => set("videoUrl", e.target.value)}
          className={inputClass}
        />
        <input
          placeholder="Alternatives (comma-separated)"
          value={form.alternatives}
          onChange={(e) => set("alternatives", e.target.value)}
          className={inputClass}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.requiresWeight}
          onChange={(e) => set("requiresWeight", e.target.checked)}
          className="accent-blue-600"
        />
        Uses weights — uncheck for bodyweight exercises (reps only)
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={saving || !form.name.trim() || !form.muscleGroup.trim()}>
          {saving ? "Saving…" : "Save exercise"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string | null>(null);
  const [editing, setEditing] = useState<FormState | null>(null);

  const muscleGroups = [...new Set(exercises.map((e) => e.muscleGroup))];
  const visible = filter
    ? exercises.filter((e) => e.muscleGroup === filter)
    : exercises;

  function closeForm() {
    setEditing(null);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Exercise Library</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {exercises.length} exercise{exercises.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button size="sm" onClick={() => setEditing({ ...EMPTY_FORM })}>
          <Plus size={15} /> Add exercise
        </Button>
      </div>

      {editing && (
        <ExerciseForm initial={editing} onDone={closeForm} onCancel={() => setEditing(null)} />
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            filter === null
              ? "bg-blue-600 text-white"
              : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          )}
        >
          All
        </button>
        {muscleGroups.map((group) => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
              filter === group
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {group}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {visible.map((exercise) => (
          <div key={exercise.id} className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900 text-sm">{exercise.name}</p>
                  <Badge variant="muted">{exercise.muscleGroup}</Badge>
                  {!exercise.requiresWeight && <Badge variant="blue">Bodyweight</Badge>}
                </div>
                <p className="text-xs text-slate-500">{exercise.instructions}</p>
                {exercise.alternatives && exercise.alternatives.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="text-xs text-slate-400">Alternatives:</span>
                    {exercise.alternatives.map((alt) => (
                      <span
                        key={alt}
                        className="text-xs bg-slate-50 border border-slate-200 text-slate-600 rounded px-1.5 py-0.5"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                {exercise.videoUrl && (
                  <a
                    href={exercise.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <Play size={13} /> Video
                  </a>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    setEditing({
                      id: exercise.id,
                      name: exercise.name,
                      muscleGroup: exercise.muscleGroup,
                      instructions: exercise.instructions ?? "",
                      videoUrl: exercise.videoUrl ?? "",
                      alternatives: (exercise.alternatives ?? []).join(", "),
                      requiresWeight: exercise.requiresWeight,
                    })
                  }
                >
                  Edit
                </Button>
              </div>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="text-sm text-slate-500 px-5 py-6 text-center">
            No exercises yet. Add your first exercise to build the library.
          </p>
        )}
      </div>
    </>
  );
}
