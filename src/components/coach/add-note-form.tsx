"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { copy } from "@/lib/copy";

const t = copy.coach.addNote;

export function AddNoteForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase
      .from("coach_notes")
      .insert({ client_id: clientId, content: content.trim() });
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    setContent("");
    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t.add}
      </Button>
    );
  }

  return (
    <div className="w-full">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t.placeholder}
        rows={3}
        autoFocus
        className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <Button size="sm" onClick={save} disabled={saving || !content.trim()}>
          {saving ? t.saving : t.save}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          {t.cancel}
        </Button>
      </div>
    </div>
  );
}
