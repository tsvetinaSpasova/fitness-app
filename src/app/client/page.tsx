import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getCurrentClient, getProgramme, getWorkoutLogs } from "@/lib/data";
import { formatDate, isWithinDays, timeOfDayGreeting, workoutStreak } from "@/lib/utils";
import { ChevronRight, CheckCircle2, Clock, Flame } from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.client.home;

export default async function ClientWorkoutsPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const [programme, recentLogs] = await Promise.all([
    client.assignedProgrammeId ? getProgramme(client.assignedProgrammeId) : null,
    getWorkoutLogs(client.id, 20),
  ]);

  const completedLogs = recentLogs.filter((l) => l.status === "completed");
  const streak = workoutStreak(completedLogs.map((l) => l.loggedAt));
  const thisWeek = completedLogs.filter((l) => isWithinDays(l.loggedAt, 7));
  const completedThisWeek = new Set(thisWeek.map((l) => l.workoutId));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm">{fill(t.greeting, { greeting: timeOfDayGreeting() })}</p>
            <h1 className="text-xl font-bold text-slate-900 mt-0.5">{client.name}</h1>
          </div>
          <Avatar name={client.name} size="md" />
        </div>

        {/* Streak */}
        <div className="mt-4 flex gap-3">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 text-sm font-medium text-orange-500">
              <Flame size={16} />
              <span>{fill(t.streak, { count: streak })}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 size={16} />
            <span>
              {fill(thisWeek.length === 1 ? t.workoutsThisWeekOne : t.workoutsThisWeekOther, {
                count: thisWeek.length,
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5">
        {/* Current programme */}
        {programme ? (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">{programme.name}</h2>
              <div className="flex items-center gap-1.5">
                {programme.phase != null && <Badge variant="muted">{fill(t.phaseBadge, { phase: programme.phase })}</Badge>}
                <Badge variant="blue">{t.activeBadge}</Badge>
              </div>
            </div>

            <div className="space-y-3">
              {programme.workouts.map((workout, i) => {
                const done = completedThisWeek.has(workout.id);
                const inProgress = recentLogs.find(
                  (l) => l.workoutId === workout.id && l.status === "in_progress"
                );

                return (
                  <Link
                    key={workout.id}
                    href={`/client/workout/${workout.id}`}
                    className="flex items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-4 hover:shadow-md transition-shadow group"
                  >
                    {/* Number / check */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${
                        done
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {done ? <CheckCircle2 size={20} /> : i + 1}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm">{workout.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {fill(copy.client.common.exerciseCount, { count: workout.exercises.length })}
                        {workout.exercises[0] &&
                          ` · ${fill(t.startsWith, { name: workout.exercises[0].exercise.name })}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {inProgress && (
                        <Badge variant="warning">
                          <Clock size={10} className="mr-1" /> {t.inProgressBadge}
                        </Badge>
                      )}
                      {done && <Badge variant="success">{t.doneBadge}</Badge>}
                      <ChevronRight
                        size={16}
                        className="text-slate-300 group-hover:text-slate-500 transition-colors"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-5 bg-white rounded-xl border border-slate-200 px-4 py-6 text-center">
            <p className="text-sm font-semibold text-slate-700">{t.noProgrammeTitle}</p>
            <p className="text-xs text-slate-500 mt-1">{t.noProgrammeBody}</p>
          </div>
        )}

        {/* Recent logs */}
        {recentLogs.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-3">{t.recentWorkoutsTitle}</h2>
            <div className="space-y-2">
              {recentLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{log.workoutName}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(log.loggedAt)}</p>
                    </div>
                    <Badge variant={log.status === "completed" ? "success" : "warning"}>
                      {log.status === "completed" ? t.completedStatus : t.inProgressStatus}
                    </Badge>
                  </div>
                  {/* What was actually performed, per exercise */}
                  {log.exercises.length > 0 && (
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
                                ? fill(copy.client.common.setWeighted, { weight: s.weightKg, reps: s.reps })
                                : fill(copy.client.common.setBodyweight, { reps: s.reps })}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
