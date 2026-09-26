import { redirect } from "next/navigation";
import { CheckInForm } from "@/components/client/checkin-form";
import { getCheckIns, getCurrentClient } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { copy } from "@/lib/copy";

const t = copy.client.checkin;

export default async function CheckInPage() {
  const client = await getCurrentClient();
  if (!client) redirect("/login");

  const recent = await getCheckIns(client.id, 3);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white px-5 pt-12 pb-5 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900">{t.title}</h1>
        <p className="text-slate-500 text-sm mt-0.5">{t.subtitle}</p>
      </div>

      <div className="px-4 py-5 space-y-4">
        <CheckInForm clientId={client.id} />

        {/* History */}
        {recent.length > 0 && (
          <div className="pt-2">
            <h2 className="text-base font-bold text-slate-900 mb-3">{t.previousTitle}</h2>
            <div className="space-y-3">
              {recent.map((ci) => (
                <div key={ci.id} className="bg-white rounded-xl border border-slate-200 px-4 py-4">
                  <p className="text-xs font-semibold text-slate-400 mb-2">{formatDate(ci.date)}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: t.energy, val: ci.energy },
                      { label: t.sleep, val: ci.sleep },
                      { label: t.nutrition, val: ci.nutrition },
                    ].map(({ label, val }) => (
                      <div key={label} className="bg-slate-50 rounded-lg py-2">
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
