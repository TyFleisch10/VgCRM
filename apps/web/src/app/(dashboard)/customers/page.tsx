"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatPhone, relativeTime } from "@/lib/utils";

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");

  const { data, isLoading } = trpc.customers.list.useQuery({
    search: search || undefined,
    type: type || undefined,
    limit: 100,
  });

  const typeColors: Record<string, string> = {
    RESIDENTIAL: "bg-blue-100 text-blue-700",
    COMMERCIAL: "bg-purple-100 text-purple-700",
    MUNICIPAL: "bg-green-100 text-green-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">{data?.customers.length ?? 0} customers</p>
        </div>
        <a
          href="/customers/new"
          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
        >
          + New Customer
        </a>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, phone, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All types</option>
          <option value="RESIDENTIAL">Residential</option>
          <option value="COMMERCIAL">Commercial</option>
          <option value="MUNICIPAL">Municipal</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Name / Company</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Sites</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Activity</th>
              </tr>
            </thead>
            <tbody>
              {data?.customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition"
                  onClick={() => (window.location.href = `/customers/${customer.id}`)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {[customer.firstName, customer.lastName].filter(Boolean).join(" ") || customer.company || "—"}
                    </div>
                    {customer.company && (customer.firstName || customer.lastName) && (
                      <div className="text-xs text-gray-400">{customer.company}</div>
                    )}
                    {customer.sites[0] && (
                      <div className="text-xs text-gray-400">{customer.sites[0].city}, {customer.sites[0].state}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${typeColors[customer.type]}`}>
                      {customer.type.charAt(0) + customer.type.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatPhone(customer.phonePrimary)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{customer.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{customer.sites.length}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    <div>{customer._count.leads} leads</div>
                    <div>{customer._count.jobs} jobs</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.customers.length && (
            <div className="py-12 text-center text-gray-400">
              No customers found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
