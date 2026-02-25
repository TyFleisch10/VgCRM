"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { PipelineBoard } from "@/components/leads/pipeline-board";
import { formatCurrency, relativeTime } from "@/lib/utils";
import { PIPELINE_STAGES } from "@watersys/shared";

type ViewMode = "kanban" | "list";

export default function LeadsPage() {
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");

  const { data, isLoading, refetch } = trpc.leads.list.useQuery({
    search: search || undefined,
    limit: 200,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads & Pipeline</h1>
          <p className="text-gray-500 text-sm">{data?.leads.length ?? 0} active leads</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm ${view === "kanban" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              Board
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
            >
              List
            </button>
          </div>

          <a
            href="/leads/new"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            + New Lead
          </a>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search leads by name, phone, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : view === "kanban" ? (
        <PipelineBoard leads={data?.leads ?? []} onUpdate={() => refetch()} />
      ) : (
        <LeadListView leads={data?.leads ?? []} />
      )}
    </div>
  );
}

function LeadListView({ leads }: { leads: ReturnType<typeof trpc.leads.list.useQuery>["data"] extends { leads: infer L } ? L : never[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Stage</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Source</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Value</th>
            <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Updated</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => {
            const stageInfo = PIPELINE_STAGES.find((s) => s.key === lead.stage);
            return (
              <tr
                key={lead.id}
                className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                onClick={() => (window.location.href = `/leads/${lead.id}`)}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {[lead.customer.firstName, lead.customer.lastName].filter(Boolean).join(" ") ||
                      lead.customer.company ||
                      "—"}
                  </div>
                  {lead.site && (
                    <div className="text-xs text-gray-400">{lead.site.city}, {lead.site.state}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${stageInfo?.color ?? "bg-gray-100"} text-white`}>
                    {stageInfo?.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 capitalize">{lead.source.toLowerCase().replace("_", " ")}</td>
                <td className="px-4 py-3 text-gray-600">{lead.assignedTo?.name ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium text-gray-900">
                  {lead.estimatedValue ? formatCurrency(Number(lead.estimatedValue)) : "—"}
                </td>
                <td className="px-4 py-3 text-right text-gray-400 text-xs">{relativeTime(lead.stageUpdatedAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
