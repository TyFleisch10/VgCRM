"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  EXPIRED: "bg-orange-100 text-orange-700",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default function EstimatesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = trpc.estimates.list.useQuery({
    status: statusFilter || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estimates</h1>
          <p className="text-gray-500 text-sm">{data?.length ?? 0} estimates</p>
        </div>
        <button
          onClick={() => router.push("/estimates/new")}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
        >
          + New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="ACCEPTED">Accepted</option>
          <option value="REJECTED">Rejected</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {/* Estimates Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : data?.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No estimates found</p>
          <p className="text-gray-400 text-sm mt-1">Create an estimate from a lead</p>
          <button
            onClick={() => router.push("/estimates/new")}
            className="mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            + New Estimate
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Options</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Created By</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((estimate) => (
                <tr
                  key={estimate.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => router.push(`/estimates/${estimate.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {[estimate.customer.firstName, estimate.customer.lastName]
                        .filter(Boolean)
                        .join(" ") || estimate.customer.company || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[estimate.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {estimate.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {estimate.options.map((o) => o.title).join(", ")}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {estimate.options.length > 0
                      ? formatCurrency(Math.max(...estimate.options.map((o) => Number(o.total))))
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{estimate.createdBy.name}</td>
                  <td className="px-4 py-3 text-right text-gray-400 text-xs">
                    {new Date(estimate.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}