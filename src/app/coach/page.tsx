import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCheckIns, getClients, getWorkoutLogs } from "@/lib/data";
import { daysSince, isWithinDays } from "@/lib/utils";
import { Users, Activity, ClipboardCheck, TrendingUp, ChevronRight } from "lucide-react";

export default async function CoachDashboard() {
  const [clients, logs, checkIns] = await Promise.all([
    getClients(),
    getWorkoutLogs(undefined, 100),
    getCheckIns(undefined, 100),
  ]);

  const clientName = (id: string) =>
    clients.find((c) => c.id === id)?.name ?? "Unknown client";

  const logsThisWeek = logs.filter((l) => isWithinDays(l.loggedAt, 7));
  const logsLastWeek = logs.filter(
    (l) => isWithinDays(l.loggedAt, 14) && !isWithinDays(l.loggedAt, 7)
  );
  const checkInsThisWeek = checkIns.filter((c) => isWithinDays(c.date, 7));
  const checkInsLastWeek = checkIns.filter(
    (c) => isWithinDays(c.date, 14) && !isWithinDays(c.date, 7)
  );
  const activeClientIds = new Set([
    ...logsThisWeek.map((l) => l.clientId),
    ...checkInsThisWeek.map((c) => c.clientId),
  ]);

  const weekTrend = (curr: number, prev: number) =>
    curr > prev ? ("up" as const) : curr < prev ? ("down" as const) : ("neutral" as const);
  const weekSub = (curr: number, prev: number) =>
    `${curr >= prev ? "+" : ""}${curr - prev} vs last week`;

  const recentActivity = [
    ...logs.map((l) => ({
      type: "workout" as const,
      clientName: clientName(l.clientId),
      label: `Logged ${l.workoutName}`,
      time: l.loggedAt,
    })),
    ...checkIns.map((c) => ({
      type: "checkin" as const,
      clientName: clientName(c.clientId),
      label: "Submitted check-in",
      time: c.date,
    })),
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 6);

  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">{today}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Clients"
          value={clients.length}
          sub="On your roster"
          icon={<Users size={18} />}
          trend="neutral"
        />
        <StatCard
          label="Workouts Logged"
          value={logsThisWeek.length}
          sub={weekSub(logsThisWeek.length, logsLastWeek.length)}
          icon={<Activity size={18} />}
          trend={weekTrend(logsThisWeek.length, logsLastWeek.length)}
        />
        <StatCard
          label="Check-ins"
          value={checkInsThisWeek.length}
          sub={weekSub(checkInsThisWeek.length, checkInsLastWeek.length)}
          icon={<ClipboardCheck size={18} />}
          trend={weekTrend(checkInsThisWeek.length, checkInsLastWeek.length)}
        />
        <StatCard
          label="Active This Week"
          value={`${activeClientIds.size}/${clients.length}`}
          sub="Logged a workout or check-in"
          icon={<TrendingUp size={18} />}
          trend={activeClientIds.size >= clients.length / 2 ? "up" : "down"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Client list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Clients</CardTitle>
              <Link href="/coach/clients" className="text-xs text-blue-600 hover:underline font-medium">
                View all
              </Link>
            </CardHeader>
            {clients.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const days = daysSince(client.lastActive ?? client.joinedAt);
                  return (
                    <Link
                      key={client.id}
                      href={`/coach/clients/${client.id}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                    >
                      <Avatar name={client.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                        <p className="text-xs text-slate-500 truncate">{client.goal ?? client.email}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={days <= 2 ? "success" : days <= 7 ? "blue" : "muted"}>
                          {days === 0 ? "Today" : days === 1 ? "Yesterday" : `${days}d ago`}
                        </Badge>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <CardContent>
                <p className="text-sm text-slate-500">
                  No clients yet. Clients appear here once they create an account.
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Recent activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="px-0 py-0">
              {recentActivity.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3 px-5 py-3">
                      <Avatar name={item.clientName} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{item.clientName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                      </div>
                      <Badge variant={item.type === "workout" ? "blue" : "success"}>
                        {item.type === "workout" ? "Workout" : "Check-in"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 px-5 py-4">No activity yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
