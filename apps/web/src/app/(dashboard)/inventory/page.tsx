"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const { data: matrix, isLoading } = trpc.inventory.stockMatrix.useQuery();
  const { data: alerts } = trpc.inventory.lowStockAlerts.useQuery();

  const filteredItems = matrix?.items.filter((item) => {
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.partNumber?.toLowerCase().includes(search.toLowerCase()) ?? false);

    if (!matchesSearch) return false;

    if (lowStockOnly) {
      const total = Object.values(matrix.matrix[item.id] ?? {}).reduce(
        (sum, q) => sum + q,
        0
      );
      return item.reorderPoint != null && total <= Number(item.reorderPoint);
    }

    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm">
            {matrix?.locations.length ?? 0} locations · {matrix?.items.length ?? 0} items
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/inventory/transfer"
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition"
          >
            Transfer Stock
          </a>
          <a
            href="/inventory/new"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition"
          >
            + Add Item
          </a>
        </div>
      </div>

      {/* Low stock alerts */}
      {(alerts?.length ?? 0) > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm font-medium text-amber-800 mb-1">
            ⚠ {alerts?.length} items at or below reorder point
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            {alerts?.slice(0, 6).map((item) => (
              <span key={item.id} className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-md">
                {item.name}: {item.totalQuantity} {item.unitOfMeasure}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search parts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded"
          />
          Low stock only
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50">
                    Item
                  </th>
                  {matrix?.locations.map((loc) => (
                    <th
                      key={loc.id}
                      className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide whitespace-nowrap"
                    >
                      {loc.name}
                    </th>
                  ))}
                  <th className="text-center px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredItems?.map((item) => {
                  const itemStock = matrix?.matrix[item.id] ?? {};
                  const total = Object.values(itemStock).reduce((sum, q) => sum + q, 0);
                  const isLow = item.reorderPoint != null && total <= Number(item.reorderPoint);

                  return (
                    <tr
                      key={item.id}
                      className={`border-b border-gray-50 hover:bg-gray-50 transition ${isLow ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-white">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        {item.partNumber && (
                          <div className="text-xs text-gray-400">PN: {item.partNumber}</div>
                        )}
                        {item.category && (
                          <div className="text-xs text-gray-400">{item.category}</div>
                        )}
                        {isLow && (
                          <span className="inline-flex px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 mt-0.5">
                            ⚠ Low
                          </span>
                        )}
                      </td>
                      {matrix?.locations.map((loc) => (
                        <td key={loc.id} className="px-3 py-3 text-center text-gray-700">
                          {itemStock[loc.id] ?? 0}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-center font-medium text-gray-900">
                        {total}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!filteredItems?.length && (
              <div className="py-12 text-center text-gray-400">No items found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
