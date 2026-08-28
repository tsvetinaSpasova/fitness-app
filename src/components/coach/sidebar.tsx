"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Dumbbell,
  LayoutDashboard,
  BookOpen,
  LogOut,
} from "lucide-react";
import type { User } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/sign-out-button";

const NAV = [
  { href: "/coach", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/coach/clients", label: "Clients", icon: Users },
  { href: "/coach/programmes", label: "Programmes", icon: BookOpen },
  { href: "/coach/exercises", label: "Exercises", icon: Dumbbell },
];

export function CoachSidebar({ coach }: { coach: User }) {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <span className="text-xl font-bold text-blue-600 tracking-tight">FitCoach</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                size={18}
                className={cn(active ? "text-blue-600" : "text-slate-400 group-hover:text-slate-600")}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Coach profile */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <Avatar name={coach.name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{coach.name}</p>
            <p className="text-xs text-slate-500 truncate">{coach.email}</p>
          </div>
          <SignOutButton className="text-slate-400 hover:text-slate-600">
            <LogOut size={16} />
          </SignOutButton>
        </div>
      </div>
    </aside>
  );
}
