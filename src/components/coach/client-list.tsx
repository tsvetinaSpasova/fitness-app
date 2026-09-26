"use client";
import { useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Client } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { ChevronRight, Search } from "lucide-react";
import { copy, fill } from "@/lib/copy";

const t = copy.coach.clients;

export function ClientList({
  clients,
  programmeNames,
}: {
  clients: Client[];
  programmeNames: Record<string, string>;
}) {
  const [query, setQuery] = useState("");

  const filtered = clients.filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.goal ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          placeholder={t.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        {filtered.map((client) => {
          const programmeName = client.assignedProgrammeId
            ? programmeNames[client.assignedProgrammeId]
            : undefined;
          return (
            <Link
              key={client.id}
              href={`/coach/clients/${client.id}`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors group"
            >
              <Avatar name={client.name} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-900 text-sm">{client.name}</p>
                <p className="text-xs text-slate-500 truncate">{client.email}</p>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                {programmeName && <Badge variant="blue">{programmeName}</Badge>}
                <p className="text-xs text-slate-400">
                  {fill(t.joined, { date: formatDate(client.joinedAt) })}
                </p>
              </div>
              <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </Link>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-slate-500 px-5 py-6 text-center">
            {clients.length === 0 ? t.noClients : t.noMatches}
          </p>
        )}
      </div>
    </>
  );
}
