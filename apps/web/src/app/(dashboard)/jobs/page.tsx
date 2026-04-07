"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-gray-100 text-gray-700",
  SCHEDULED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  ON_HOLD: "bg-orange-100 text-orange-700",
  COMPLETE: "bg-green-100 text-green-700",
  INVOICED: "bg-purple-100 text-purple-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const JOB_TYPES: Record<string, string> = {
  INSTALLATION: "Installation",
  MUNICIPAL_PROJECT: "Municipal Project",
  SERVICE_CALL: "Service Call",
  MAINTENANCE: "Maintenance",
};

export default function JobsPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data, isLoading } = trpc.jobs.list.useQuery({
    status: statusFilter || undefined,
    type: typeFilter || undefined,
    limit: 50,
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
          <p className="text-gray-500 text-sm">{data?.jobs.length ?? 0} jobs</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SCHEDULED">Scheduled</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="ON_HOLD">On Hold</option>
          <option value="COMPLETE">Complete</option>
          <option value="INVOICED">Invoiced</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Types</option>
          <option value="INSTALLATION">Installation</option>
          <option value="MUNICIPAL_PROJECT">Municipal Project</option>
          <option value="SERVICE_CALL">Service Call</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
      </div>

      {/* Jobs Table */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : data?.jobs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No jobs found</p>
          <p className="text-gray-400 text-sm mt-1">Jobs are created from accepted estimates</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned To</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Scheduled</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Site</th>
              </tr>
            </thead>
            <tbody>
              {data?.jobs.map((job) => (
                <tr
                  key={job.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => router.push(`/jobs/${job.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {[job.customer.firstName, job.customer.lastName].filter(Boolean).join(" ") ||
                        job.customer.company || "—"}
                    </div>
                    <div className="text-xs text-gray-400">{job.customer.phonePrimary}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{JOB_TYPES[job.type] ?? job.type}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? "bg-gray-100 text-gray-700"}`}>
                      {job.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.assignments.map((a) => a.user.name).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.scheduledStart
                      ? new Date(job.scheduledStart).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {job.site ? `${job.site.city}, ${job.site.state}` : "—"}
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