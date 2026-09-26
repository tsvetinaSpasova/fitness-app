import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MeasurementForm } from "@/components/client/measurement-form";
import { getCurrentClient, getMeasurements, getWorkoutLogs } from "@/lib/data";
import { HOW_TO_MEASURE_PATH } from "@/lib/measurement-guide";
import { formatDate } from "@/lib/utils";
import { Scale, Activity, HelpCircle } from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.client.progress;
const labels = copy.client.measurementLabels;

function delta(curr: number, prev: number) {
  const d = curr - prev;
  return { val: Math.abs(d).toFixed(1), dir: d < 0 ? "down" : d > 0 ? "up" : "same" };
}

export default async function ProgressPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const [measurements, logs] = await Promise.all([
    getMeasurements(client.id),
    getWorkoutLogs(client.id, 4),
  ]);
  const latest = measurements[0];
  const prev = measurements[1];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.subtitle}</p>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Measurements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between relative">
            <CardTitle className="flex items-center gap-2">
              <Scale size={16} className="text-blue-600" /> {t.measurementsTitle}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Link
                href={HOW_TO_MEASURE_PATH}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
              >
                <HelpCircle size={13} /> {t.howToMeasure}
              </Link>
              <MeasurementForm clientId={client.id} />
            </div>
          </CardHeader>
          {latest ? (
            <CardContent className="pt-0">
              <p className="text-xs text-slate-400 mb-3">
                {fill(t.latest, { date: formatDate(latest.date) })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: labels.weight, curr: latest.weightKg, prevVal: prev?.weightKg, unit: "kg" },
                  { label: labels.waist, curr: latest.waistCm, prevVal: prev?.waistCm, unit: "cm" },
                  { label: labels.hips, curr: latest.hipsCm, prevVal: prev?.hipsCm, unit: "cm" },
                  { label: labels.chest, curr: latest.chestCm, prevVal: prev?.chestCm, unit: "cm" },
                  { label: labels.arms, curr: latest.armsCm, prevVal: prev?.armsCm, unit: "cm" },
                  { label: labels.legs, curr: latest.legsCm, prevVal: prev?.legsCm, unit: "cm" },
                ].map(({ label, curr, prevVal, unit }) => {
                  if (curr == null) return null;
                  const diff = prevVal != null ? delta(curr, prevVal) : null;

                  return (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="text-2xl font-bold text-slate-900">
                        {curr}
                        <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>
                      </p>
                      {diff && diff.dir !== "same" && (
                        <p
                          className={`text-xs font-medium mt-1 ${
                            diff.dir === "down" ? "text-emerald-600" : "text-red-500"
                          }`}
                        >
                          {diff.dir === "down" ? "▼" : "▲"} {fill(t.vsLast, { diff: diff.val, unit })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* History */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t.history}</p>
                {measurements.map((m) => (
                  <div
                    key={m.id}
                    className="flex justify-between items-center py-2 text-sm border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-500">{formatDate(m.date)}</span>
                    <span className="font-semibold text-slate-900">
                      {m.weightKg != null ? `${m.weightKg} kg` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          ) : (
            <CardContent>
              <p className="text-sm text-slate-500">{t.noMeasurements}</p>
              <p className="text-xs text-slate-400 mt-1">
                {t.firstTimeBefore}{" "}
                <Link href={HOW_TO_MEASURE_PATH} className="text-blue-600 hover:underline">
                  {t.firstTimeLink}
                </Link>{" "}
                {t.firstTimeAfter}
              </p>
            </CardContent>
          )}
        </Card>

        {/* Strength progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity size={16} className="text-blue-600" /> {t.strengthTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {logs.length > 0 ? (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-slate-50 rounded-xl px-3 py-3">
                    <p className="text-sm font-semibold text-slate-800">{log.workoutName}</p>
                    <p className="text-xs text-slate-400 mb-2">{formatDate(log.loggedAt)}</p>
                    {/* What was actually performed, per exercise */}
                    <div className="space-y-1.5">
                      {log.exercises.map((ex) => (
                        <div key={ex.exerciseId} className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-xs font-medium text-slate-700">
                            {ex.exerciseName}
                          </span>
                          {ex.sets.map((s, i) => (
                            <span
                              key={i}
                              className="text-xs bg-white border border-slate-200 text-slate-600 rounded px-2 py-0.5"
                            >
                              {s.weightKg != null
                                ? fill(copy.client.common.setWeighted, { weight: s.weightKg, reps: s.reps })
                                : fill(copy.client.common.setBodyweight, { reps: s.reps })}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">{t.noWorkouts}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
