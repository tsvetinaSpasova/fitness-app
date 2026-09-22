import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentClient } from "@/lib/data";
import { GENERAL_TIPS, MEASUREMENT_GUIDES } from "@/lib/measurement-guide";
import { youTubeEmbedUrl } from "@/lib/utils";
import { ArrowLeft, Ruler, Lightbulb, Play } from "lucide-react";

/**
 * FR-6.2: how to take each body measurement correctly. A static written guide
 * per measure (with an optional demo video slot), reachable from the Progress
 * page and from the "?" links beside each field in the log form. Sections use
 * the guide key as their id so those links can deep-link straight to a measure.
 */
export default async function HowToMeasurePage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-slate-100">
        <Link
          href="/client/progress"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3 transition-colors"
        >
          <ArrowLeft size={15} /> Back to progress
        </Link>
        <h1 className="text-xl font-bold text-slate-900">How to measure</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Take each measurement the same way every time so the numbers tell the truth.
        </p>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Jump list */}
        <nav aria-label="Measurements" className="flex flex-wrap gap-2">
          {MEASUREMENT_GUIDES.map((g) => (
            <a
              key={g.key}
              href={`#${g.key}`}
              className="text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-full px-3 py-1.5 hover:bg-slate-50 transition-colors"
            >
              {g.label}
            </a>
          ))}
        </nav>

        {/* Ground rules */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <Lightbulb size={15} /> Before you start
          </p>
          <ul className="mt-2 space-y-1.5">
            {GENERAL_TIPS.map((tip) => (
              <li key={tip} className="text-xs text-amber-800 flex gap-2">
                <span aria-hidden="true">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* One section per measure */}
        {MEASUREMENT_GUIDES.map((g) => {
          const embed = g.videoUrl ? youTubeEmbedUrl(g.videoUrl) : null;
          return (
            <section
              key={g.key}
              id={g.key}
              aria-labelledby={`${g.key}-heading`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-4"
            >
              <div className="px-4 py-3 border-b border-slate-100 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Ruler size={17} />
                </div>
                <div className="min-w-0">
                  <h2 id={`${g.key}-heading`} className="text-base font-semibold text-slate-900">
                    {g.label}
                    <span className="text-xs font-normal text-slate-400 ml-1.5">{g.unit}</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">{g.where}</p>
                </div>
              </div>

              {embed && (
                <div className="aspect-video bg-slate-900">
                  <iframe
                    src={embed}
                    title={`How to measure your ${g.label.toLowerCase()}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}

              <div className="px-4 py-3 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    <Play size={11} /> Steps
                  </p>
                  <ol className="space-y-1.5">
                    {g.steps.map((step, i) => (
                      <li key={step} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Watch out for
                  </p>
                  <ul className="space-y-1">
                    {g.tips.map((tip) => (
                      <li key={tip} className="text-xs text-slate-600 flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}

        <p className="text-center text-xs text-slate-400 pt-1">
          Not sure about a reading? Take it twice and log the average.
        </p>
      </div>
    </div>
  );
}
