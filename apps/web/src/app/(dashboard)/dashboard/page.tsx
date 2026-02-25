"use client";

import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";
import { PIPELINE_STAGES } from "@watersys/shared";

export default function DashboardPage() {
  const { data: summary, isLoading } = trpc.dashboard.summary.useQuery();
  const { data: todayJobs } = trpc.jobs.todaySchedule.useQuery();
  const { data: lowStock } = trpc.inventory.lowStockAlerts.useQuery();
  const { data: pipeline } = trpc.leads.pipelineSummary.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Pipeline"
          value={formatCurrency(summary?.pipeline.totalValue)}
          sub={`${summary?.pipeline.activeLeads ?? 0} active leads`}
          color="blue"
        />
        <KpiCard
          label="Jobs Today"
          value={String(summary?.todayJobs ?? 0)}
          sub="scheduled or in progress"
          color="purple"
        />
        <KpiCard
          label="Open Tickets"
          value={String((summary?.tickets.open ?? 0) + (summary?.tickets.inProgress ?? 0))}
          sub={`${summary?.tickets.pendingParts ?? 0} pending parts`}
          color="orange"
          alert={summary?.tickets.open ?? 0 > 0}
        />
        <KpiCard
          label="Accounts Receivable"
          value={formatCurrency(summary?.ar.outstanding)}
          sub={`${summary?.ar.invoiceCount ?? 0} open invoices`}
          color="green"
        />
      </div>

      {/* Pipeline + Schedule row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline by stage */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pipeline by Stage</h2>
          <div className="space-y-2.5">
            {pipeline?.map((stage) => {
              const stageInfo = PIPELINE_STAGES.find((s) => s.key === stage.stage);
              const maxValue = Math.max(...(pipeline?.map((s) => s.value) ?? [1]));
              const pct = maxValue > 0 ? (stage.value / maxValue) * 100 : 0;
              return (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-44 shrink-0">{stageInfo?.label}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${stageInfo?.color ?? "bg-blue-500"} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 w-8 text-right">{stage.count}</span>
                  <span className="text-sm text-gray-500 w-24 text-right">{formatCurrency(stage.value)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Today&apos;s Schedule</h2>
          {!todayJobs?.length ? (
            <p className="text-sm text-gray-400 text-center py-8">No jobs scheduled today</p>
          ) : (
            <div className="space-y-3">
              {todayJobs.map((job) => (
                <a
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-100 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {job.customer.firstName} {job.customer.lastName || job.customer.company}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {job.site?.city}
                        {" · "}
                        {job.assignments.map((a) => a.user.name).join(", ")}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {job.scheduledStart
                        ? new Date(job.scheduledStart).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                          })
                        : "—"}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(lowStock?.length ?? 0) > 0 || (summary?.warrantyExpiring ?? 0) > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Alerts</h2>
          <div className="space-y-2">
            {lowStock?.slice(0, 5).map((item) => (
              <AlertRow
                key={item.id}
                type="warning"
                message={`Inventory low: ${item.name} — ${item.totalQuantity} ${item.unitOfMeasure} remaining`}
                href="/inventory"
              />
            ))}
            {(summary?.warrantyExpiring ?? 0) > 0 && (
              <AlertRow
                type="warning"
                message={`${summary?.warrantyExpiring} warranty expiring within 30 days`}
                href="/customers"
              />
            )}
            {(summary?.maintenanceDue ?? 0) > 0 && (
              <AlertRow
                type="info"
                message={`${summary?.maintenanceDue} systems due for maintenance this month`}
                href="/tickets"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  color,
  alert,
}: {
  label: string;
  value: string;
  sub: string;
  color: "blue" | "purple" | "orange" | "green";
  alert?: boolean;
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
    green: "bg-green-50 text-green-700",
  };
  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className="text-xs mt-1 opacity-70">{sub}</p>
    </div>
  );
}

function AlertRow({
  type,
  message,
  href,
}: {
  type: "warning" | "info" | "error";
  message: string;
  href: string;
}) {
  const styles = {
    warning: "text-amber-700 bg-amber-50 border-amber-200",
    info: "text-blue-700 bg-blue-50 border-blue-200",
    error: "text-red-700 bg-red-50 border-red-200",
  };
  const icons = {
    warning: "⚠",
    info: "ℹ",
    error: "✕",
  };
  return (
    <a
      href={href}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${styles[type]} hover:opacity-80 transition`}
    >
      <span>{icons[type]}</span>
      <span>{message}</span>
    </a>
  );
}
