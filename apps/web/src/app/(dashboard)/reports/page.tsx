"use client";

import { trpc } from "@/lib/trpc/client";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function StatCard({
  title,
  value,
  subtitle,
  color = "blue",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "orange" | "red" | "purple";
}) {
  const colors = {
    blue: "text-blue-600",
    green: "text-green-600",
    orange: "text-orange-600",
    red: "text-red-600",
    purple: "text-purple-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${colors[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const { data: summary, isLoading: summaryLoading } = trpc.dashboard.summary.useQuery();
  const { data: leads, isLoading: leadsLoading } = trpc.leads.list.useQuery({ limit: 200 });
  const { data: estimates, isLoading: estimatesLoading } = trpc.estimates.list.useQuery({ limit: 200 });
  const { data: tickets, isLoading: ticketsLoading } = trpc.tickets.list.useQuery({ limit: 200 });
  const { data: jobs, isLoading: jobsLoading } = trpc.jobs.list.useQuery({ limit: 200 });

  const isLoading = summaryLoading || leadsLoading || estimatesLoading || ticketsLoading || jobsLoading;

  // Calculate estimate conversion rate
  const totalEstimates = estimates?.length ?? 0;
  const acceptedEstimates = estimates?.filter((e) => e.status === "ACCEPTED").length ?? 0;
  const conversionRate = totalEstimates > 0 ? Math.round((acceptedEstimates / totalEstimates) * 100) : 0;

  // Calculate jobs by status
  const jobsByStatus = (jobs?.jobs ?? []).reduce((acc, job) => {
    acc[job.status] = (acc[job.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate leads by stage
  const leadsByStage = (leads?.leads ?? []).reduce((acc, lead) => {
    acc[lead.stage] = (acc[lead.stage] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calculate tickets by type
  const ticketsByType = (tickets?.tickets ?? []).reduce((acc, ticket) => {
    acc[ticket.type] = (acc[ticket.type] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-500 text-sm">Business overview and key metrics</p>
      </div>

      {/* Key Metrics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Key Metrics</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Active Pipeline Value"
            value={formatCurrency(summary?.pipeline.totalValue ?? 0)}
            subtitle={`${summary?.pipeline.activeLeads ?? 0} active leads`}
            color="blue"
          />
          <StatCard
            title="Accounts Receivable"
            value={formatCurrency(summary?.ar.outstanding ?? 0)}
            subtitle={`${summary?.ar.invoiceCount ?? 0} open invoices`}
            color="green"
          />
          <StatCard
            title="Estimate Conversion"
            value={`${conversionRate}%`}
            subtitle={`${acceptedEstimates} of ${totalEstimates} accepted`}
            color="purple"
          />
          <StatCard
            title="Open Tickets"
            value={(summary?.tickets.open ?? 0) + (summary?.tickets.inProgress ?? 0)}
            subtitle={`${summary?.tickets.pendingParts ?? 0} pending parts`}
            color="orange"
          />
        </div>
      </div>

      {/* Pipeline & Jobs */}
      <div className="grid grid-cols-2 gap-6">
        {/* Leads by Stage */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Leads by Stage</h2>
          <div className="space-y-2">
            {Object.entries(leadsByStage).length === 0 ? (
              <p className="text-gray-400 text-sm">No leads yet</p>
            ) : (
              Object.entries(leadsByStage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {stage.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Jobs by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Jobs by Status</h2>
          <div className="space-y-2">
            {Object.entries(jobsByStatus).length === 0 ? (
              <p className="text-gray-400 text-sm">No jobs yet</p>
            ) : (
              Object.entries(jobsByStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {status.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tickets by Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Tickets by Type</h2>
          <div className="space-y-2">
            {Object.entries(ticketsByType).length === 0 ? (
              <p className="text-gray-400 text-sm">No tickets yet</p>
            ) : (
              Object.entries(ticketsByType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {type.toLowerCase().replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estimates by Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Estimates by Status</h2>
          <div className="space-y-2">
            {totalEstimates === 0 ? (
              <p className="text-gray-400 text-sm">No estimates yet</p>
            ) : (
              ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"].map((status) => {
                const count = estimates?.filter((e) => e.status === status).length ?? 0;
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 capitalize">
                      {status.toLowerCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Alerts</h2>
        <div className="space-y-2">
          {summary?.warrantyExpiring > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <span>⚠️</span>
              <span>{summary.warrantyExpiring} warranties expiring in the next 30 days</span>
            </div>
          )}
          {summary?.maintenanceDue > 0 && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <span>🔧</span>
              <span>{summary.maintenanceDue} maintenance plans due this month</span>
            </div>
          )}
          {summary?.lowStockItems > 0 && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <span>📦</span>
              <span>{summary.lowStockItems} inventory items low on stock</span>
            </div>
          )}
          {!summary?.warrantyExpiring && !summary?.maintenanceDue && !summary?.lowStockItems && (
            <p className="text-gray-400 text-sm">No alerts at this time</p>
          )}
        </div>
      </div>
    </div>
  );
}