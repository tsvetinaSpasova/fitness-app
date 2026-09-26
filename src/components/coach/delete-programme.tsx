"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { copy } from "@/lib/copy";

const t = copy.coach.deleteProgramme;

/** Two-step inline delete for a template programme on the library card. */
export function DeleteProgramme({ programmeId }: { programmeId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const { error: dError } = await createClient()
      .from("programmes")
      .delete()
      .eq("id", programmeId);
    if (dError) {
      setError(dError.message);
      setBusy(false);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        <Trash2 size={13} className="text-red-500" /> {t.delete}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="secondary" onClick={remove} disabled={busy}>
        <Trash2 size={13} className="text-red-500" /> {t.confirm}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
        {t.cancel}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
