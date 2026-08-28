"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2 } from "lucide-react";

const QUESTIONS = [
  { key: "energy" as const, label: "Energy levels", emoji: "⚡", desc: "How energetic do you feel?" },
  { key: "sleep" as const, label: "Sleep quality", emoji: "😴", desc: "How well did you sleep this week?" },
  { key: "nutrition" as const, label: "Nutrition", emoji: "🥗", desc: "How well did you eat this week?" },
];

function RatingSlider({
  label,
  emoji,
  desc,
  value,
  onChange,
}: {
  label: string;
  emoji: string;
  desc: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{emoji}</span>
        <p className="font-semibold text-slate-900 text-sm">{label}</p>
        <span className="ml-auto text-2xl font-bold text-blue-600">{value}</span>
      </div>
      <p className="text-xs text-slate-400 mb-3">{desc}</p>
      <input
        type="range"
        min={1}
        max={10}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-600"
      />
      <div className="flex justify-between text-xs text-slate-400 mt-1">
        <span>1 — Poor</span>
        <span>10 — Great</span>
      </div>
    </div>
  );
}

export function CheckInForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ energy: 7, sleep: 7, nutrition: 7 });
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("check_ins").insert({
      client_id: clientId,
      date: new Date().toISOString().slice(0, 10),
      energy: values.energy,
      sleep: values.sleep,
      nutrition: values.nutrition,
      notes: notes.trim() || null,
    });
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
    setSubmitting(false);
    router.refresh();
  }

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Check-in submitted!</h2>
        <p className="text-slate-500 text-sm mt-1">Your coach will review this shortly.</p>
        <Button
          variant="secondary"
          className="mt-6"
          onClick={() => {
            setSubmitted(false);
            setNotes("");
          }}
        >
          View history
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {QUESTIONS.map((q) => (
        <RatingSlider
          key={q.key}
          label={q.label}
          emoji={q.emoji}
          desc={q.desc}
          value={values[q.key]}
          onChange={(v) => setValues((prev) => ({ ...prev, [q.key]: v }))}
        />
      ))}

      {/* Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <label className="block text-sm font-semibold text-slate-900 mb-2">
          Any notes for your coach? (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Feeling great this week, sleep has improved…"
          rows={3}
          className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button className="w-full" size="lg" onClick={submit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Check-in"}
      </Button>
    </div>
  );
}
