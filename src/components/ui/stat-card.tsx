import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, sub, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm p-5", className)}>
      <div className="flex items-start justify-between">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {sub && (
        <p
          className={cn("mt-1 text-xs font-medium", {
            "text-emerald-600": trend === "up",
            "text-red-500": trend === "down",
            "text-slate-400": trend === "neutral" || !trend,
          })}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
