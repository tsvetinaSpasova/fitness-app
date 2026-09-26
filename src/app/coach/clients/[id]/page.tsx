import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignProgramme } from "@/components/coach/assign-programme";
import { AddNoteForm } from "@/components/coach/add-note-form";
import {
  getCheckIns,
  getClient,
  getCoachNotes,
  getMeasurements,
  getProgramme,
  getProgrammeTemplates,
  getProgressPhotos,
  getWorkoutLogs,
} from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { copy, fill } from "@/lib/copy";
import {
  ArrowLeft,
  Camera,
  Dumbbell,
  ClipboardCheck,
  Pencil,
  StickyNote,
  Scale,
  ChevronRight,
} from "lucide-react";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = copy.coach.clientDetail;
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  const [programme, templates, logs, checkins, measurements, notes, photos] =
    await Promise.all([
      client.assignedProgrammeId ? getProgramme(client.assignedProgrammeId) : null,
      getProgrammeTemplates(),
      getWorkoutLogs(id, 5),
      getCheckIns(id, 3),
      getMeasurements(id),
      getCoachNotes(id),
      getProgressPhotos(id),
    ]);
  const latestMeasurement = measurements[0];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link
        href="/coach"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-5 transition-colors"
      >
        <ArrowLeft size={15} /> {t.backToDashboard}
      </Link>

      {/* Client header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5 flex items-start gap-5">
        <Avatar name={client.name} size="lg" />
        <div className="flex-1">
          <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-slate-500 text-sm">{client.email}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {client.goal && <Badge variant="blue">{client.goal}</Badge>}
            <Badge variant="muted">{fill(t.joined, { date: formatDate(client.joinedAt) })}</Badge>
            {programme && <Badge variant="default">{programme.name}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Assigned programme */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Dumbbell size={16} className="text-blue-600" />
                {t.assignedProgrammeTitle}
              </CardTitle>
              <div className="flex items-center gap-2">
                {programme && (
                  <Link
                    href={`/coach/programmes/${programme.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 border border-slate-200 transition-colors"
                  >
                    <Pencil size={12} /> {t.edit}
                  </Link>
                )}
                <AssignProgramme
                  clientId={client.id}
                  templates={templates.map((t) => ({ id: t.id, name: t.name }))}
                  hasProgramme={Boolean(programme)}
                />
              </div>
            </CardHeader>
            {programme ? (
              <CardContent className="py-3 px-0">
                <div className="px-5 mb-2">
                  <p className="font-semibold text-slate-900">{programme.name}</p>
                  <p className="text-sm text-slate-500">
                    {fill(t.workoutsPerCycle, { count: programme.workouts.length })}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {programme.workouts.map((w) => (
                    <Link
                      key={w.id}
                      href={`/coach/programmes/${programme.id}#workout-${w.id}`}
                      className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{w.name}</p>
                        <p className="text-xs text-slate-500">
                          {fill(t.exerciseCount, { count: w.exercises.length })}
                        </p>
                      </div>
                      <ChevronRight size={15} className="text-slate-300" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-slate-500">{t.noProgramme}</p>
              </CardContent>
            )}
          </Card>

          {/* Workout logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck size={16} className="text-blue-600" />
                {t.recentWorkoutsTitle}
              </CardTitle>
            </CardHeader>
            {logs.length > 0 ? (
              <CardContent className="py-0 px-0">
                <div className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <div key={log.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{log.workoutName}</p>
                          <p className="text-xs text-slate-500">{log.programmeName}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant={log.status === "completed" ? "success" : "warning"}>
                            {log.status === "completed" ? t.statusCompleted : t.statusInProgress}
                          </Badge>
                          <p className="text-xs text-slate-400 mt-1">{formatDate(log.loggedAt)}</p>
                        </div>
                      </div>
                      {/* What was actually performed, per exercise */}
                      <div className="mt-2 space-y-1">
                        {log.exercises.map((ex) => (
                          <div key={ex.exerciseId} className="flex flex-wrap items-baseline gap-1.5">
                            <span className="text-xs font-medium text-slate-700">
                              {ex.exerciseName}
                            </span>
                            {ex.sets.map((s, i) => (
                              <span
                                key={i}
                                className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-600"
                              >
                                {s.weightKg != null
                                  ? fill(t.setWithWeight, { weight: s.weightKg, reps: s.reps })
                                  : fill(t.setRepsOnly, { reps: s.reps })}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-slate-500">{t.noWorkouts}</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle>{t.recentCheckInsTitle}</CardTitle>
            </CardHeader>
            {checkins.length > 0 ? (
              <CardContent className="space-y-3">
                {checkins.map((ci) => (
                  <div key={ci.id} className="text-sm">
                    <p className="font-medium text-slate-700 text-xs mb-1.5">{formatDate(ci.date)}</p>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      {[
                        { label: t.checkInEnergy, val: ci.energy },
                        { label: t.checkInSleep, val: ci.sleep },
                        { label: t.checkInNutrition, val: ci.nutrition },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-slate-50 rounded-lg py-1.5">
                          <p className="text-lg font-bold text-slate-900">{val}</p>
                          <p className="text-xs text-slate-500">{label}</p>
                        </div>
                      ))}
                    </div>
                    {ci.notes && (
                      <p className="text-xs text-slate-500 mt-2 italic">&ldquo;{ci.notes}&rdquo;</p>
                    )}
                  </div>
                ))}
              </CardContent>
            ) : (
              <CardContent>
                <p className="text-sm text-slate-500">{t.noCheckIns}</p>
              </CardContent>
            )}
          </Card>

          {/* Latest measurements */}
          {latestMeasurement && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale size={15} className="text-blue-600" /> {t.measurementsTitle}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-slate-400 mb-2">{formatDate(latestMeasurement.date)}</p>
                {[
                  { label: t.measurementWeight, value: latestMeasurement.weightKg, unit: "kg" },
                  { label: t.measurementWaist, value: latestMeasurement.waistCm, unit: "cm" },
                  { label: t.measurementHips, value: latestMeasurement.hipsCm, unit: "cm" },
                  { label: t.measurementChest, value: latestMeasurement.chestCm, unit: "cm" },
                  { label: t.measurementArms, value: latestMeasurement.armsCm, unit: "cm" },
                  { label: t.measurementLegs, value: latestMeasurement.legsCm, unit: "cm" },
                ].map(({ label, value, unit }) =>
                  value != null ? (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-slate-900">{value} {unit}</span>
                    </div>
                  ) : null
                )}
              </CardContent>
            </Card>
          )}

          {/* Progress photos (clients are told these are visible to the coach) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera size={15} className="text-blue-600" /> {t.progressPhotosTitle}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 6).map((photo) =>
                    photo.url ? (
                      // Signed URLs expire hourly, so a plain <img> beats next/image caching here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={photo.id}
                        src={photo.url}
                        alt={fill(t.progressPhotoAlt, { date: formatDate(photo.date) })}
                        className="rounded-lg aspect-[3/4] w-full object-cover bg-slate-100 border border-slate-200"
                      />
                    ) : null
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">{t.noPhotos}</p>
              )}
            </CardContent>
          </Card>

          {/* Coach notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StickyNote size={15} className="text-blue-600" /> {t.notesTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {notes.length > 0 ? (
                notes.map((n) => (
                  <div key={n.id} className="bg-amber-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">{n.content}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">{t.noNotes}</p>
              )}
              <AddNoteForm clientId={client.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
