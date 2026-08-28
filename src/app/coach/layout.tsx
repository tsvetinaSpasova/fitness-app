import { CoachSidebar } from "@/components/coach/sidebar";
import { getCurrentProfile } from "@/lib/data";
import { redirect } from "next/navigation";

export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await getCurrentProfile();
  if (!coach) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      <CoachSidebar coach={coach} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
