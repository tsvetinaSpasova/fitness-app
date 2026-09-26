"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { copy } from "@/lib/copy";

const t = copy.coach.assignProgramme;

interface TemplateOption {
  id: string;
  name: string;
}

/**
 * Entry point for assigning a programme. Picking a template no longer
 * assigns it directly — it opens the programme editor prepopulated from the
 * template so the coach can customise before committing (see
 * /coach/clients/[id]/assign/[templateId]). "Assign a new programme" is styled as a warning
 * because assigning replaces the client's current (possibly customised) copy.
 */
export function AssignProgramme({
  clientId,
  templates,
  hasProgramme,
}: {
  clientId: string;
  templates: TemplateOption[];
  hasProgramme: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setOpen((v) => !v)}
        className={
          hasProgramme
            ? "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 focus:ring-amber-400"
            : undefined
        }
      >
        {hasProgramme && <AlertTriangle size={13} />}
        {hasProgramme ? t.assignNew : t.assign}
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-64 bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {hasProgramme && (
            <p className="px-3 py-2 text-xs text-amber-700 bg-amber-50 border-b border-amber-100">
              {t.replaceWarning}
            </p>
          )}
          {templates.map((t) => (
            <Link
              key={t.id}
              href={`/coach/clients/${clientId}/assign/${t.id}`}
              className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              {t.name}
            </Link>
          ))}
          {templates.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-500">{t.noTemplates}</p>
          )}
        </div>
      )}
    </div>
  );
}
