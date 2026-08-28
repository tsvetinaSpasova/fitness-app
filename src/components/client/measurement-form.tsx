"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

const FIELDS = [
  { key: "weightKg", label: "Weight", unit: "kg", column: "weight_kg" },
  { key: "waistCm", label: "Waist", unit: "cm", column: "waist_cm" },
  { key: "hipsCm", label: "Hips", unit: "cm", column: "hips_cm" },
  { key: "chestCm", label: "Chest", unit: "cm", column: "chest_cm" },
  { key: "armsCm", label: "Arms", unit: "cm", column: "arms_cm" },
  { key: "legsCm", label: "Legs", unit: "cm", column: "legs_cm" },
] as const;

export function MeasurementForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValue = FIELDS.some((f) => parseFloat(values[f.key] ?? "") > 0);

  async function save() {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const payload: Record<string, string | number | null> = {
      client_id: clientId,
      date: new Date().toISOString().slice(0, 10),
    };
    for (const f of FIELDS) {
      const parsed = parseFloat(values[f.key] ?? "");
      payload[f.column] = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    const { error: insertError } = await supabase
      .from("measurements")
      .insert(payload as never);
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setOpen(false);
    setValues({});
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus size={13} /> Log
      </Button>
    );
  }

  return (
    <div className="absolute right-0 top-full mt-2 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">Log measurements</p>
      <div className="space-y-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex items-center gap-2 text-sm">
            <span className="w-14 text-slate-500 text-xs">{f.label}</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="flex-1 min-w-0 px-2.5 py-1.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-slate-400 w-6">{f.unit}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={save} disabled={saving || !hasValue}>
          {saving ? "Saving…" : "Save"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
