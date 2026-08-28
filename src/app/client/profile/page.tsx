import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { getCurrentClient, getProgramme } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { LogOut, ChevronRight } from "lucide-react";

export default async function ProfilePage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const programme = client.assignedProgrammeId
    ? await getProgramme(client.assignedProgrammeId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">Profile</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* User card */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
          <Avatar name={client.name} size="lg" />
          <div>
            <p className="font-bold text-slate-900">{client.name}</p>
            <p className="text-sm text-slate-500">{client.email}</p>
            <div className="flex gap-2 mt-2">
              {client.goal && <Badge variant="blue">{client.goal}</Badge>}
              <Badge variant="muted">Since {formatDate(client.joinedAt)}</Badge>
            </div>
          </div>
        </div>

        {/* Current programme */}
        {programme && (
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Current Programme</p>
                <p className="font-semibold text-slate-900">{programme.name}</p>
                <p className="text-xs text-slate-500">{programme.workouts.length} workouts/cycle</p>
              </div>
              <Badge variant="success">Active</Badge>
            </CardContent>
          </Card>
        )}

        {/* Weekly check-in CTA */}
        <Link href="/client/checkin">
          <div className="bg-blue-600 rounded-xl px-5 py-4 flex items-center justify-between shadow-sm">
            <div>
              <p className="font-semibold text-white text-sm">Weekly Check-in</p>
              <p className="text-blue-200 text-xs mt-0.5">Let your coach know how you&apos;re doing</p>
            </div>
            <ChevronRight size={18} className="text-blue-200" />
          </div>
        </Link>

        {/* Sign out */}
        <SignOutButton className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-medium text-red-500 hover:text-red-600 transition-colors">
          <LogOut size={16} />
          Sign out
        </SignOutButton>
      </div>
    </div>
  );
}
